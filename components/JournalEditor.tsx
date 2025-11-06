
import React, { useState, useRef, useCallback } from 'react';
import { generatePrompt, getAuraAI } from '../services/geminiService';
import { JournalEntry, Mood, GeneratedPrompt, ConversationHistoryItem } from '../types';
import { moodStyles } from '../data/emotionsData';
import LoadingSpinner from './LoadingSpinner';
import TextToSpeechButton from './TextToSpeechButton';
import EmotionWheel from './EmotionWheel';
import { SparklesIcon, MicIcon, StopIcon } from './Icons';
import { LiveSession, LiveServerMessage, Blob, Modality } from '@google/genai';

// Helper function for audio encoding
const encode = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

interface JournalEditorProps {
  saveEntry: (content: string, mood: Mood, detailedMood?: string, type?: 'text' | 'conversation') => void;
  pastEntries: JournalEntry[];
  conversationHistory: ConversationHistoryItem[];
}

const JournalEditor: React.FC<JournalEditorProps> = ({ saveEntry, pastEntries, conversationHistory }) => {
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [detailedMood, setDetailedMood] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isEmotionWheelOpen, setIsEmotionWheelOpen] = useState(false);
  
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const cleanupRecording = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
  }, []);

  const startRecording = async () => {
    if (isRecording) return;
    setIsRecording(true);
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const ai = getAuraAI();

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: { 
                inputAudioTranscription: {},
                responseModalities: [Modality.AUDIO] 
            },
            callbacks: {
                onopen: () => {
                    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    audioContextRef.current = inputAudioContext;
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioEvent) => {
                        const inputData = audioEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                },
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const newText = message.serverContent.inputTranscription.text;
                        setContent(prev => prev + newText);
                    }
                },
                onerror: (e) => console.error('Transcription error:', e),
                onclose: () => cleanupRecording(),
            }
        });
    } catch (err) {
        console.error("Failed to start recording:", err);
        setIsRecording(false);
    }
  };

  const stopRecording = () => {
    cleanupRecording();
    setIsRecording(false);
  };


  const handleSave = () => {
    if (content.trim() && selectedMood) {
      saveEntry(content, selectedMood, detailedMood ?? undefined);
      setContent('');
      setSelectedMood(null);
      setDetailedMood(null);
      setGeneratedPrompt(null);
    }
  };

  const fetchPrompt = async () => {
    setIsLoadingPrompt(true);
    setGeneratedPrompt(null);
    try {
      const moodPayload = selectedMood ? { core: selectedMood, detailed: detailedMood || undefined } : undefined;
      const promptData = await generatePrompt(pastEntries, conversationHistory, moodPayload);
      setGeneratedPrompt(promptData);
    } catch (error) {
      console.error("Failed to fetch prompt", error);
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleSelectEmotion = (core: Mood, detailed: string) => {
    setSelectedMood(core);
    setDetailedMood(detailed);
    setIsEmotionWheelOpen(false);
  };

  const selectedMoodStyle = selectedMood ? moodStyles[selectedMood] : null;
  const emotionButtonClasses = selectedMoodStyle
    ? `${selectedMoodStyle.selected} w-full justify-center`
    : `${moodStyles.Bad.base} w-full justify-center opacity-70`;


  return (
    <>
      <EmotionWheel 
        isOpen={isEmotionWheelOpen}
        onClose={() => setIsEmotionWheelOpen(false)}
        onSelect={handleSelectEmotion}
      />
      <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg lg:h-full">
        <h2 className="text-2xl font-bold text-white mb-4">New Entry</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">How are you feeling today?</label>
          <button
            onClick={() => setIsEmotionWheelOpen(true)}
            className={`flex items-center px-4 py-3 text-base rounded-lg border-2 font-medium transition-colors duration-200 ${emotionButtonClasses}`}
          >
            {selectedMoodStyle?.emoji} 
            <span className="ml-2">{detailedMood || 'Select how you feel'}</span>
          </button>
        </div>

        {generatedPrompt && (
          <div className="mb-4 p-4 bg-slate-900/70 border-l-4 border-cyan-500 rounded-r-lg flex justify-between items-center animate-fade-in">
            <p className="text-slate-300 italic">{generatedPrompt.prompt}</p>
            <TextToSpeechButton textToSpeak={generatedPrompt.prompt} />
          </div>
        )}

        <textarea
          className="flex-grow w-full bg-slate-900/70 border-2 border-slate-700 rounded-lg p-4 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200 resize-none"
          placeholder="What's on your mind? Or, use the mic to speak your entry."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
          <div className="w-full sm:w-auto">
              <button
                onClick={fetchPrompt}
                disabled={isLoadingPrompt || isRecording}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-slate-700 text-cyan-300 rounded-lg hover:bg-slate-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingPrompt ? (
                  <LoadingSpinner className="w-5 h-5 mr-2" />
                ) : (
                  <SparklesIcon className="w-5 h-5 mr-2" />
                )}
                Get a Prompt
              </button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors duration-200 flex-1 sm:flex-none sm:w-28 ${isRecording ? 'bg-red-500/80 hover:bg-red-500' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
                {isRecording ? (
                    <>
                        <StopIcon className="w-5 h-5 mr-2 text-white" />
                        <span className="text-white">Stop</span>
                    </>
                ) : (
                    <>
                        <MicIcon className="w-5 h-5 mr-2 text-cyan-300" />
                        <span className="text-cyan-300">Record</span>
                    </>
                )}
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || !selectedMood || isRecording}
              className="px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
            >
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default JournalEditor;