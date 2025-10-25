/**
 * Blockchain Hashing Utilities
 *
 * Purpose: Generate deterministic hashes for on-chain storage
 * Privacy: Only hashes are stored on-chain, never actual PHI
 */
export interface HashableData {
    [key: string]: any;
}
/**
 * Generate a deterministic SHA-256 hash of any data
 * Used for blockchain verification without exposing sensitive data
 */
export declare function generateDataHash(data: HashableData): string;
/**
 * Generate a hash for a prescription
 * Includes: medications, patient ID, clinician ID, timestamp
 */
export declare function generatePrescriptionHash(prescription: {
    patientId: string;
    clinicianId: string;
    medications: any[];
    timestamp: string;
}): string;
/**
 * Generate a hash for a consent form
 * Includes: content, patient ID, signature, timestamp
 */
export declare function generateConsentHash(consent: {
    patientId: string;
    content: string;
    signatureData: string;
    signedAt: string;
}): string;
/**
 * Generate a hash for a clinical document
 * Includes: file content hash, patient ID, document type, timestamp
 */
export declare function generateDocumentHash(document: {
    patientId: string;
    fileBuffer: Buffer;
    documentType: string;
    uploadedAt: string;
}): string;
/**
 * Generate a hash for patient critical data
 * Used for detecting unauthorized modifications
 */
export declare function generatePatientDataHash(patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    mrn: string;
}): string;
/**
 * Generate a hash for clinical notes
 * Ensures SOAP notes haven't been tampered with
 */
export declare function generateClinicalNoteHash(note: {
    patientId: string;
    authorId: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    createdAt: string;
}): string;
/**
 * Verify a hash matches the original data
 */
export declare function verifyHash(data: HashableData, expectedHash: string): boolean;
/**
 * Generate a Merkle root from multiple hashes
 * Useful for batching multiple records into a single blockchain transaction
 */
export declare function generateMerkleRoot(hashes: string[]): string;
/**
 * Generate a timestamp hash for audit trails
 * Includes: action, user, resource, timestamp
 */
export declare function generateAuditHash(audit: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    timestamp: string;
}): string;
//# sourceMappingURL=hashing.d.ts.map