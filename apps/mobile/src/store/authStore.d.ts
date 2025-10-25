import { User, AuthTokens } from '@/shared/types';
type AuthState = {
    user: User | null;
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
    _hasHydrated: boolean;
    setAuth: (user: User, tokens: AuthTokens) => void;
    updateUser: (user: Partial<User>) => void;
    updateTokens: (tokens: AuthTokens) => void;
    logout: () => void;
    setHasHydrated: (hydrated: boolean) => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, metadata?: any) => Promise<void>;
    signOut: () => Promise<void>;
    initializeAuth: () => Promise<void>;
};
export declare const useAuthStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AuthState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AuthState, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AuthState) => void) => () => void;
        onFinishHydration: (fn: (state: AuthState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AuthState, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=authStore.d.ts.map