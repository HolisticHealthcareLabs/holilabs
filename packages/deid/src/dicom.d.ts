import { Policy, DICOMScrubResult } from './types';
/**
 * DICOM de-identification stub
 * In production: use dcmjs library to parse and scrub DICOM tags
 *
 * Scrubs HIPAA Safe Harbor identifiers from DICOM metadata
 * Preserves clinical windowing and other non-identifying attributes
 */
export declare function scrubDICOM(buffer: Buffer, modality: string, policy: Policy): DICOMScrubResult;
/**
 * Verify DICOM buffer has been properly de-identified
 */
export declare function verifyDICOMDeID(buffer: Buffer): {
    passed: boolean;
    violations: string[];
};
/**
 * Generate new DICOM UIDs for pseudonymization
 */
export declare function generateDICOMUID(): string;
//# sourceMappingURL=dicom.d.ts.map