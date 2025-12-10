import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageContextType, AppLanguage } from '../types';

const translations = {
  en: {
    appTitle: "MASTER TRANSLATOR",
    subtitle: "Upload raw Manga/Manhwa pages (or a ZIP file).\nAI extracts text and translates it using strict Scanlation formatting.",
    uploadTitle: "Click to upload Images or ZIP",
    uploadDesc: "JPG, PNG, WEBP, or ZIP archive containing images",
    pagesLoaded: "Pages Loaded",
    clear: "Clear",
    useSymbols: "Use Symbols",
    copyAll: "Copy Translation",
    copyAllExtracted: "Copy Extracted",
    translateAll: "Translate All Pending",
    translate: "Translate",
    retranslate: "Retranslate",
    retry: "Retry",
    done: "Done",
    queued: "Queued",
    processing: "Translating...",
    error: "Error",
    extracted: "Extracted Text",
    translated: "Translation",
    targetLang: "Target Language",
    noImages: "No images uploaded yet.",
    copySuccess: "Copied to clipboard!",
    unzipError: "Failed to unzip file",
    unknownError: "An unknown error occurred",
    analyzing: "Analyzing visuals and translating...",
  },
  ar: {
    appTitle: "MASTER TRANSLATOR",
    subtitle: "ارفع صفحات المانجا/المانهوا (أو ملف ZIP).\nالذكاء الاصطناعي يستخرج النص ويترجمه باستخدام تنسيق الفصول الدقيق.",
    uploadTitle: "اضغط لرفع الصور أو ملف ZIP",
    uploadDesc: "JPG, PNG, WEBP, أو ملف مضغوط يحتوي على صور",
    pagesLoaded: "صفحات تم تحميلها",
    clear: "مسح الكل",
    useSymbols: "استخدام الرموز",
    copyAll: "نسخ الترجمة",
    copyAllExtracted: "نسخ النص الأصلي",
    translateAll: "ترجمة الكل",
    translate: "ترجمة",
    retranslate: "إعادة الترجمة",
    retry: "إعادة المحاولة",
    done: "تم",
    queued: "في الانتظار",
    processing: "جاري الترجمة...",
    error: "خطأ",
    extracted: "النص المستخرج",
    translated: "الترجمة",
    targetLang: "لغة الترجمة",
    noImages: "لم يتم رفع صور بعد.",
    copySuccess: "تم النسخ للحافظة!",
    unzipError: "فشل فك ضغط الملف",
    unknownError: "حدث خطأ غير معروف",
    analyzing: "جاري تحليل الصور والترجمة...",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<AppLanguage>('en');

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.body.dir = dir;
    if (language === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [dir, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};