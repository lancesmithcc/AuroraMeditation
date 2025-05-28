import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendToWebhook } from '../lib/webhookUtils';
import { renderFullAudioMix, audioBufferToMp3, VOICE_PLAYBACK_RATE } from '../audio/audioProcessing';
import type { IntentionAnalysisParameters, VoiceProfile } from '../lib/deepseekApi';

// Function to generate a short silent audio buffer
const createSilentAudioArrayBuffer = (durationSeconds: number, sampleRate: number): ArrayBuffer => {
    const numChannels = 1;
    const numFrames = sampleRate * durationSeconds;
    const buffer = new ArrayBuffer(numFrames * numChannels * 2); // 16-bit PCM
    // No need to fill with silence, ArrayBuffer is zero-initialized
    return buffer;
};

// Function to decode a simple ArrayBuffer to AudioBuffer for rendering tests
const decodeMockAudioData = async (audioContext: OfflineAudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> => {
    // For a truly silent buffer, we might need a proper WAV header if decodeAudioData expects it.
    // However, for `renderFullAudioMix`, it primarily cares about the duration and sample rate derived from a DECODED voice.
    // Let's try creating a minimal AudioBuffer directly for the "voice" part.
    // The key is that `renderFullAudioMix` uses `decodedVoice.duration` and `offlineCtx.sampleRate`.
    const duration = arrayBuffer.byteLength / (audioContext.sampleRate * 1 * 2); // 1 channel, 16-bit
    const audioBufferDecoded = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    // No need to copy data if it's meant to be silent and `renderFullAudioMix` just needs its structure.
    return audioBufferDecoded;
};


export function WebhookTestPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string>("");
    const [offlineAudioContext, setOfflineAudioContext] = useState<OfflineAudioContext | null>(null);

    useEffect(() => {
        // Initialize a shared OfflineAudioContext for operations on this page
        // Standard sample rate, 2 channels for output, initial duration 1 sec (will be adjusted by renderFullAudioMix)
        if (typeof window !== 'undefined') {
            setOfflineAudioContext(new OfflineAudioContext(2, 44100 * 1, 44100));
        }
    }, []);

    const handleSendMockData = async () => {
        if (!offlineAudioContext) {
            setMessage("OfflineAudioContext not initialized. Cannot send mock data.");
            console.error("OfflineAudioContext not available for mock webhook.")
            return;
        }
        setIsLoading(true);
        setMessage("Preparing mock data...");

        const mockIntention = "This is a test intention for webhook automation.";
        const mockTheme = "Test Theme";
        const mockVoiceProfile: VoiceProfile = 'default';

        const mockAnalysisParams: IntentionAnalysisParameters = {
            primaryGoal: "Test Webhook",
            meditationTheme: mockTheme,
            suggestedVoiceProfile: mockVoiceProfile,
            binauralBeatFrequency: 7.83, // Example: Schumann Resonance
            acutonicsFrequency: 136.10, // Example: Ohm
            ambientNoiseType: 'pink',
        };

        try {
            // 1. Create a short, silent "voice" audio ArrayBuffer
            //    renderFullAudioMix expects a raw ArrayBuffer that it will decode itself.
            const mockVoiceArrayBuffer = createSilentAudioArrayBuffer(5, offlineAudioContext.sampleRate); // 5 seconds of silence
            setMessage("Mock voice audio created. Sending to webhook...");

            await sendToWebhook(
                mockIntention,
                mockVoiceArrayBuffer, // Pass the silent ArrayBuffer
                mockTheme,
                mockVoiceProfile,
                mockAnalysisParams,
                offlineAudioContext, // Pass the offline context
                renderFullAudioMix, 
                audioBufferToMp3
            );
            setMessage("Mock data sent to webhook successfully!");
        } catch (error) {
            console.error("Error sending mock data to webhook:", error);
            setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-900 text-white">
            <Card className="w-full max-w-md bg-gray-800 border-gray-700 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl text-center text-sky-400">Webhook Test Page</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-gray-300">
                        Click the button below to send mock data to the configured N8N webhook.
                        This will simulate a full audio mix generation without using API credits.
                    </p>
                    <Button 
                        onClick={handleSendMockData} 
                        disabled={isLoading || !offlineAudioContext}
                        className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white font-semibold py-3 rounded-lg transition-colors duration-150 ease-in-out"
                    >
                        {isLoading ? "Sending..." : "Send Mock Webhook Data"}
                    </Button>
                    {message && (
                        <p className={`text-center p-3 rounded-md ${message.startsWith("Error:") ? "bg-red-700/50 text-red-300" : "bg-green-700/50 text-green-300"}`}>
                            {message}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 