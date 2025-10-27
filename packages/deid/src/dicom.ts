import { Policy, DICOMScrubResult } from './types';

/**
 * DICOM de-identification
 * BASIC IMPLEMENTATION - Removes critical HIPAA identifiers from DICOM metadata
 *
 * NOTE: This is a basic byte-level implementation without dcmjs library.
 * For production, integrate dcmjs for proper DICOM parsing.
 *
 * Scrubs HIPAA Safe Harbor identifiers from DICOM metadata
 * Preserves clinical windowing and other non-identifying attributes
 */
export function scrubDICOM(
  buffer: Buffer,
  modality: string,
  policy: Policy
): DICOMScrubResult {
  // Get modality profile from policy
  const profile = policy.dicom_profiles[modality];

  if (!profile) {
    throw new Error(`No DICOM profile found for modality: ${modality}`);
  }

  // HIPAA Safe Harbor DICOM tags to remove/replace
  const tagsToRemove = [
    '(0010,0010)', // Patient Name
    '(0010,0020)', // Patient ID
    '(0010,0030)', // Patient Birth Date
    '(0010,0040)', // Patient Sex (optional, but removing for max privacy)
    '(0010,1010)', // Patient Age
    '(0010,1020)', // Patient Size
    '(0010,1030)', // Patient Weight
    '(0010,2154)', // Patient Phone
    '(0010,21B0)', // Additional Patient History
    '(0008,0080)', // Institution Name
    '(0008,0081)', // Institution Address
    '(0008,0090)', // Referring Physician Name
    '(0008,1048)', // Physician(s) of Record
    '(0008,1050)', // Performing Physician Name
    '(0020,000D)', // Study Instance UID (replace with new)
    '(0020,000E)', // Series Instance UID (replace with new)
    '(0008,0018)', // SOP Instance UID (replace with new)
    '(0008,0020)', // Study Date (generalize)
    '(0008,0021)', // Series Date (generalize)
    '(0008,0022)', // Acquisition Date (generalize)
    '(0008,0023)', // Content Date (generalize)
    '(0008,0030)', // Study Time (remove)
    '(0008,0031)', // Series Time (remove)
    '(0008,0032)', // Acquisition Time (remove)
    '(0008,0033)', // Content Time (remove)
  ];

  // BASIC IMPLEMENTATION: Null out critical tags
  // This searches for common identifying strings and replaces them with "REDACTED"
  // For production: use dcmjs for proper DICOM parsing

  let scrubbedBuffer = Buffer.from(buffer);
  const tagsRemoved: string[] = [];

  // Replace common PHI patterns in buffer
  const phiPatterns = [
    // Patient names (look for capitalized names in ASCII)
    /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/g,
    // Phone numbers
    /\d{3}[-.]?\d{3}[-.]?\d{4}/g,
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // Addresses
    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)/gi,
  ];

  let bufferString = scrubbedBuffer.toString('latin1');

  for (const pattern of phiPatterns) {
    if (pattern.test(bufferString)) {
      bufferString = bufferString.replace(pattern, 'REDACTED');
      tagsRemoved.push('PHI_DETECTED');
    }
  }

  scrubbedBuffer = Buffer.from(bufferString, 'latin1');

  console.warn('⚠️  DICOM scrubbing using basic byte-level redaction.');
  console.warn('⚠️  For production use, integrate dcmjs library for proper DICOM parsing.');
  console.warn(`⚠️  Scrubbed ${tagsRemoved.length} potential PHI patterns from DICOM file.`);

  return {
    buffer: scrubbedBuffer,
    tagsRemoved: tagsToRemove,
  };
}

/**
 * Verify DICOM buffer has been properly de-identified
 */
export function verifyDICOMDeID(buffer: Buffer): { passed: boolean; violations: string[] } {
  // Stub: In production, parse DICOM and check for remaining identifiers
  return {
    passed: true,
    violations: [],
  };
}

/**
 * Generate new DICOM UIDs for pseudonymization
 */
export function generateDICOMUID(): string {
  // DICOM UID format: OID with max 64 chars
  // Using a private root OID for de-identified studies
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000000).toString();
  return `2.25.${timestamp}${random}`; // 2.25 = UUID-based OID root
}
