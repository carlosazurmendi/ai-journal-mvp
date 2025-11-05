
import React, { useState, useCallback } from 'react';
import { complexQuery } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { BrainIcon } from './Icons';

// Make TypeScript aware of the 'marked' library loaded from the CDN
declare global {
    interface Window { marked: { parse: (md: string) => string; }; }
}

const ComplexQuery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResult('');
    try {
      const response = await complexQuery(query);
      setResult(response);
    } catch (error) {
      console.error("Complex query failed", error);
      setResult('An error occurred while processing your request.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  return (
    <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg w-full">
      <div className="flex items-center mb-4">
        <BrainIcon className="w-8 h-8 text-cyan-400 mr-3" />
        <div>
            <h2 className="text-2xl font-bold text-white">Deep Thought</h2>
            <p className="text-slate-400">Ask complex questions that require deep reasoning. Powered by Gemini 2.5 Pro with Thinking Mode.</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 mb-4">
        <textarea
          rows={5}
          className="flex-grow bg-slate-900/70 border-2 border-slate-700 rounded-lg p-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Enter a complex query, e.g., 'Based on CBT principles, devise a multi-step plan to address recurring anxious thoughts about public speaking...'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !query.trim()}
          className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {isLoading ? <LoadingSpinner /> : 'Submit for Analysis'}
        </button>
      </div>
      
      <div className="flex-grow bg-slate-900/70 rounded-lg overflow-y-auto p-4 border border-slate-700">
        {isLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner className="w-10 h-10" /></div>}
        {result ? (
            <div className="prose-styles" dangerouslySetInnerHTML={{ __html: window.marked.parse(result) }} />
        ) : !isLoading && (
            <p className="text-slate-500">Your in-depth analysis will appear here.</p>
        )}
      </div>
    </div>
  );
};

export default ComplexQuery;