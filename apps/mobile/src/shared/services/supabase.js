"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthTokens = exports.mapSupabaseUser = exports.supabaseAuth = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const expo_constants_1 = __importDefault(require("expo-constants"));
// Get Supabase credentials from app.json extra field
const getEnvVar = (key) => {
    const value = expo_constants_1.default.expoConfig?.extra?.[key];
    if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
};
const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');
// Create Supabase client
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
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
exports.supabaseAuth = {
    // Sign in with email and password
    signIn: async (email, password) => {
        const { data, error } = await exports.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error)
            throw error;
        return {
            user: data.user,
            session: data.session,
        };
    },
    // Sign up with email and password
    signUp: async (email, password, metadata) => {
        const { data, error } = await exports.supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });
        if (error)
            throw error;
        return {
            user: data.user,
            session: data.session,
        };
    },
    // Sign out
    signOut: async () => {
        const { error } = await exports.supabase.auth.signOut();
        if (error)
            throw error;
    },
    // Get current session
    getSession: async () => {
        const { data, error } = await exports.supabase.auth.getSession();
        if (error)
            throw error;
        return data.session;
    },
    // Get current user
    getUser: async () => {
        const { data, error } = await exports.supabase.auth.getUser();
        if (error)
            throw error;
        return data.user;
    },
    // Listen to auth state changes
    onAuthStateChange: (callback) => {
        return exports.supabase.auth.onAuthStateChange(callback);
    },
    // Refresh session
    refreshSession: async () => {
        const { data, error } = await exports.supabase.auth.refreshSession();
        if (error)
            throw error;
        return data.session;
    },
};
// Helper to convert Supabase user to our User type
const mapSupabaseUser = (supabaseUser) => {
    return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email,
        role: supabaseUser.user_metadata?.role || 'doctor',
        specialty: supabaseUser.user_metadata?.specialty,
        licenseNumber: supabaseUser.user_metadata?.licenseNumber,
    };
};
exports.mapSupabaseUser = mapSupabaseUser;
// Helper to get auth tokens from session
const getAuthTokens = (session) => {
    if (!session)
        return null;
    return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at * 1000, // Convert to milliseconds
    };
};
exports.getAuthTokens = getAuthTokens;
exports.default = exports.supabase;
//# sourceMappingURL=supabase.js.map