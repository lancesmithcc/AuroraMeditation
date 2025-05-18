import ttsConfig from './ttsConfig';
import { elevenLabsService } from './elevenLabsApi';
import { falAiService } from './falApi';
import type { TTSService } from './ttsServiceInterface';

let activeTtsService: TTSService;

if (ttsConfig.activeProvider === 'elevenlabs') {
  activeTtsService = elevenLabsService;
} else if (ttsConfig.activeProvider === 'fal') {
  activeTtsService = falAiService;
} else {
  // Default or throw error if configuration is invalid
  console.warn(`Invalid TTS provider configured: ${ttsConfig.activeProvider}. Defaulting to ElevenLabs.`);
  activeTtsService = elevenLabsService; 
}

export default activeTtsService; 