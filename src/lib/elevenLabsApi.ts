import type { VoiceProfile } from './deepseekApi'; // Import VoiceProfile type

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

export function getVoiceIdFromProfile(profile?: VoiceProfile): string {
  // return 'pjcYQlDFKMbcOUp6F5GD'; // Britney (pre-made) - FOR TESTING
  return voiceProfileToIdMap[profile || 'default'] || voiceProfileToIdMap['default'];
}

export async function synthesizeSpeech(
  text: string, 
  voiceId: string // Expecting a resolved voice ID now
): Promise<ArrayBuffer | null> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error("ElevenLabs API key is not configured.");
    throw new Error("ElevenLabs API key is missing. Please check your .env file (ensure it's VITE_ELEVENLABS_API_KEY).");
  }

  const apiUrl = `${ELEVENLABS_API_URL_BASE}/${voiceId}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
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
    throw error; // Re-throw to be caught by the caller
  }
}
