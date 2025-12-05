export interface TranslationResult {
  extracted: string;
  translated: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  result?: TranslationResult;
  error?: string;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}
