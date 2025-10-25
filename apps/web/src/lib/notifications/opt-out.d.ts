/**
 * Opt-Out Token Generation
 * TCPA & CAN-SPAM Compliance
 */
/**
 * Encrypt patient ID to create opt-out token
 */
export declare function encryptPatientId(patientId: string): string;
/**
 * Generate opt-out URL for SMS
 */
export declare function generateSmsOptOutUrl(patientId: string, baseUrl?: string): string;
/**
 * Generate opt-out URL for email
 */
export declare function generateEmailOptOutUrl(patientId: string, baseUrl?: string): string;
/**
 * Generate opt-out URL for all communications
 */
export declare function generateOptOutUrl(patientId: string, baseUrl?: string): string;
/**
 * Generate short opt-out message for SMS (TCPA required)
 * Example: "Reply STOP to opt-out or visit: https://..."
 */
export declare function generateSmsOptOutText(patientId: string): string;
/**
 * Generate opt-out footer for emails (CAN-SPAM required)
 */
export declare function generateEmailOptOutFooter(patientId: string): string;
//# sourceMappingURL=opt-out.d.ts.map