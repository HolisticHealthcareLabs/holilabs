"use strict";
/**
 * Calendar Token Encryption
 * Encrypt/decrypt OAuth tokens before storing in database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
exports.isTokenEncrypted = isTokenEncrypted;
const encryption_1 = require("@/lib/security/encryption");
/**
 * Encrypt access token before storing in database
 */
function encryptToken(token) {
    const encrypted = (0, encryption_1.encrypt)(token);
    return JSON.stringify(encrypted);
}
/**
 * Decrypt access token from database
 */
function decryptToken(encryptedToken) {
    try {
        const encrypted = JSON.parse(encryptedToken);
        return (0, encryption_1.decrypt)(encrypted);
    }
    catch (error) {
        // Fallback for legacy plaintext tokens (during migration)
        console.warn('Token decryption failed - may be plaintext legacy token');
        return encryptedToken;
    }
}
/**
 * Check if token is encrypted (has IV and authTag properties)
 */
function isTokenEncrypted(token) {
    try {
        const parsed = JSON.parse(token);
        return !!(parsed.iv && parsed.encrypted && parsed.authTag);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=token-encryption.js.map