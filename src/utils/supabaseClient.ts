import { createClient } from '@supabase/supabase-js';

// Configure these environment variables in your Vite env (e.g., .env.local):
// VITE_SUPABASE_URL=your_supabase_project_url
// VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
// VITE_SUPABASE_STORAGE_BUCKET=recordings

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear error early if env is missing
  // Add your Supabase URL and anon key to .env.local as noted above
  console.error('Supabase env vars missing: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const STORAGE_BUCKET = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string) || 'recordings';


