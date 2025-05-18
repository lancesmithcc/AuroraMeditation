import type { VoiceProfile } from './deepseekApi'; // Import VoiceProfile type
import type { TTSService } from './ttsServiceInterface';

const ELEVENLABS_API_URL_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';

// Define a mapping from our abstract voice profiles to specific ElevenLabs Voice IDs
// You can find voice IDs in your ElevenLabs voice lab or use pre-made ones.
// Pre-made voices: https://elevenlabs.io/docs/api-reference/premade-voices
const voiceProfileToIdMap: Record<VoiceProfile, string> = {
  'calm_female_gentle': 'pjcYQlDFKMbcOUp6F5GD', // Britney (calm, soothing)
  'soothing_male_deep': 'AeRdCCKzvd23BpJoofzx', // cool british guy (deep, soothing)
  'clear_female_neutral': 'Qggl4b0xRMiqOwhPtVWT', // my calm gal
  'warm_male_reassuring': 'IsEXLHzSvLH9UMB6SLHj', // mellow matt
  // 'uplifting_female_bright': 'jsCqWAovK2LkecY7zXl4', // Mimi (can be energetic) - currently commented out
  'default': 'pjcYQlDFKMbcOUp6F5GD' // Britney
};

function getVoiceId(profile?: VoiceProfile): string {
  return voiceProfileToIdMap[profile || 'default'] || voiceProfileToIdMap['default'];
}

async function synthesizeSpeech(
  text: string,
  voice: VoiceProfile | string // Changed to accept VoiceProfile or string
): Promise<ArrayBuffer | null> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error("ElevenLabs API key is not configured.");
    throw new Error("ElevenLabs API key is missing. Please check your .env file (ensure it's VITE_ELEVENLABS_API_KEY).");
  }

  // Remove asterisks from the text
  const cleanedText = text.replace(/\*/g, '');

  // Resolve voice profile to ID if a profile name is given
  let resolvedVoiceId: string;
  if (typeof voice === 'string' && voiceProfileToIdMap[voice as VoiceProfile]) {
    resolvedVoiceId = getVoiceId(voice as VoiceProfile);
  } else if (typeof voice === 'string') {
    resolvedVoiceId = voice; // Assume it's a direct voice ID
  } else {
    resolvedVoiceId = getVoiceId(voice); // It's a VoiceProfile enum/type
  }

  const apiUrl = `${ELEVENLABS_API_URL_BASE}/${resolvedVoiceId}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: cleanedText,
        model_id: 'eleven_turbo_v2.5', // Switched from eleven_multilingual_v2 for better economy
        voice_settings: {
          stability: 0.55, // Slightly more stability for consistent tone
          similarity_boost: 0.70, // Keep similarity reasonable
          style: 0.3, // Lower style exaggeration for a more natural, less "performed" meditation voice
          use_speaker_boost: true 
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('ElevenLabs API Error:', response.status, errorBody);
      throw new Error(`ElevenLabs API request failed with status ${response.status}: ${errorBody}`);
    }

    const audioArrayBuffer = await response.arrayBuffer();
    return audioArrayBuffer;

  } catch (error) {
    console.error('Error calling ElevenLabs API:', error);
    // Return null as per interface, or re-throw if preferred by design
    // For now, let's re-throw to make failures explicit to the caller
    throw error; 
  }
}

export const elevenLabsService: TTSService = {
  synthesizeSpeech,
  getVoiceId,
};
