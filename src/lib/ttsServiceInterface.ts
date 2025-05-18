import type { VoiceProfile } from './deepseekApi'; // Assuming VoiceProfile is still relevant

export interface TTSService {
  /**
   * Synthesizes speech from text using a specified voice.
   * @param text The text to synthesize.
   * @param voice The voice profile or specific voice ID to use.
   * @returns A Promise resolving to an ArrayBuffer containing the audio data, or null if an error occurs.
   */
  synthesizeSpeech(text: string, voice: VoiceProfile | string): Promise<ArrayBuffer | null>;

  /**
   * Retrieves a provider-specific voice ID based on a generic voice profile.
   * @param profile The generic voice profile.
   * @returns The provider-specific voice ID string.
   */
  getVoiceId(profile?: VoiceProfile): string;
} 