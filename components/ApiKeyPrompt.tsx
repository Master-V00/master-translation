import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { setUserApiKey } from '../services/geminiService';
import { KeyRound, X } from 'lucide-react';

// Startup popup: asks the visitor for their own Gemini API key (BYOK)
// so translation works immediately without any backend setup.
// The key is stored only in the browser's localStorage - it never
// leaves the device except in direct calls to Google's API.
export const ApiKeyPrompt: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { language } = useLanguage();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const clean = key.trim().replace(/[\n\r]/g, '');
    if (!clean) {
      setError(language === 'ar' ? 'من فضلك الصق مفتاحاً صحيحاً' : 'Please paste a valid key');
      return;
    }
    setUserApiKey(clean);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-2xl text-brand-600 dark:text-brand-400">
              <KeyRound size={28} />
            </div>
            <button
              onClick={onDone}
              aria-label="Close"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 font-[Cairo]">
            {language === 'ar' ? 'مفتاح الترجمة الخاص بك' : 'Your translation key'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-5">
            {language === 'ar'
              ? 'الصق مفتاح Gemini الخاص بك لتعمل الترجمة فوراً من جهازك مباشرة. يُحفظ في متصفحك فقط ولا يُرسل لأي مكان آخر.'
              : 'Paste your own Gemini key so translation works instantly, straight from your device. It stays in your browser only.'}
          </p>

          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="AIza..."
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500 transition-colors mb-2"
          />
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-brand-600 dark:text-brand-400 hover:underline mb-4"
          >
            {language === 'ar' ? 'احصل على مفتاح مجاني من Google AI Studio ←' : 'Get a free key from Google AI Studio →'}
          </a>

          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 transition-all active:scale-95 mb-2"
          >
            {language === 'ar' ? 'حفظ وبدء الترجمة' : 'Save & start translating'}
          </button>
          <button
            onClick={onDone}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors uppercase tracking-widest"
          >
            {language === 'ar' ? '[ تخطي ]' : '[ skip ]'}
          </button>
        </div>
      </div>
    </div>
  );
};
