
import React from 'react';
import { JournalEntry } from '../types';
import { moodStyles } from '../data/emotionsData';
import TextToSpeechButton from './TextToSpeechButton';
import { ChatBubbleIcon, MicIcon, TrashIcon, EditIcon } from './Icons';

interface JournalFeedProps {
  entries: JournalEntry[];
  onChatAbout: (entry: JournalEntry) => void;
  onTalkAbout: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: JournalEntry) => void;
}

const JournalFeed: React.FC<JournalFeedProps> = ({ entries, onChatAbout, onTalkAbout, onDelete, onEdit }) => {
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
              const style = moodStyles[entry.mood];
              return (
                <div key={entry.id} className="bg-slate-900/70 rounded-lg p-4 border-l-4 border-cyan-500/50 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-sm font-semibold text-cyan-400">{entry.date}</p>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${style.feed} ${style.text}`}>
                                {style.emoji}
                                <span className="ml-1.5">{entry.detailedMood || entry.mood}</span>
                            </span>
                            {entry.type === 'conversation' && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">
                                    <MicIcon className="w-3 h-3" />
                                    From Conversation
                                </span>
                            )}
                        </div>
                    </div>
                    <TextToSpeechButton textToSpeak={entry.content} />
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap mt-2 flex-grow">{entry.content}</p>
                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onEdit(entry)}
                        className="flex items-center p-2 text-xs text-slate-400 rounded-md hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
                        aria-label="Edit entry"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(entry.id)}
                        className="flex items-center p-2 text-xs text-slate-400 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        aria-label="Delete entry"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <div className="flex-grow" />
                      <button 
                        onClick={() => onChatAbout(entry)}
                        className="flex items-center px-3 py-1.5 text-xs bg-slate-700 text-slate-300 rounded-md hover:bg-slate-600 hover:text-white transition-colors"
                      >
                        <ChatBubbleIcon className="w-4 h-4 mr-1.5" />
                        Chat About It
                      </button>
                      <button 
                        onClick={() => onTalkAbout(entry)}
                        className="flex items-center px-3 py-1.5 text-xs bg-slate-700 text-cyan-300 rounded-md hover:bg-slate-600 hover:text-white transition-colors"
                      >
                        <MicIcon className="w-4 h-4 mr-1.5" />
                        Talk About It
                      </button>
                  </div>
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