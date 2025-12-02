
import { Mood } from '../types';

export interface EmotionNode {
  name: string;
  emoji?: string;
  children?: EmotionNode[];
}

export interface EmotionCategory extends EmotionNode {
  color: string;
  children: EmotionNode[];
}

// Data transcribed from user-provided JSON
export const emotionData = {
  "Happy": {
    "Playful": ["Aroused", "Cheeky"], "Content": ["Free", "Joyful"], "Interested": ["Curious", "Inquisitive"], "Proud": ["Successful", "Confident"], "Accepted": ["Respected", "Valued"], "Powerful": ["Courageous", "Creative"], "Peaceful": ["Loving", "Thankful"], "Trusting": ["Sensitive", "Intimate"], "Optimistic": ["Hopeful", "Inspired"]
  },
  "Surprised": {
    "Startled": ["Shocked", "Dismayed"], "Confused": ["Disillusioned", "Perplexed"], "Amazed": ["Astonished", "Awe"], "Excited": ["Eager", "Energetic"]
  },
  "Bad": {
    "Bored": ["Indifferent", "Apathetic"], "Busy": ["Pressured", "Rushed"], "Stressed": ["Overwhelmed", "Out of Control"], "Tired": ["Unfocused", "Sleepy"]
  },
  "Fearful": {
    "Scared": ["Helpless", "Frightened"], "Anxious": ["Overwhelmed", "Worried"], "Insecure": ["Inadequate", "Inferior"], "Weak": ["Worthless", "Insignificant"], "Rejected": ["Excluded", "Persecuted"], "Threatened": ["Nervous", "Exposed"]
  },
  "Angry": {
    "Let down": ["Betrayed", "Resentful"], "Humiliated": ["Disrespected", "Ridiculed"], "Bitter": ["Indignant", "Violated"], "Mad": ["Furious", "Jealous"], "Aggressive": ["Provoked", "Hostile"], "Frustrated": ["Infuriated", "Annoyed"], "Distant": ["Withdrawn", "Numb"], "Critical": ["Skeptical", "Dismissive"]
  },
  "Disgusted": {
    "Disapproving": ["Judgmental", "Embarrassed"], "Disappointed": ["Appalled", "Revolted"], "Awful": ["Nauseated", "Detestable"], "Repelled": ["Horrified", "Hesitant"]
  },
  "Sad": {
    "Lonely": ["Isolated", "Abandoned"], "Vulnerable": ["Victimized", "Fragile"], "Despair": ["Powerless", "Grief"], "Guilty": ["Ashamed", "Remorseful"], "Depressed": ["Empty", "Inferior"], "Hurt": ["Disappointed", "Embarrassed"]
  }
};

// Helper to parse the raw data into the EmotionNode structure
const parseLevel = (data: any): EmotionNode[] => {
  return Object.entries(data).map(([name, children]) => ({
    name: name.replace(/_/g, ' '),
    children: Array.isArray(children)
      ? children.map(childName => ({ name: childName.replace(/_/g, ' ') }))
      : parseLevel(children),
  }));
};

export const moodStyles: Record<Mood, { base: string; selected: string; feed: string; text: string; emoji: string }> = {
  Happy: { base: 'border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20', selected: 'bg-yellow-500/30 border-yellow-400 text-yellow-200', feed: 'bg-yellow-500/20', text: 'text-yellow-300', emoji: '😄' },
  Sad: { base: 'border-blue-500/50 text-blue-300 hover:bg-blue-500/20', selected: 'bg-blue-500/30 border-blue-400 text-blue-200', feed: 'bg-blue-500/20', text: 'text-blue-300', emoji: '😢' },
  Angry: { base: 'border-red-500/50 text-red-300 hover:bg-red-500/20', selected: 'bg-red-500/30 border-red-400 text-red-200', feed: 'bg-red-500/20', text: 'text-red-300', emoji: '😠' },
  Fearful: { base: 'border-purple-500/50 text-purple-300 hover:bg-purple-500/20', selected: 'bg-purple-500/30 border-purple-400 text-purple-200', feed: 'bg-purple-500/20', text: 'text-purple-300', emoji: '😨' },
  Surprised: { base: 'border-pink-500/50 text-pink-300 hover:bg-pink-500/20', selected: 'bg-pink-500/30 border-pink-400 text-pink-200', feed: 'bg-pink-500/20', text: 'text-pink-300', emoji: '😲' },
  Bad: { base: 'border-green-500/50 text-green-300 hover:bg-green-500/20', selected: 'bg-green-500/30 border-green-400 text-green-200', feed: 'bg-green-500/20', text: 'text-green-300', emoji: '😒' },
  Disgusted: { base: 'border-gray-500/50 text-gray-300 hover:bg-gray-500/20', selected: 'bg-gray-500/30 border-gray-400 text-gray-200', feed: 'bg-gray-500/20', text: 'text-gray-300', emoji: '🤢' },
  Neutral: { base: 'border-slate-500/50 text-slate-300 hover:bg-slate-500/20', selected: 'bg-slate-500/30 border-slate-400 text-slate-200', feed: 'bg-slate-500/20', text: 'text-slate-300', emoji: '😐' },
};

const mappedData: EmotionCategory[] = Object.entries(emotionData).map(([name, children]) => ({
  name: name as Mood,
  color: moodStyles[name as Mood].selected,
  emoji: moodStyles[name as Mood].emoji,
  children: parseLevel(children)
}));

export const emotionWheelData: EmotionCategory[] = [
  ...mappedData,
  {
    name: 'Neutral',
    color: moodStyles['Neutral'].selected,
    emoji: moodStyles['Neutral'].emoji,
    children: [], // No children makes this a final choice
  }
];
