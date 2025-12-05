/**
 * Consent Version Manager
 * Handles consent version updates and patient notifications
 */

import { prisma } from '@/lib/prisma';
import type { ConsentType as PrismaConsentType } from '@prisma/client';

export interface ConsentVersion {
  version: string;
  effectiveDate: Date;
  changes: string[];
  requiresReconsent: boolean;
}

// Define consent versions (in production, this would be in database)
export const CONSENT_VERSIONS: Record<string, ConsentVersion[]> = {
  GENERAL_CONSULTATION: [
    {
      version: '1.0',
      effectiveDate: new Date('2025-01-01'),
      changes: ['Initial consent version'],
      requiresReconsent: false,
    },
    {
      version: '1.1',
      effectiveDate: new Date('2025-06-01'),
      changes: [
        'Added clause about AI-assisted diagnosis',
        'Updated data retention policy',
      ],
      requiresReconsent: true,
    },
  ],
  RECORDING: [
    {
      version: '1.0',
      effectiveDate: new Date('2025-01-01'),
      changes: ['Initial recording consent'],
      requiresReconsent: false,
    },
  ],
  TELEHEALTH: [
    {
      version: '1.0',
      effectiveDate: new Date('2025-01-01'),
      changes: ['Initial telehealth consent'],
      requiresReconsent: false,
    },
  ],
};

/**
 * Get the latest version for a consent type
 */
export function getLatestVersion(consentType: string): string {
  const versions = CONSENT_VERSIONS[consentType] || [];
  if (versions.length === 0) return '1.0';
  return versions[versions.length - 1].version;
}

/**
 * Check if a patient's consent needs to be updated
 */
export async function checkConsentVersion(
  patientId: string,
  consentType: string
): Promise<{
  needsUpdate: boolean;
  currentVersion: string | null;
  latestVersion: string;
  changes: string[];
}> {
  const consent = await prisma.consent.findFirst({
    where: {
      patientId,
      type: consentType as PrismaConsentType,
      isActive: true,
    },
    orderBy: { signedAt: 'desc' },
  });

  const currentVersion = consent?.version || null;
  const latestVersion = getLatestVersion(consentType);

  const versions = CONSENT_VERSIONS[consentType] || [];
  const latestVersionData = versions.find((v) => v.version === latestVersion);

  return {
    needsUpdate: currentVersion !== latestVersion && latestVersionData?.requiresReconsent === true,
    currentVersion,
    latestVersion,
    changes: latestVersionData?.changes || [],
  };
}

/**
 * Find all patients with outdated consents
 */
export async function findPatientsWithOutdatedConsents(
  consentType: string
): Promise<Array<{ patientId: string; currentVersion: string; email: string | null }>> {
  const latestVersion = getLatestVersion(consentType);

  const outdatedConsents = await prisma.consent.findMany({
    where: {
      type: consentType as PrismaConsentType,
      isActive: true,
      version: {
        not: latestVersion,
      },
    },
    distinct: ['patientId'],
    select: {
      patientId: true,
      version: true,
    },
  });

  // Get patient details
  const patientsWithDetails = await Promise.all(
    outdatedConsents.map(async (consent) => {
      const patient = await prisma.patient.findUnique({
        where: { id: consent.patientId },
        select: { email: true },
      });

      return {
        patientId: consent.patientId,
        currentVersion: consent.version,
        email: patient?.email || null,
      };
    })
  );

  return patientsWithDetails;
}

/**
 * Create a new consent version record (when patient re-consents)
 */
export async function upgradeConsentVersion(
  patientId: string,
  consentType: string,
  signatureData: string
): Promise<void> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }

  const latestVersion = getLatestVersion(consentType);
  const versions = CONSENT_VERSIONS[consentType] || [];
  const versionData = versions.find((v) => v.version === latestVersion);

  if (!versionData) {
    throw new Error(`Version data not found for ${consentType} v${latestVersion}`);
  }

  const prismaConsentType = consentType as PrismaConsentType;

  // Deactivate old consent
  await prisma.consent.updateMany({
    where: {
      patientId,
      type: prismaConsentType,
      isActive: true,
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: `Superseded by version ${latestVersion}`,
    },
  });

  // Create new consent with latest version
  const consentContent = `
Consent for: ${consentType}
Version: ${latestVersion}
Effective Date: ${versionData.effectiveDate.toLocaleDateString()}

Changes in this version:
${versionData.changes.map((change) => `- ${change}`).join('\n')}

By signing this consent, you acknowledge that you have read and understood the changes above.

Patient: ${patient.firstName} ${patient.lastName}
Date: ${new Date().toLocaleDateString()}
  `.trim();

  const crypto = require('crypto');
  const consentHash = crypto
    .createHash('sha256')
    .update(consentContent + patientId + new Date().toISOString())
    .digest('hex');

  const newConsent = await prisma.consent.create({
    data: {
      patientId,
      type: prismaConsentType,
      title: `${consentType} (v${latestVersion})`,
      content: consentContent,
      version: latestVersion,
      signatureData,
      signedAt: new Date(),
      isActive: true,
      consentHash,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: patientId,
      userEmail: 'patient',
      action: 'UPGRADE_CONSENT_VERSION',
      resource: 'Consent',
      resourceId: newConsent.id,
      ipAddress: 'system',
      details: {
        consentType,
        oldVersion: 'previous',
        newVersion: latestVersion,
        changes: versionData.changes,
      },
      success: true,
    },
  });

  console.log(`✅ Upgraded consent for patient ${patientId}: ${consentType} → v${latestVersion}`);
}

/**
 * Mark a patient as notified about consent update
 */
export async function markConsentUpdateNotified(
  patientId: string,
  consentType: string,
  version: string
): Promise<void> {
  // In production, you'd store this in a separate table
  // For now, we'll create an audit log entry
  await prisma.auditLog.create({
    data: {
      userId: patientId,
      userEmail: 'system',
      action: 'CONSENT_UPDATE_NOTIFIED',
      resource: 'Consent',
      resourceId: patientId,
      ipAddress: 'system',
      details: {
        consentType,
        version,
        notifiedAt: new Date().toISOString(),
      },
      success: true,
    },
  });
}

/**
 * Get consent version history for a patient
 */
export async function getConsentVersionHistory(
  patientId: string,
  consentType: string
): Promise<Array<{
  version: string;
  signedAt: Date;
  revokedAt: Date | null;
  isActive: boolean;
}>> {
  const prismaConsentType = consentType as PrismaConsentType;
  const consents = await prisma.consent.findMany({
    where: {
      patientId,
      type: prismaConsentType,
    },
    orderBy: { signedAt: 'desc' },
    select: {
      version: true,
      signedAt: true,
      revokedAt: true,
      isActive: true,
    },
  });

  return consents;
}
