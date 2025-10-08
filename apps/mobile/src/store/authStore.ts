import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthTokens } from '@/shared/types';
import { storage, STORAGE_KEYS } from '@/shared/services/storage';
import { supabaseAuth, mapSupabaseUser, getAuthTokens } from '@/shared/services/supabase';

type AuthState = {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void;
  updateUser: (user: Partial<User>) => void;
  updateTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  setHasHydrated: (hydrated: boolean) => void;

  // Supabase Auth Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
};

// Custom storage adapter for MMKV
const mmkvStorage = {
  getItem: (name: string): string | null => {
    return storage.getString(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.delete(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, tokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
        });
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }));
      },

      updateTokens: (tokens) => {
        set({ tokens });
      },

      logout: () => {
        // Clear auth state
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        });

        // Clear sensitive data from storage
        storage.delete(STORAGE_KEYS.AUTH_TOKEN);
        storage.delete(STORAGE_KEYS.REFRESH_TOKEN);
        storage.delete(STORAGE_KEYS.USER_DATA);
      },

      setHasHydrated: (hydrated) => {
        set({ _hasHydrated: hydrated });
      },

      // Supabase Auth Actions
      signIn: async (email: string, password: string) => {
        try {
          const { user: supabaseUser, session } = await supabaseAuth.signIn(email, password);
          
          if (supabaseUser && session) {
            const user = mapSupabaseUser(supabaseUser);
            const tokens = getAuthTokens(session);
            
            if (tokens) {
              set({
                user,
                tokens,
                isAuthenticated: true,
              });
            }
          }
        } catch (error) {
          console.error('Sign in error:', error);
          throw error;
        }
      },

      signUp: async (email: string, password: string, metadata?: any) => {
        try {
          const { user: supabaseUser, session } = await supabaseAuth.signUp(email, password, metadata);
          
          if (supabaseUser && session) {
            const user = mapSupabaseUser(supabaseUser);
            const tokens = getAuthTokens(session);
            
            if (tokens) {
              set({
                user,
                tokens,
                isAuthenticated: true,
              });
            }
          }
        } catch (error) {
          console.error('Sign up error:', error);
          throw error;
        }
      },

      signOut: async () => {
        try {
          await supabaseAuth.signOut();
          
          // Clear auth state
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
          });

          // Clear sensitive data from storage
          storage.delete(STORAGE_KEYS.AUTH_TOKEN);
          storage.delete(STORAGE_KEYS.REFRESH_TOKEN);
          storage.delete(STORAGE_KEYS.USER_DATA);
        } catch (error) {
          console.error('Sign out error:', error);
          throw error;
        }
      },

      initializeAuth: async () => {
        try {
          const session = await supabaseAuth.getSession();
          
          if (session?.user) {
            const user = mapSupabaseUser(session.user);
            const tokens = getAuthTokens(session);
            
            if (tokens) {
              set({
                user,
                tokens,
                isAuthenticated: true,
              });
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Don't throw here as this runs on app start
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
