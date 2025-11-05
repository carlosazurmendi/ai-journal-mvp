import React, { useState, useEffect, useRef } from 'react';
import { startChat, generateChatSuggestions } from '../services/geminiService';
import { JournalEntry, ChatMessage } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { Chat } from '@google/genai';

interface ChatViewProps {
  journalEntries: JournalEntry[];
}

const ChatView: React.FC<ChatViewProps> = ({ journalEntries }) => {
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeChat = async () => {
      setIsLoading(true);
      setMessages([]);
      setSuggestions([]);
      const session = startChat(journalEntries);
      setChatSession(session);
      
      const suggestedTopics = await generateChatSuggestions(journalEntries);
      setSuggestions(suggestedTopics);

      setMessages([
        {
          id: 'init',
          role: 'model',
          text: "Hello! I'm Aura. We can talk about your journal entries, insights, or anything else that's on your mind. Here are a few places we could start, or feel free to type your own message below.",
        },
      ]);
      setIsLoading(false);
    };
    
    initializeChat();
  }, [journalEntries]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !chatSession || isLoading) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
    };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);
    if(suggestions.length > 0) setSuggestions([]); // Clear suggestions once conversation starts

    try {
      const response = await chatSession.sendMessage({ message: messageText });
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(userInput);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg h-full w-full">
      <h2 className="text-2xl font-bold text-white mb-2">Chat with Aura</h2>
      <p className="text-slate-400 mb-4">Discuss your thoughts, feelings, and journal insights.</p>
      
      <div className="flex-grow bg-slate-900/70 rounded-lg overflow-y-auto p-4 border border-slate-700 mb-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-cyan-800 text-white' : 'bg-slate-700 text-slate-200'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
                <div className="max-w-xl px-4 py-2 rounded-lg bg-slate-700 text-slate-200">
                    <LoadingSpinner className="w-5 h-5" />
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {suggestions.length > 0 && !isLoading && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="px-3 py-1.5 bg-slate-700 text-sm text-cyan-300 rounded-full hover:bg-slate-600 transition-colors duration-200"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="flex gap-4">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow bg-slate-900/70 border-2 border-slate-700 rounded-lg p-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim()}
          className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatView;