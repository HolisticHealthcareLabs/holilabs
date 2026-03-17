/**
 * Consent Gate for Agent Data Access (LGPD Compliance)
 *
 * Verifies that a patient has granted the required consent before
 * MCP tool handlers access their data. The Consent model uses the
 * `type` field (ConsentType enum) and `isActive` + `revokedAt` for status.
 *
 * ConsentType enum: GENERAL_CONSULTATION | TELEHEALTH | DATA_RESEARCH |
 *                   SURGERY | PROCEDURE | PHOTOGRAPHY | CUSTOM
 *
 * Agent data access maps to DATA_RESEARCH consent type.
 */

import { prisma } from '@/lib/prisma';

export class ConsentDeniedError extends Error {
  constructor(
    public patientId: string,
    public consentType: string,
  ) {
    super(`Consent not granted: ${consentType} for patient ${patientId}`);
    this.name = 'ConsentDeniedError';
  }
}

export async function verifyConsentForAgentAccess(
  patientId: string,
  consentType: string,
): Promise<void> {
  const consent = await prisma.consent.findFirst({
    where: {
      patientId,
      type: consentType as any,
      isActive: true,
      revokedAt: null,
    },
  });

  if (!consent) {
    throw new ConsentDeniedError(patientId, consentType);
  }
}
