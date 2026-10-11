
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { Navbar } from './components/Navbar';
import { useLanguage } from './components/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import { SupportView } from './components/SupportView';
import { FreeCoinsView } from './components/FreeCoinsView';
import { EarnCoinsView } from './components/EarnCoinsView';
import { HistoryView } from './components/HistoryView';
import { AuthProvider, useAuth } from './components/AuthContext';
import { supabase } from './services/supabaseClient';
import { getUserApiKey } from './services/geminiService';
import { ApiKeyPrompt } from './components/ApiKeyPrompt';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import EditorApp from './components/EditorApp'; // ملف App بتاع المشروع الفرعي
import { CoverDesignView } from './components/CoverDesignView';
import { MangaReaderView } from './components/MangaReaderView';
import ChapterScraperView from './components/ChapterScraperView';
import { X, Megaphone } from 'lucide-react';

const AppContent: React.FC = () => {
  const { dir } = useLanguage();
  const { user } = useAuth();
  
  // States for Global Message
  const [globalMessage, setGlobalMessage] = useState<{ title: string; main_message: string } | null>(null);
  const [showGlobalPopup, setShowGlobalPopup] = useState(false);

  // Personal API key prompt (BYOK): shown once on startup when no key is saved
  const [showKeyPrompt, setShowKeyPrompt] = useState<boolean>(() => !getUserApiKey());

  // Initialize sidebar based on screen width
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Check for global message on mount
  useEffect(() => {
    const fetchGlobalMessage = async () => {
      try {
        const { data, error } = await supabase
          .from('api_messages')
          .select('message, title, main_message')
          .eq('id', 1)
          .maybeSingle();

        if (!error && data && data.message === true) {
          setGlobalMessage({ title: data.title, main_message: data.main_message });
          setShowGlobalPopup(true);
        }
      } catch (err) {
        console.error('Error fetching global message:', err);
      }
    };
    fetchGlobalMessage();
  }, []);

  // Update last_seen when user is authenticated using RPC
  useEffect(() => {
    if (user) {
      const touchLastSeen = async () => {
        try {
          // Use RPC 'touch_user_activity' which handles permissions (SECURITY DEFINER)
          // and sets timestamp to Postgres now()
          const { error } = await supabase.rpc('touch_user_activity');

          if (error) {
            console.error('Error updating last_seen via RPC:', error);
          }
        } catch (err) {
          console.error('Error calling touchLastSeen:', err);
        }
      };
      touchLastSeen();
    }
  }, [user]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300" dir={dir}>
      {/* Sidebar Layout */}
      <div className="flex flex-col md:flex-row min-h-screen">
        
        <Sidebar 
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar toggleSidebar={toggleSidebar} />
          <main className="flex-1 relative">
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/profile" element={<ProfileWrapper />} />
              <Route path="/admin" element={<AdminView />} />
              <Route path="/merger" element={<EditorApp />} />
              <Route path="/cover-design" element={<CoverDesignView />} />
              <Route path="/viewer-manga" element={<MangaReaderView />} />
              <Route path="/scraper" element={<ChapterScraperView />} />
              <Route path="/history" element={<HistoryView />} />
              <Route path="/support" element={<SupportView />} />
              <Route path="/earn" element={<EarnCoinsView />} />
              <Route path="/free-coins/:slug" element={<FreeCoinsView />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* Personal API key prompt */}
      {showKeyPrompt && <ApiKeyPrompt onDone={() => setShowKeyPrompt(false)} />}

      {/* Global Message Modal */}
      {showGlobalPopup && globalMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-2xl text-brand-600 dark:text-brand-400">
                  <Megaphone size={32} />
                </div>
                <button 
                  onClick={() => setShowGlobalPopup(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 font-[Cairo] leading-tight">
                {globalMessage.title}
              </h2>
              
              <div className="bg-gray-50 dark:bg-slate-950/50 rounded-2xl p-6 mb-6 border border-gray-100 dark:border-slate-800/50">
                <p className="text-gray-700 dark:text-gray-200 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                  {globalMessage.main_message}
                </p>
              </div>

              <button
                onClick={() => setShowGlobalPopup(false)}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 transition-all active:scale-95 text-lg"
              >
                فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileWrapper = () => {
  const navigate = useNavigate();
  return (
    <ProfileView
      onUpgrade={() => navigate('/earn')}
      onBuyCredits={() => navigate('/earn')}
    />
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
