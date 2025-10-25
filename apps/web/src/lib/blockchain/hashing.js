"use strict";
/**
 * Blockchain Hashing Utilities
 *
 * Purpose: Generate deterministic hashes for on-chain storage
 * Privacy: Only hashes are stored on-chain, never actual PHI
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDataHash = generateDataHash;
exports.generatePrescriptionHash = generatePrescriptionHash;
exports.generateConsentHash = generateConsentHash;
exports.generateDocumentHash = generateDocumentHash;
exports.generatePatientDataHash = generatePatientDataHash;
exports.generateClinicalNoteHash = generateClinicalNoteHash;
exports.verifyHash = verifyHash;
exports.generateMerkleRoot = generateMerkleRoot;
exports.generateAuditHash = generateAuditHash;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a deterministic SHA-256 hash of any data
 * Used for blockchain verification without exposing sensitive data
 */
function generateDataHash(data) {
    // Normalize data: sort keys to ensure consistent hashing
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return crypto_1.default.createHash('sha256').update(normalized, 'utf8').digest('hex');
}
/**
 * Generate a hash for a prescription
 * Includes: medications, patient ID, clinician ID, timestamp
 */
function generatePrescriptionHash(prescription) {
    return generateDataHash({
        patientId: prescription.patientId,
        clinicianId: prescription.clinicianId,
        medications: prescription.medications,
        timestamp: prescription.timestamp,
    });
}
/**
 * Generate a hash for a consent form
 * Includes: content, patient ID, signature, timestamp
 */
function generateConsentHash(consent) {
    return generateDataHash({
        patientId: consent.patientId,
        // Hash the content itself to reduce size
        contentHash: crypto_1.default.createHash('sha256').update(consent.content).digest('hex'),
        signatureHash: crypto_1.default.createHash('sha256').update(consent.signatureData).digest('hex'),
        signedAt: consent.signedAt,
    });
}
/**
 * Generate a hash for a clinical document
 * Includes: file content hash, patient ID, document type, timestamp
 */
function generateDocumentHash(document) {
    const fileHash = crypto_1.default.createHash('sha256').update(document.fileBuffer).digest('hex');
    return generateDataHash({
        patientId: document.patientId,
        fileHash,
        documentType: document.documentType,
        uploadedAt: document.uploadedAt,
    });
}
/**
 * Generate a hash for patient critical data
 * Used for detecting unauthorized modifications
 */
function generatePatientDataHash(patient) {
    return generateDataHash({
        id: patient.id,
        firstName: patient.firstName.toLowerCase().trim(),
        lastName: patient.lastName.toLowerCase().trim(),
        dateOfBirth: patient.dateOfBirth,
        mrn: patient.mrn,
    });
}
/**
 * Generate a hash for clinical notes
 * Ensures SOAP notes haven't been tampered with
 */
function generateClinicalNoteHash(note) {
    return generateDataHash({
        patientId: note.patientId,
        authorId: note.authorId,
        subjective: note.subjective || '',
        objective: note.objective || '',
        assessment: note.assessment || '',
        plan: note.plan || '',
        createdAt: note.createdAt,
    });
}
/**
 * Verify a hash matches the original data
 */
function verifyHash(data, expectedHash) {
    const computedHash = generateDataHash(data);
    return computedHash === expectedHash;
}
/**
 * Generate a Merkle root from multiple hashes
 * Useful for batching multiple records into a single blockchain transaction
 */
function generateMerkleRoot(hashes) {
    if (hashes.length === 0) {
        throw new Error('Cannot generate Merkle root from empty array');
    }
    if (hashes.length === 1) {
        return hashes[0];
    }
    // Build Merkle tree
    let currentLevel = [...hashes];
    while (currentLevel.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            if (i + 1 < currentLevel.length) {
                // Pair exists
                const combined = currentLevel[i] + currentLevel[i + 1];
                const hash = crypto_1.default.createHash('sha256').update(combined).digest('hex');
                nextLevel.push(hash);
            }
            else {
                // Odd one out, duplicate it
                const combined = currentLevel[i] + currentLevel[i];
                const hash = crypto_1.default.createHash('sha256').update(combined).digest('hex');
                nextLevel.push(hash);
            }
        }
        currentLevel = nextLevel;
    }
    return currentLevel[0];
}
/**
 * Generate a timestamp hash for audit trails
 * Includes: action, user, resource, timestamp
 */
function generateAuditHash(audit) {
    return generateDataHash(audit);
}
//# sourceMappingURL=hashing.js.map