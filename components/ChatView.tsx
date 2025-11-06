
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { startChat, generateChatSuggestions } from '../services/geminiService';
import { JournalEntry, ChatMessage, ChatThread } from '../types';
import LoadingSpinner from './LoadingSpinner';
import TypingIndicator from './TypingIndicator';
import { TrashIcon } from './Icons';
import { Chat } from '@google/genai';

// --- Sub-component for displaying a single chat thread ---
interface ChatThreadComponentProps {
    thread: ChatThread;
    journalEntries: JournalEntry[];
    onUpdateThread: (updatedThread: ChatThread) => void;
    onBack: () => void;
}

const ChatThreadComponent: React.FC<ChatThreadComponentProps> = ({ thread, journalEntries, onUpdateThread, onBack }) => {
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const journalEntryForThread = useMemo(() => {
        if (!thread.journalEntryId) return null;
        return journalEntries.find(e => e.id === thread.journalEntryId);
    }, [thread.journalEntryId, journalEntries]);

    const sendMessage = async (messageText: string, session: Chat, isInitial = false) => {
        if (!messageText.trim()) return;

        setIsLoading(true);
        if (!isInitial) setUserInput('');

        const newUserMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            text: messageText,
        };
        const updatedMessages = [...thread.messages, newUserMessage];
        onUpdateThread({ ...thread, messages: updatedMessages, lastUpdated: new Date().toISOString() });
        if(suggestions.length > 0) setSuggestions([]);
        
        try {
            const response = await session.sendMessage({ message: messageText });
            const modelMessage: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'model',
                text: response.text,
            };
            onUpdateThread({ ...thread, messages: [...updatedMessages, modelMessage], lastUpdated: new Date().toISOString() });
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = {
                id: `err-${Date.now()}`,
                role: 'model',
                text: 'Sorry, I encountered an error. Please try again.',
            };
            onUpdateThread({ ...thread, messages: [...updatedMessages, errorMessage], lastUpdated: new Date().toISOString() });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const initializeChat = async () => {
            const session = startChat(journalEntries, thread.messages, journalEntryForThread);
            setChatSession(session);

            if (thread.messages.length === 0) {
                if (journalEntryForThread) {
                    await sendMessage(journalEntryForThread.content, session, true);
                } else {
                    const welcomeMessage: ChatMessage = {
                        id: 'init-general',
                        role: 'model',
                        text: "Hello! I'm Aura. We can talk about your journal entries, insights, or anything else that's on your mind. Here are a few places we could start, or feel free to type your own message below."
                    };
                    onUpdateThread({ ...thread, messages: [welcomeMessage], lastUpdated: new Date().toISOString() });
                    const suggestedTopics = await generateChatSuggestions(journalEntries);
                    setSuggestions(suggestedTopics);
                }
            }
        };
        initializeChat();
    }, [thread.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread.messages]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatSession) sendMessage(userInput, chatSession);
    };

    const handleSuggestionClick = (suggestion: string) => {
        if(chatSession) sendMessage(suggestion, chatSession);
    }
    
    return (
        <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg h-full w-full">
            <div className="flex items-center mb-4">
                <button onClick={onBack} className="mr-4 px-3 py-1 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors text-slate-300">&larr; Back</button>
                <h2 className="text-xl font-bold text-white truncate">{thread.title}</h2>
            </div>
            <div className="flex-grow bg-slate-900/70 rounded-lg overflow-y-auto p-4 border border-slate-700 mb-4">
                <div className="space-y-4">
                    {thread.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-cyan-800 text-white' : 'bg-slate-700 text-slate-200'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && <div className="flex justify-start"><div className="max-w-xl px-4 py-3 rounded-lg bg-slate-700 text-slate-200"><TypingIndicator /></div></div>}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            {suggestions.length > 0 && !isLoading && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleSuggestionClick(s)} className="px-3 py-1.5 bg-slate-700 text-sm text-cyan-300 rounded-full hover:bg-slate-600 transition-colors duration-200">{s}</button>
                    ))}
                </div>
            )}
            <form onSubmit={handleFormSubmit} className="flex gap-4">
                <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type your message..." className="flex-grow bg-slate-900/70 border-2 border-slate-700 rounded-lg p-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500" disabled={isLoading} />
                <button type="submit" disabled={isLoading || !userInput.trim()} className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">Send</button>
            </form>
        </div>
    );
};

// --- Sub-component for displaying the list of chat threads ---
interface ChatListComponentProps {
    threads: ChatThread[];
    onSelectThread: (id: string) => void;
    onNewChat: () => void;
    onDeleteThread: (id: string) => void;
}
const ChatListComponent: React.FC<ChatListComponentProps> = ({ threads, onSelectThread, onNewChat, onDeleteThread }) => {
    
    const handleDelete = (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation(); // Prevent the parent button from being clicked
        onDeleteThread(threadId);
    };

    return (
        <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg h-full w-full">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
                <h2 className="text-2xl font-bold text-white">Your Conversations</h2>
                <button onClick={onNewChat} className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200">Start New Chat</button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                {threads.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500"><p>No conversations yet. Start a new chat or talk about a journal entry.</p></div>
                ) : (
                    <ul className="space-y-3">
                        {threads.map(thread => (
                            <li key={thread.id} className="relative">
                                <button onClick={() => onSelectThread(thread.id)} className="w-full text-left p-4 bg-slate-900/70 rounded-lg hover:bg-slate-900/100 border border-slate-700 hover:border-cyan-500 transition-all duration-200">
                                    <h3 className="font-semibold text-cyan-400 truncate pr-8">{thread.title}</h3>
                                    <p className="text-sm text-slate-400 truncate mt-1">{thread.messages[thread.messages.length - 1]?.text || "..."}</p>
                                    <p className="text-xs text-slate-500 mt-2">{new Date(thread.lastUpdated).toLocaleString()}</p>
                                </button>
                                <button 
                                    onClick={(e) => handleDelete(e, thread.id)} 
                                    className="absolute top-3 right-3 p-2 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                    aria-label="Delete chat"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// --- Main ChatView component ---
interface ChatViewProps {
  journalEntries: JournalEntry[];
  chatThreads: ChatThread[];
  setChatThreads: (threads: ChatThread[]) => void;
  activeChatThreadId: string | null;
  setActiveChatThreadId: (id: string | null) => void;
  onDeleteThread: (id: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  journalEntries,
  chatThreads,
  setChatThreads,
  activeChatThreadId,
  setActiveChatThreadId,
  onDeleteThread
}) => {
  
  const handleCreateNewChat = () => {
    const newThread: ChatThread = {
      id: `general-${new Date().toISOString()}`,
      title: 'New Conversation',
      messages: [],
      lastUpdated: new Date().toISOString(),
    };
    setChatThreads([newThread, ...chatThreads]);
    setActiveChatThreadId(newThread.id);
  };
  
  const handleUpdateThread = (updatedThread: ChatThread) => {
    const newThreads = chatThreads.map(t => t.id === updatedThread.id ? updatedThread : t);
    setChatThreads(newThreads);
  };

  const activeThread = chatThreads.find(t => t.id === activeChatThreadId);

  if (activeThread) {
    return (
      <ChatThreadComponent
        thread={activeThread}
        journalEntries={journalEntries}
        onUpdateThread={handleUpdateThread}
        onBack={() => setActiveChatThreadId(null)}
      />
    );
  } else {
    return (
      <ChatListComponent
        threads={chatThreads}
        onSelectThread={setActiveChatThreadId}
        onNewChat={handleCreateNewChat}
        onDeleteThread={onDeleteThread}
      />
    );
  }
};

export default ChatView;