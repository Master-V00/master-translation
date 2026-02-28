
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

export interface MangaImage {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface HistoryItem {
  fileName: string;
  extracted: string;
  translated: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  date: string;
  items: HistoryItem[];
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

export enum MergeMode {
  PAGES = 'PAGES',
  PIXELS = 'PIXELS',
  CROP = 'CROP',
}

export enum CropSubMode {
  SEPARATE = 'SEPARATE',
  DELETE = 'DELETE',
}

export enum OutputFormat {
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  WEBP = 'image/webp',
}

export interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
}

export type TranslationKey = string;

export type TargetLanguage = 'English' | 'Arabic' | 'French' | 'German';
export type AppLanguage = 'en' | 'ar';

export interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

export type ViewType = 'home' | 'profile' | 'store' | 'payment' | 'admin';

export interface StoreProduct {
  id: string;
  type: 'subscription' | 'pack';
  nameKey: string;
  price: string;
  durationKey?: string; // For subscriptions
  credits?: number;     // For packs
  features: string[];
}

export type SubscriptionTier = 'free' | 'pro' | 'pro-max' | 'master';

export interface SymbolSet {
  id: string;
  name: string;
  symbols: Record<string, string>;
  createdAt: number;
}

export interface Offer {
  id: string;
  slug: string;
  coins_amount: number;
  active: boolean;
  expires_at: string;
  created_at: string;
  short_link?: string;
}

export interface TermReplacement {
  id: string;
  original: string;
  replacement: string;
}
