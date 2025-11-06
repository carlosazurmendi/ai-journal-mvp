
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LiveServerMessage, Modality, Blob } from '@google/genai';
import { getAuraAI, summarizeConversationForJournal, getConversationalSystemInstruction } from '../services/geminiService';
import { Mood, JournalEntry, TranscriptEntry, ConversationHistoryItem } from '../types';
import { MicIcon, StopIcon, SaveIcon, ClockIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

// Helper functions for audio encoding/decoding
const encode = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

interface ConversationalViewProps {
    saveJournalEntry: (content: string, mood: Mood, detailedMood?: string, type?: 'text' | 'conversation') => void;
    contextualEntry?: JournalEntry | null;
    conversationHistory: ConversationHistoryItem[];
    saveConversationHistory: (transcript: TranscriptEntry[]) => void;
}

const ConversationalView: React.FC<ConversationalViewProps> = ({ saveJournalEntry, contextualEntry, conversationHistory, saveConversationHistory }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking' | 'connecting' | 'error'>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);


  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  
  // Use a ref to hold the toggleConversation function to avoid dependency issues in useEffect
  const toggleConversationRef = useRef<() => Promise<void>>();

  const handleEndConversation = (transcriptToSave: TranscriptEntry[]) => {
    if (transcriptToSave.length > 0) {
      saveConversationHistory(transcriptToSave);
    }
  };

  const cleanup = useCallback(() => {
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

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const handleSaveConversation = async () => {
    if (transcript.length === 0) return;
    setIsSaving(true);
    const fullTranscript = transcript.map(t => `${t.speaker === 'user' ? 'User' : 'Aura'}: ${t.text}`).join('\n');
    try {
        const result = await summarizeConversationForJournal(fullTranscript);
        if (result) {
            saveJournalEntry(result.content, result.mood, result.detailedMood, 'conversation');
            setTranscript([]); // Clear transcript after saving
        }
    } catch(e) {
        console.error("Failed to save conversation", e);
    } finally {
        setIsSaving(false);
    }
  };

  const toggleConversation = async () => {
    if (isSessionActive) {
      handleEndConversation(transcript);
      cleanup();
      setIsSessionActive(false);
      setStatus('idle');
      return;
    }

    setIsHistoryOpen(false);
    setStatus('connecting');
    setErrorMessage('');

    // Pre-populate transcript if there's a contextual entry
    if (contextualEntry) {
        const userMessage: TranscriptEntry = {
            id: `context-user-${Date.now()}`,
            speaker: 'user',
            text: contextualEntry.content
        };
        setTranscript([userMessage]);
    } else {
        setTranscript([]);
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const ai = getAuraAI();
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioContext;
      const systemInstruction = getConversationalSystemInstruction(contextualEntry);

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' }}},
            systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;

            // If there is a contextual entry, send a silent packet to kick off the conversation
            if (contextualEntry && sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                    // Create a short silent audio packet
                    const silentData = new Float32Array(1024).fill(0);
                    const l = silentData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) {
                        int16[i] = silentData[i] * 32768;
                    }
                    const pcmBlob: Blob = {
                        data: encode(new Uint8Array(int16.buffer)),
                        mimeType: 'audio/pcm;rate=16000',
                    };
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            }

            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
              };
              if(sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
            setStatus('listening');
          },
          onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.outputTranscription) {
                  currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              }
              if (message.serverContent?.inputTranscription) {
                  currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              }

              if (message.serverContent?.turnComplete) {
                  const userInput = currentInputTranscriptionRef.current.trim();
                  const auraResponse = currentOutputTranscriptionRef.current.trim();
                  setTranscript(prev => {
                      const newHistory: TranscriptEntry[] = [...prev];
                      if(userInput) {
                        newHistory.push({id: `user-${Date.now()}`, speaker: 'user', text: userInput});
                      }
                      if(auraResponse) {
                        newHistory.push({id: `aura-${Date.now()}`, speaker: 'aura', text: auraResponse});
                      }
                      return newHistory;
                  });
                  currentInputTranscriptionRef.current = '';
                  currentOutputTranscriptionRef.current = '';
                  setStatus('listening');
              }
              
              const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioData) {
                  setStatus('speaking');
                  const outCtx = outputAudioContextRef.current;
                  if (outCtx) {
                    const decodedAudio = decode(audioData);
                    const audioBuffer = await decodeAudioData(decodedAudio, outCtx, 24000, 1);
                    
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                    const source = outCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outCtx.destination);
                    
                    source.addEventListener('ended', () => {
                      audioSourcesRef.current.delete(source);
                      if (audioSourcesRef.current.size === 0) {
                        setStatus('listening');
                      }
                    });
                    
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    audioSourcesRef.current.add(source);
                  }
              }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setErrorMessage('A connection error occurred.');
            setStatus('error');
            cleanup();
            setIsSessionActive(false);
          },
          onclose: (e: CloseEvent) => {
            cleanup();
            setIsSessionActive(false);
            if(status !== 'idle') setStatus('idle');
          },
        }
      });

      await sessionPromiseRef.current;
      setIsSessionActive(true);

    } catch (err) {
        console.error("Failed to start conversation:", err);
        setErrorMessage('Could not access microphone. Please grant permission.');
        setStatus('error');
        cleanup();
    }
  };

  // Assign the function to the ref after it's defined.
  toggleConversationRef.current = toggleConversation;

  useEffect(() => {
    // Automatically start the conversation if a contextual entry is provided.
    if (contextualEntry && !isSessionActive && status === 'idle' && toggleConversationRef.current) {
      toggleConversationRef.current();
    }
  }, [contextualEntry, isSessionActive, status]);


  const viewHistoryEntry = (entry: ConversationHistoryItem) => {
    setTranscript(entry.transcript);
    setIsHistoryOpen(false);
  };
  
  const getStatusIndicator = () => {
    switch(status) {
        case 'connecting': return <span className="text-yellow-400">Connecting...</span>;
        case 'listening': return <span className="text-green-400">Listening...</span>;
        case 'speaking': return <span className="text-cyan-400">Aura is speaking...</span>;
        case 'error': return <span className="text-red-400">Error</span>;
        default: return <span className="text-slate-400">Idle</span>;
    }
  }

  // Safely format history dates to avoid "Invalid Date" when legacy items exist
  const formatHistoryDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString();
      }
      const numeric = Number(dateStr);
      if (!isNaN(numeric)) {
        return new Date(numeric).toLocaleString();
      }
    } catch (e) {
      // Fall through to fallback below
    }
    // Fallback to current time to keep UI stable
    return new Date().toLocaleString();
  };

  return (
    <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg h-full w-full">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white">Talk to Your Journal</h2>
        <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              disabled={isSessionActive}
              className="flex items-center px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ClockIcon className="w-5 h-5 mr-2" />
                History
            </button>
            <button
              onClick={handleSaveConversation}
              disabled={isSaving || transcript.length === 0 || isSessionActive}
              className="flex items-center px-4 py-2 bg-slate-700 text-cyan-300 rounded-lg hover:bg-slate-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? <LoadingSpinner className="w-5 h-5 mr-2" /> : <SaveIcon className="w-5 h-5 mr-2" />}
                Save as Journal Entry
            </button>
        </div>
      </div>
      <p className="text-slate-400 mb-4">Have a conversation with Aura. When you're done, the transcript will be saved to your history.</p>
      
      {contextualEntry && !isSessionActive && (
          <div className="mb-4 p-3 bg-slate-900/70 border-l-4 border-cyan-500 rounded-r-lg animate-fade-in">
              <p className="text-slate-300 font-semibold">Focusing on your entry from: <span className="text-cyan-400">{contextualEntry.date}</span></p>
              <p className="text-slate-400 italic mt-1 text-sm">"{contextualEntry.content.substring(0, 150)}{contextualEntry.content.length > 150 ? '...' : ''}"</p>
          </div>
      )}

      <div className="flex-grow bg-slate-900/70 rounded-lg overflow-hidden border border-slate-700 mb-4 flex">
        {isHistoryOpen ? (
            <div className="w-full p-4 overflow-y-auto">
                <h3 className="text-lg font-bold text-white mb-4">Conversation History</h3>
                {conversationHistory.length === 0 ? (
                    <p className="text-slate-500">No past conversations saved.</p>
                ) : (
                    <ul className="space-y-2">
                        {conversationHistory.map(entry => (
                            <li key={entry.id}>
                                <button 
                                    onClick={() => viewHistoryEntry(entry)}
                                    className="w-full text-left p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors duration-200"
                                >
                                    <p className="font-semibold text-cyan-400">{formatHistoryDate(entry.date)}</p>
                                    <p className="text-sm text-slate-400 truncate">{entry.transcript.map(t => t.text).join(' ')}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        ) : (
          <div className="w-full p-4 overflow-y-auto">
            {transcript.length === 0 ? (
              <p className="text-slate-500 h-full flex items-center justify-center">
                {status === 'idle' ? "Press the mic to start talking." : "Conversation will appear here."}
              </p>
            ) : (
              <div className="space-y-4">
                {transcript.map((entry) => (
                  <div key={entry.id} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xl px-4 py-2 rounded-lg ${entry.speaker === 'user' ? 'bg-cyan-800 text-white' : 'bg-slate-700 text-slate-200'}`}>
                      {entry.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6">
        <div className="text-center w-40">
            {getStatusIndicator()}
            {errorMessage && <p className="text-xs text-red-500 mt-1">{errorMessage}</p>}
        </div>
        <button
          onClick={toggleConversation}
          disabled={isHistoryOpen}
          className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
            isSessionActive ? 'bg-red-500/80 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500'
          }`}
        >
          {status === 'listening' && <div className="absolute w-full h-full rounded-full bg-green-500/30 animate-ping"></div>}
          {isSessionActive ? <StopIcon className="w-12 h-12 text-white" /> : <MicIcon className="w-12 h-12 text-white" />}
        </button>
         <div className="w-40" />
      </div>
    </div>
  );
};

export default ConversationalView;