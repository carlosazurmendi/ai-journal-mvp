
import { GoogleGenAI, GenerateContentResponse, Type, GroundingChunk, Chat, Modality, Content } from "@google/genai";
import { JournalEntry, Insight, GroundingResult, GroundingSource, GeneratedPrompt, Mood, ChatMessage, ConversationHistoryItem } from '../types';
import { emotionData } from "../data/emotionsData";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseGroundingChunks = (chunks: GroundingChunk[] | undefined): GroundingSource[] => {
    if (!chunks) return [];
    const sources: GroundingSource[] = [];
    chunks.forEach(chunk => {
        if (chunk.web) {
            sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
        if (chunk.maps) {
            sources.push({ uri: chunk.maps.uri, title: chunk.maps.title });
        }
    });
    return sources;
}

export const generatePrompt = async (entries: JournalEntry[], conversationHistory: ConversationHistoryItem[], currentMood?: { core: Mood; detailed?: string }): Promise<GeneratedPrompt> => {
  const combinedHistory = [
    ...entries.map(e => ({ type: 'entry' as const, date: new Date(e.id), content: `On ${e.date}, I felt ${e.detailedMood || e.mood} and wrote: "${e.content}"`})),
    ...conversationHistory.map(c => ({ type: 'conversation' as const, date: new Date(c.date), content: `On ${new Date(c.date).toLocaleDateString()}, I had a conversation:\n${c.transcript.map(t => `${t.speaker === 'user' ? 'Me' : 'Aura'}: ${t.text}`).join('\n')}`}))
  ];

  combinedHistory.sort((a, b) => b.date.getTime() - a.date.getTime());

  const history = combinedHistory.slice(0, 5).map(item => item.content).join('\n\n---\n\n');
  
  const moodInfo = currentMood ? `I'm currently feeling ${currentMood.detailed || currentMood.core}.` : "I'm not sure how I'm feeling.";
  
  const systemInstruction = `You are an insightful, empathetic, and creative journaling assistant. Your goal is to help the user explore their thoughts and feelings constructively.
- Based on the user's current mood and their previous journal entries and conversations, generate a single, thought-provoking journal prompt.
- If the user seems stuck (e.g., has few or no entries) or their mood suggests it, provide a simpler, open-ended, low-pressure prompt to help them overcome writer's block.
- Otherwise, try to base the prompt on Cognitive Behavioral Therapy (CBT) principles.
- The prompt must be short, encouraging, and end with an open-ended question.
- Return a JSON object with two keys: 'prompt' (the journal prompt string) and 'explanation' (a brief, clear explanation of the principle behind the prompt, like 'Cognitive Restructuring', 'To get the words flowing', or 'Behavioral Activation').`;
  
  const userMessage = `My current mood is: ${moodInfo}.\n\nHere is my recent history of journal entries and conversations:\n${history}\n\nGenerate a new prompt for me.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                prompt: { type: Type.STRING },
                explanation: { type: Type.STRING },
            },
            required: ['prompt', 'explanation'],
        },
      }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as GeneratedPrompt;
  } catch (error) {
    console.error("Error generating prompt:", error);
    return {
        prompt: "Write about what's on your mind today.",
        explanation: "This is a default prompt for open reflection."
    };
  }
};

export const generateInsights = async (entries: JournalEntry[], conversationHistory: ConversationHistoryItem[]): Promise<Insight[]> => {
  if (entries.length === 0 && conversationHistory.length === 0) return [];
  
  const combinedHistory = [
    ...entries.map(e => ({ type: 'entry' as const, date: new Date(e.id), content: `Date: ${e.date}\nMood: ${e.detailedMood || e.mood}\nEntry: ${e.content}`})),
    ...conversationHistory.map(c => ({ type: 'conversation' as const, date: new Date(c.date), content: `On ${new Date(c.date).toLocaleDateString()}, I had a conversation with Aura:\n${c.transcript.map(t => `${t.speaker === 'user' ? 'Me' : 'Aura'}: ${t.text}`).join('\n')}`}))
  ];

  combinedHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

  const history = combinedHistory.map(item => item.content).join('\n\n---\n\n');

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze my journal entries, conversations, and their associated moods. Provide 2-3 key insights based on Cognitive Behavioral Therapy principles and emotional patterns you observe. Reference Plutchik's Wheel of Emotions to discuss how primary emotions might be combining or leading to more complex feelings. For each insight, provide a title, a brief explanation, and a constructive suggestion. Here are my entries and conversations:\n\n${history}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        suggestion: { type: Type.STRING },
                    },
                    required: ['id', 'title', 'explanation', 'suggestion'],
                },
            },
            thinkingConfig: { thinkingBudget: 32768 },
        },
    });
    
    const jsonText = response.text.trim();
    const insights = JSON.parse(jsonText) as Insight[];
    return insights.map(insight => ({ ...insight, id: `insight-${Date.now()}-${Math.random()}` }));
  } catch (error) {
      console.error("Error generating insights:", error);
      return [];
  }
};

export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const imagePart = {
        inlineData: { data: imageBase64, mimeType },
    };
    const textPart = { text: prompt };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing image:", error);
        return "Sorry, I couldn't analyze the image.";
    }
};

export const groundedSearch = async (query: string, useMaps: boolean, location?: GeolocationCoordinates): Promise<GroundingResult> => {
    const tools = useMaps ? [{ googleMaps: {} }] : [{ googleSearch: {} }];
    const toolConfig = (useMaps && location) ? {
        retrievalConfig: {
            latLng: {
                latitude: location.latitude,
                longitude: location.longitude,
            }
        }
    } : undefined;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: query,
            config: {
                tools,
                toolConfig
            },
        });
        const sources = parseGroundingChunks(response.candidates?.[0]?.groundingMetadata?.groundingChunks);
        return { text: response.text, sources };
    } catch (error) {
        console.error("Error with grounded search:", error);
        return { text: "Sorry, I couldn't complete the search.", sources: [] };
    }
};

export const complexQuery = async (query: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: query,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error with complex query:", error);
        return "Sorry, I couldn't process your request.";
    }
};

const AURA_CHAT_PERSONA = `You are Aura, an AI companion specializing in mental wellness. Your persona is empathetic, patient, and insightful. Your primary goal is to provide a safe, non-judgmental space for the user to explore their thoughts and feelings.

Key Principles for Conversation:
1.  **Empathetic Validation:** Always start by acknowledging the user's feelings. Use phrases like, "It sounds like that was really challenging," or "I hear you, and it makes sense that you'd feel that way."
2.  **Active Listening:** Ask open-ended, clarifying questions to encourage deeper reflection (e.g., "What was going through your mind at that moment?"). Occasionally summarize their points to show you're listening (e.g., "So, it feels like the main issue is...").
3.  **CBT Integration:** Subtly introduce Cognitive Behavioral Therapy (CBT) concepts. Help the user identify thought patterns or suggest emotional regulation strategies. For example, you might ask, "Is there another way to look at that situation?" or suggest a simple grounding technique.
4.  **Varied Responses:** Maintain a natural, conversational flow. Avoid repetitive phrases and vary how you begin your responses.
5.  **Professional Boundaries:** You are a supportive companion, not a therapist. Do not give medical advice. If the user is in severe distress, gently guide them towards professional help.
6.  **Use Context:** Refer to the user's recent journal entries to help them connect dots and see patterns, but do so gently.

Keep your responses conversational and limited to a few sentences, do not make your responses too long.`;

export const startChat = (entries: JournalEntry[], history: ChatMessage[], contextualEntry?: JournalEntry | null): Chat => {
    const recentEntriesHistory = entries.slice(-10).map(e => `On ${e.date}, I felt ${e.detailedMood || e.mood} and wrote: "${e.content}"`).join('\n');
    
    let systemInstruction: string;
    if (contextualEntry) {
        systemInstruction = `${AURA_CHAT_PERSONA}

The user wants to talk specifically about this journal entry:
- Date: ${contextualEntry.date}
- Mood: ${contextualEntry.detailedMood || contextualEntry.mood}
- Content: "${contextualEntry.content}"

**Your Primary Focus:**
- Center the conversation around this specific entry. Ask clarifying questions, validate their feelings from that day, and explore the thoughts and events described.
- Apply Cognitive Behavioral Therapy (CBT) principles to help them understand the connections between their thoughts, feelings, and actions in that specific situation.
- Always bring the conversation back to the main entry of focus.

You can use the user's other recent journal entries for broader context if relevant.

OTHER RECENT ENTRIES for context:
${recentEntriesHistory}`;
    } else {
        systemInstruction = `${AURA_CHAT_PERSONA}

CONTEXT from recent journal entries:
${recentEntriesHistory}`;
    }
    
    const geminiHistory: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
        history: geminiHistory,
    });
};

export const generateChatSuggestions = async (entries: JournalEntry[]): Promise<string[]> => {
    if (entries.length === 0) return [];
  
    const history = entries.slice(-3).map(e => `Date: ${e.date}, Mood: ${e.detailedMood || e.mood}, Entry: "${e.content}"`).join('\n');
  
    const systemInstruction = `You are an insightful AI assistant. Based on the user's recent journal entries, generate 2 or 3 concise, gentle, and open-ended conversation starter questions. These questions should help the user explore their feelings or situations further. Return a JSON array of strings.`;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Here are my recent journal entries:\n${history}\n\nGenerate conversation starters.`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      });
      const jsonText = response.text.trim();
      return JSON.parse(jsonText) as string[];
    } catch (error) {
      console.error("Error generating chat suggestions:", error);
      return [
          "What's been on your mind lately?",
          "Is there anything from your recent entries you'd like to explore more?",
      ];
    }
  };

export const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A soothing, soft-spoken female voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
};

export const summarizeConversationForJournal = async (transcript: string): Promise<{ content: string; mood: Mood; detailedMood: string } | null> => {
    const systemInstruction = `You are a helpful assistant. Analyze the following conversation transcript between a user and their AI journal, Aura. Your task is to:
1.  Summarize the key points of the conversation into a coherent journal entry from the user's perspective.
2.  Infer the user's dominant mood from the conversation by selecting the most appropriate specific emotion from the provided hierarchy.

You must first determine the primary emotion category (e.g., 'Happy', 'Sad'), then select the most fitting specific emotion from its subcategories.
Return a JSON object with three keys: "content" (the summarized journal entry), "mood" (the primary emotion category as a string), and "detailedMood" (the specific, detailed emotion as a string).

Here is the emotional hierarchy you must use:
${JSON.stringify(emotionData, null, 2)}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Here is the transcript:\n\n${transcript}`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        content: { type: Type.STRING },
                        mood: { type: Type.STRING, enum: ['Happy', 'Sad', 'Angry', 'Fearful', 'Surprised', 'Bad', 'Disgusted', 'Neutral'] },
                        detailedMood: { type: Type.STRING },
                    },
                    required: ['content', 'mood', 'detailedMood'],
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as { content: string; mood: Mood; detailedMood: string };
    } catch (error) {
        console.error("Error summarizing conversation:", error);
        return null;
    }
};

const AURA_CONVERSATIONAL_PERSONA = 'You are Aura, a soothing, empathetic mental health journal. Speak in a soft, calming female voice. Use principles of Cognitive Behavioral Therapy and the Wheel of Emotions to guide the user through their thoughts and feelings. Keep your responses concise, supportive and conversational.';

export const getConversationalSystemInstruction = (contextualEntry?: JournalEntry | null): string => {
    if (contextualEntry) {
        return `${AURA_CONVERSATIONAL_PERSONA}

This is the beginning of a new conversation. The user wants to talk about a journal entry they wrote.
The user's entry is provided below. Treat this as the user's first turn in the conversation.
Your task is to provide the *second* turn by responding empathetically and directly to the content of their entry. Do not refer to it as an "entry"; just continue the conversation naturally.

User's first message:
"${contextualEntry.content}"`;
    }
    
    return AURA_CONVERSATIONAL_PERSONA;
}


export const getAuraAI = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};