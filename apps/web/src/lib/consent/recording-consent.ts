/**
 * Recording Consent Management
 *
 * Two-Party Consent States Compliance
 * States requiring explicit consent: CA, CT, FL, IL, MD, MA, MT, NV, NH, PA, WA
 *
 * References:
 * - California Penal Code § 632
 * - 18 U.S.C. § 2511 (Federal Wiretap Act)
 * - State-specific wiretapping laws
 */

import { prisma } from '@/lib/prisma';

/**
 * States requiring two-party consent for recording
 * All other states follow one-party consent (only clinician consent needed)
 */
export const TWO_PARTY_CONSENT_STATES = [
  'CA', // California
  'CT', // Connecticut
  'FL', // Florida
  'IL', // Illinois
  'MD', // Maryland
  'MA', // Massachusetts
  'MT', // Montana
  'NV', // Nevada
  'NH', // New Hampshire
  'PA', // Pennsylvania
  'WA', // Washington
];

/**
 * State consent law references
 */
export const STATE_CONSENT_LAWS: Record<string, string> = {
  CA: 'California Penal Code § 632 - Two-party consent required',
  CT: 'Connecticut General Statutes § 53a-189 - Two-party consent required',
  FL: 'Florida Statutes § 934.03 - Two-party consent required',
  IL: '720 ILCS 5/14-2 - Two-party consent required',
  MD: 'Maryland Courts and Judicial Proceedings § 10-402 - Two-party consent required',
  MA: 'Massachusetts General Laws c. 272, § 99 - Two-party consent required',
  MT: 'Montana Code Annotated § 45-8-213 - Two-party consent required',
  NV: 'Nevada Revised Statutes § 200.620 - Two-party consent required',
  NH: 'New Hampshire RSA 570-A:2 - Two-party consent required',
  PA: '18 Pa. Cons. Stat. § 5704 - Two-party consent required',
  WA: 'Washington Revised Code § 9.73.030 - Two-party consent required',
};

/**
 * Consent record structure
 */
export interface ConsentRecord {
  consentGiven: boolean;
  consentDate: Date | null;
  consentMethod: string | null;
  consentState: string | null;
  withdrawnAt: Date | null;
  consentLanguage: string | null;
  consentVersion: string | null;
  consentSignature: string | null;
}

/**
 * Check if a state requires explicit recording consent
 */
export function requiresExplicitConsent(state: string): boolean {
  return TWO_PARTY_CONSENT_STATES.includes(state.toUpperCase());
}

/**
 * Get consent law reference for a state
 */
export function getConsentLaw(state: string): string {
  return STATE_CONSENT_LAWS[state.toUpperCase()] || 'One-party consent (federal default)';
}

/**
 * Verify if patient has given recording consent
 * Returns consent status and reason if not allowed
 */
export async function verifyRecordingConsent(
  patientId: string,
  state?: string
): Promise<{ allowed: boolean; reason?: string; requiresConsent: boolean }> {
  // Get patient consent data
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      state: true,
      recordingConsentGiven: true,
      recordingConsentDate: true,
      recordingConsentMethod: true,
      recordingConsentState: true,
      recordingConsentWithdrawnAt: true,
      recordingConsentLanguage: true,
      recordingConsentVersion: true,
      recordingConsentSignature: true,
    },
  });

  if (!patient) {
    return {
      allowed: false,
      reason: 'Patient not found',
      requiresConsent: true,
    };
  }

  // Use provided state or patient's state
  const patientState = state || patient.state || 'UNKNOWN';

  // One-party consent states: Recording allowed by default (clinician consent sufficient)
  if (!requiresExplicitConsent(patientState)) {
    return {
      allowed: true,
      requiresConsent: false,
    };
  }

  // Two-party consent state: Check for explicit patient consent
  const consent: ConsentRecord = {
    consentGiven: patient.recordingConsentGiven,
    consentDate: patient.recordingConsentDate,
    consentMethod: patient.recordingConsentMethod,
    consentState: patient.recordingConsentState,
    withdrawnAt: patient.recordingConsentWithdrawnAt,
    consentLanguage: patient.recordingConsentLanguage,
    consentVersion: patient.recordingConsentVersion,
    consentSignature: patient.recordingConsentSignature,
  };

  // Check if consent was withdrawn
  if (consent.withdrawnAt) {
    return {
      allowed: false,
      reason: `Patient withdrew recording consent on ${consent.withdrawnAt.toISOString()}. New consent required.`,
      requiresConsent: true,
    };
  }

  // Check if consent was given
  if (!consent.consentGiven || !consent.consentDate) {
    return {
      allowed: false,
      reason: `Explicit recording consent required in ${patientState}. ${getConsentLaw(patientState)}`,
      requiresConsent: true,
    };
  }

  // Consent valid
  return {
    allowed: true,
    requiresConsent: true,
  };
}

/**
 * Record patient consent for recording
 */
export async function recordConsent(
  patientId: string,
  consentData: {
    consentMethod: 'Portal' | 'In-Person' | 'Verbal' | 'Written';
    consentState: string;
    consentLanguage?: string;
    consentVersion?: string;
    consentSignature?: string;
    clinicianId?: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        recordingConsentGiven: true,
        recordingConsentDate: new Date(),
        recordingConsentMethod: consentData.consentMethod,
        recordingConsentState: consentData.consentState.toUpperCase(),
        recordingConsentLanguage: consentData.consentLanguage || 'en',
        recordingConsentVersion: consentData.consentVersion || '1.0',
        recordingConsentSignature: consentData.consentSignature || 'VERBAL_ACKNOWLEDGED',
        recordingConsentWithdrawnAt: null, // Clear any previous withdrawal
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: consentData.clinicianId || null,
        action: 'CREATE',
        resource: 'RecordingConsent',
        resourceId: patientId,
        success: true,
        accessReason: 'LEGAL_COMPLIANCE',
        details: {
          consentMethod: consentData.consentMethod,
          consentState: consentData.consentState,
          consentLanguage: consentData.consentLanguage,
          lawReference: getConsentLaw(consentData.consentState),
        },
      },
    });

    return {
      success: true,
      message: 'Recording consent successfully recorded',
    };
  } catch (error) {
    console.error('Error recording consent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record consent',
    };
  }
}

/**
 * Withdraw recording consent
 */
export async function withdrawConsent(
  patientId: string,
  clinicianId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        recordingConsentWithdrawnAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: clinicianId || null,
        action: 'UPDATE',
        resource: 'RecordingConsent',
        resourceId: patientId,
        success: true,
        accessReason: 'LEGAL_COMPLIANCE',
        details: {
          action: 'consent_withdrawn',
          withdrawnAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: 'Recording consent withdrawn successfully',
    };
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to withdraw consent',
    };
  }
}

/**
 * Get consent status summary for UI display
 */
export async function getConsentStatus(
  patientId: string
): Promise<{
  requiresConsent: boolean;
  hasConsent: boolean;
  consentDate: Date | null;
  consentMethod: string | null;
  withdrawnAt: Date | null;
  patientState: string;
  lawReference: string;
}> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      state: true,
      recordingConsentGiven: true,
      recordingConsentDate: true,
      recordingConsentMethod: true,
      recordingConsentWithdrawnAt: true,
    },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  const patientState = patient.state || 'UNKNOWN';
  const requiresConsent = requiresExplicitConsent(patientState);

  return {
    requiresConsent,
    hasConsent: patient.recordingConsentGiven && !patient.recordingConsentWithdrawnAt,
    consentDate: patient.recordingConsentDate,
    consentMethod: patient.recordingConsentMethod,
    withdrawnAt: patient.recordingConsentWithdrawnAt,
    patientState,
    lawReference: getConsentLaw(patientState),
  };
}
