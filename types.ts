export type Mood = 'Joy' | 'Sadness' | 'Anger' | 'Fear' | 'Calm';

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: Mood;
}

export interface Insight {
  id: string;
  title: string;
  explanation: string;
  suggestion: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface GroundingResult {
    text: string;
    sources: GroundingSource[];
}

export interface GeneratedPrompt {
  prompt: string;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export enum View {
  JOURNAL = 'JOURNAL',
  CONVERSATION = 'CONVERSATION',
  INSIGHTS = 'INSIGHTS',
  IMAGE_ANALYSIS = 'IMAGE_ANALYSIS',
  GROUNDING_SEARCH = 'GROUNDING_SEARCH',
  COMPLEX_QUERY = 'COMPLEX_QUERY',
  CHAT = 'CHAT',
}