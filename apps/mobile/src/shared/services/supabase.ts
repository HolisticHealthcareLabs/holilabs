import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { User } from '@/shared/types';

// Get Supabase credentials from app.json extra field
const getEnvVar = (key: string): string => {
  const value = Constants.expoConfig?.extra?.[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Persist session in secure storage
    persistSession: true,
    // Detect session from URL (for deep linking)
    detectSessionInUrl: false,
  },
});

// Auth helper functions
export const supabaseAuth = {
  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return {
      user: data.user,
      session: data.session,
    };
  },

  // Sign up with email and password
  signUp: async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;

    return {
      user: data.user,
      session: data.session,
    };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // Get current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Refresh session
  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },
};

// Helper to convert Supabase user to our User type
export const mapSupabaseUser = (supabaseUser: any): User => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.user_metadata?.name || supabaseUser.email,
    role: supabaseUser.user_metadata?.role || 'doctor',
    specialty: supabaseUser.user_metadata?.specialty,
    licenseNumber: supabaseUser.user_metadata?.licenseNumber,
  };
};

// Helper to get auth tokens from session
export const getAuthTokens = (session: any) => {
  if (!session) return null;

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at * 1000, // Convert to milliseconds
  };
};

export default supabase;

