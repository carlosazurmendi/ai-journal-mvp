
import React, { useState, useEffect } from 'react';
import { JournalEntry, Insight, View, Mood, ChatThread, ConversationHistoryItem, TranscriptEntry } from './types';
import JournalEditor from './components/JournalEditor';
import JournalFeed from './components/JournalFeed';
import InsightsPanel from './components/InsightsPanel';
import ConversationalView from './components/ConversationalView';
import ImageAnalyzer from './components/ImageAnalyzer';
import GroundingSearch from './components/GroundingSearch';
import ComplexQuery from './components/ComplexQuery';
import ChatView from './components/ChatView';
import ConfirmationModal from './components/ConfirmationModal';
import JournalEditModal from './components/JournalEditModal';
import { JournalIcon, MicIcon, LightbulbIcon, ImageIcon, SearchIcon, BrainIcon, ChatBubbleIcon } from './components/Icons';

type ItemToDelete = {
    id: string;
    type: 'journal' | 'chat';
};


const App: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistoryItem[]>([]);
  const [view, setView] = useState<View>(View.JOURNAL);
  const [contextualEntry, setContextualEntry] = useState<JournalEntry | null>(null);
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);


  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem('journalEntries');
      if (savedEntries) {
        const parsedEntries: JournalEntry[] = JSON.parse(savedEntries);
        setJournalEntries(parsedEntries);
      }
      const savedInsights = localStorage.getItem('journalInsights');
      if (savedInsights) {
        setInsights(JSON.parse(savedInsights));
      }
      const savedThreads = localStorage.getItem('chatThreads');
      if (savedThreads) {
        setChatThreads(JSON.parse(savedThreads));
      }
      const savedHistory = localStorage.getItem('conversationHistory');
      if (savedHistory) {
        setConversationHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  const saveJournalEntry = (content: string, mood: Mood, detailedMood?: string, type: 'text' | 'conversation' = 'text') => {
    const newEntry: JournalEntry = {
      id: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      content,
      mood,
      detailedMood,
      type,
    };
    const updatedEntries = [newEntry, ...journalEntries];
    setJournalEntries(updatedEntries);
    localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
  };

  const saveConversationHistory = (transcriptToSave: TranscriptEntry[]) => {
    if (transcriptToSave.length === 0) return;
    const newConversation: ConversationHistoryItem = {
        id: new Date().toISOString(),
        date: new Date().toISOString(),
        transcript: transcriptToSave,
    };
    
    const updatedHistory = [newConversation, ...conversationHistory];
    if (updatedHistory.length > 20) updatedHistory.splice(20); // Cap history at 20 entries
    setConversationHistory(updatedHistory);
    localStorage.setItem('conversationHistory', JSON.stringify(updatedHistory));
  };

  const handleSaveEditedEntry = (id: string, content: string, mood: Mood, detailedMood?: string) => {
    const updatedEntries = journalEntries.map(entry => {
        if (entry.id === id) {
            return { ...entry, content, mood, detailedMood };
        }
        return entry;
    });
    setJournalEntries(updatedEntries);
    localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
  };

  const deleteJournalEntry = (id: string) => {
    const journalChatThreadId = `journal-${id}`;

    setJournalEntries(prevEntries => {
      const updatedEntries = prevEntries.filter(entry => entry.id !== id);
      localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
      return updatedEntries;
    });

    setChatThreads(prevThreads => {
      const updatedThreads = prevThreads.filter(thread => thread.id !== journalChatThreadId);
      localStorage.setItem('chatThreads', JSON.stringify(updatedThreads));
      return updatedThreads;
    });

    if (activeChatThreadId === journalChatThreadId) {
      setActiveChatThreadId(null);
    }
  };

  const updateInsights = (newInsights: Insight[]) => {
    setInsights(newInsights);
    localStorage.setItem('journalInsights', JSON.stringify(newInsights));
  };
  
  const updateAndSaveThreads = (newThreads: ChatThread[]) => {
    newThreads.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    setChatThreads(newThreads);
    localStorage.setItem('chatThreads', JSON.stringify(newThreads));
  }

  const deleteChatThread = (id: string) => {
    setChatThreads(prevThreads => {
      const updatedThreads = prevThreads.filter(thread => thread.id !== id);
      localStorage.setItem('chatThreads', JSON.stringify(updatedThreads));
      return updatedThreads;
    });

    if (activeChatThreadId === id) {
      setActiveChatThreadId(null);
    }
  };

  const requestDelete = (id: string, type: 'journal' | 'chat') => {
    setItemToDelete({ id, type });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'journal') {
      deleteJournalEntry(itemToDelete.id);
    } else if (itemToDelete.type === 'chat') {
      deleteChatThread(itemToDelete.id);
    }
    
    handleCloseDeleteModal();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleStartChatAboutEntry = (entry: JournalEntry) => {
    const threadId = `journal-${entry.id}`;
    const existingThread = chatThreads.find(t => t.id === threadId);

    if (existingThread) {
        setActiveChatThreadId(existingThread.id);
    } else {
        const newThread: ChatThread = {
            id: threadId,
            journalEntryId: entry.id,
            title: `About your entry from ${entry.date}`,
            messages: [],
            lastUpdated: new Date().toISOString(),
        };
        updateAndSaveThreads([newThread, ...chatThreads]);
        setActiveChatThreadId(newThread.id);
    }
    setView(View.CHAT);
  };

  const handleStartTalkAboutEntry = (entry: JournalEntry) => {
    setContextualEntry(entry);
    setView(View.CONVERSATION);
  };

  const handleStartEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
  };
  
  const NavItem: React.FC<{
    targetView: View;
    label: string;
    icon: React.ReactNode;
  }> = ({ targetView, label, icon }) => {
    const handleClick = () => {
      if (targetView === View.CHAT) {
        setActiveChatThreadId(null);
        setContextualEntry(null);
      }
      if (targetView === View.CONVERSATION) {
        setContextualEntry(null);
      }
      setView(targetView);
    };

    return (
      <button
        onClick={handleClick}
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
  }

  const renderView = () => {
    switch (view) {
      case View.CONVERSATION:
        return <ConversationalView 
                    saveJournalEntry={saveJournalEntry} 
                    contextualEntry={contextualEntry}
                    conversationHistory={conversationHistory}
                    saveConversationHistory={saveConversationHistory}
                />;
      case View.INSIGHTS:
        return <InsightsPanel 
                  journalEntries={journalEntries} 
                  conversationHistory={conversationHistory} 
                  insights={insights} 
                  setInsights={updateInsights} 
                />;
      case View.IMAGE_ANALYSIS:
        return <ImageAnalyzer />;
      case View.GROUNDING_SEARCH:
        return <GroundingSearch />;
      case View.COMPLEX_QUERY:
        return <ComplexQuery />;
      case View.CHAT:
        return <ChatView 
                  journalEntries={journalEntries}
                  chatThreads={chatThreads}
                  setChatThreads={updateAndSaveThreads}
                  activeChatThreadId={activeChatThreadId}
                  setActiveChatThreadId={setActiveChatThreadId}
                  onDeleteThread={(id) => requestDelete(id, 'chat')}
               />;
      case View.JOURNAL:
      default:
        return (
          <div className="flex-grow flex flex-col lg:grid lg:grid-cols-2 gap-6">
            <JournalEditor 
              saveEntry={saveJournalEntry} 
              pastEntries={journalEntries} 
              conversationHistory={conversationHistory}
            />
            <JournalFeed 
              entries={journalEntries} 
              onChatAbout={handleStartChatAboutEntry}
              onTalkAbout={handleStartTalkAboutEntry}
              onDelete={(id) => requestDelete(id, 'journal')}
              onEdit={handleStartEdit}
            />
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
      <JournalEditModal 
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveEditedEntry}
          entry={editingEntry}
      />
      <ConfirmationModal 
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          title="Confirm Deletion"
          message={
              itemToDelete?.type === 'journal' 
              ? "Are you sure you want to delete this journal entry? This will also delete any chat conversations associated with it. This action cannot be undone."
              : "Are you sure you want to delete this chat conversation? This action cannot be undone."
          }
      />
    </div>
  );
};

export default App;