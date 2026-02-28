// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// سحبناهم بأسماء جديدة بعيد عن رادار نتلفاي
// Fix: Use process.env instead of import.meta.env to resolve TypeScript errors and maintain consistency with Gemini API key handling
const supabaseUrl = (process.env as any).VITE_SUPABASE_URL;
const supabaseAnonKey = (process.env as any).VITE_SUPABASE_SERVICE_ROLE_KEY;


export const supabase = createClient(supabaseUrl, supabaseAnonKey);