import React, { useState, useEffect } from 'react';
import { JournalEntry, Insight, View, Mood } from './types';
import JournalEditor from './components/JournalEditor';
import JournalFeed from './components/JournalFeed';
import InsightsPanel from './components/InsightsPanel';
import ConversationalView from './components/ConversationalView';
import ImageAnalyzer from './components/ImageAnalyzer';
import GroundingSearch from './components/GroundingSearch';
import ComplexQuery from './components/ComplexQuery';
import ChatView from './components/ChatView';
import { JournalIcon, MicIcon, LightbulbIcon, ImageIcon, SearchIcon, BrainIcon, ChatBubbleIcon } from './components/Icons';

const App: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [view, setView] = useState<View>(View.JOURNAL);

  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem('journalEntries');
      if (savedEntries) {
        const parsedEntries: JournalEntry[] = JSON.parse(savedEntries).map((e: any) => ({
            ...e,
            mood: e.mood || 'Calm'
        }));
        setJournalEntries(parsedEntries);
      }
      const savedInsights = localStorage.getItem('journalInsights');
      if (savedInsights) {
        setInsights(JSON.parse(savedInsights));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  const saveJournalEntry = (content: string, mood: Mood) => {
    const newEntry: JournalEntry = {
      id: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      content,
      mood,
    };
    const updatedEntries = [newEntry, ...journalEntries];
    setJournalEntries(updatedEntries);
    localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
  };

  const updateInsights = (newInsights: Insight[]) => {
    setInsights(newInsights);
    localStorage.setItem('journalInsights', JSON.stringify(newInsights));
  };
  
  const NavItem: React.FC<{
    targetView: View;
    label: string;
    icon: React.ReactNode;
  }> = ({ targetView, label, icon }) => (
    <button
      onClick={() => setView(targetView)}
      className={`flex flex-col md:flex-row items-center justify-center md:justify-start flex-1 md:flex-initial py-2 px-1 md:p-3 md:my-1 rounded-lg text-xs md:text-sm transition-all duration-200 ${
        view === targetView
          ? 'bg-cyan-500/20 text-cyan-300'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
      }`}
    >
      <div className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-0 md:mr-3">{icon}</div>
      <span className="text-center md:text-left">{label}</span>
    </button>
  );

  const renderView = () => {
    switch (view) {
      case View.CONVERSATION:
        return <ConversationalView saveJournalEntry={saveJournalEntry} />;
      case View.INSIGHTS:
        return <InsightsPanel journalEntries={journalEntries} insights={insights} setInsights={updateInsights} />;
      case View.IMAGE_ANALYSIS:
        return <ImageAnalyzer />;
      case View.GROUNDING_SEARCH:
        return <GroundingSearch />;
      case View.COMPLEX_QUERY:
        return <ComplexQuery />;
      case View.CHAT:
        return <ChatView journalEntries={journalEntries} />;
      case View.JOURNAL:
      default:
        return (
          <div className="flex-grow flex flex-col lg:grid lg:grid-cols-2 gap-6">
            <JournalEditor saveEntry={saveJournalEntry} pastEntries={journalEntries} />
            <JournalFeed entries={journalEntries} />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans bg-slate-900 text-slate-200">
      <nav className="order-last md:order-none w-full md:w-56 bg-slate-800/50 p-1 md:p-3 flex flex-row md:flex-col gap-1 md:justify-start shrink-0 border-t-2 md:border-t-0 md:border-r-2 border-slate-700">
         <div className="hidden md:block text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Aura</h1>
            <p className="text-xs text-cyan-400">Your AI Journal</p>
        </div>
        <NavItem targetView={View.JOURNAL} label="Journal" icon={<JournalIcon />} />
        <NavItem targetView={View.CHAT} label="Chat" icon={<ChatBubbleIcon />} />
        <NavItem targetView={View.CONVERSATION} label="Talk" icon={<MicIcon />} />
        <NavItem targetView={View.INSIGHTS} label="Insights" icon={<LightbulbIcon />} />
        <NavItem targetView={View.IMAGE_ANALYSIS} label="Analyze" icon={<ImageIcon />} />
        <NavItem targetView={View.GROUNDING_SEARCH} label="Search" icon={<SearchIcon />} />
        <NavItem targetView={View.COMPLEX_QUERY} label="Thought" icon={<BrainIcon />} />
      </nav>
      <main className="flex-grow p-4 sm:p-6 pb-20 md:pb-6 overflow-y-auto flex flex-col">
        {renderView()}
      </main>
    </div>
  );
};

export default App;