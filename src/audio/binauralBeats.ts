export class BinauralBeatPlayer {
  private audioContext: AudioContext;
  private leftOscillator: OscillatorNode | null = null;
  private rightOscillator: OscillatorNode | null = null;
  private leftPanner: StereoPannerNode | null = null;
  private rightPanner: StereoPannerNode | null = null;
  private masterGain: GainNode | null = null;
  public isPlaying: boolean = false;
  private targetVolume: number = 0.5; // Default, will be set by setup

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  public setup(baseFrequency: number, beatFrequency: number, volume: number): void {
    // Stop and disconnect any existing oscillators immediately (no fade for setup changes)
    if (this.isPlaying && this.masterGain) { // If playing, do a quick fade out before re-setup
      const currentTime = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, currentTime + 0.1); // Quick 0.1s fade
    }

    // Clear previous nodes after a small delay to allow fade out if it happened
    setTimeout(() => {
      if (this.leftOscillator) {
        try { this.leftOscillator.stop(0); } catch(e) {/* Already stopped */}
        this.leftOscillator.disconnect();
        this.leftOscillator = null;
      }
      if (this.rightOscillator) {
        try { this.rightOscillator.stop(0); } catch(e) {/* Already stopped */}
        this.rightOscillator.disconnect();
        this.rightOscillator = null;
      }
      if (this.leftPanner) { this.leftPanner.disconnect(); this.leftPanner = null; }
      if (this.rightPanner) { this.rightPanner.disconnect(); this.rightPanner = null; }
      if (this.masterGain) { this.masterGain.disconnect(); this.masterGain = null; }
      this.isPlaying = false; // Reset playing state

      // Proceed with new setup
      this.performSetup(baseFrequency, beatFrequency, volume);
    }, this.isPlaying ? 150 : 0); // Delay if was playing, otherwise immediate
  }

  private performSetup(baseFrequency: number, beatFrequency: number, volume: number): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(console.error);
    }

    this.targetVolume = Math.max(0, Math.min(1, volume)); // Clamp volume

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime); // Start at 0 for potential fade-in
    this.masterGain.connect(this.audioContext.destination);

    const leftFrequency = baseFrequency - beatFrequency / 2;
    const rightFrequency = baseFrequency + beatFrequency / 2;

    this.leftOscillator = this.audioContext.createOscillator();
    this.leftOscillator.type = 'sine';
    this.leftOscillator.frequency.setValueAtTime(leftFrequency, this.audioContext.currentTime);
    this.leftPanner = this.audioContext.createStereoPanner();
    this.leftPanner.pan.setValueAtTime(-1, this.audioContext.currentTime);
    this.leftOscillator.connect(this.leftPanner);
    this.leftPanner.connect(this.masterGain);

    this.rightOscillator = this.audioContext.createOscillator();
    this.rightOscillator.type = 'sine';
    this.rightOscillator.frequency.setValueAtTime(rightFrequency, this.audioContext.currentTime);
    this.rightPanner = this.audioContext.createStereoPanner();
    this.rightPanner.pan.setValueAtTime(1, this.audioContext.currentTime);
    this.rightOscillator.connect(this.rightPanner);
    this.rightPanner.connect(this.masterGain);
  }


  public play(fadeInDuration: number = 2): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isPlaying && this.masterGain && this.masterGain.gain.value > 0.0001) {
        resolve(); // Already playing or fading in
        return;
      }
      if (!this.masterGain || !this.leftOscillator || !this.rightOscillator) {
        console.error("Binaural beats not properly set up. Call setup() first.");
        reject(new Error("Player not set up. Call setup() to initialize."));
        return;
      }

      this.isPlaying = true;
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(console.error);
      }

      const currentTime = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime); // Start from current value (should be near 0)
      this.masterGain.gain.linearRampToValueAtTime(this.targetVolume, currentTime + fadeInDuration);

      try {
        this.leftOscillator.start(0);
        this.rightOscillator.start(0);
      } catch (e) {
        // If oscillators were already started, this is fine as long as they were stopped and new ones created by setup.
        // This catch is a safeguard.
      }
      
      setTimeout(() => {
        resolve();
      }, fadeInDuration * 1000);
    });
  }

  public stop(fadeOutDuration: number = 2): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isPlaying || !this.masterGain) {
        this.isPlaying = false;
        resolve();
        return;
      }

      const currentTime = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, currentTime + fadeOutDuration);

      const L_OSC = this.leftOscillator;
      const R_OSC = this.rightOscillator;
      const L_PANNER = this.leftPanner;
      const R_PANNER = this.rightPanner;
      const M_GAIN = this.masterGain;

      this.isPlaying = false; 

      // Nullify instance properties after fade and stop
      // This ensures that setup() is needed to play again.
      this.leftOscillator = null;
      this.rightOscillator = null;
      this.leftPanner = null;
      this.rightPanner = null;
      this.masterGain = null;

      setTimeout(() => {
        if (L_OSC) {
          try { L_OSC.stop(0); } catch (e) { /* NOP */ }
          L_OSC.disconnect();
        }
        if (R_OSC) {
          try { R_OSC.stop(0); } catch (e) { /* NOP */ }
          R_OSC.disconnect();
        }
        if (L_PANNER) L_PANNER.disconnect();
        if (R_PANNER) R_PANNER.disconnect();
        if (M_GAIN) M_GAIN.disconnect();
        resolve();
      }, fadeOutDuration * 1000 + 100); // Buffer for ramp and stop
    });
  }

  public setVolume(volume: number): void {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    if (this.isPlaying && this.masterGain) {
      // If playing, ramp to new volume. Otherwise, it will be picked up on next play.
      const currentTime = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.targetVolume, currentTime + 0.5); // 0.5s ramp for volume change
    }
  }

  public updateFrequencies(baseFrequency: number, beatFrequency: number): void {
    // For frequency changes while playing, it's often better to fade out, setup, and fade in.
    // Or, for direct change:
    if (this.isPlaying && this.leftOscillator && this.rightOscillator) {
        const leftFrequency = baseFrequency - beatFrequency / 2;
        const rightFrequency = baseFrequency + beatFrequency / 2;
        const currentTime = this.audioContext.currentTime;
        this.leftOscillator.frequency.linearRampToValueAtTime(leftFrequency, currentTime + 0.1);
        this.rightOscillator.frequency.linearRampToValueAtTime(rightFrequency, currentTime + 0.1);
    } else if (this.leftOscillator && this.rightOscillator) { // Not playing, just set
        const leftFrequency = baseFrequency - beatFrequency / 2;
        const rightFrequency = baseFrequency + beatFrequency / 2;
        this.leftOscillator.frequency.setValueAtTime(leftFrequency, this.audioContext.currentTime);
        this.rightOscillator.frequency.setValueAtTime(rightFrequency, this.audioContext.currentTime);
    }
    // If not setup, these changes won't apply until setup is called.
  }
}
