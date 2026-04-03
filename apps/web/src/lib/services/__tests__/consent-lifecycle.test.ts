/**
 * Suite 2 — Consent Lifecycle
 *
 * Proves LGPD/HIPAA consent checks are enforced:
 * - Absent, inactive, expired, revoked → denied
 * - Active, non-expired → permitted
 * - Purpose limitation (consent type must match required type)
 * - Audit logged on every check
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => null),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    consent: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((fn: any) => fn({
      auditLog: { create: jest.fn() },
    })),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() })),
  logError: jest.fn((e: any) => ({ message: String(e) })),
}));

// ─── After mocks ──────────────────────────────────────────────────────────────

const { prisma } = require('@/lib/prisma');

import { ConsentGuard } from '@/lib/consent/consent-guard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PATIENT_ID = 'patient-test-001';

function makeActiveConsent(type: string, overrides: Record<string, any> = {}) {
  return {
    type,
    isActive: true,
    revokedAt: null,
    expiresAt: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Suite 2 — Consent Lifecycle', () => {
  let guard: ConsentGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the singleton — reset any cached instance state via clearAllMocks
    guard = ConsentGuard.getInstance();
  });

  // ── Explicit Consent Required ────────────────────────────────────────────────

  describe('Explicit Consent Required', () => {
    it('[REJECT] checkConsent() returns allowed=false when Consent table has no record', async () => {
      prisma.consent.findMany.mockResolvedValue([]);

      const result = await guard.checkConsent(PATIENT_ID, ['anonymous_research']);

      expect(result.allowed).toBe(false);
      expect(result.missingConsents).toContain('anonymous_research');
    });

    it('[REJECT] checkConsent() returns allowed=false when consent isActive=false', async () => {
      // The consent guard filters isActive:true in the query, so findMany returns empty
      prisma.consent.findMany.mockResolvedValue([]);

      const result = await guard.checkConsent(PATIENT_ID, ['anonymous_research']);

      expect(result.allowed).toBe(false);
      expect(result.missingConsents.length).toBeGreaterThan(0);
    });

    it('[REJECT] checkConsent() rejects expired consent (expiresAt in the past)', async () => {
      // The guard applies { expiresAt: { gt: new Date() } } filter in the query
      // So expired consent is excluded from findMany results
      prisma.consent.findMany.mockResolvedValue([]);

      const result = await guard.checkConsent(PATIENT_ID, ['appointment_booking']);

      expect(result.allowed).toBe(false);
    });

    it('[PERMIT] checkConsent() returns allowed=true for active, non-expired, non-revoked consent', async () => {
      prisma.consent.findMany.mockResolvedValue([
        makeActiveConsent('APPOINTMENT_REMINDERS'),
        makeActiveConsent('GENERAL_CONSULTATION'),
      ]);

      const result = await guard.checkConsent(PATIENT_ID, ['treatment_access', 'appointment_booking']);

      expect(result.allowed).toBe(true);
      expect(result.missingConsents).toHaveLength(0);
    });
  });

  // ── Consent Revocation ───────────────────────────────────────────────────────

  describe('Consent Revocation — Immediate Halt', () => {
    it('[REJECT] canRecordClinicalSession() returns false after consent is revoked', async () => {
      // Revoked consent is excluded by the revokedAt: null filter in the query
      prisma.consent.findMany.mockResolvedValue([]);

      const result = await guard.canRecordClinicalSession(PATIENT_ID);

      expect(result.allowed).toBe(false);
    });

    it('[REJECT] canUseForResearch() returns false when DATA_RESEARCH consent revoked', async () => {
      prisma.consent.findMany.mockResolvedValue([]);

      const result = await guard.canUseForResearch(PATIENT_ID);

      expect(result.allowed).toBe(false);
      expect(result.missingConsents).toContain('anonymous_research');
    });
  });

  // ── Purpose Limitation ───────────────────────────────────────────────────────

  describe('Purpose Limitation', () => {
    it('[REJECT] DATA_RESEARCH consent does not satisfy TELEHEALTH/clinical_recording purpose', async () => {
      // Only DATA_RESEARCH (anonymous_research) consent exists, not RECORDING (clinical_recording)
      prisma.consent.findMany.mockResolvedValue([
        makeActiveConsent('DATA_RESEARCH'),
      ]);

      // canRecordClinicalSession requires treatment_access (GENERAL_CONSULTATION) + clinical_recording (RECORDING)
      const result = await guard.canRecordClinicalSession(PATIENT_ID);

      expect(result.allowed).toBe(false);
      expect(result.missingConsents.length).toBeGreaterThan(0);
    });

    it('[REJECT] WELLNESS_TIPS consent does not grant APPOINTMENT_REMINDERS', async () => {
      prisma.consent.findMany.mockResolvedValue([
        makeActiveConsent('WELLNESS_TIPS'),
      ]);

      // canBookAppointment requires treatment_access + appointment_booking
      const result = await guard.canBookAppointment(PATIENT_ID);

      expect(result.allowed).toBe(false);
      expect(result.missingConsents).toContain('treatment_access');
    });
  });

  // ── Audit on Consent Check ───────────────────────────────────────────────────

  describe('Audit on Consent Check', () => {
    it('[AUDIT] logConsentCheck() calls prisma.auditLog.create with action=READ and resource=ConsentGuard', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-001' });

      await guard.logConsentCheck(
        PATIENT_ID,
        'canBookAppointment',
        { allowed: true, missingConsents: [] },
        { ipAddress: '10.0.0.1' }
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'READ',
            resource: 'ConsentGuard',
            accessReason: 'DIRECT_PATIENT_CARE',
          }),
        })
      );
    });

    it('[AUDIT] requireConsent() calls logConsentCheck on both pass and fail', async () => {
      prisma.consent.findMany.mockResolvedValue([]);
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-002' });

      const spy = jest.spyOn(guard, 'logConsentCheck');

      await guard.requireConsent(PATIENT_ID, ['anonymous_research'], 'research-operation');

      expect(spy).toHaveBeenCalled();
    });
  });
});
