/**
 * Input Sanitization & Validation
 * Prevents prompt injection, XSS, and other injection attacks
 *
 * SECURITY: Used to sanitize user inputs before AI processing
 */
/**
 * Sanitize user input before sending to AI
 * @param input - Raw user input
 * @param options - Sanitization options
 * @returns Sanitized input safe for AI processing
 */
export interface SanitizeOptions {
    maxLength?: number;
    allowHtml?: boolean;
    removeUrls?: boolean;
    removeEmails?: boolean;
}
export declare function sanitizeAIInput(input: string, options?: SanitizeOptions): string;
/**
 * Escape HTML special characters to prevent XSS
 * Use this for user-generated content that will be rendered in HTML
 */
export declare function escapeHtml(text: string): string;
/**
 * Remove all HTML tags from string
 */
export declare function stripHtml(html: string): string;
/**
 * Escape SQL special characters
 * Note: This is a backup - always use parameterized queries (Prisma does this)
 */
export declare function escapeSql(input: string): string;
/**
 * Validate and format phone number to E.164 format
 * @param phone - Phone number in any format
 * @returns Formatted phone number or null if invalid
 */
export declare function validatePhone(phone: string): string | null;
/**
 * Validate email address
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export declare function validateEmail(email: string): boolean;
/**
 * Validate medication dose format
 * @param dose - Dose string (e.g., "500mg", "10ml")
 * @returns true if valid format
 */
export declare function validateDose(dose: string): boolean;
/**
 * Check if input contains only safe characters
 * Useful for names, IDs, etc.
 */
export declare function isSafeString(input: string, allowSpaces?: boolean): boolean;
/**
 * Remove dangerous characters from string
 */
export declare function sanitizeString(input: string): string;
/**
 * Test sanitization functions
 */
export declare function testSanitization(): void;
//# sourceMappingURL=input-sanitization.d.ts.map