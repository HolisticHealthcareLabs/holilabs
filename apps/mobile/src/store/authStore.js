"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const storage_1 = require("@/shared/services/storage");
const supabase_1 = require("@/shared/services/supabase");
// Custom storage adapter for MMKV
const mmkvStorage = {
    getItem: (name) => {
        return storage_1.storage.getString(name) ?? null;
    },
    setItem: (name, value) => {
        storage_1.storage.set(name, value);
    },
    removeItem: (name) => {
        storage_1.storage.delete(name);
    },
};
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
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
        storage_1.storage.delete(storage_1.STORAGE_KEYS.AUTH_TOKEN);
        storage_1.storage.delete(storage_1.STORAGE_KEYS.REFRESH_TOKEN);
        storage_1.storage.delete(storage_1.STORAGE_KEYS.USER_DATA);
    },
    setHasHydrated: (hydrated) => {
        set({ _hasHydrated: hydrated });
    },
    // Supabase Auth Actions
    signIn: async (email, password) => {
        try {
            const { user: supabaseUser, session } = await supabase_1.supabaseAuth.signIn(email, password);
            if (supabaseUser && session) {
                const user = (0, supabase_1.mapSupabaseUser)(supabaseUser);
                const tokens = (0, supabase_1.getAuthTokens)(session);
                if (tokens) {
                    set({
                        user,
                        tokens,
                        isAuthenticated: true,
                    });
                }
            }
        }
        catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    },
    signUp: async (email, password, metadata) => {
        try {
            const { user: supabaseUser, session } = await supabase_1.supabaseAuth.signUp(email, password, metadata);
            if (supabaseUser && session) {
                const user = (0, supabase_1.mapSupabaseUser)(supabaseUser);
                const tokens = (0, supabase_1.getAuthTokens)(session);
                if (tokens) {
                    set({
                        user,
                        tokens,
                        isAuthenticated: true,
                    });
                }
            }
        }
        catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    },
    signOut: async () => {
        try {
            await supabase_1.supabaseAuth.signOut();
            // Clear auth state
            set({
                user: null,
                tokens: null,
                isAuthenticated: false,
            });
            // Clear sensitive data from storage
            storage_1.storage.delete(storage_1.STORAGE_KEYS.AUTH_TOKEN);
            storage_1.storage.delete(storage_1.STORAGE_KEYS.REFRESH_TOKEN);
            storage_1.storage.delete(storage_1.STORAGE_KEYS.USER_DATA);
        }
        catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    },
    initializeAuth: async () => {
        try {
            const session = await supabase_1.supabaseAuth.getSession();
            if (session?.user) {
                const user = (0, supabase_1.mapSupabaseUser)(session.user);
                const tokens = (0, supabase_1.getAuthTokens)(session);
                if (tokens) {
                    set({
                        user,
                        tokens,
                        isAuthenticated: true,
                    });
                }
            }
        }
        catch (error) {
            console.error('Auth initialization error:', error);
            // Don't throw here as this runs on app start
        }
    },
}), {
    name: 'auth-storage',
    storage: (0, middleware_1.createJSONStorage)(() => mmkvStorage),
    onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
    },
}));
//# sourceMappingURL=authStore.js.map