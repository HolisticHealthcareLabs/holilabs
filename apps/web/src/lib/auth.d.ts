/**
 * NextAuth Configuration
 *
 * Handles clinician authentication via Supabase
 */
import { NextAuthOptions } from 'next-auth';
export declare const authOptions: NextAuthOptions;
/**
 * Get user session token for Socket.io authentication
 */
export declare function getUserSessionToken(userId: string): Promise<string | null>;
/**
 * Verify Socket.io authentication token
 */
export declare function verifySocketToken(token: string): Promise<{
    userId: string;
    userType: 'CLINICIAN' | 'PATIENT';
} | null>;
//# sourceMappingURL=auth.d.ts.map