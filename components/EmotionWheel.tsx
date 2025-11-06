import React, { useState, useMemo } from 'react';
import { Mood } from '../types';
import { emotionWheelData, EmotionNode, moodStyles } from '../data/emotionsData';

interface EmotionWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (coreMood: Mood, detailedMood: string) => void;
}

const EmotionWheel: React.FC<EmotionWheelProps> = ({ isOpen, onClose, onSelect }) => {
  const [path, setPath] = useState<EmotionNode[]>([]);
  const coreMood = useMemo(() => path[0]?.name as Mood | undefined, [path]);

  const handleSelect = (node: EmotionNode) => {
    if (node.children && node.children.length > 0) {
      setPath(prev => [...prev, node]);
    } else {
      // If path is empty, it's a top-level selection (like Neutral). Use its own name as the core mood.
      // Otherwise, use the first item in the path as the core mood.
      const selectedCoreMood = (path.length > 0 ? path[0].name : node.name) as Mood;
      onSelect(selectedCoreMood, node.name);
      setPath([]); // Reset path for next time
    }
  };

  const goBack = () => {
    setPath(prev => prev.slice(0, -1));
  };
  
  const handleClose = () => {
      setPath([]);
      onClose();
  }

  const currentNodes = useMemo(() => {
    if (path.length === 0) {
      return emotionWheelData;
    }
    const lastNode = path[path.length - 1];
    return lastNode.children || [];
  }, [path]);

  if (!isOpen) {
    return null;
  }

  const currentMoodStyle = coreMood ? moodStyles[coreMood] : null;

  return (
    <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
        onClick={handleClose}
    >
      <div 
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 m-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center space-x-2 text-slate-400">
            {path.length > 0 && (
              <button onClick={goBack} className="px-3 py-1 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors">&larr; Back</button>
            )}
            <div className="flex items-center text-sm">
                {path.map((p, i) => (
                    <React.Fragment key={i}>
                        <span>{p.name}</span>
                        {i < path.length - 1 && <span className="mx-2">&gt;</span>}
                    </React.Fragment>
                ))}
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">
            {path.length > 0 ? `Feeling ${path[path.length-1].name}...` : 'How are you feeling?'}
          </h2>
          <button onClick={handleClose} className="text-2xl text-slate-400 hover:text-white transition-colors">&times;</button>
        </div>

        <div className="overflow-y-auto flex-grow pr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {currentNodes.map(node => {
                    const style = path.length === 0 ? moodStyles[node.name as Mood] : currentMoodStyle;
                    if (!style) return null; // Should not happen
                    return (
                        <button
                            key={node.name}
                            onClick={() => handleSelect(node)}
                            className={`p-4 rounded-lg text-lg font-semibold border-2 transition-all duration-200 transform hover:scale-105 ${style.selected}`}
                        >
                            {path.length === 0 && 'emoji' in node && (node as any).emoji ? 
                                <span className="text-3xl block mb-2">{(node as any).emoji}</span> : null}
                            {node.name}
                        </button>
                    )
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionWheel;