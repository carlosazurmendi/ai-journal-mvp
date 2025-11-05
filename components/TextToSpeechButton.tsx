import React, { useState, useCallback } from 'react';
import { generateSpeech } from '../services/geminiService';
import { VolumeUpIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

interface TextToSpeechButtonProps {
  textToSpeak: string;
  className?: string;
}

// Helper to decode base64 string to Uint8Array
const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Helper to decode raw PCM audio data into an AudioBuffer
const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    // FIX: Corrected typo from dataInt116 to dataInt16
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

const TextToSpeechButton: React.FC<TextToSpeechButtonProps> = ({ textToSpeak, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(async () => {
    if (!textToSpeak || isLoading || isPlaying) return;
    
    setIsLoading(true);
    try {
      const audioBase64 = await generateSpeech(textToSpeak);
      if (audioBase64) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedAudio = decode(audioBase64);
        const audioBuffer = await decodeAudioData(decodedAudio, audioContext, 24000, 1);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        source.onended = () => {
          setIsPlaying(false);
          audioContext.close();
        };

        setIsPlaying(true);
        source.start();
      }
    } catch (error) {
      console.error("Failed to play audio", error);
    } finally {
      setIsLoading(false);
    }
  }, [textToSpeak, isLoading, isPlaying]);

  const buttonStateClasses = isLoading || isPlaying
    ? 'text-cyan-400 cursor-not-allowed'
    : 'text-slate-400 hover:text-cyan-300';

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading || isPlaying}
      className={`transition-colors duration-200 ${buttonStateClasses} ${className}`}
      aria-label="Read text aloud"
    >
      {isLoading ? (
        <LoadingSpinner className="w-5 h-5" />
      ) : (
        <VolumeUpIcon className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
      )}
    </button>
  );
};

export default TextToSpeechButton;