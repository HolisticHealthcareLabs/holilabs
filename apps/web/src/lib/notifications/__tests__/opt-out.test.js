"use strict";
/**
 * Unit Tests: Opt-Out Utilities
 * Tests TCPA and CAN-SPAM compliant opt-out functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const opt_out_1 = require("../opt-out");
(0, globals_1.describe)('Opt-Out Utilities (TCPA & CAN-SPAM Compliance)', () => {
    const testPatientId = 'test-patient-123';
    const testBaseUrl = 'https://holilabs.com';
    // ===========================================================================
    // Token Encryption Tests
    // ===========================================================================
    (0, globals_1.describe)('encryptPatientId', () => {
        (0, globals_1.it)('should encrypt patient ID to a hex string', () => {
            const encrypted = (0, opt_out_1.encryptPatientId)(testPatientId);
            (0, globals_1.expect)(encrypted).toBeDefined();
            (0, globals_1.expect)(typeof encrypted).toBe('string');
            (0, globals_1.expect)(encrypted).toMatch(/^[a-f0-9]+$/); // Hex string
            (0, globals_1.expect)(encrypted.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should generate consistent token for same patient ID', () => {
            const token1 = (0, opt_out_1.encryptPatientId)(testPatientId);
            const token2 = (0, opt_out_1.encryptPatientId)(testPatientId);
            // Should be consistent with same IV (production should use random IV)
            (0, globals_1.expect)(token1).toBe(token2);
        });
        (0, globals_1.it)('should generate different tokens for different patient IDs', () => {
            const token1 = (0, opt_out_1.encryptPatientId)('patient-1');
            const token2 = (0, opt_out_1.encryptPatientId)('patient-2');
            (0, globals_1.expect)(token1).not.toBe(token2);
        });
        (0, globals_1.it)('should handle empty patient ID', () => {
            const token = (0, opt_out_1.encryptPatientId)('');
            (0, globals_1.expect)(token).toBeDefined();
            (0, globals_1.expect)(typeof token).toBe('string');
        });
        (0, globals_1.it)('should handle special characters in patient ID', () => {
            const specialPatientId = 'patient-123-@#$%';
            const token = (0, opt_out_1.encryptPatientId)(specialPatientId);
            (0, globals_1.expect)(token).toBeDefined();
            (0, globals_1.expect)(token).toMatch(/^[a-f0-9]+$/);
        });
    });
    // ===========================================================================
    // SMS Opt-Out URL Tests (TCPA Compliance)
    // ===========================================================================
    (0, globals_1.describe)('generateSmsOptOutUrl', () => {
        (0, globals_1.it)('should generate valid SMS opt-out URL', () => {
            const url = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId);
            (0, globals_1.expect)(url).toContain('/api/patients/preferences/opt-out');
            (0, globals_1.expect)(url).toContain('type=sms');
            (0, globals_1.expect)(url).toContain('token=');
        });
        (0, globals_1.it)('should use custom base URL when provided', () => {
            const customUrl = 'https://custom-domain.com';
            const url = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId, customUrl);
            (0, globals_1.expect)(url).toMatch(new RegExp(`^${customUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
            (0, globals_1.expect)(url).toContain('type=sms');
        });
        (0, globals_1.it)('should use default URL from env when no base URL provided', () => {
            const url = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId);
            // In test environment, uses localhost or env variable
            (0, globals_1.expect)(url).toMatch(/^https?:\/\//);
            (0, globals_1.expect)(url).toContain('/api/patients/preferences/opt-out');
        });
        (0, globals_1.it)('should include encrypted patient token', () => {
            const url = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId);
            const token = (0, opt_out_1.encryptPatientId)(testPatientId);
            (0, globals_1.expect)(url).toContain(`token=${token}`);
        });
        (0, globals_1.it)('should be URL-safe', () => {
            const url = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId);
            // Should be parseable as a URL
            (0, globals_1.expect)(() => new URL(url)).not.toThrow();
        });
    });
    // ===========================================================================
    // Email Opt-Out URL Tests (CAN-SPAM Compliance)
    // ===========================================================================
    (0, globals_1.describe)('generateEmailOptOutUrl', () => {
        (0, globals_1.it)('should generate valid email opt-out URL', () => {
            const url = (0, opt_out_1.generateEmailOptOutUrl)(testPatientId);
            (0, globals_1.expect)(url).toContain('/api/patients/preferences/opt-out');
            (0, globals_1.expect)(url).toContain('type=email');
            (0, globals_1.expect)(url).toContain('token=');
        });
        (0, globals_1.it)('should use custom base URL when provided', () => {
            const customUrl = 'https://custom-domain.com';
            const url = (0, opt_out_1.generateEmailOptOutUrl)(testPatientId, customUrl);
            (0, globals_1.expect)(url).toMatch(new RegExp(`^${customUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
            (0, globals_1.expect)(url).toContain('type=email');
        });
        (0, globals_1.it)('should be different from SMS opt-out URL', () => {
            const smsUrl = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId);
            const emailUrl = (0, opt_out_1.generateEmailOptOutUrl)(testPatientId);
            (0, globals_1.expect)(smsUrl).not.toBe(emailUrl);
            (0, globals_1.expect)(smsUrl).toContain('type=sms');
            (0, globals_1.expect)(emailUrl).toContain('type=email');
        });
    });
    // ===========================================================================
    // All Communications Opt-Out URL Tests
    // ===========================================================================
    (0, globals_1.describe)('generateOptOutUrl', () => {
        (0, globals_1.it)('should generate URL to opt out of all communications', () => {
            const url = (0, opt_out_1.generateOptOutUrl)(testPatientId);
            (0, globals_1.expect)(url).toContain('/api/patients/preferences/opt-out');
            (0, globals_1.expect)(url).toContain('type=all');
            (0, globals_1.expect)(url).toContain('token=');
        });
        (0, globals_1.it)('should use custom base URL when provided', () => {
            const customUrl = 'https://custom-domain.com';
            const url = (0, opt_out_1.generateOptOutUrl)(testPatientId, customUrl);
            (0, globals_1.expect)(url).toMatch(new RegExp(`^${customUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
            (0, globals_1.expect)(url).toContain('type=all');
        });
    });
    // ===========================================================================
    // SMS Opt-Out Text Tests (TCPA Required)
    // ===========================================================================
    (0, globals_1.describe)('generateSmsOptOutText', () => {
        (0, globals_1.it)('should include "Reply STOP" instruction (TCPA required)', () => {
            const text = (0, opt_out_1.generateSmsOptOutText)(testPatientId);
            (0, globals_1.expect)(text.toLowerCase()).toContain('stop');
            (0, globals_1.expect)(text.toLowerCase()).toContain('reply');
        });
        (0, globals_1.it)('should include opt-out URL', () => {
            const text = (0, opt_out_1.generateSmsOptOutText)(testPatientId);
            const url = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId);
            (0, globals_1.expect)(text).toContain(url);
        });
        (0, globals_1.it)('should be concise (for SMS character limits)', () => {
            const text = (0, opt_out_1.generateSmsOptOutText)(testPatientId);
            // SMS opt-out should be under 160 characters when possible
            // With URL shortening, this should be achievable
            (0, globals_1.expect)(text.length).toBeLessThan(300); // Reasonable limit
        });
        (0, globals_1.it)('should include "opt-out" terminology', () => {
            const text = (0, opt_out_1.generateSmsOptOutText)(testPatientId);
            (0, globals_1.expect)(text.toLowerCase()).toContain('opt-out');
        });
    });
    // ===========================================================================
    // Email Opt-Out Footer Tests (CAN-SPAM Required)
    // ===========================================================================
    (0, globals_1.describe)('generateEmailOptOutFooter', () => {
        (0, globals_1.it)('should generate HTML footer', () => {
            const footer = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            (0, globals_1.expect)(footer).toContain('<div');
            (0, globals_1.expect)(footer).toContain('</div>');
        });
        (0, globals_1.it)('should include unsubscribe link (CAN-SPAM required)', () => {
            const footer = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            // Spanish: "Cancelar suscripción" or "dejar de recibir"
            (0, globals_1.expect)(footer.toLowerCase()).toMatch(/suscripción|unsubscribe|cancelar/);
            (0, globals_1.expect)(footer).toContain('<a');
            (0, globals_1.expect)(footer).toContain('href=');
        });
        (0, globals_1.it)('should include opt-out URL in link', () => {
            const footer = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            const url = (0, opt_out_1.generateEmailOptOutUrl)(testPatientId);
            (0, globals_1.expect)(footer).toContain(url);
        });
        (0, globals_1.it)('should include company information', () => {
            const footer = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            (0, globals_1.expect)(footer).toContain('HoliLabs');
        });
        (0, globals_1.it)('should be properly formatted HTML', () => {
            const footer = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            // Should have opening and closing div tags
            const openDivCount = (footer.match(/<div/g) || []).length;
            const closeDivCount = (footer.match(/<\/div>/g) || []).length;
            (0, globals_1.expect)(openDivCount).toBe(closeDivCount);
        });
        (0, globals_1.it)('should use Spanish language (for Mexican market)', () => {
            const footer = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            // Should contain Spanish text
            (0, globals_1.expect)(footer).toContain('dejar de recibir');
        });
        (0, globals_1.it)('should include clickable link', () => {
            const footer = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            (0, globals_1.expect)(footer).toMatch(/<a[^>]+href="[^"]+"[^>]*>/);
        });
    });
    // ===========================================================================
    // Security Tests
    // ===========================================================================
    (0, globals_1.describe)('Security Considerations', () => {
        (0, globals_1.it)('should not expose patient ID in plain text in URLs', () => {
            const url = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId);
            (0, globals_1.expect)(url).not.toContain(testPatientId);
        });
        (0, globals_1.it)('should use HTTPS in production URLs', () => {
            // In test environment, localhost uses HTTP, but production should use HTTPS
            const productionUrl = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId, 'https://holilabs.com');
            (0, globals_1.expect)(productionUrl).toMatch(/^https:\/\//);
        });
        (0, globals_1.it)('should generate unique tokens for different patients', () => {
            const url1 = (0, opt_out_1.generateSmsOptOutUrl)('patient-1');
            const url2 = (0, opt_out_1.generateSmsOptOutUrl)('patient-2');
            // Extract tokens
            const token1 = new URL(url1).searchParams.get('token');
            const token2 = new URL(url2).searchParams.get('token');
            (0, globals_1.expect)(token1).not.toBe(token2);
        });
    });
    // ===========================================================================
    // Compliance Tests
    // ===========================================================================
    (0, globals_1.describe)('Regulatory Compliance', () => {
        (0, globals_1.it)('TCPA: SMS opt-out text should include "STOP" keyword', () => {
            const text = (0, opt_out_1.generateSmsOptOutText)(testPatientId);
            (0, globals_1.expect)(text.toUpperCase()).toContain('STOP');
        });
        (0, globals_1.it)('TCPA: SMS opt-out URL should be accessible', () => {
            const url = (0, opt_out_1.generateSmsOptOutUrl)(testPatientId);
            // URL should be valid and accessible
            (0, globals_1.expect)(() => new URL(url)).not.toThrow();
        });
        (0, globals_1.it)('CAN-SPAM: Email footer should have unsubscribe link', () => {
            const footer = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            // Spanish: "Cancelar suscripción"
            (0, globals_1.expect)(footer).toMatch(/<a[^>]+href="[^"]+"[^>]*>[^<]*(unsubscribe|cancelar suscripción)[^<]*<\/a>/i);
        });
        (0, globals_1.it)('CAN-SPAM: Opt-out should be one-click (single URL visit)', () => {
            const url = (0, opt_out_1.generateEmailOptOutUrl)(testPatientId);
            // URL should contain all necessary parameters for one-click opt-out
            const urlObj = new URL(url);
            (0, globals_1.expect)(urlObj.searchParams.has('token')).toBe(true);
            (0, globals_1.expect)(urlObj.searchParams.has('type')).toBe(true);
        });
        (0, globals_1.it)('Both: Opt-out mechanism should be clearly labeled', () => {
            const smsText = (0, opt_out_1.generateSmsOptOutText)(testPatientId);
            const emailFooter = (0, opt_out_1.generateEmailOptOutFooter)(testPatientId);
            (0, globals_1.expect)(smsText.toLowerCase()).toContain('opt');
            // Spanish: "suscripción" instead of "unsubscribe"
            (0, globals_1.expect)(emailFooter.toLowerCase()).toMatch(/suscripción|unsubscribe/);
        });
    });
});
//# sourceMappingURL=opt-out.test.js.map