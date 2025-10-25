"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pseudonymize = pseudonymize;
exports.verifyPseudonym = verifyPseudonym;
exports.generateSaltRotationKey = generateSaltRotationKey;
const crypto_1 = require("crypto");
/**
 * Pseudonymize subject identifiers using salted hash
 * Generates a deterministic patient token from subject keys
 */
function pseudonymize(subjectKeys, saltRotationKey) {
    // Concatenate all subject identifiers
    const subjectString = subjectKeys.sort().join('|');
    // Create salted hash
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(saltRotationKey);
    hash.update(subjectString);
    const pointerHash = hash.digest('hex');
    // Generate UUID-like token for external use
    const tokenId = generateUUIDFromHash(pointerHash);
    return {
        tokenId,
        pointerHash,
    };
}
/**
 * Generate a UUID v5-like identifier from hash
 */
function generateUUIDFromHash(hash) {
    // Take first 32 hex chars and format as UUID
    const hex = hash.substring(0, 32);
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}
/**
 * Verify if a subject matches a given token
 */
function verifyPseudonym(subjectKeys, saltRotationKey, expectedPointerHash) {
    const result = pseudonymize(subjectKeys, saltRotationKey);
    return result.pointerHash === expectedPointerHash;
}
/**
 * Generate a new salt rotation key (for key rotation operations)
 */
function generateSaltRotationKey() {
    return (0, crypto_1.randomBytes)(32).toString('hex');
}
//# sourceMappingURL=pseudonymize.js.map