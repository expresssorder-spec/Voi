import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// --- Base64 and Audio Utility Functions ---
// These are required for handling audio data with the Gemini Live API.

/**
 * Decodes a base64 string into a Uint8Array.
 */
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Encodes a Uint8Array into a base64 string.
 */
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Creates a Gemini API-compatible Blob from raw audio data (Float32Array).
 * This is used for sending audio input, like a silent chunk to trigger the model.
 */
function createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        // Convert float to 16-bit PCM
        int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

/**
 * Writes a string to a DataView.
 */
function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Converts raw PCM audio data to a WAV file Blob.
 * Gemini Live API returns 24kHz, 1-channel, 16-bit PCM audio.
 */
function pcmToWav(pcmData: Uint8Array): Blob {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcmData.length;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size for PCM
    view.setUint16(20, 1, true); // AudioFormat for PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    new Uint8Array(buffer, 44).set(pcmData);

    return new Blob([view], { type: 'audio/wav' });
}


export const generateAudioFromText = (text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!process.env.API_KEY || process.env.API_KEY === 'YOUR_GEMINI_API_KEY') {
            return reject(new Error("Please provide your Gemini API key in index.html."));
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let audioChunks: Uint8Array[] = [];

        const systemInstruction = `You are a text-to-speech engine. Your one and only task is to read the following text aloud with a clear, natural, and friendly voice. Do not add any commentary, greetings, or introductory phrases. Just read the text. The text is: "${text}"`;

        try {
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log("Session opened. Triggering model response.");
                        const silentAudioData = new Float32Array(160); // ~10ms of silence at 16kHz
                        const pcmBlob = createBlob(silentAudioData);
                        
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        }).catch(reject);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const decodedChunk = decode(base64Audio);
                            audioChunks.push(decodedChunk);
                        }

                        if (message.serverContent?.turnComplete) {
                            console.log("Model turn complete. Closing session.");
                            sessionPromise.then(session => session.close()).catch(console.error);
                        }
                    },
                    onclose: () => {
                        console.log("Session closed by server.");
                        if (audioChunks.length > 0) {
                            const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
                            const fullAudio = new Uint8Array(totalLength);
                            let offset = 0;
                            for (const chunk of audioChunks) {
                                fullAudio.set(chunk, offset);
                                offset += chunk.length;
                            }
                            const audioBlob = pcmToWav(fullAudio);
                            const audioUrl = URL.createObjectURL(audioBlob);
                            resolve(audioUrl);
                        } else {
                            reject(new Error("No audio data was received from the API."));
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Session error:", e);
                        reject(new Error(`A connection error occurred: ${e.message}`));
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO], // CORRECTED: Use the Modality enum
                    speechConfig: {
                        // Other voices: 'Puck', 'Charon', 'Kore', 'Fenrir'
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: systemInstruction,
                },
            });
            
            // This is critical to stop the app from crashing with a blank screen on connection errors.
            sessionPromise.catch(reject);

        } catch (error) {
            console.error("Failed to connect to Live API:", error);
            reject(error);
        }
    });
};
