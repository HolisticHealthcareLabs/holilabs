/**
 * Cross-Organization Data Sharing Service
 *
 * Enforces RUTH (consent granularity) and CYRUS (triple-gate access control)
 * invariants for inter-organizational clinical data exchange.
 *
 * RUTH invariant: No blanket consent, no empty consent, no contradictions.
 * CYRUS invariant: Triple-gate defense-in-depth — agreement + consent + care team
 *   membership — with full audit logging on every access check.
 *
 * LGPD Art. 7 (legal bases), Art. 11 (sensitive data), Art. 33 (cross-border).
 */

import crypto from 'crypto';

import type {
  PrismaClient,
  DataSharingAgreement,
  PatientSharingConsent,
  SharedCareRecord,
} from '@prisma/client';
import { DataSharingScope } from '@prisma/client';

import logger from '@/lib/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SCOPES = Object.values(DataSharingScope);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConsentValidationResult {
  valid: boolean;
  violations: string[];
}

interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  auditTrail: Record<string, unknown>;
}

interface GrantConsentInput {
  patientId: string;
  agreementId: string;
  consentedScopes: DataSharingScope[];
  deniedScopes: DataSharingScope[];
  consentText: string;
  signatureData?: string;
  consentVersion?: string;
  expiresAt?: Date;
  userId: string;
}

interface CreateAgreementInput {
  requestingOrgId: string;
  receivingOrgId: string;
  title: string;
  description?: string;
  scopes: DataSharingScope[];
  legalBasis: string;
  lgpdArticle?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  autoRenew?: boolean;
}

interface ScopedRecordGroup {
  scope: DataSharingScope;
  records: SharedCareRecord[];
}

// ---------------------------------------------------------------------------
// RUTH Invariant: Consent Granularity Validation
// ---------------------------------------------------------------------------

/**
 * Validates that consent selections satisfy RUTH's granularity invariant.
 *
 * Rejects:
 * - Blanket consent (all scopes consented, none denied)
 * - Empty consent (no scopes consented)
 * - Contradictions (same scope in both consented and denied)
 */
export function validateConsentGranularity(
  consentedScopes: DataSharingScope[],
  deniedScopes: DataSharingScope[],
): ConsentValidationResult {
  const violations: string[] = [];

  if (consentedScopes.length === ALL_SCOPES.length && deniedScopes.length === 0) {
    violations.push(
      'BLANKET_CONSENT: All scopes consented with no denials — RUTH invariant requires granular consent',
    );
  }

  if (consentedScopes.length === 0) {
    violations.push(
      'EMPTY_CONSENT: No scopes consented — consent must include at least one scope',
    );
  }

  const contradictions = consentedScopes.filter((s) => deniedScopes.includes(s));
  if (contradictions.length > 0) {
    violations.push(
      `CONTRADICTION: Scopes appear in both consented and denied: ${contradictions.join(', ')}`,
    );
  }

  return { valid: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// SHA-256 Consent Hash (immutable audit trail)
// ---------------------------------------------------------------------------

/**
 * Produces a SHA-256 hash of the consent payload for tamper detection.
 * Scopes are sorted before hashing to ensure deterministic output
 * regardless of insertion order.
 */
export function computeConsentHash(
  patientId: string,
  agreementId: string,
  consentedScopes: DataSharingScope[],
  deniedScopes: DataSharingScope[],
): string {
  const sortedConsented = [...consentedScopes].sort();
  const sortedDenied = [...deniedScopes].sort();
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    patientId,
    agreementId,
    consentedScopes: sortedConsented,
    deniedScopes: sortedDenied,
    timestamp,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ---------------------------------------------------------------------------
// Patient Owning-Org Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the owning organization for a patient via their primary CareTeam.
 * Patient model does not carry a direct organizationId — the owning org is
 * derived from the CareTeam.owningOrgId where the team is ACTIVE.
 *
 * AWAITING_REVIEW: Confirm this is the canonical path for patient->org resolution.
 * If a patient belongs to multiple active care teams across orgs, the first
 * (oldest) team's org is used. A future migration may add Patient.organizationId.
 */
async function resolvePatientOwningOrg(
  prisma: PrismaClient,
  patientId: string,
): Promise<string | null> {
  const careTeam = await prisma.careTeam.findFirst({
    where: { patientId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { owningOrgId: true },
  });
  return careTeam?.owningOrgId ?? null;
}

// ---------------------------------------------------------------------------
// CYRUS Invariant: Triple-Gate Access Control
// ---------------------------------------------------------------------------

/**
 * Evaluates whether a requesting user/org may access a specific data scope
 * for a patient. Implements defense-in-depth with three sequential gates:
 *
 * Gate 1 — Active DataSharingAgreement between orgs covering the requested scope.
 * Gate 2 — PatientSharingConsent granting the scope (validated for granularity).
 * Gate 3 — CareTeamMembership proving the requesting user is on the patient's team.
 *
 * Every evaluation (allowed OR denied) is logged to AuditLog.
 */
export async function canAccessData(
  prisma: PrismaClient,
  requestingUserId: string,
  requestingOrgId: string,
  patientId: string,
  scope: DataSharingScope,
): Promise<AccessCheckResult> {
  const auditTrail: Record<string, unknown> = {
    requestingUserId,
    requestingOrgId,
    patientId,
    scope,
    evaluatedAt: new Date().toISOString(),
    gates: {},
  };

  const gates = auditTrail.gates as Record<string, unknown>;

  const patientOrgId = await resolvePatientOwningOrg(prisma, patientId);
  if (!patientOrgId) {
    gates.orgResolution = { passed: false, reason: 'Patient has no active care team' };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: 'Patient has no active care team — cannot resolve owning org',
      auditTrail,
    };
  }

  // Same-org access bypasses the inter-org agreement and consent gates
  if (requestingOrgId === patientOrgId) {
    gates.sameOrg = true;
    gates.gate1 = { passed: true, reason: 'Same-org access — agreement gate bypassed' };
    gates.gate2 = { passed: true, reason: 'Same-org access — consent gate bypassed' };

    const membership = await prisma.careTeamMembership.findFirst({
      where: {
        userId: requestingUserId,
        isActive: true,
        careTeam: { patientId, status: 'ACTIVE' },
      },
    });

    if (!membership) {
      gates.gate3 = { passed: false, reason: 'User not on patient care team' };
      await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
      return {
        allowed: false,
        reason: 'CYRUS: User is not an active member of any care team for this patient',
        auditTrail,
      };
    }

    gates.gate3 = { passed: true, membershipId: membership.id };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, true);
    return {
      allowed: true,
      reason: 'Same-org access granted via care team membership',
      auditTrail,
    };
  }

  // ---- Gate 1: Active DataSharingAgreement ----
  const now = new Date();
  const agreement = await prisma.dataSharingAgreement.findFirst({
    where: {
      OR: [
        { requestingOrgId, receivingOrgId: patientOrgId },
        { requestingOrgId: patientOrgId, receivingOrgId: requestingOrgId },
      ],
      status: 'ACTIVE',
      scopes: { has: scope },
      effectiveFrom: { lte: now },
    },
  });

  if (!agreement) {
    gates.gate1 = {
      passed: false,
      reason: 'No active agreement covers this scope between orgs',
    };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: 'CYRUS Gate 1: No active data-sharing agreement between organizations for this scope',
      auditTrail,
    };
  }

  if (agreement.effectiveUntil && agreement.effectiveUntil < now) {
    gates.gate1 = {
      passed: false,
      reason: 'Agreement has expired',
      effectiveUntil: agreement.effectiveUntil.toISOString(),
    };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: 'CYRUS Gate 1: Data-sharing agreement has expired',
      auditTrail,
    };
  }

  gates.gate1 = { passed: true, agreementId: agreement.id, title: agreement.title };

  // ---- Gate 2: PatientSharingConsent ----
  const consent = await prisma.patientSharingConsent.findUnique({
    where: {
      patientId_agreementId: { patientId, agreementId: agreement.id },
    },
  });

  if (!consent) {
    gates.gate2 = {
      passed: false,
      reason: 'No patient consent record for this agreement',
    };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: 'CYRUS Gate 2: Patient has not consented to data sharing under this agreement',
      auditTrail,
    };
  }

  if (consent.revokedAt) {
    gates.gate2 = {
      passed: false,
      reason: 'Consent has been revoked',
      revokedAt: consent.revokedAt.toISOString(),
    };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: 'CYRUS Gate 2: Patient consent has been revoked',
      auditTrail,
    };
  }

  if (consent.expiresAt && consent.expiresAt < now) {
    gates.gate2 = {
      passed: false,
      reason: 'Consent has expired',
      expiresAt: consent.expiresAt.toISOString(),
    };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: 'CYRUS Gate 2: Patient consent has expired',
      auditTrail,
    };
  }

  const granularity = validateConsentGranularity(
    consent.consentedScopes,
    consent.deniedScopes,
  );
  if (!granularity.valid) {
    gates.gate2 = {
      passed: false,
      reason: 'Stored consent fails granularity validation',
      violations: granularity.violations,
    };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: `RUTH: Stored consent fails granularity validation — ${granularity.violations.join('; ')}`,
      auditTrail,
    };
  }

  if (!consent.consentedScopes.includes(scope)) {
    gates.gate2 = {
      passed: false,
      reason: `Scope ${scope} not in consented scopes`,
    };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: `CYRUS Gate 2: Patient has not consented to scope ${scope}`,
      auditTrail,
    };
  }

  if (consent.deniedScopes.includes(scope)) {
    gates.gate2 = {
      passed: false,
      reason: `Scope ${scope} explicitly denied`,
    };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: `CYRUS Gate 2: Patient has explicitly denied scope ${scope}`,
      auditTrail,
    };
  }

  gates.gate2 = {
    passed: true,
    consentId: consent.id,
    consentVersion: consent.consentVersion,
  };

  // ---- Gate 3: CareTeamMembership ----
  const membership = await prisma.careTeamMembership.findFirst({
    where: {
      userId: requestingUserId,
      isActive: true,
      careTeam: { patientId, status: 'ACTIVE' },
    },
  });

  if (!membership) {
    gates.gate3 = { passed: false, reason: 'User not on patient care team' };
    await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, false);
    return {
      allowed: false,
      reason: 'CYRUS Gate 3: Requesting user is not an active member of any care team for this patient',
      auditTrail,
    };
  }

  gates.gate3 = { passed: true, membershipId: membership.id, role: membership.role };

  await logAccessCheck(prisma, requestingUserId, patientId, scope, auditTrail, true);
  return {
    allowed: true,
    reason: 'All three gates passed — access granted',
    auditTrail,
  };
}

// ---------------------------------------------------------------------------
// Agreement Lifecycle
// ---------------------------------------------------------------------------

export async function createAgreement(
  prisma: PrismaClient,
  data: CreateAgreementInput,
  userId: string,
): Promise<DataSharingAgreement> {
  const agreement = await prisma.dataSharingAgreement.create({
    data: {
      requestingOrgId: data.requestingOrgId,
      receivingOrgId: data.receivingOrgId,
      title: data.title,
      description: data.description,
      scopes: data.scopes,
      legalBasis: data.legalBasis,
      lgpdArticle: data.lgpdArticle,
      effectiveFrom: data.effectiveFrom,
      effectiveUntil: data.effectiveUntil,
      autoRenew: data.autoRenew ?? false,
      requestedBy: userId,
      status: 'DRAFT',
    },
  });

  await logAgreementAction(prisma, userId, agreement.id, 'CREATE', {
    title: agreement.title,
    scopes: agreement.scopes,
    legalBasis: agreement.legalBasis,
  });

  return agreement;
}

export async function approveAgreement(
  prisma: PrismaClient,
  agreementId: string,
  userId: string,
): Promise<DataSharingAgreement> {
  const existing = await prisma.dataSharingAgreement.findUniqueOrThrow({
    where: { id: agreementId },
  });

  if (existing.status !== 'PENDING_APPROVAL') {
    throw new Error(
      `Agreement ${agreementId} cannot be approved — current status is ${existing.status}, expected PENDING_APPROVAL`,
    );
  }

  const agreement = await prisma.dataSharingAgreement.update({
    where: { id: agreementId },
    data: {
      status: 'ACTIVE',
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });

  await logAgreementAction(prisma, userId, agreement.id, 'UPDATE', {
    transition: `${existing.status} -> ACTIVE`,
    approvedBy: userId,
  });

  return agreement;
}

export async function revokeAgreement(
  prisma: PrismaClient,
  agreementId: string,
  userId: string,
  reason: string,
): Promise<DataSharingAgreement> {
  const existing = await prisma.dataSharingAgreement.findUniqueOrThrow({
    where: { id: agreementId },
  });

  if (existing.status === 'REVOKED') {
    throw new Error(`Agreement ${agreementId} is already revoked`);
  }

  const agreement = await prisma.dataSharingAgreement.update({
    where: { id: agreementId },
    data: {
      status: 'REVOKED',
      revokedBy: userId,
      revokedAt: new Date(),
      revocationReason: reason,
    },
  });

  await logAgreementAction(prisma, userId, agreement.id, 'REVOKE', {
    transition: `${existing.status} -> REVOKED`,
    reason,
  });

  return agreement;
}

// ---------------------------------------------------------------------------
// Patient Consent Management
// ---------------------------------------------------------------------------

/**
 * Grants consent for a patient under a specific data-sharing agreement.
 * RUTH invariant: validateConsentGranularity MUST pass before persisting.
 * CYRUS invariant: AuditLog entry created for every consent mutation.
 */
export async function grantConsent(
  prisma: PrismaClient,
  input: GrantConsentInput,
): Promise<PatientSharingConsent> {
  const granularity = validateConsentGranularity(
    input.consentedScopes,
    input.deniedScopes,
  );
  if (!granularity.valid) {
    throw new Error(
      `RUTH: Consent validation failed — ${granularity.violations.join('; ')}`,
    );
  }

  const consentHash = computeConsentHash(
    input.patientId,
    input.agreementId,
    input.consentedScopes,
    input.deniedScopes,
  );

  const consent = await prisma.patientSharingConsent.create({
    data: {
      patientId: input.patientId,
      agreementId: input.agreementId,
      consentedScopes: input.consentedScopes,
      deniedScopes: input.deniedScopes,
      grantedAt: new Date(),
      expiresAt: input.expiresAt,
      consentVersion: input.consentVersion ?? '1.0',
      signatureData: input.signatureData,
      consentText: input.consentText,
      consentHash,
    },
  });

  await logConsentAction(prisma, input.userId, input.patientId, consent.id, 'CREATE', {
    agreementId: input.agreementId,
    consentedScopes: input.consentedScopes,
    deniedScopes: input.deniedScopes,
    consentHash,
  });

  return consent;
}

/**
 * Revokes a patient's consent under a specific agreement.
 * CYRUS invariant: Never destroy AuditLog records — revocation is a soft update.
 */
export async function revokeConsent(
  prisma: PrismaClient,
  patientId: string,
  agreementId: string,
  userId: string,
): Promise<void> {
  const existing = await prisma.patientSharingConsent.findUnique({
    where: {
      patientId_agreementId: { patientId, agreementId },
    },
  });

  if (!existing) {
    throw new Error(
      `No consent record found for patient ${patientId} under agreement ${agreementId}`,
    );
  }

  if (existing.revokedAt) {
    throw new Error('Consent has already been revoked');
  }

  await prisma.patientSharingConsent.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  await logConsentAction(prisma, userId, patientId, existing.id, 'REVOKE', {
    agreementId,
    previousConsentedScopes: existing.consentedScopes,
    previousDeniedScopes: existing.deniedScopes,
    consentHash: existing.consentHash,
  });
}

// ---------------------------------------------------------------------------
// Shared Timeline Query
// ---------------------------------------------------------------------------

/**
 * Returns shared care records grouped by scope, filtered by the requesting
 * user's access rights. Calls canAccessData for each scope before including
 * records — never returns data the user is not entitled to see.
 *
 * AWAITING_REVIEW: PII encryption integration needed for returned patient data.
 */
export async function getSharedTimeline(
  prisma: PrismaClient,
  patientId: string,
  requestingUserId: string,
  requestingOrgId: string,
): Promise<ScopedRecordGroup[]> {
  const scopeResults = await Promise.all(
    ALL_SCOPES.map(async (scope) => {
      const access = await canAccessData(
        prisma,
        requestingUserId,
        requestingOrgId,
        patientId,
        scope,
      );
      return { scope, allowed: access.allowed };
    }),
  );

  const allowedScopes = scopeResults
    .filter((r) => r.allowed)
    .map((r) => r.scope);

  if (allowedScopes.length === 0) {
    return [];
  }

  const records = await prisma.sharedCareRecord.findMany({
    where: {
      patientId,
      scope: { in: allowedScopes },
    },
    orderBy: { createdAt: 'desc' },
  });

  const grouped: ScopedRecordGroup[] = allowedScopes.map((scope) => ({
    scope,
    records: records.filter((r) => r.scope === scope),
  }));

  return grouped.filter((g) => g.records.length > 0);
}

// ---------------------------------------------------------------------------
// Audit Logging Helpers
// ---------------------------------------------------------------------------

/**
 * Logs an access-control evaluation to the AuditLog.
 * Every check — whether allowed or denied — produces an immutable record.
 */
async function logAccessCheck(
  prisma: PrismaClient,
  userId: string,
  patientId: string,
  scope: DataSharingScope,
  trail: Record<string, unknown>,
  allowed: boolean,
): Promise<void> {
  try {
    const detailPayload = {
      ...trail,
      scope,
      decision: allowed ? 'ALLOWED' : 'DENIED',
    };
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(detailPayload))
      .digest('hex');

    await prisma.auditLog.create({
      data: {
        userId,
        action: allowed ? 'SHARE' : 'SECURITY_ALERT',
        resource: 'PatientSharingConsent',
        resourceId: patientId,
        details: detailPayload,
        dataHash,
        accessReason: 'CARE_COORDINATION',
        legalBasis: 'LGPD Art. 11, II, a — health data for care coordination',
        success: allowed,
        ipAddress: 'server-internal',
        actorType: 'SYSTEM',
      },
    });
  } catch (err) {
    logger.error(
      { err, userId, patientId, scope },
      'Failed to write access-check audit log',
    );
  }
}

async function logAgreementAction(
  prisma: PrismaClient,
  userId: string,
  agreementId: string,
  action: 'CREATE' | 'UPDATE' | 'REVOKE',
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(details))
      .digest('hex');

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: 'DataSharingAgreement',
        resourceId: agreementId,
        details,
        dataHash,
        accessReason: 'CARE_COORDINATION',
        legalBasis: 'LGPD Art. 7, V — contract execution',
        success: true,
        ipAddress: 'server-internal',
        actorType: 'USER',
      },
    });
  } catch (err) {
    logger.error(
      { err, userId, agreementId, action },
      'Failed to write agreement audit log',
    );
  }
}

async function logConsentAction(
  prisma: PrismaClient,
  userId: string,
  patientId: string,
  consentId: string,
  action: 'CREATE' | 'REVOKE',
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(details))
      .digest('hex');

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: 'PatientSharingConsent',
        resourceId: consentId,
        details: { ...details, patientId },
        dataHash,
        accessReason: 'CARE_COORDINATION',
        legalBasis: 'LGPD Art. 11 — explicit consent for sensitive health data',
        success: true,
        ipAddress: 'server-internal',
        actorType: 'USER',
      },
    });
  } catch (err) {
    logger.error(
      { err, userId, patientId, consentId, action },
      'Failed to write consent audit log',
    );
  }
}
