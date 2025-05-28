import lamejs from 'lamejs';
import type { IntentionAnalysisParameters } from '../lib/deepseekApi'; // Adjust path as needed

// --- Voice Processing Constants ---
export const VOICE_PLAYBACK_RATE = 0.85;
export const VOICE_EQ_SETTINGS = { type: 'highshelf' as BiquadFilterType, frequency: 3500, gain: 2.5 };
export const VOICE_COMPRESSOR_SETTINGS = { threshold: -20, knee: 25, ratio: 6, attack: 0.005, release: 0.150 };
export const VOICE_GAIN_VALUE = 2.5;
export const VOICE_DRY_GAIN_VALUE = 1.0;
export const VOICE_REVERB_IMPULSE_DURATION = 1.5;
export const VOICE_REVERB_IMPULSE_DECAY = 2.0;
export const VOICE_REVERB_GAIN_VALUE = 0.35;
export const BINAURAL_VOLUME = 0.18;
// --- End Voice Processing Constants ---

export function createReverbImpulseResponse(audioContext: AudioContext | OfflineAudioContext, duration: number = VOICE_REVERB_IMPULSE_DURATION, decay: number = VOICE_REVERB_IMPULSE_DECAY): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioContext.createBuffer(2, length, sampleRate); 

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

// --- MP3 Encoding Utility ---
export async function audioBufferToMp3(audioBuffer: AudioBuffer, onProgress?: (progress: number) => void): Promise<Blob> {
  if (!lamejs || !lamejs.Mp3Encoder) {
    throw new Error("MP3 Encoder (lamejs) is not loaded. Please ensure it is properly installed and imported.");
  }

  const mp3encoder = new lamejs.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, 128); // 128kbps
  const samplesLeft = audioBuffer.getChannelData(0); // Float32Array
  let samplesRight: Float32Array | null = null;
  if (audioBuffer.numberOfChannels === 2) {
    samplesRight = audioBuffer.getChannelData(1); // Float32Array
  }

  const sampleBlockSize = 1152; // Standard block size for MP3 encoding
  const mp3Data: Int8Array[] = [];

  const floatTo16BitPCM = (input: Float32Array): Int16Array => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  };

  const samplesLeft16 = floatTo16BitPCM(samplesLeft);
  const samplesRight16 = samplesRight ? floatTo16BitPCM(samplesRight) : null;

  let currentPosition = 0;
  const totalSamples = samplesLeft16.length;

  while (currentPosition < totalSamples) {
    const leftChunk = samplesLeft16.subarray(currentPosition, currentPosition + sampleBlockSize);
    let rightChunk: Int16Array | null = null;
    if (samplesRight16) {
      rightChunk = samplesRight16.subarray(currentPosition, currentPosition + sampleBlockSize);
    }

    let mp3buf: Int8Array;
    if (audioBuffer.numberOfChannels === 1 && leftChunk) {
        mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else if (audioBuffer.numberOfChannels === 2 && leftChunk && rightChunk) {
        mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
        break; // Should not happen if channels are 1 or 2
    }
    
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    currentPosition += sampleBlockSize;
    if (onProgress) {
      onProgress(Math.min(1, currentPosition / totalSamples));
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data, { type: 'audio/mpeg' });
}
// --- End MP3 Encoding Utility ---


// --- Full Audio Mix Rendering Function ---
export async function renderFullAudioMix(
  rawMeditationArrayBuffer: ArrayBuffer,
  mainAudioContextSampleRate: number,
  currentAnalysisParams: IntentionAnalysisParameters | null
): Promise<AudioBuffer | null> {
  if (!currentAnalysisParams) {
    console.error("Cannot render audio mix: analysisParams are missing.");
    return null;
  }
  
  try {
    const tempCtx = new AudioContext({ sampleRate: mainAudioContextSampleRate });
    const decodedVoice = await tempCtx.decodeAudioData(rawMeditationArrayBuffer.slice(0));
    await tempCtx.close();

    const targetDuration = decodedVoice.duration / VOICE_PLAYBACK_RATE;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(mainAudioContextSampleRate * targetDuration), mainAudioContextSampleRate);

    const voiceSource = offlineCtx.createBufferSource();
    voiceSource.buffer = decodedVoice;
    voiceSource.playbackRate.value = VOICE_PLAYBACK_RATE;

    const eqNode = offlineCtx.createBiquadFilter();
    eqNode.type = VOICE_EQ_SETTINGS.type;
    eqNode.frequency.setValueAtTime(VOICE_EQ_SETTINGS.frequency, 0);
    eqNode.gain.setValueAtTime(VOICE_EQ_SETTINGS.gain, 0);

    const compressorNode = offlineCtx.createDynamicsCompressor();
    compressorNode.threshold.setValueAtTime(VOICE_COMPRESSOR_SETTINGS.threshold, 0);
    compressorNode.knee.setValueAtTime(VOICE_COMPRESSOR_SETTINGS.knee, 0);
    compressorNode.ratio.setValueAtTime(VOICE_COMPRESSOR_SETTINGS.ratio, 0);
    compressorNode.attack.setValueAtTime(VOICE_COMPRESSOR_SETTINGS.attack, 0);
    compressorNode.release.setValueAtTime(VOICE_COMPRESSOR_SETTINGS.release, 0);

    const voiceGainNode = offlineCtx.createGain();
    voiceGainNode.gain.value = VOICE_GAIN_VALUE;

    const dryGainNode = offlineCtx.createGain();
    dryGainNode.gain.value = VOICE_DRY_GAIN_VALUE;

    const reverbNode = offlineCtx.createConvolver();
    try {
      reverbNode.buffer = createReverbImpulseResponse(offlineCtx);
    } catch (e) {
      console.error("Failed to create reverb for offline render:", e);
    }

    const reverbGainNode = offlineCtx.createGain();
    reverbGainNode.gain.value = VOICE_REVERB_GAIN_VALUE;

    voiceSource.connect(eqNode).connect(compressorNode).connect(voiceGainNode);
    voiceGainNode.connect(dryGainNode).connect(offlineCtx.destination);
    if (reverbNode.buffer) {
      voiceGainNode.connect(reverbNode).connect(reverbGainNode).connect(offlineCtx.destination);
    }

    if (currentAnalysisParams.binauralBeatFrequency > 0) {
      const baseFreq = currentAnalysisParams.acutonicsFrequency;
      const beatFreq = currentAnalysisParams.binauralBeatFrequency;
      const leftFrequency = baseFreq - beatFreq / 2;
      const rightFrequency = baseFreq + beatFreq / 2;

      const masterGainBinaural = offlineCtx.createGain();
      masterGainBinaural.gain.value = BINAURAL_VOLUME;
      masterGainBinaural.connect(offlineCtx.destination);

      const leftOscillator = offlineCtx.createOscillator();
      leftOscillator.type = 'sine';
      leftOscillator.frequency.setValueAtTime(leftFrequency, 0);
      const leftPanner = offlineCtx.createStereoPanner();
      leftPanner.pan.setValueAtTime(-1, 0);
      leftOscillator.connect(leftPanner).connect(masterGainBinaural);
      leftOscillator.start(0);

      const rightOscillator = offlineCtx.createOscillator();
      rightOscillator.type = 'sine';
      rightOscillator.frequency.setValueAtTime(rightFrequency, 0);
      const rightPanner = offlineCtx.createStereoPanner();
      rightPanner.pan.setValueAtTime(1, 0);
      rightOscillator.connect(rightPanner).connect(masterGainBinaural);
      rightOscillator.start(0);
    }

    if (currentAnalysisParams.ambientNoiseType !== 'none') {
      const noiseBufferSize = 2 * offlineCtx.sampleRate; 
      const noiseBufferOffline = offlineCtx.createBuffer(1, noiseBufferSize, offlineCtx.sampleRate);
      const output = noiseBufferOffline.getChannelData(0);
      for (let i = 0; i < noiseBufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = offlineCtx.createBufferSource();
      noiseSource.buffer = noiseBufferOffline;
      noiseSource.loop = true;

      let filterType: BiquadFilterType = 'lowpass';
      let filterFreq = 20000;
      let noiseVolume = 0.03;
      if (currentAnalysisParams.ambientNoiseType === 'pink') { filterType = 'lowshelf'; filterFreq = 800; }
      else if (currentAnalysisParams.ambientNoiseType === 'brown') { filterType = 'lowpass'; filterFreq = 500; }
      if (filterFreq > 800) {
        const reductionFactor = Math.min(0.02, (filterFreq - 800) / 20000 * 0.02);
        noiseVolume = Math.max(0.01, noiseVolume - reductionFactor);
      }

      const noiseGain = offlineCtx.createGain();
      noiseGain.gain.value = noiseVolume;

      const noiseFilter = offlineCtx.createBiquadFilter();
      noiseFilter.type = filterType;
      noiseFilter.frequency.setValueAtTime(filterFreq, 0);
      noiseFilter.Q.setValueAtTime(1, 0);

      noiseSource.connect(noiseGain).connect(noiseFilter).connect(offlineCtx.destination);
      noiseSource.start(0);
    }

    voiceSource.start(0);
    return await offlineCtx.startRendering();

  } catch (error) {
    console.error("Error rendering full audio mix:", error);
    return null;
  }
}
// --- End Full Audio Mix Rendering Function --- 