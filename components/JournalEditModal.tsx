import React, { useState } from 'react';
import { JournalEntry, Mood } from '../types';
import EmotionWheel from './EmotionWheel';
import { moodStyles } from '../data/emotionsData';

interface JournalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, content: string, mood: Mood, detailedMood?: string) => void;
  entry: JournalEntry | null;
}

const JournalEditModal: React.FC<JournalEditModalProps> = ({ isOpen, onClose, onSave, entry }) => {
  const [content, setContent] = useState(entry?.content || '');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(entry?.mood || null);
  const [detailedMood, setDetailedMood] = useState<string | null>(entry?.detailedMood || null);
  const [isEmotionWheelOpen, setIsEmotionWheelOpen] = useState(false);

  React.useEffect(() => {
    if (entry) {
      setContent(entry.content);
      setSelectedMood(entry.mood);
      setDetailedMood(entry.detailedMood || null);
    }
  }, [entry]);

  if (!isOpen || !entry) {
    return null;
  }

  const handleSelectEmotion = (core: Mood, detailed: string) => {
    setSelectedMood(core);
    setDetailedMood(detailed);
    setIsEmotionWheelOpen(false);
  };

  const handleSave = () => {
    if (content.trim() && selectedMood) {
      onSave(entry.id, content, selectedMood, detailedMood || undefined);
      onClose();
    }
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
      <div
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-40 animate-fade-in"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        <div
          className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl m-4 p-6 border border-slate-700 flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-white mb-4">Edit Journal Entry</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">How were you feeling?</label>
            <button
              onClick={() => setIsEmotionWheelOpen(true)}
              className={`flex items-center px-4 py-3 text-base rounded-lg border-2 font-medium transition-colors duration-200 ${emotionButtonClasses}`}
            >
              {selectedMoodStyle?.emoji} 
              <span className="ml-2">{detailedMood || 'Select how you feel'}</span>
            </button>
          </div>

          <textarea
            className="flex-grow w-full bg-slate-900/70 border-2 border-slate-700 rounded-lg p-4 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200 resize-none mb-6"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-slate-200 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || !selectedMood}
              className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200 disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default JournalEditModal;