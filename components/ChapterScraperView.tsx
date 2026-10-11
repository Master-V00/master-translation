import React from 'react';
import { useLanguage } from './LanguageContext';
import { Globe } from 'lucide-react';

// Placeholder view: the /scraper route exists in the sidebar but this
// screen was never included in the archived versions. It renders a
// themed "coming soon" card instead of crashing the router.
const ChapterScraperView: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
          <Globe size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3 font-[Cairo]">
          {language === 'ar' ? 'كاشط الفصول' : 'Chapter Scraper'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {language === 'ar'
            ? 'هذه الشاشة قيد التطوير — ترقبوا إطلاقها قريباً.'
            : 'This screen is under development — coming soon.'}
        </p>
      </div>
    </div>
  );
};

export default ChapterScraperView;
