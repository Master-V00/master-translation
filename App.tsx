import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { Navbar } from './components/Navbar';
import { useLanguage } from './components/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { ProfileView } from './components/ProfileView';
import { StoreView } from './components/StoreView';
import { PaymentView } from './components/PaymentView';
import { ViewType, StoreProduct } from './types';
import { AuthProvider } from './components/AuthContext';

const AppContent: React.FC = () => {
  const { dir } = useLanguage();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedPlan, setSelectedPlan] = useState<StoreProduct | null>(null);
  
  // Initialize sidebar based on screen width
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const [storeSection, setStoreSection] = useState<'top' | 'packs'>('top');

  const handleSubscribe = (plan: StoreProduct) => {
    setSelectedPlan(plan);
    setCurrentView('payment');
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'profile':
        return <ProfileView 
          onUpgrade={() => {
            setStoreSection('top');
            setCurrentView('store');
          }}
          onBuyCredits={() => {
            setStoreSection('packs');
            setCurrentView('store');
          }}
        />;
      case 'store':
        return <StoreView onSubscribe={handleSubscribe} scrollToPacks={storeSection === 'packs'} />;
      case 'payment':
        if (!selectedPlan) {
          setCurrentView('store');
          return null;
        }
        return (
          <PaymentView 
            plan={selectedPlan} 
            onBack={() => setCurrentView('store')} 
            onConfirm={() => setCurrentView('home')} 
          />
        );
      default:
        return <HomeView />;
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300" dir={dir}>
      {/* Sidebar Layout */}
      <div className="flex flex-col md:flex-row min-h-screen">
        
        <Sidebar 
          currentView={currentView} 
          setView={(view) => {
            // Reset store section when navigating via sidebar
            if (view === 'store') setStoreSection('top');
            setCurrentView(view);
          }} 
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar toggleSidebar={toggleSidebar} />
          <main className="flex-1 relative">
            {renderView()}
          </main>
        </div>
      </div>
    </div>
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