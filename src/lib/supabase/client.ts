import { createClient, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — set them in .env.local'
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'placeholder',
  {
    auth: {
      // Persist + auto-refresh so users stay signed in across visits.
      // Access JWTs last up to 1 week (project jwt_exp); refresh tokens
      // do not expire unless time-box / inactivity timeouts are set.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
