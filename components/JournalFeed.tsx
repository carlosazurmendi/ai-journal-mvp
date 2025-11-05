import React from 'react';
import { JournalEntry, Mood } from '../types';
import TextToSpeechButton from './TextToSpeechButton';

interface JournalFeedProps {
  entries: JournalEntry[];
}

const moodStyles: Record<Mood, { bg: string; text: string; emoji: string }> = {
    Joy: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', emoji: '😊' },
    Sadness: { bg: 'bg-blue-500/20', text: 'text-blue-300', emoji: '😢' },
    Anger: { bg: 'bg-red-500/20', text: 'text-red-300', emoji: '😠' },
    Fear: { bg: 'bg-purple-500/20', text: 'text-purple-300', emoji: '😨' },
    Calm: { bg: 'bg-green-500/20', text: 'text-green-300', emoji: '😌' },
};

const JournalFeed: React.FC<JournalFeedProps> = ({ entries }) => {
  return (
    <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg flex-grow lg:h-full min-h-0 overflow-hidden">
      <h2 className="text-2xl font-bold text-white mb-4 shrink-0">My Journal</h2>
      <div className="flex-grow overflow-y-auto pr-2">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">Your journal entries will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => {
              const style = moodStyles[entry.mood] || moodStyles.Calm;
              return (
                <div key={entry.id} className="bg-slate-900/70 rounded-lg p-4 border-l-4 border-cyan-500/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-sm font-semibold text-cyan-400">{entry.date}</p>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                            {style.emoji} {entry.mood}
                        </span>
                    </div>
                    <TextToSpeechButton textToSpeak={entry.content} />
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap mt-2">{entry.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalFeed;