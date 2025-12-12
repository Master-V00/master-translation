export interface TranslationResult {
  extracted: string;
  translated: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'queued' | 'waiting';
  result?: TranslationResult;
  error?: string;
  cooldownEndsAt?: number;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

export type TargetLanguage = 'English' | 'Arabic' | 'French' | 'German';
export type AppLanguage = 'en' | 'ar';

export interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}