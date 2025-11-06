
import React, { useState } from 'react';
import { generateInsights } from '../services/geminiService';
import { JournalEntry, Insight, ConversationHistoryItem } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface InsightsPanelProps {
  journalEntries: JournalEntry[];
  insights: Insight[];
  setInsights: (insights: Insight[]) => void;
  conversationHistory: ConversationHistoryItem[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ journalEntries, insights, setInsights, conversationHistory }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    try {
      const newInsights = await generateInsights(journalEntries, conversationHistory);
      setInsights(newInsights);
    } catch (error) {
      console.error("Failed to generate insights", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg h-full w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Your Insights</h2>
        <button
          onClick={handleGenerateInsights}
          disabled={isLoading || (journalEntries.length < 1 && conversationHistory.length < 1)}
          className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <LoadingSpinner /> : 'Generate New Insights'}
        </button>
      </div>
      <p className="text-slate-400 mb-6">Insights are generated using your journal entries and conversations to help you notice patterns and reflect. You need at least one entry or conversation to begin.</p>
      <div className="flex-grow overflow-y-auto pr-2">
        {insights.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>No insights yet. Write a journal entry and generate them!</p>
          </div>
        )}
        {isLoading && insights.length === 0 && (
            <div className="flex items-center justify-center h-full">
                <LoadingSpinner className="w-12 h-12" />
            </div>
        )}
        <div className="space-y-4">
          {insights.map((insight) => (
            <div key={insight.id} className="bg-slate-900/70 rounded-lg p-5 border border-slate-700">
              <h3 className="text-xl font-semibold text-cyan-400 mb-2">{insight.title}</h3>
              <p className="text-slate-300 mb-3"><strong className="text-slate-100">Explanation:</strong> {insight.explanation}</p>
              <p className="text-slate-300 bg-slate-800 p-3 rounded-md"><strong className="text-slate-100">Suggestion:</strong> {insight.suggestion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;