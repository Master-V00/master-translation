
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { Navbar } from './components/Navbar';
import { useLanguage } from './components/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { ProfileView } from './components/ProfileView';
import { StoreView } from './components/StoreView';
import { PaymentView } from './components/PaymentView';
import { AdminView } from './components/AdminView';
import { SupportView } from './components/SupportView';
import { StoreProduct } from './types';
import { AuthProvider, useAuth } from './components/AuthContext';
import { supabase } from './services/supabaseClient';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import EditorApp from './components/EditorApp'; // ملف App بتاع المشروع الفرعي

const AppContent: React.FC = () => {
  const { dir } = useLanguage();
  const { user } = useAuth();
  
  // Initialize sidebar based on screen width
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

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
              <Route path="/shop" element={<StoreWrapper />} />
              <Route path="/payment" element={<PaymentWrapper />} />
              <Route path="/admin" element={<AdminView />} />
              <Route path="/merger" element={<EditorApp />} />
              <Route path="/support" element={<SupportView />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

const ProfileWrapper = () => {
  const navigate = useNavigate();
  return (
    <ProfileView 
      onUpgrade={() => navigate('/shop')}
      onBuyCredits={() => navigate('/shop', { state: { scrollToPacks: true } })}
    />
  );
};

const StoreWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { scrollToPacks?: boolean } | null;
  
  return (
    <StoreView 
      onSubscribe={(plan) => navigate('/payment', { state: { plan } })} 
      scrollToPacks={state?.scrollToPacks} 
    />
  );
};

const PaymentWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { plan: StoreProduct } | null;

  if (!state?.plan) {
    return <Navigate to="/shop" replace />;
  }

  return (
    <PaymentView 
      plan={state.plan} 
      onBack={() => navigate('/shop')} 
      onConfirm={() => navigate('/')} 
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
