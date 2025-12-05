/**
 * Consent Expiration Checker
 * Utility to check and handle expired consents
 */

import { prisma } from '@/lib/prisma';

export interface ExpiredConsent {
  id: string;
  patientId: string;
  type: string;
  title: string;
  expiresAt: Date;
}

/**
 * Find all expired consents that are still active
 */
export async function findExpiredConsents(): Promise<ExpiredConsent[]> {
  const now = new Date();

  const expiredConsents = await prisma.consent.findMany({
    where: {
      isActive: true,
      expiresAt: {
        not: null,
        lte: now,
      },
    },
    select: {
      id: true,
      patientId: true,
      type: true,
      title: true,
      expiresAt: true,
    },
  });

  return expiredConsents.filter((c) => c.expiresAt !== null) as ExpiredConsent[];
}

/**
 * Expire a single consent and revoke associated data access grants
 */
export async function expireConsent(consentId: string): Promise<void> {
  const consent = await prisma.consent.findUnique({
    where: { id: consentId },
    select: { id: true, patientId: true, type: true },
  });

  if (!consent) {
    throw new Error(`Consent ${consentId} not found`);
  }

  // Mark consent as expired
  await prisma.consent.update({
    where: { id: consentId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: 'Consent expired automatically',
    },
  });

  // If it's GENERAL_CONSULTATION, revoke data access grants
  if (consent.type === 'GENERAL_CONSULTATION') {
    await prisma.dataAccessGrant.updateMany({
      where: {
        patientId: consent.patientId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'Consent expired',
      },
    });
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: 'system',
      userEmail: 'system',
      action: 'EXPIRE_CONSENT',
      resource: 'Consent',
      resourceId: consentId,
      ipAddress: 'system',
      details: {
        consentType: consent.type,
        patientId: consent.patientId,
        reason: 'Automatic expiration',
      },
      success: true,
    },
  });

  console.log(`⏰ Expired consent ${consentId} for patient ${consent.patientId}`);
}

/**
 * Batch expire all consents that have passed their expiration date
 */
export async function expireAllExpiredConsents(): Promise<number> {
  const expiredConsents = await findExpiredConsents();

  for (const consent of expiredConsents) {
    try {
      await expireConsent(consent.id);
    } catch (error) {
      console.error(`Failed to expire consent ${consent.id}:`, error);
    }
  }

  return expiredConsents.length;
}

/**
 * Check if a specific patient has any expired but active consents
 */
export async function checkPatientConsentExpiration(patientId: string): Promise<boolean> {
  const now = new Date();

  const expiredCount = await prisma.consent.count({
    where: {
      patientId,
      isActive: true,
      expiresAt: {
        not: null,
        lte: now,
      },
    },
  });

  return expiredCount > 0;
}
