import React, { useState, useCallback, ChangeEvent } from 'react';
import { generateAudioFromText } from './services/geminiService.ts';

// --- Icon Components ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-8 h-8"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-8 h-8"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const SpeakerWaveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
  </svg>
);

// --- UI Components ---

const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-lg ${className}`}>
        {children}
    </div>
);

const App: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [voiceAnalyzed, setVoiceAnalyzed] = useState(false);
    const [textToSpeak, setTextToSpeak] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setError(null);
            setAudioUrl(null);
            setVoiceAnalyzed(false);
            setVideoFile(file);
            setIsAnalyzing(true);
            // Simulate voice analysis
            setTimeout(() => {
                setIsAnalyzing(false);
                setVoiceAnalyzed(true);
            }, 2500);
        }
    };

    const handleGenerateAudio = useCallback(async () => {
        if (!textToSpeak.trim() || isGenerating) return;

        setIsGenerating(true);
        setError(null);
        setAudioUrl(null);

        try {
            const url = await generateAudioFromText(textToSpeak);
            setAudioUrl(url);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error("Audio generation failed:", errorMessage);
            setError(`Error generating audio: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    }, [textToSpeak, isGenerating]);
    
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 selection:bg-teal-400/20">
            <div className="w-full max-w-2xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-300 to-purple-400 text-transparent bg-clip-text">
                        Voice Clone Studio
                    </h1>
                    <p className="text-gray-400 mt-3 max-w-md mx-auto">
                       Welcome to the Voice Clone Studio. Upload a video to analyze the voice, then write text to generate speech in the same tone.
                    </p>
                </header>

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
                       <span className="font-medium">{error}</span>
                       <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-200">
                           <XCircleIcon className="w-6 h-6" />
                       </button>
                    </div>
                )}
                
                <main className="space-y-6">
                    {/* Step 1: Upload Video */}
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Step 1: Upload & Analyze Voice</h2>
                                <p className="text-gray-400 mt-1">Upload a video (mp4, mov) to extract a voice sample.</p>
                            </div>
                            <div className="ml-4">
                                <input
                                    type="file"
                                    id="video-upload"
                                    className="hidden"
                                    accept="video/*"
                                    onChange={handleFileChange}
                                    disabled={isAnalyzing}
                                />
                                <label
                                    htmlFor="video-upload"
                                    className={`cursor-pointer group relative flex items-center justify-center px-6 py-3 rounded-full transition-all duration-300 w-48 text-center ${
                                        voiceAnalyzed
                                            ? 'bg-green-500/20 border border-green-400 text-green-300'
                                            : 'bg-teal-500 hover:bg-teal-600 text-white'
                                    } ${isAnalyzing ? 'bg-gray-600 cursor-not-allowed' : ''}`}
                                >
                                    {isAnalyzing ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Spinner />
                                            <span>Analyzing...</span>
                                        </div>
                                    ) : voiceAnalyzed ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <CheckCircleIcon className="w-6 h-6" />
                                            <span>Voice Analyzed</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <UploadIcon className="w-6 h-6" />
                                            <span>Upload Video</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                        {videoFile && (
                            <div className="mt-4 text-sm text-gray-400 border-t border-gray-700 pt-4">
                                <p>
                                    <span className="font-medium text-gray-300">File:</span> {videoFile.name}
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* Step 2: Generate Speech */}
                    <Card className={!voiceAnalyzed ? 'opacity-50 pointer-events-none' : ''}>
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Step 2: Generate Speech</h2>
                                <p className="text-gray-400 mt-1">Write the text you want to generate with the analyzed voice.</p>
                            </div>
                            <textarea
                                value={textToSpeak}
                                onChange={(e) => setTextToSpeak(e.target.value)}
                                placeholder="Enter your text here..."
                                className="w-full h-32 p-3 bg-gray-900/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors placeholder-gray-500"
                                disabled={!voiceAnalyzed || isGenerating}
                                aria-label="Text to generate speech from"
                            />
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button
                                    onClick={handleGenerateAudio}
                                    disabled={!voiceAnalyzed || isGenerating || !textToSpeak.trim()}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Spinner />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SpeakerWaveIcon />
                                            <span>Generate Audio</span>
                                        </>
                                    )}
                                </button>
                                {audioUrl && (
                                    <audio controls src={audioUrl} className="w-full sm:w-auto rounded-full bg-gray-700/50">
                                        Your browser does not support the audio element.
                                    </audio>
                                )}
                            </div>
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
};

export default App;