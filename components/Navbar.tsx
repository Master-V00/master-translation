import React, { useState } from 'react';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { Moon, Sun, Globe, Info, X, Menu, Coins } from 'lucide-react';
import { useAuth } from './AuthContext';

interface NavbarProps {
  toggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, balance } = useAuth();
  const [showInstructions, setShowInstructions] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <>
      <nav className="sticky top-0 z-30 w-full border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0">
              {/* Menu Button - ALWAYS Visible */}
              <button
                onClick={toggleSidebar}
                className="p-2 me-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                title={t('toggleMenu')}
              >
                <Menu size={24} />
              </button>

              {/* Branding (Logo + Title) */}
              <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse min-w-0">
                <img src={import.meta.env.BASE_URL + 'logo.png'} alt="Logo" className="w-8 h-8 rounded-lg flex-shrink-0 object-contain" />
                <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400 font-[Cairo] tracking-wide truncate">
                  {t('appTitle')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse flex-shrink-0">
              {/* Coin Balance (Only if Logged In) */}
              {user && (
                <>
                  <div className="hidden sm:flex items-center space-x-1 rtl:space-x-reverse px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                    <Coins size={16} className="fill-current" />
                    <span className="font-bold text-sm">{balance}</span>
                  </div>
                  <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-0.5 sm:mx-1" />
                </>
              )}

              <button
                onClick={() => setShowInstructions(true)}
                className="flex items-center space-x-1 rtl:space-x-reverse px-2 sm:px-3 py-1.5 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:bg-brand-900/30 transition-colors text-sm font-medium"
              >
                <Info size={18} />
                <span className="hidden sm:inline">{t('instructions')}</span>
              </button>

              <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-0.5 sm:mx-1" />

              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-1 rtl:space-x-reverse px-2 sm:px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                aria-label="Switch Language"
              >
                <Globe size={18} />
                <span className="hidden sm:inline">{language === 'en' ? 'Arabic' : 'English'}</span>
                <span className="sm:hidden font-bold text-xs">{language === 'en' ? 'AR' : 'EN'}</span>
              </button>

              <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-0.5 sm:mx-2" />

              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Toggle Dark Mode"
              >
                {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowInstructions(false)}>
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-brand-600 dark:text-brand-400">
                <Info size={24} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('instructions')}</h3>
              </div>
              <button 
                onClick={() => setShowInstructions(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-lg p-4 mb-6">
              <p className="whitespace-pre-line text-gray-800 dark:text-gray-200 text-base leading-relaxed font-medium">
                {t('instructionsContent')}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-medium transition-colors"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};