import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Define __dirname manually as it is not available in ESM by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      // تحديد الـ root لأنه مفيش مجشلد src
      root: '.',
      base: '/master-translation/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // تأكد إن الأسماء دي هي اللي بتستخدمها في الكود فعلاً
        // Fix: Explicitly define environment variables for process.env access in the frontend
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
        'process.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? ''),
      },
      resolve: {
        alias: {
          // الـ @ دلوقتي هيشاور على المجلد الرئيسي مباشرة
          // Fix: Use the manually defined __dirname to resolve path
          '@': path.resolve(__dirname, './'),
        },
      },
      build: {
        // عشان يجمع الملفات اللي بره صح
        outDir: 'dist',
        rollupOptions: {
          input: {
            // Fix: Use the manually defined __dirname to resolve path
            main: path.resolve(__dirname, 'index.html'),
          },
        },
      },
    };
});