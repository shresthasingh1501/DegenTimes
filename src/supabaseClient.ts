import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type { UserPreferences } from './components/OnboardingWizard';
import { UserPreferences } from './components/OnboardingWizard';

export interface SupabaseUserData {
  user_email: string;
  preferences: UserPreferences | null;
  created_at?: string;
  updated_at?: string; // General row update timestamp (managed by Supabase usually)
  preference_update?: string | null; // <<< ADDED: Specific timestamp for preference changes
  telegramid?: string | null;
  tele_update_rate?: number | null;
  ispro?: boolean | null;
  watchlist?: string | null;
  sector?: string | null;
  narrative?: string | null;
  isenterprise?: boolean | null;
}
