/**
 * Consent Guard Service
 *
 * Enforces consent-gated access for critical operations
 * following industry standards:
 * - HIPAA Authorization Requirements
 * - GDPR Article 6 (Lawfulness of processing)
 * - LGPD Article 7 (Consent requirements)
 *
 * @compliance HIPAA, GDPR, LGPD
 */

import { prisma } from '@/lib/db';

export type ConsentTypeId =
  | 'treatment_access'
  | 'appointment_booking'
  | 'clinical_recording'
  | 'data_sharing_specialists'
  | 'anonymous_research'
  | 'health_reminders'
  | 'wellness_programs';

export interface ConsentCheckResult {
  allowed: boolean;
  missingConsents: ConsentTypeId[];
  message?: string;
}

/**
 * Consent Guard Class
 */
export class ConsentGuard {
  private static instance: ConsentGuard;

  private constructor() {}

  public static getInstance(): ConsentGuard {
    if (!ConsentGuard.instance) {
      ConsentGuard.instance = new ConsentGuard();
    }
    return ConsentGuard.instance;
  }

  /**
   * Check if patient has granted required consents for an operation
   */
  public async checkConsent(
    patientId: string,
    requiredConsents: ConsentTypeId[]
  ): Promise<ConsentCheckResult> {
    try {
      // Fetch patient's consents from database
      const consents = await prisma.patientConsent.findMany({
        where: {
          patientId,
          consentTypeId: {
            in: requiredConsents,
          },
          granted: true,
          // Check not expired
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          // Check not revoked
          revokedAt: null,
        },
        select: {
          consentTypeId: true,
        },
      });

      const grantedConsentIds = new Set(consents.map((c) => c.consentTypeId));
      const missingConsents = requiredConsents.filter((id) => !grantedConsentIds.has(id));

      if (missingConsents.length > 0) {
        return {
          allowed: false,
          missingConsents: missingConsents as ConsentTypeId[],
          message: `Missing required consents: ${missingConsents.join(', ')}`,
        };
      }

      return {
        allowed: true,
        missingConsents: [],
      };
    } catch (error) {
      console.error('Error checking consent:', error);
      return {
        allowed: false,
        missingConsents: requiredConsents as ConsentTypeId[],
        message: 'Failed to verify consent. Please try again.',
      };
    }
  }

  /**
   * Guard for appointment booking
   * Requires: treatment_access AND appointment_booking consents
   */
  public async canBookAppointment(patientId: string): Promise<ConsentCheckResult> {
    return this.checkConsent(patientId, ['treatment_access', 'appointment_booking']);
  }

  /**
   * Guard for clinical recording
   * Requires: treatment_access AND clinical_recording consents
   */
  public async canRecordClinicalSession(patientId: string): Promise<ConsentCheckResult> {
    return this.checkConsent(patientId, ['treatment_access', 'clinical_recording']);
  }

  /**
   * Guard for data sharing with specialists
   * Requires: treatment_access AND data_sharing_specialists consents
   */
  public async canShareWithSpecialist(patientId: string): Promise<ConsentCheckResult> {
    return this.checkConsent(patientId, ['treatment_access', 'data_sharing_specialists']);
  }

  /**
   * Guard for research participation
   * Requires: anonymous_research consent
   */
  public async canUseForResearch(patientId: string): Promise<ConsentCheckResult> {
    return this.checkConsent(patientId, ['anonymous_research']);
  }

  /**
   * Log consent check for audit trail
   */
  public async logConsentCheck(
    patientId: string,
    operation: string,
    result: ConsentCheckResult,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.consentAuditLog.create({
        data: {
          patientId,
          operation,
          allowed: result.allowed,
          missingConsents: result.missingConsents,
          metadata: metadata || {},
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error logging consent check:', error);
      // Don't throw - logging failure shouldn't block operations
    }
  }

  /**
   * Middleware wrapper for Next.js API routes
   */
  public async requireConsent(
    patientId: string,
    requiredConsents: ConsentTypeId[],
    operation: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.checkConsent(patientId, requiredConsents);

    // Log the check
    await this.logConsentCheck(patientId, operation, result);

    if (!result.allowed) {
      return {
        success: false,
        error: result.message || 'Required consent not granted',
      };
    }

    return { success: true };
  }
}

// Export singleton
export const consentGuard = ConsentGuard.getInstance();
