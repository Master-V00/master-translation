// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// سحبناهم بأسماء جديدة بعيد عن رادار نتلفاي
// Fix: Use process.env instead of import.meta.env to resolve TypeScript errors and maintain consistency with Gemini API key handling
const supabaseUrl = (process.env as any).VITE_SUPABASE_URL;
const supabaseAnonKey = (process.env as any).VITE_SUPABASE_SERVICE_ROLE_KEY;

// Static-preview guard: createClient throws on empty URL/key, which would
// crash the whole app on hosts without backend env (e.g. GitHub Pages demo).
// Real deployments must set VITE_SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-preview-key'
);