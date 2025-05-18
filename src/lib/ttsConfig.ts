export type TTSProvider = 'elevenlabs' | 'fal';

export interface TTSConfig {
  activeProvider: TTSProvider;
  
}

const ttsConfig: TTSConfig = {
  activeProvider: 'fal', // Default to elevenlabs, can be changed to 'fal'
};

export default ttsConfig; 