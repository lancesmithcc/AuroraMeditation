import './App.css'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Brain, Send, Headphones, Waves, Zap, Loader2, Mic, UserCircle, Sparkles, Download } from "lucide-react"
import { useState, useRef, useEffect } from 'react'
import { BinauralBeatPlayer } from './audio/binauralBeats'
import { WhiteNoisePlayer } from './audio/whiteNoise'
import { analyzeIntention, IntentionAnalysisParameters, generateMeditationScript, VoiceProfile } from './lib/deepseekApi'
import { synthesizeSpeech, getVoiceIdFromProfile } from './lib/elevenLabsApi'

const acutonicsFrequencyDetails: Record<number, { name: string; association: string; symbol: string }> = {
  136.10: { name: "Ohm", association: "Earth - Grounding & Stability", symbol: "♁" },
  210.42: { name: "New Moon", association: "Moon - Intuition & New Cycles", symbol: "☽" },
  126.22: { name: "Sun", association: "Sun - Vitality & Self-Expression", symbol: "☉" },
  141.27: { name: "Mercury", association: "Communication & Intellect", symbol: "☿" },
  221.23: { name: "Venus", association: "Love & Harmony", symbol: "♀" },
  144.72: { name: "Mars", association: "Action & Drive", symbol: "♂" },
  183.58: { name: "Jupiter", association: "Expansion & Abundance", symbol: "♃" },
  172.06: { name: "Saturn", association: "Structure & Discipline", symbol: "♄" },
  207.36: { name: "Uranus", association: "Innovation & Change", symbol: "♅" },
  211.44: { name: "Neptune", association: "Dreams & Spirituality", symbol: "♆" },
  140.25: { name: "Pluto", association: "Transformation & Rebirth", symbol: "♇" },
};

const getBinauralState = (freq: number): { state: string; emoji: string } => {
  if (freq < 4) return { state: "Delta - Deep Sleep, Healing", emoji: "😴" };
  if (freq < 8) return { state: "Theta - Deep Relaxation, Meditation, Creativity", emoji: "🧘" };
  if (freq < 14) return { state: "Alpha - Relaxed Focus, Calm Alertness", emoji: "✨" };
  if (freq < 30) return { state: "Beta - Active Thinking, Focus", emoji: "🤔" };
  return { state: "Gamma - Peak Awareness, Insight", emoji: "🚀" };
};

function createReverbImpulseResponse(audioContext: AudioContext, duration: number = 1.5, decay: number = 2.0): AudioBuffer {
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

const AUDIO_CACHE_NAME = 'auramind-audio-cache-v1';

function App() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  const binauralPlayerRef = useRef<BinauralBeatPlayer | null>(null);
  const [isBinauralPlaying, setIsBinauralPlaying] = useState<boolean>(false);

  const whiteNoisePlayerRef = useRef<WhiteNoisePlayer | null>(null);
  const [isWhiteNoisePlaying, setIsWhiteNoisePlaying] = useState<boolean>(false);

  const loadingAudioRef = useRef<HTMLAudioElement | null>(null);

  const meditationAudioNodesRef = useRef<{
    source: AudioBufferSourceNode;
    eqNode: BiquadFilterNode;
    compressorNode: DynamicsCompressorNode;
    voiceGain: GainNode;
    dryGain: GainNode;
    reverb: ConvolverNode;
    reverbGain: GainNode;
  } | null>(null);

  const [isMeditationPlaying, setIsMeditationPlaying] = useState<boolean>(false);
  const [currentMeditationAudio, setCurrentMeditationAudio] = useState<{ buffer: ArrayBuffer; script: string; voiceProfile: VoiceProfile, theme: string } | null>(null);


  const [intentionInput, setIntentionInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<{ type: 'user' | 'system' | 'error', text: string, data?: any, voiceProfile?: VoiceProfile }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContext) {
      const ctx = new window.AudioContext();
      setAudioContext(ctx);
      binauralPlayerRef.current = new BinauralBeatPlayer(ctx);
      whiteNoisePlayerRef.current = new WhiteNoisePlayer(ctx);
    }
    
    // Initialize loading audio
    if (typeof window !== 'undefined') {
      const audio = new Audio('/sounds/loadingsong.mp3');
      audio.loop = true;
      loadingAudioRef.current = audio;

      // Cleanup when component unmounts
      return () => {
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
        loadingAudioRef.current = null; // Clean up ref
      };
    }

    return () => {
      if (meditationAudioNodesRef.current) {
        try {
          meditationAudioNodesRef.current.source.stop();
          meditationAudioNodesRef.current.source.disconnect();
          meditationAudioNodesRef.current.eqNode.disconnect();
          meditationAudioNodesRef.current.compressorNode.disconnect();
          meditationAudioNodesRef.current.voiceGain.disconnect();
          meditationAudioNodesRef.current.dryGain.disconnect();
          meditationAudioNodesRef.current.reverb.disconnect();
          meditationAudioNodesRef.current.reverbGain.disconnect();
        } catch(e) { console.warn("Error cleaning up meditation audio nodes on unmount:", e); }
        meditationAudioNodesRef.current = null;
      }
      if (audioContext && audioContext.state !== 'closed') {
        if (binauralPlayerRef.current?.isPlaying) binauralPlayerRef.current.stop(0.1);
        if (whiteNoisePlayerRef.current?.isPlaying) whiteNoisePlayerRef.current.stop(0.1);
        audioContext.close().catch(console.error);
      }
    };
  }, []);

  // Effect to play/pause loading sound based on isAnalyzing state
  useEffect(() => {
    if (loadingAudioRef.current) { // Check if audio element is initialized
      if (isAnalyzing) {
        loadingAudioRef.current.currentTime = 0; // Reset before playing
        loadingAudioRef.current.play().catch(e => console.error("Error playing loading song:", e));
      } else {
        if (!loadingAudioRef.current.paused) {
          loadingAudioRef.current.pause();
          loadingAudioRef.current.currentTime = 0;
        }
      }
    }
  }, [isAnalyzing]); // Dependency: isAnalyzing

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const stopAllAudio = (fadeDuration = 0.5) => {
    if (binauralPlayerRef.current?.isPlaying) {
      binauralPlayerRef.current.stop(fadeDuration)
        .then(() => setIsBinauralPlaying(false))
        .catch(console.error);
       setIsBinauralPlaying(false);
    }
    if (whiteNoisePlayerRef.current?.isPlaying) {
      whiteNoisePlayerRef.current.stop(fadeDuration)
        .then(() => setIsWhiteNoisePlaying(false))
        .catch(console.error);
      setIsWhiteNoisePlaying(false);
    }
    if (meditationAudioNodesRef.current) {
      try {
        meditationAudioNodesRef.current.source.stop();
      } catch (e) { /* NOP */ }
      setIsMeditationPlaying(false);
    }
  };

  const ensureAudioContext = () => {
    let localAudioContext = audioContext;
    if (!localAudioContext || localAudioContext.state === 'closed') {
        if (typeof window !== 'undefined') {
            localAudioContext = new window.AudioContext();
            setAudioContext(localAudioContext);
        } else {
            console.error("Cannot create AudioContext outside of a browser environment.");
            setChatMessages(prev => [...prev, {type: 'error', text: "AudioContext creation failed."}]);
            return null;
        }
    }

    if (!binauralPlayerRef.current && localAudioContext) {
        binauralPlayerRef.current = new BinauralBeatPlayer(localAudioContext);
    }
    if (!whiteNoisePlayerRef.current && localAudioContext) {
        whiteNoisePlayerRef.current = new WhiteNoisePlayer(localAudioContext);
    }
  
    if (!localAudioContext || !binauralPlayerRef.current || !whiteNoisePlayerRef.current) {
      console.error("Audio components not fully initialized.");
      setChatMessages(prev => [...prev, {type: 'error', text: "Audio components could not be initialized. Please refresh."}]);
      return null;
    }

    if (localAudioContext.state === 'suspended') {
      localAudioContext.resume().catch(err => {
        console.error("Error resuming audio context:", err);
        setChatMessages(prev => [...prev, {type: 'error', text: "Could not resume audio. Please interact with the page and try again."}]);
      });
    }
    return localAudioContext;
  }

  const handleIntentionSubmit = async () => {
    if (!intentionInput.trim() || isAnalyzing) return;
    
    const currentAudioContext = ensureAudioContext();
    if (!currentAudioContext) {
        setChatMessages(prev => [...prev, {type: 'system', text: "Audio system could not be initialized. Please interact with the page or refresh and try again."}]);
        return;
    }
     if (currentAudioContext.state === 'suspended') {
        await currentAudioContext.resume().catch(console.error);
        if (currentAudioContext.state === 'suspended') {
             setChatMessages(prev => [...prev, {type: 'system', text: "Audio system needs activation. Please click anywhere on the page or try submitting again."}]);
            return; 
        }
    }

    const userMessage = { type: 'user' as 'user', text: intentionInput };
    setChatMessages(prev => [...prev, userMessage]);
    const currentIntention = intentionInput;
    setIntentionInput("");
    setIsAnalyzing(true);
    setCurrentMeditationAudio(null); 
    
    stopAllAudio(0.2);

    setChatMessages(prev => [...prev, {type: 'system', text: "Thinking... analyzing your intention."}]);
    
    try {
      const analysisParams: IntentionAnalysisParameters | null = await analyzeIntention(currentIntention);
      
      if (!analysisParams) {
        setChatMessages(prev => [...prev, {type: 'error', text: "Sorry, I couldn't analyze your intention. Please try rephrasing."}]);
        setIsAnalyzing(false);
        return;
      }

      const voiceProfileToDisplay = (analysisParams.suggestedVoiceProfile || 'default')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      setChatMessages(prev => {
        const newMessages = [...prev];
        const thinkingMsgIndex = newMessages.findIndex(msg => msg.text.startsWith("Thinking..."));
        if (thinkingMsgIndex !== -1) newMessages.splice(thinkingMsgIndex, 1);
        return [...newMessages, {
          type: 'system', 
          text: `Analysis complete! Goal: ${analysisParams.primaryGoal}. Voice: ${voiceProfileToDisplay}. Preparing audio...`,
          data: analysisParams,
          voiceProfile: analysisParams.suggestedVoiceProfile
        }];
      });
      console.log("Intention Analysis Parameters:", analysisParams);

      let audioDescription = "Playing audio: ";
      const acutoDetails = acutonicsFrequencyDetails[analysisParams.acutonicsFrequency];
      const binauralInfo = getBinauralState(analysisParams.binauralBeatFrequency);
      let willPlayBinaural = false;
      let willPlayNoise = false;

      if (binauralPlayerRef.current && analysisParams.binauralBeatFrequency > 0) {
        const baseFreq = analysisParams.acutonicsFrequency;
        const beatFreq = analysisParams.binauralBeatFrequency;
        binauralPlayerRef.current.setup(baseFreq, beatFreq, 0.18);
        willPlayBinaural = true;
        const acutoText = acutoDetails ? `${acutoDetails.symbol} ${acutoDetails.association}` : 'Custom';
        audioDescription += `Binaural Beats (Base: ${baseFreq.toFixed(2)}Hz - ${acutoText}, Beat: ${beatFreq}Hz - ${binauralInfo.emoji} ${binauralInfo.state}). `;
      }

      if (whiteNoisePlayerRef.current && analysisParams.ambientNoiseType !== 'none') {
        let filterType: BiquadFilterType = 'lowpass';
        let filterFreq = 20000;
        
        // Set filter based on noise type
        if (analysisParams.ambientNoiseType === 'pink') { filterType = 'lowshelf'; filterFreq = 800; }
        else if (analysisParams.ambientNoiseType === 'brown') { filterType = 'lowpass'; filterFreq = 500; }
        
        // Adjust volume based on frequency
        // Higher frequencies should be quieter to avoid distraction
        // Base volume very low for subtlety
        let noiseVolume = 0.03;
        
        // For higher frequencies (meaning less filtering), reduce the volume even further
        // The higher the filter frequency, the more high frequencies are preserved
        if (filterFreq > 800) {
          // Progressively reduce volume as filter frequency increases
          // Subtract up to 0.02 from already low base volume
          const reductionFactor = Math.min(0.02, (filterFreq - 800) / 20000 * 0.02);
          noiseVolume = Math.max(0.01, noiseVolume - reductionFactor);
        }
        
        whiteNoisePlayerRef.current.setup(noiseVolume, filterType, filterFreq, 1);
        willPlayNoise = true;
        audioDescription += `Ambient Noise: ${analysisParams.ambientNoiseType}.`;
      }
      
      if (willPlayBinaural || willPlayNoise) {
           setChatMessages(prev => [...prev, { type: 'system', text: audioDescription.trim() }]);
      }

      if (analysisParams.meditationTheme) {
        setChatMessages(prev => [...prev, {type: 'system', text: `Generating meditation script for theme: "${analysisParams.meditationTheme}"...`}]);
        const script = await generateMeditationScript(analysisParams.meditationTheme, currentIntention);

        if (script) {
          let audioArrayBuffer: ArrayBuffer | null = null;
          const cacheKey = `meditation-${analysisParams.suggestedVoiceProfile}-${script}`;
          
          try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
              setChatMessages(prev => [...prev, {type: 'system', text: `Retrieved meditation audio from cache.`}]);
              audioArrayBuffer = await cachedResponse.arrayBuffer();
            }
          } catch (cacheError) {
            console.warn("Cache API not available or error accessing cache:", cacheError);
            setChatMessages(prev => [...prev, {type: 'system', text: `Cache access failed, proceeding with synthesis.`}]);
          }

          if (!audioArrayBuffer) {
            setChatMessages(prev => [...prev, {type: 'system', text: `Script generated. Synthesizing audio with ${voiceProfileToDisplay} voice...`}]);
            const voiceIdToUse = getVoiceIdFromProfile(analysisParams.suggestedVoiceProfile);
            audioArrayBuffer = await synthesizeSpeech(script, voiceIdToUse);
            
            if (audioArrayBuffer) {
              try {
                const cache = await caches.open(AUDIO_CACHE_NAME);
                await cache.put(cacheKey, new Response(audioArrayBuffer.slice(0), { headers: { 'Content-Type': 'audio/mpeg' } }));
                setChatMessages(prev => [...prev, {type: 'system', text: `Audio synthesized and cached.`}]);
              } catch (cacheError) {
                 console.warn("Failed to cache audio:", cacheError);
                 setChatMessages(prev => [...prev, {type: 'system', text: `Audio synthesized but failed to cache.`}]);
              }
            }
          }
          
          if (audioArrayBuffer && currentAudioContext) {
            setCurrentMeditationAudio({ 
              buffer: audioArrayBuffer.slice(0), 
              script, 
              voiceProfile: analysisParams.suggestedVoiceProfile,
              theme: analysisParams.meditationTheme 
            });

            const decodedAudio = await currentAudioContext.decodeAudioData(audioArrayBuffer.slice(0)); 
            
            if (meditationAudioNodesRef.current) {
                try {
                    meditationAudioNodesRef.current.source.stop();
                    meditationAudioNodesRef.current.source.disconnect();
                    meditationAudioNodesRef.current.eqNode.disconnect();
                    meditationAudioNodesRef.current.compressorNode.disconnect();
                    meditationAudioNodesRef.current.voiceGain.disconnect();
                    meditationAudioNodesRef.current.dryGain.disconnect();
                    meditationAudioNodesRef.current.reverb.disconnect();
                    meditationAudioNodesRef.current.reverbGain.disconnect();
                } catch(e) { console.warn("Error cleaning up old meditation audio nodes:", e); }
                meditationAudioNodesRef.current = null;
            }

            const newSource = currentAudioContext.createBufferSource();
            newSource.buffer = decodedAudio;
            newSource.playbackRate.value = 0.85; 

            const eqNode = currentAudioContext.createBiquadFilter();
            eqNode.type = 'highshelf';
            eqNode.frequency.setValueAtTime(3500, currentAudioContext.currentTime);
            eqNode.gain.setValueAtTime(2.5, currentAudioContext.currentTime); 

            const compressorNode = currentAudioContext.createDynamicsCompressor();
            compressorNode.threshold.setValueAtTime(-20, currentAudioContext.currentTime);
            compressorNode.knee.setValueAtTime(25, currentAudioContext.currentTime);
            compressorNode.ratio.setValueAtTime(6, currentAudioContext.currentTime);
            compressorNode.attack.setValueAtTime(0.005, currentAudioContext.currentTime);
            compressorNode.release.setValueAtTime(0.150, currentAudioContext.currentTime);

            const voiceGainNode = currentAudioContext.createGain();
            voiceGainNode.gain.value = 2.5;

            const dryGainNode = currentAudioContext.createGain();
            dryGainNode.gain.value = 1.0;

            const reverbNode = currentAudioContext.createConvolver();
            try {
              reverbNode.buffer = createReverbImpulseResponse(currentAudioContext, 1.5, 2.0);
            } catch (e) {
              console.error("Failed to create or set reverb impulse response:", e);
              setChatMessages(prev => [...prev, {type: 'error', text: "Failed to create reverb effect."}]);
            }

            const reverbGainNode = currentAudioContext.createGain();
            reverbGainNode.gain.value = 0.35;

            newSource.connect(eqNode);
            eqNode.connect(compressorNode);
            compressorNode.connect(voiceGainNode);
            
            voiceGainNode.connect(dryGainNode);
            dryGainNode.connect(currentAudioContext.destination);

            if (reverbNode.buffer) { 
                voiceGainNode.connect(reverbNode);
                reverbNode.connect(reverbGainNode);
                reverbGainNode.connect(currentAudioContext.destination);
            } else { // Connect directly if reverb failed
                voiceGainNode.connect(currentAudioContext.destination);
            }
            
            meditationAudioNodesRef.current = {
              source: newSource,
              eqNode,
              compressorNode,
              voiceGain: voiceGainNode,
              dryGain: dryGainNode,
              reverb: reverbNode.buffer ? reverbNode : currentAudioContext.createConvolver(), // Store even if buffer is null
              reverbGain: reverbGainNode,
            };
            
            const fadeDuration = 2;
            const playPromises = [];
            if (willPlayBinaural && binauralPlayerRef.current) {
              playPromises.push(binauralPlayerRef.current.play(fadeDuration).then(() => setIsBinauralPlaying(true)));
            }
            if (willPlayNoise && whiteNoisePlayerRef.current) {
              playPromises.push(whiteNoisePlayerRef.current.play(fadeDuration).then(() => setIsWhiteNoisePlaying(true)));
            }
            await Promise.all(playPromises).catch(console.error);

            newSource.start();
            setIsMeditationPlaying(true);
            setChatMessages(prev => [...prev, {type: 'system', text: "Guided meditation audio is now playing."}]);
            
            newSource.onended = () => {
              setIsMeditationPlaying(false);
              if (meditationAudioNodesRef.current && meditationAudioNodesRef.current.source === newSource) {
                try {
                  meditationAudioNodesRef.current.source.disconnect();
                  meditationAudioNodesRef.current.eqNode.disconnect();
                  meditationAudioNodesRef.current.compressorNode.disconnect();
                  meditationAudioNodesRef.current.voiceGain.disconnect();
                  meditationAudioNodesRef.current.dryGain.disconnect();
                  if (meditationAudioNodesRef.current.reverb.buffer) meditationAudioNodesRef.current.reverb.disconnect();
                  meditationAudioNodesRef.current.reverbGain.disconnect();
                } catch(e) { console.warn("Error disconnecting meditation audio nodes onended:", e); }
                meditationAudioNodesRef.current = null;
              }
              
              const stopPromises = [];
              if (willPlayBinaural && binauralPlayerRef.current?.isPlaying) { // Check isPlaying
                stopPromises.push(binauralPlayerRef.current.stop(fadeDuration) 
                  .then(() => setIsBinauralPlaying(false)));
              }
              if (willPlayNoise && whiteNoisePlayerRef.current?.isPlaying) { // Check isPlaying
                 stopPromises.push(whiteNoisePlayerRef.current.stop(fadeDuration)
                  .then(() => setIsWhiteNoisePlaying(false)));
              }
              Promise.all(stopPromises)
                .catch(console.error)
                .finally(() => { // Ensure state is updated even if promises reject
                    if (willPlayBinaural) setIsBinauralPlaying(false); 
                    if (willPlayNoise) setIsWhiteNoisePlaying(false);
                });
            };
          } else {
            setChatMessages(prev => [...prev, {type: 'error', text: "Failed to synthesize or decode meditation audio."}]);
            setCurrentMeditationAudio(null);
          }
        } else {
          setChatMessages(prev => [...prev, {type: 'error', text: "Failed to generate meditation script."}]);
          setCurrentMeditationAudio(null);
        }
      } else { 
        const fadeDuration = 1;
        const playPromises = [];
        if (willPlayBinaural && binauralPlayerRef.current && !isBinauralPlaying) {
            playPromises.push(binauralPlayerRef.current.play(fadeDuration).then(() => setIsBinauralPlaying(true)));
        }
        if (willPlayNoise && whiteNoisePlayerRef.current && !isWhiteNoisePlaying) {
            playPromises.push(whiteNoisePlayerRef.current.play(fadeDuration).then(() => setIsWhiteNoisePlaying(true)));
        }
        await Promise.all(playPromises).catch(console.error);
        setCurrentMeditationAudio(null); 
      }
      setIsAnalyzing(false);

    } catch (error) {
      setIsAnalyzing(false);
      setCurrentMeditationAudio(null);
      console.error("Error during intention processing:", error);
      setChatMessages(prev => [...prev, {type: 'error', text: `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}. Please check the console.`}]);
    }
  };

  const handleDownloadMeditation = () => {
    if (!currentMeditationAudio || !currentMeditationAudio.buffer || !(currentMeditationAudio.buffer instanceof ArrayBuffer) || currentMeditationAudio.buffer.byteLength === 0) {
      setChatMessages(prev => [...prev, {type: 'error', text: "No meditation audio available, buffer is invalid, or audio is empty."}]);
      console.error("Download failed: No audio buffer, buffer is not ArrayBuffer, or buffer is empty.", currentMeditationAudio);
      return;
    }

    try {
      console.log("Attempting download. Audio buffer byte length:", currentMeditationAudio.buffer.byteLength);
      const blob = new Blob([currentMeditationAudio.buffer], { type: 'audio/mpeg' });
      console.log("Blob created. Size:", blob.size, "Type:", blob.type);

      if (blob.size === 0) {
          setChatMessages(prev => [...prev, {type: 'error', text: "Cannot download empty audio file (blob size is 0)."}]);
          console.error("Download failed: Blob size is 0.");
          return;
      }

      const url = URL.createObjectURL(blob);
      console.log("Object URL created:", url);

      const a = document.createElement('a');
      document.body.appendChild(a); 
      a.style.display = 'none';
      a.href = url;
      
      const themeSanitized = (currentMeditationAudio.theme || "untitled").replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
      const voiceSanitized = (currentMeditationAudio.voiceProfile || "default").replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
      const dateString = new Date().toISOString().slice(0, 10);
      a.download = `AuraMind_Meditation_${themeSanitized}_${voiceSanitized}_${dateString}.mp3`;
      console.log("Download filename:", a.download);
      
      a.click();
      console.log("Download click triggered.");
      
      setChatMessages(prev => [...prev, {type: 'system', text: "Meditation audio download initiated. If the download doesn't start, try opening the app in a regular browser tab instead of a preview window."}]);

      setTimeout(() => {
        URL.revokeObjectURL(url);
        console.log("Object URL revoked.");
        if (a.parentNode) {
            a.remove();
            console.log("Anchor element removed.");
        }
      }, 150); 

    } catch (error) {
      console.error("Error preparing download:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error during download.";
      setChatMessages(prev => [...prev, {type: 'error', text: `Could not prepare audio for download: ${errorMessage}`}]);
    }
  };

  const getMessageIcon = (type: 'user' | 'system' | 'error', voiceProfile?: VoiceProfile) => {
    if (type === 'user') return <UserCircle className="w-5 h-5 mr-2 flex-shrink-0" />;
    if (type === 'system') {
        if (voiceProfile) {
            return <Sparkles className="w-5 h-5 mr-2 flex-shrink-0 text-[oklch(var(--aurora-accent-color))]" />;
        }
        return <Brain className="w-5 h-5 mr-2 flex-shrink-0 text-[oklch(var(--aurora-border-color))]" />;
    }
    return null; 
  };


  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-4 sm:p-6 md:p-8 selection:bg-[oklch(var(--aurora-border-color)/0.3)] selection:text-white relative isolate">
      {/* Indigo Spiral Background Layer - Container for pseudo-elements */}
      <div aria-hidden="true" className="fixed inset-0 -z-5 animate-slow-spin flex items-center justify-center">
        {/* This div will now act as the base for the pseudo-element spiral arms */}
        <div className="relative w-1 h-1" id="spiral-center"></div>
      </div>
      <header className="w-full max-w-2xl mb-8 text-center">
        <div className="flex justify-center mb-4">
          <img src="/icons/icon-base.svg" alt="Aurora Meditation Logo" width="333" className="mx-auto" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.7_0.2_250)] via-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.2_310)] py-2">
          Aurora Meditation Generator
        </h1>
        
      </header>

      <main className="w-full max-w-2xl flex-grow flex flex-col justify-center">
        <Card className="aurora-ui-element shadow-2xl flex flex-col">
          <CardHeader className="text-center shrink-0">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <Brain className="w-10 h-10" />
              <CardTitle className="text-3xl">What is your intention?</CardTitle>
            </div>
            
          </CardHeader>
          <CardContent ref={chatContainerRef} className="p-4 sm:p-6 flex-grow overflow-y-auto space-y-3 bg-[oklch(var(--aurora-element-bg)/0.3)] rounded-b-xl_minus_1_border_hack">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex items-start ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                
                <div className={`max-w-[80%] p-3 rounded-xl text-sm shadow ${
                  msg.type === 'user' 
                    ? 'bg-[oklch(var(--aurora-accent-color)/0.8)] text-white rounded-br-none border border-[oklch(var(--aurora-accent-color))]' 
                    : msg.type === 'system' 
                      ? 'bg-[oklch(var(--aurora-border-color)/0.2)] text-muted-foreground rounded-bl-none border border-[oklch(var(--aurora-border-color)/0.7)]'
                      : 'bg-red-500/20 text-red-300 rounded-bl-none border border-red-500/50'
                }`}>
                  {msg.text}
                  {isAnalyzing && msg.text.startsWith("Thinking...") && <Loader2 className="inline w-4 h-4 ml-2 animate-spin" />}
                  {isAnalyzing && msg.text.startsWith("Generating meditation script") && <Loader2 className="inline w-4 h-4 ml-2 animate-spin" />}
                  {isAnalyzing && msg.text.startsWith("Script generated. Synthesizing audio") && <Loader2 className="inline w-4 h-4 ml-2 animate-spin" />}
                </div>
                {msg.type === 'user' && <div className="ml-2 mt-1 flex-shrink-0">{getMessageIcon(msg.type)}</div>}
              </div>
            ))}
             {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground/70 pt-10">
                </div>
            )}
          </CardContent>
          <div className="p-4 sm:p-6 shrink-0">
            <div className="flex items-center space-x-3">
              <Input 
                id="intentionInput"
                type="text" 
                value={intentionInput}
                onChange={(e) => setIntentionInput(e.target.value)}
                placeholder="Type your intention here..."
                className="flex-grow mt-1 bg-transparent text-lg border-2 border-[oklch(var(--aurora-border-color)/0.7)] focus:border-[oklch(var(--aurora-border-color))] focus:ring-[oklch(var(--aurora-border-color))] h-12 px-4 rounded-2xl"
                onKeyPress={(e) => e.key === 'Enter' && handleIntentionSubmit()}
                disabled={isAnalyzing}
              />
              <Button 
                onClick={handleIntentionSubmit} 
                className="aurora-button h-12 w-12 p-0 flex-shrink-0"
                aria-label="Submit Intention"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </Button>
            </div>
            
          </div>
        </Card>
        
        { (isBinauralPlaying || isWhiteNoisePlaying || isMeditationPlaying || currentMeditationAudio) && (
            <Card className="aurora-ui-element mt-8">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-2xl flex items-center">
                        <Headphones className="w-6 h-6 mr-2" style={{color: "var(--aurora-border-color)"}}/>
                        Now Playing
                    </CardTitle>
                    {currentMeditationAudio && currentMeditationAudio.buffer && currentMeditationAudio.buffer.byteLength > 0 && ( 
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={handleDownloadMeditation}
                            className="aurora-button-outline"
                            aria-label="Download Meditation Audio"
                        >
                            <Download className="w-5 h-5" />
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-1">
                    {isBinauralPlaying && <p className="text-muted-foreground flex items-center"><Waves className="inline w-4 h-4 mr-2"/> Binaural beats active.</p>}
                    {isWhiteNoisePlaying && <p className="text-muted-foreground flex items-center"><Zap className="inline w-4 h-4 mr-2"/> Ambient noise active.</p>}
                    {isMeditationPlaying && <p className="text-muted-foreground flex items-center"><Mic className="inline w-4 h-4 mr-2"/> Guided meditation active.</p>}
                    {!isMeditationPlaying && currentMeditationAudio && <p className="text-muted-foreground flex items-center"><Mic className="inline w-4 h-4 mr-2 opacity-50"/> Meditation audio ready.</p>}
                </CardContent>
            </Card>
        )}
      </main>

      <footer className="w-full max-w-2xl mt-12 mb-6 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Aurora Meditation Generator. All rights reserved.
        </p>
        
      </footer>
    </div>
  )
}

export default App
