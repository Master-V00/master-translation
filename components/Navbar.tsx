import React from 'react';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { Moon, Sun, Globe } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 overflow-hidden rounded-lg flex items-center justify-center bg-gray-100 dark:bg-slate-800">
              <img 
                src="/logo.png" 
                alt="MT" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-brand-500');
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-white font-bold text-xs">MT</span>';
                }}
              />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400 font-[Cairo] tracking-wide">
              {t('appTitle')}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
              aria-label="Switch Language"
            >
              <Globe size={18} />
              <span>{language === 'en' ? 'Arabic' : 'English'}</span>
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-2" />

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
  );
};