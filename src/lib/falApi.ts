import type { VoiceProfile } from './deepseekApi';
import type { TTSService } from './ttsServiceInterface';
import { fal } from "@fal-ai/client"; // Import fal client

// Model path for Fal.ai Kokoro American English TTS
const FAL_KOKORO_MODEL_PATH = "fal-ai/kokoro/american-english";

// Type for the known Fal.ai Kokoro American English voice IDs based on the error and usage
// This should ideally be imported from @fal-ai/client if available, or kept updated.
type FalKokoroAmericanEnglishVoiceId = 
  | "af_heart" 
  | "af_nova" 
  | "af_aoede" 
  | "af_alloy" 
  | "af_bella" 
  | "af_jessica" 
  | "af_kore" 
  | "af_nicole" 
  | "af_river" 
  | "af_sarah" 
  | "af_sky" 
  | "am_adam" 
  | "am_echo" 
  | "am_eric";
  // Add other known voice IDs from the full error message if needed.
  // If the API truly accepts any string, then `string` would be appropriate,
  // but the error suggests a specific union.

// Interface for the Fal.ai Kokoro input, including speed
interface FalKokoroInput {
  prompt: string;
  voice: FalKokoroAmericanEnglishVoiceId;
  speed?: number; // Making speed optional to align with default behavior if not specified
}

// Define a mapping from our abstract voice profiles to specific Fal.ai Kokoro Voice IDs
const voiceProfileToFalVoiceMap: Record<VoiceProfile, FalKokoroAmericanEnglishVoiceId> = {
  'calm_female_gentle': 'af_heart',
  'soothing_male_deep': 'af_nova',   // Fallback to female, warning will be logged
  'clear_female_neutral': 'af_aoede',
  'warm_male_reassuring': 'af_nova', // Fallback to female, warning will be logged
  'default': 'af_nova', 
};

function getVoiceId(profile?: VoiceProfile): FalKokoroAmericanEnglishVoiceId {
  const selectedProfile = profile || 'default';
  if (profile === 'soothing_male_deep' || profile === 'warm_male_reassuring') {
    console.warn(`Fal.ai Kokoro: Requested male voice profile ('${profile}') is not available with current Fal.ai voice selection. Falling back to female voice '${voiceProfileToFalVoiceMap[selectedProfile]}'.`);
  }
  return voiceProfileToFalVoiceMap[selectedProfile] || voiceProfileToFalVoiceMap['default'];
}

async function synthesizeSpeech(
  text: string,
  voice: VoiceProfile | string
): Promise<ArrayBuffer | null> {
  const apiKey = import.meta.env.VITE_FAL_API_KEY;

  if (!apiKey) {
    console.error("Fal.ai API key (VITE_FAL_API_KEY) is not configured.");
    throw new Error("Fal.ai API key is missing. Please check your .env file.");
  }
  // Note: @fal-ai/client typically relies on global configuration (e.g., fal.config()) 
  // or environment variables in Node for authentication. Ensure it's set up if this call fails.

  let resolvedVoiceModel: string; // Keep as string initially for broader assignment
  if (typeof voice === 'string' && voiceProfileToFalVoiceMap[voice as VoiceProfile]) {
    resolvedVoiceModel = getVoiceId(voice as VoiceProfile);
  } else if (typeof voice === 'string' && Object.values(voiceProfileToFalVoiceMap).includes(voice as FalKokoroAmericanEnglishVoiceId)) {
    resolvedVoiceModel = voice;
  } else if (typeof voice === 'string') {
    console.warn(`Fal.ai Kokoro: Provided voice string '${voice}' is not a recognized VoiceProfile or known Fal voice ID. Attempting to use directly. This may fail.`);
    resolvedVoiceModel = voice; 
  } else {
    resolvedVoiceModel = getVoiceId(voice);
  }

  try {
    console.log(`Fal.ai Kokoro: Subscribing with model: ${FAL_KOKORO_MODEL_PATH}, voice: ${resolvedVoiceModel}`);
    const result: any = await fal.subscribe(FAL_KOKORO_MODEL_PATH, {
      input: {
        prompt: text,
        voice: resolvedVoiceModel as FalKokoroAmericanEnglishVoiceId,
        speed: 0.7,
      } as FalKokoroInput, // Cast the input object here
      logs: true, // Enable logs for debugging during development
    });

    if (result && result.data && result.data.audio_url) {
      console.log(`Fal.ai Kokoro: Audio URL received: ${result.data.audio_url}`);
      const audioResponse = await fetch(result.data.audio_url);
      if (!audioResponse.ok) {
        const errorBody = await audioResponse.text();
        console.error('Fal.ai Kokoro: Failed to fetch audio from URL:', audioResponse.status, errorBody);
        throw new Error(`Fal.ai Kokoro: Failed to fetch audio from URL ${result.data.audio_url}. Status: ${audioResponse.status}`);
      }
      const audioArrayBuffer = await audioResponse.arrayBuffer();
      return audioArrayBuffer;
    } else if (result && result.audio && typeof result.audio === 'object' && result.audio.url) {
      // Alternative common structure: result.audio.url
      console.log(`Fal.ai Kokoro: Audio URL received (alternative path): ${result.audio.url}`);
      const audioResponse = await fetch(result.audio.url);
      if (!audioResponse.ok) {
        const errorBody = await audioResponse.text();
        console.error('Fal.ai Kokoro: Failed to fetch audio from URL (alternative path):', audioResponse.status, errorBody);
        throw new Error(`Fal.ai Kokoro: Failed to fetch audio from URL ${result.audio.url}. Status: ${audioResponse.status}`);
      }
      const audioArrayBuffer = await audioResponse.arrayBuffer();
      return audioArrayBuffer;
    }
     else {
      let responseDetails = "No details available";
      try {
        responseDetails = JSON.stringify(result, null, 2);
        if (responseDetails === '{}' || responseDetails === 'null') { // Check for empty or null stringification
            responseDetails += ` | Keys: ${Object.keys(result).join(', ')}`;
        }
      } catch (e) {
        responseDetails = `Could not stringify result. Keys: ${Object.keys(result).join(', ')}`;
      }
      console.error(`Fal.ai Kokoro: Unexpected response structure. Audio URL not found. Full response details: ${responseDetails}`, result);
      throw new Error('Fal.ai Kokoro: Audio URL not found in the response.');
    }

  } catch (error) {
    console.error('Error calling Fal.ai Kokoro API:', error);
    throw error; // Re-throw
  }
}

export const falAiService: TTSService = {
  synthesizeSpeech,
  getVoiceId,
}; 