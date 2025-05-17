export class WhiteNoisePlayer {
  private audioContext: AudioContext;
  private bufferSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  public isPlaying: boolean = false;
  private buffer: AudioBuffer | null = null;
  private targetVolume: number = 0.2; // Default, will be set by setup

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.createBuffer();
  }

  private createBuffer(): void {
    const bufferSize = 2 * this.audioContext.sampleRate; // 2 seconds of audio, loops
    this.buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = this.buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public setup(
    volume: number = 0.2, 
    filterType: BiquadFilterType = 'lowpass', 
    filterFrequency: number = 20000,
    filterQ: number = 1
  ): void {
    if (this.isPlaying && this.gainNode) { // If playing, quick fade out before re-setup
      const currentTime = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.0001, currentTime + 0.1);
    }
    
    // Clear previous nodes after a small delay to allow fade out if it happened
    setTimeout(() => {
      if (this.bufferSource) {
        try { this.bufferSource.stop(0); } catch(e) {/* Already stopped */}
        this.bufferSource.disconnect();
        this.bufferSource = null;
      }
      if (this.gainNode) { this.gainNode.disconnect(); this.gainNode = null; }
      if (this.filterNode) { this.filterNode.disconnect(); this.filterNode = null; }
      this.isPlaying = false;

      this.performSetup(volume, filterType, filterFrequency, filterQ);
    }, this.isPlaying ? 150 : 0);
  }

  private performSetup(
    volume: number, 
    filterType: BiquadFilterType, 
    filterFrequency: number, 
    filterQ: number
  ): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(console.error);
    }

    this.targetVolume = Math.max(0, Math.min(1, volume));

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime); // Start at 0 for fade-in

    this.filterNode = this.audioContext.createBiquadFilter();
    this.filterNode.type = filterType;
    this.filterNode.frequency.setValueAtTime(filterFrequency, this.audioContext.currentTime);
    this.filterNode.Q.setValueAtTime(filterQ, this.audioContext.currentTime);
    
    this.gainNode.connect(this.filterNode);
    this.filterNode.connect(this.audioContext.destination);
  }


  public play(fadeInDuration: number = 2): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isPlaying && this.gainNode && this.gainNode.gain.value > 0.0001) {
        resolve(); // Already playing or fading in
        return;
      }
      if (!this.gainNode || !this.filterNode || !this.buffer) {
        console.error("White noise not set up. Call setup() first.");
        reject(new Error("Player not set up. Call setup() to initialize."));
        return;
      }
      
      this.isPlaying = true;
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(console.error);
      }

      this.bufferSource = this.audioContext.createBufferSource();
      this.bufferSource.buffer = this.buffer;
      this.bufferSource.loop = true;
      this.bufferSource.connect(this.gainNode);
      
      try {
        this.bufferSource.start(0);
      } catch (e) {
        // If already started (e.g. due to rapid stop/start), this is okay.
      }

      const currentTime = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime); // Start from current (should be near 0)
      this.gainNode.gain.linearRampToValueAtTime(this.targetVolume, currentTime + fadeInDuration);
      
      setTimeout(() => {
        resolve();
      }, fadeInDuration * 1000);
    });
  }

  public stop(fadeOutDuration: number = 2): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isPlaying || !this.gainNode || !this.bufferSource) {
        this.isPlaying = false;
        resolve();
        return;
      }

      const currentTime = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.0001, currentTime + fadeOutDuration);

      const BS = this.bufferSource;
      // Keep gainNode and filterNode for potential re-play without full re-setup,
      // but nullify bufferSource as it cannot be restarted.
      this.bufferSource = null; 
      this.isPlaying = false;

      setTimeout(() => {
        if (BS) {
          try { BS.stop(0); } catch (e) { /* NOP */ }
          BS.disconnect();
        }
        resolve();
      }, fadeOutDuration * 1000 + 100); // Buffer for ramp and stop
    });
  }

  public setVolume(volume: number): void { // For immediate volume changes if needed, or to set target for next play
    this.targetVolume = Math.max(0, Math.min(1, volume));
    if (this.isPlaying && this.gainNode) {
      const currentTime = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(this.targetVolume, currentTime + 0.5); // 0.5s ramp
    }
  }

  public setFilter(type: BiquadFilterType, frequency: number, qValue: number): void {
    if (this.filterNode) {
      this.filterNode.type = type;
      this.filterNode.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      this.filterNode.Q.setValueAtTime(qValue, this.audioContext.currentTime);
    }
  }
}
