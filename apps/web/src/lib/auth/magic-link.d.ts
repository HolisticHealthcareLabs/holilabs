/**
 * Magic Link Authentication System
 *
 * Industry-grade passwordless authentication for patients
 * Features:
 * - Crypto-secure token generation
 * - SHA-256 token hashing
 * - Time-based expiration (15 minutes)
 * - Single-use tokens
 * - IP address tracking
 * - Rate limiting protection
 */
interface GenerateMagicLinkOptions {
    email: string;
    ipAddress?: string;
    userAgent?: string;
}
interface MagicLinkResult {
    success: boolean;
    token?: string;
    magicLinkUrl?: string;
    expiresAt?: Date;
    error?: string;
}
/**
 * Generate and store a magic link for patient authentication
 */
export declare function generateMagicLink({ email, ipAddress, userAgent, }: GenerateMagicLinkOptions): Promise<MagicLinkResult>;
/**
 * Send magic link via email
 */
export declare function sendMagicLinkEmail(email: string, magicLinkUrl: string, patientName?: string): Promise<boolean>;
/**
 * Verify magic link token and return patient user
 */
export declare function verifyMagicLink(token: string): Promise<{
    success: boolean;
    patientUser?: any;
    error?: string;
}>;
/**
 * Clean up expired magic links (run via cron job)
 */
export declare function cleanupExpiredMagicLinks(): Promise<number>;
export {};
//# sourceMappingURL=magic-link.d.ts.map