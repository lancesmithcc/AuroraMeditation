import type { IntentionAnalysisParameters, VoiceProfile } from './deepseekApi'; // Adjust path as needed

export const N8N_WEBHOOK_URL = 'https://lancesmithcc.app.n8n.cloud/webhook/a1f817bc-7b37-4626-9328-b111aada64a4';
// export const N8N_WEBHOOK_URL = 'https://lancesmithcc.app.n8n.cloud/webhook-test/a1f817bc-7b37-4626-9328-b111aada64a4';

export async function sendToWebhook(
  intention: string, 
  rawVoiceAudioBuffer: ArrayBuffer, 
  theme: string, 
  voiceProfile: VoiceProfile,
  analysisParams: IntentionAnalysisParameters | null,
  audioContext: AudioContext | OfflineAudioContext | null, // Can be OfflineAudioContext too
  renderFullMixFunction: (rawMeditationArrayBuffer: ArrayBuffer, mainAudioContextSampleRate: number, currentAnalysisParams: IntentionAnalysisParameters | null) => Promise<AudioBuffer | null>,
  audioBufferToMp3Function: (audioBuffer: AudioBuffer, onProgress?: (progress: number) => void) => Promise<Blob>
) {
  if (!N8N_WEBHOOK_URL) {
    console.warn("Webhook URL is not configured. Skipping webhook send.");
    return;
  }
  if (!analysisParams || !audioContext) {
    console.warn("Analysis parameters or audio context not available for webhook. Sending voice only.");
    const audioBlob = new Blob([rawVoiceAudioBuffer], { type: 'audio/mpeg' });
    const formData = new FormData();
    formData.append('intention', intention);
    formData.append('theme', theme);
    formData.append('voiceProfile', voiceProfile);
    formData.append('audioFile', audioBlob, `meditation-voiceonly-${theme.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase()}-${Date.now()}.mp3`);
    
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Webhook Error (voice only fallback):', response.status, errorBody);
        } else {
            console.log('Successfully sent voice-only data to webhook (fallback).');
        }
    } catch (error) {
        console.error('Error sending voice-only data to webhook (fallback):', error);
    }
    return;
  }

  try {
    console.log("Webhook: Attempting to render full audio mix...");
    const fullMixAudioBuffer = await renderFullMixFunction(
      rawVoiceAudioBuffer,
      audioContext.sampleRate,
      analysisParams
    );

    if (!fullMixAudioBuffer) {
      console.error("Webhook: Failed to render full audio mix. Sending voice only as fallback.");
      const audioBlob = new Blob([rawVoiceAudioBuffer], { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('intention', intention);
      formData.append('theme', theme);
      formData.append('voiceProfile', voiceProfile);
      formData.append('audioFile', audioBlob, `meditation-voiceonly-renderfail-${theme.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase()}-${Date.now()}.mp3`);
      const response = await fetch(N8N_WEBHOOK_URL, { method: 'POST', body: formData });
      if (!response.ok) console.error('Webhook Error (voice only fallback after render fail):', response.status, await response.text());
      else console.log('Successfully sent voice-only data to webhook (render fail fallback).');
      return;
    }
    
    console.log("Webhook: Full audio mix rendered. Encoding to MP3...");
    const mp3Blob = await audioBufferToMp3Function(fullMixAudioBuffer);

    if (mp3Blob.size === 0) {
        console.error("Webhook: MP3 blob size is 0. Sending voice only as fallback.");
        const audioBlob = new Blob([rawVoiceAudioBuffer], { type: 'audio/mpeg' });
        const formData = new FormData();
        formData.append('intention', intention);
        formData.append('theme', theme);
        formData.append('voiceProfile', voiceProfile);
        formData.append('audioFile', audioBlob, `meditation-voiceonly-emptyblob-${theme.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase()}-${Date.now()}.mp3`);
        const response = await fetch(N8N_WEBHOOK_URL, { method: 'POST', body: formData });
        if (!response.ok) console.error('Webhook Error (voice only fallback after empty blob):', response.status, await response.text());
        else console.log('Successfully sent voice-only data to webhook (empty blob fallback).');
        return;
    }

    console.log("Webhook: MP3 encoded. Preparing FormData...");
    const formData = new FormData();
    formData.append('intention', intention); 
    formData.append('theme', theme); 
    formData.append('voiceProfile', voiceProfile);
    formData.append('audioFile', mp3Blob, `meditation-fullmix-${theme.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase()}-${Date.now()}.mp3`);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Webhook Error:', response.status, errorBody);
    } else {
      console.log('Successfully sent data to webhook.');
    }
  } catch (error) {
    console.error('Error sending data to webhook:', error);
  }
} 