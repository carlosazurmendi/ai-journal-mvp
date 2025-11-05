
import { GoogleGenAI, GenerateContentResponse, Type, GroundingChunk, Chat, Modality } from "@google/genai";
import { JournalEntry, Insight, GroundingResult, GroundingSource, GeneratedPrompt, Mood } from '../types';

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

export const generatePrompt = async (entries: JournalEntry[], promptType: 'cbt' | 'writers_block' = 'cbt'): Promise<GeneratedPrompt> => {
  const history = entries.slice(-5).map(e => `Date: ${e.date}\nMood: ${e.mood}\nEntry: ${e.content}`).join('\n\n---\n\n');
  
  let systemInstruction: string;
  let userMessage: string;

  if (promptType === 'writers_block') {
    systemInstruction = "You are a creative and encouraging journaling assistant. Your task is to generate a simple, open-ended prompt to help a user overcome writer's block. The prompt should be low-pressure and easy to start with. Return a JSON object with two keys: 'prompt' (the journal prompt string) and 'explanation' (a brief explanation like 'To get the words flowing' or 'Sensory observation').";
    userMessage = "I'm feeling stuck and don't know what to write. Please give me a simple prompt to get started.";
  } else { // 'cbt'
    systemInstruction = "You are an insightful and empathetic journaling assistant. Based on previous journal entries, generate a single, thought-provoking journal prompt based on Cognitive Behavioral Therapy (CBT) principles. The prompt must be short, encouraging, and end with an open-ended question. Your goal is to help the user explore their thoughts and feelings constructively. Return a JSON object with two keys: 'prompt' (the journal prompt string) and 'explanation' (a brief, clear explanation of the CBT principle behind the prompt, like 'Cognitive Restructuring' or 'Behavioral Activation').";
    userMessage = `Here are my recent journal entries:\n${history}\n\nGenerate a new prompt for me.`;
  }

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

export const generateInsights = async (entries: JournalEntry[]): Promise<Insight[]> => {
  if (entries.length === 0) return [];
  const history = entries.map(e => `Date: ${e.date}\nMood: ${e.mood}\nEntry: ${e.content}`).join('\n\n---\n\n');

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze my journal entries and their associated moods. Provide 2-3 key insights based on Cognitive Behavioral Therapy principles and emotional patterns you observe. Reference Plutchik's Wheel of Emotions to discuss how primary emotions might be combining or leading to more complex feelings. For each insight, provide a title, a brief explanation, and a constructive suggestion. Here are my entries:\n\n${history}`,
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

export const startChat = (entries: JournalEntry[]): Chat => {
    const history = entries.slice(-10).map(e => `On ${e.date}, I felt ${e.mood} and wrote: "${e.content}"`).join('\n');
    const systemInstruction = `You are Aura, an AI companion specializing in mental wellness. Your persona is empathetic, patient, and insightful. Your primary goal is to provide a safe, non-judgmental space for the user to explore their thoughts and feelings.

Key Principles for Conversation:
1.  **Empathetic Validation:** Always start by acknowledging the user's feelings. Use phrases like, "It sounds like that was really challenging," or "I hear you, and it makes sense that you'd feel that way."
2.  **Active Listening:** Ask open-ended, clarifying questions to encourage deeper reflection (e.g., "What was going through your mind at that moment?"). Occasionally summarize their points to show you're listening (e.g., "So, it feels like the main issue is...").
3.  **CBT Integration:** Subtly introduce Cognitive Behavioral Therapy (CBT) concepts. Help the user identify thought patterns or suggest emotional regulation strategies. For example, you might ask, "Is there another way to look at that situation?" or suggest a simple grounding technique.
4.  **Varied Responses:** Maintain a natural, conversational flow. Avoid repetitive phrases and vary how you begin your responses.
5.  **Professional Boundaries:** You are a supportive companion, not a therapist. Do not give medical advice. If the user is in severe distress, gently guide them towards professional help.
6.  **Use Context:** Refer to the user's recent journal entries to help them connect dots and see patterns, but do so gently.

Keep your responses conversational and not too long.

CONTEXT from recent journal entries:
${history}`;
    
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
    });
};

export const generateChatSuggestions = async (entries: JournalEntry[]): Promise<string[]> => {
    if (entries.length === 0) return [];
  
    const history = entries.slice(-3).map(e => `Date: ${e.date}, Mood: ${e.mood}, Entry: "${e.content}"`).join('\n');
  
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

export const summarizeConversationForJournal = async (transcript: string): Promise<{ content: string; mood: Mood } | null> => {
    const systemInstruction = `You are a helpful assistant. Analyze the following conversation transcript between a user and their AI journal, Aura. Your task is to summarize the key points of the conversation into a coherent journal entry from the user's perspective. Also, infer the user's dominant mood from the conversation. The possible moods are 'Joy', 'Sadness', 'Anger', 'Fear', 'Calm'. Return a JSON object with two keys: "content" (the summarized journal entry as a string) and "mood" (the inferred mood as a string).`;

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
                        mood: { type: Type.STRING, enum: ['Joy', 'Sadness', 'Anger', 'Fear', 'Calm'] },
                    },
                    required: ['content', 'mood'],
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as { content: string; mood: Mood };
    } catch (error) {
        console.error("Error summarizing conversation:", error);
        return null;
    }
};


export const getAuraAI = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};
