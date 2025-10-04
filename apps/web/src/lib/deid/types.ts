/**
 * HIPAA Safe Harbor De-identification Types
 *
 * Implements detection and suppression of 18 HIPAA identifiers:
 * https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html
 */

export type HIPAAIdentifierType =
  | 'NAME'                    // 1. Names
  | 'GEOGRAPHIC'              // 2. Geographic subdivisions smaller than state
  | 'DATE'                    // 3. Dates (except year)
  | 'TELEPHONE'               // 4. Telephone numbers
  | 'FAX'                     // 5. Fax numbers
  | 'EMAIL'                   // 6. Email addresses
  | 'SSN'                     // 7. Social Security numbers
  | 'MRN'                     // 8. Medical record numbers
  | 'HEALTH_PLAN'             // 9. Health plan beneficiary numbers
  | 'ACCOUNT'                 // 10. Account numbers
  | 'CERTIFICATE'             // 11. Certificate/license numbers
  | 'VEHICLE'                 // 12. Vehicle identifiers and serial numbers
  | 'DEVICE'                  // 13. Device identifiers and serial numbers
  | 'URL'                     // 14. Web URLs
  | 'IP_ADDRESS'              // 15. IP address numbers
  | 'BIOMETRIC'               // 16. Biometric identifiers
  | 'PHOTO'                   // 17. Full-face photos
  | 'OTHER_UNIQUE';           // 18. Other unique identifying numbers

export interface DetectedPHI {
  type: HIPAAIdentifierType;
  value: string;
  start: number;
  end: number;
  confidence: number; // 0-1 confidence score
  context?: string;   // Surrounding text for validation
}

export interface DeidentificationResult {
  original: string;
  deidentified: string;
  detectedPHI: DetectedPHI[];
  tokenMap: Map<string, string>; // Original -> Token mapping for re-identification
  summary: {
    totalDetected: number;
    byType: Record<HIPAAIdentifierType, number>;
    confidenceScore: number; // Overall confidence
  };
  metadata: {
    timestamp: Date;
    method: 'safe_harbor' | 'expert_determination';
    version: string;
  };
}

export interface DeidentificationOptions {
  method?: 'safe_harbor' | 'expert_determination';
  suppressDates?: boolean;
  suppressAges?: boolean; // Ages > 89
  suppressZipCodes?: boolean; // First 3 digits only
  preserveStructure?: boolean; // Maintain formatting
  reversible?: boolean; // Enable token mapping for re-identification
  auditLog?: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: 'deidentify' | 'reidentify' | 'access';
  inputHash: string; // SHA-256 hash of input for verification
  detectedCount: number;
  method: string;
  success: boolean;
  errorMessage?: string;
}
