/**
 * OTP Authentication System
 *
 * SMS-based One-Time Password for patient authentication backup
 * Features:
 * - 6-digit random codes
 * - SHA-256 hashing for security
 * - 10-minute expiration
 * - 3 attempt limit per code
 * - Rate limiting
 * - Twilio SMS integration
 */
interface GenerateOTPOptions {
    phone: string;
    channel?: 'SMS' | 'WHATSAPP';
}
interface OTPResult {
    success: boolean;
    code?: string;
    expiresAt?: Date;
    error?: string;
}
/**
 * Generate and send OTP code
 */
export declare function generateOTP({ phone, channel, }: GenerateOTPOptions): Promise<OTPResult>;
/**
 * Verify OTP code
 */
export declare function verifyOTP(phone: string, code: string): Promise<{
    success: boolean;
    patientUser?: any;
    error?: string;
    attemptsLeft?: number;
}>;
/**
 * Clean up expired OTP codes (run via cron job)
 */
export declare function cleanupExpiredOTPs(): Promise<number>;
export {};
//# sourceMappingURL=otp.d.ts.map