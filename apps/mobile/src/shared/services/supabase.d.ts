import { User } from '@/shared/types';
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare const supabaseAuth: {
    signIn: (email: string, password: string) => Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        session: import("@supabase/supabase-js").AuthSession;
    }>;
    signUp: (email: string, password: string, metadata?: any) => Promise<{
        user: import("@supabase/supabase-js").AuthUser | null;
        session: import("@supabase/supabase-js").AuthSession | null;
    }>;
    signOut: () => Promise<void>;
    getSession: () => Promise<import("@supabase/supabase-js").AuthSession | null>;
    getUser: () => Promise<import("@supabase/supabase-js").AuthUser>;
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
        data: {
            subscription: import("@supabase/supabase-js").Subscription;
        };
    };
    refreshSession: () => Promise<import("@supabase/supabase-js").AuthSession | null>;
};
export declare const mapSupabaseUser: (supabaseUser: any) => User;
export declare const getAuthTokens: (session: any) => {
    accessToken: any;
    refreshToken: any;
    expiresAt: number;
} | null;
export default supabase;
//# sourceMappingURL=supabase.d.ts.map