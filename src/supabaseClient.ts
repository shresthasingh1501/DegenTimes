// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the structure of your preferences data in Supabase
export interface SupabaseUserPreferences {
  user_email: string; // Primary Key
  preferences: UserPreferences; // Stored as JSONB
  created_at?: string; // Optional: Supabase adds this automatically
  updated_at?: string; // Optional: Supabase adds this automatically
}

// Re-export UserPreferences if not already globally available
// If UserPreferences is defined elsewhere (e.g., OnboardingWizard), import it here.
// Example: import { UserPreferences } from './components/OnboardingWizard';
export type { UserPreferences } from './components/OnboardingWizard'; // Assuming it's exported there
