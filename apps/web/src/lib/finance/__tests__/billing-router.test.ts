/**
 * BillingRouter unit tests
 *
 * Tests: crosswalkCode, lookupRate, requiresPriorAuth, routeClaim, getBillingRouter
 * Pattern: jest.mock() first, then require() — per CLAUDE.md
 */

// ── Mocks (hoisted) ────────────────────────────────────────────────────────────

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
  BillingSystem: {
    TUSS: 'TUSS',
    CBHPM: 'CBHPM',
    CID10_BR: 'CID10_BR',
    NOMENCLADOR: 'NOMENCLADOR',
    CIE10_AR: 'CIE10_AR',
    CNS_BO: 'CNS_BO',
    INASES_BO: 'INASES_BO',
    SAFCI_BO: 'SAFCI_BO',
    SUMI_BO: 'SUMI_BO',
    SSPAM_BO: 'SSPAM_BO',
    SNOMED_CT: 'SNOMED_CT',
  },
}));

jest.mock('../tuss-lookup', () => ({
  getTUSSByCode: jest.fn(),
}));

// ── Imports after mocks ─────────────────────────────────────────────────────────

const { getTUSSByCode } = require('../tuss-lookup');
const { BillingRouter, getBillingRouter } = require('../billing-router');
const { BillingSystem } = require('@prisma/client');

// ── Test data ───────────────────────────────────────────────────────────────────

function mockPrisma() {
  return {
    snomedCrosswalk: { findFirst: jest.fn() },
    feeSchedule: { findFirst: jest.fn() },
    feeScheduleLine: { findFirst: jest.fn() },
    procedureCode: { findFirst: jest.fn() },
    insurer: { findUnique: jest.fn() },
    priorAuthRule: { findFirst: jest.fn() },
    clinicianNetwork: { findUnique: jest.fn() },
  };
}

const MOCK_CROSSWALK = {
  snomedConceptId: '11429006',
  country: 'BR',
  mappingType: 'EXACT',
  confidence: 0.95,
  procedureCode: {
    code: '1.01.01.09-6',
    system: 'TUSS',
    shortDescription: 'Consulta em Consultório — Clínico Geral',
    actuarialWeight: 0.1,
  },
};

const MOCK_FEE_SCHEDULE = {
  id: 'fs-bradesco-01',
  insurerId: 'ins-bradesco',
  billingSystem: 'TUSS',
  currency: 'BRL',
  isActive: true,
  effectiveDate: new Date('2024-01-01'),
};

const MOCK_FEE_LINE = {
  negotiatedRate: 280.0,
  confidence: 'CONTRACTED',
  isCovered: true,
  coverageLimit: null,
  copayFlat: 25.0,
  copayPercent: null,
  procedureCode: {
    code: '1.01.01.09-6',
    system: 'TUSS',
    isActive: true,
  },
};

const MOCK_AUTH_RULE = {
  required: true,
  windowDays: 5,
  urgentWindowHours: 24,
  requiredDocuments: ['medical_report', 'referral_letter'],
  requiredDiagnoses: ['Z00.0'],
  notes: 'Requires specialist referral',
  expirationDate: null,
};

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('BillingRouter', () => {
  let db: ReturnType<typeof mockPrisma>;
  let router: InstanceType<typeof BillingRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    db = mockPrisma();
    router = new BillingRouter(db);
  });

  // ── crosswalkCode ───────────────────────────────────────────────────────────

  describe('crosswalkCode', () => {
    it('resolves SNOMED to billing code for a given country', async () => {
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(MOCK_CROSSWALK);

      const result = await router.crosswalkCode('11429006', 'BR');

      expect(result).toEqual({
        snomedConceptId: '11429006',
        billingCode: '1.01.01.09-6',
        billingSystem: 'TUSS',
        country: 'BR',
        shortDescription: 'Consulta em Consultório — Clínico Geral',
        actuarialWeight: 0.1,
        mappingType: 'EXACT',
        confidence: 0.95,
      });

      expect(db.snomedCrosswalk.findFirst).toHaveBeenCalledWith({
        where: {
          snomedConceptId: '11429006',
          country: 'BR',
          procedureCode: { isActive: true },
        },
        orderBy: { confidence: 'desc' },
        include: {
          procedureCode: {
            select: {
              code: true,
              system: true,
              shortDescription: true,
              actuarialWeight: true,
            },
          },
        },
      });
    });

    it('returns null when no crosswalk exists', async () => {
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await router.crosswalkCode('999999999', 'AR');
      expect(result).toBeNull();
    });
  });

  // ── lookupRate ──────────────────────────────────────────────────────────────

  describe('lookupRate', () => {
    it('returns contracted rate from fee schedule line', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_SCHEDULE);
      (db.feeScheduleLine.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_LINE);

      const result = await router.lookupRate('1.01.01.09-6', BillingSystem.TUSS, 'ins-bradesco');

      expect(result).toEqual({
        billingCode: '1.01.01.09-6',
        billingSystem: 'TUSS',
        negotiatedRate: 280.0,
        currency: 'BRL',
        confidence: 'CONTRACTED',
        isCovered: true,
        coverageLimit: null,
        copayFlat: 25.0,
        copayPercent: null,
        usedFallback: false,
      });
    });

    it('falls back to reference rate on ProcedureCode when no fee schedule line', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue({
        code: '1.01.01.09-6',
        system: 'TUSS',
        referenceRateBRL: 189.0,
        referenceRateARS: null,
        referenceRateBOB: null,
      });
      (db.insurer.findUnique as jest.Mock).mockResolvedValue({ country: 'BR' });

      const result = await router.lookupRate('1.01.01.09-6', BillingSystem.TUSS, 'ins-bradesco');

      expect(result).toEqual({
        billingCode: '1.01.01.09-6',
        billingSystem: 'TUSS',
        negotiatedRate: 189.0,
        currency: 'BRL',
        confidence: 'REFERENCE',
        isCovered: true,
        coverageLimit: null,
        copayFlat: null,
        copayPercent: null,
        usedFallback: true,
      });
    });

    it('uses ARS reference rate for Argentina', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue({
        code: '010101',
        system: 'NOMENCLADOR',
        referenceRateBRL: null,
        referenceRateARS: 4500.0,
        referenceRateBOB: null,
      });
      (db.insurer.findUnique as jest.Mock).mockResolvedValue({ country: 'AR' });

      const result = await router.lookupRate('010101', BillingSystem.NOMENCLADOR, 'ins-osde');

      expect(result!.negotiatedRate).toBe(4500.0);
      expect(result!.currency).toBe('ARS');
      expect(result!.usedFallback).toBe(true);
    });

    it('uses BOB reference rate for Bolivia', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue({
        code: 'CON-001',
        system: 'CNS_BO',
        referenceRateBRL: null,
        referenceRateARS: null,
        referenceRateBOB: 120.0,
      });
      (db.insurer.findUnique as jest.Mock).mockResolvedValue({ country: 'BO' });

      const result = await router.lookupRate('CON-001', BillingSystem.CNS_BO, 'ins-cns');

      expect(result!.negotiatedRate).toBe(120.0);
      expect(result!.currency).toBe('BOB');
    });

    it('falls back to tuss-lookup.ts for TUSS codes when DB has no data', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue(null);
      (getTUSSByCode as jest.Mock).mockReturnValue({
        code: '1.01.01.09-6',
        baseRateBRL: 189.0,
        baseRateBOB: 120.0,
        actuarialWeight: 0.1,
      });

      const result = await router.lookupRate('1.01.01.09-6', BillingSystem.TUSS, 'ins-bradesco');

      expect(result).toEqual({
        billingCode: '1.01.01.09-6',
        billingSystem: 'TUSS',
        negotiatedRate: 189.0,
        currency: 'BRL',
        confidence: 'ESTIMATED',
        isCovered: true,
        coverageLimit: null,
        copayFlat: null,
        copayPercent: null,
        usedFallback: true,
      });
      expect(getTUSSByCode).toHaveBeenCalledWith('1.01.01.09-6');
    });

    it('uses BOB rate from tuss-lookup when BRL is missing', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue(null);
      (getTUSSByCode as jest.Mock).mockReturnValue({
        code: '1.01.01.50-9',
        baseRateBRL: null,
        baseRateBOB: 85.0,
        actuarialWeight: 0.05,
      });

      const result = await router.lookupRate('1.01.01.50-9', BillingSystem.TUSS, 'ins-unknown');

      expect(result!.negotiatedRate).toBe(85.0);
      expect(result!.currency).toBe('BOB');
    });

    it('does not use tuss-lookup for non-TUSS systems', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await router.lookupRate('010101', BillingSystem.NOMENCLADOR, 'ins-osde');

      expect(result).toBeNull();
      expect(getTUSSByCode).not.toHaveBeenCalled();
    });

    it('returns null when all fallbacks exhausted', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue(null);
      (getTUSSByCode as jest.Mock).mockReturnValue(undefined);

      const result = await router.lookupRate('UNKNOWN', BillingSystem.TUSS, 'ins-bradesco');
      expect(result).toBeNull();
    });

    it('returns rate even when fee schedule exists but line missing', async () => {
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_SCHEDULE);
      (db.feeScheduleLine.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue({
        code: '1.01.01.09-6',
        system: 'TUSS',
        referenceRateBRL: 189.0,
        referenceRateARS: null,
        referenceRateBOB: null,
      });
      (db.insurer.findUnique as jest.Mock).mockResolvedValue({ country: 'BR' });

      const result = await router.lookupRate('1.01.01.09-6', BillingSystem.TUSS, 'ins-bradesco');

      expect(result!.confidence).toBe('REFERENCE');
      expect(result!.usedFallback).toBe(true);
    });
  });

  // ── requiresPriorAuth ───────────────────────────────────────────────────────

  describe('requiresPriorAuth', () => {
    it('returns prior auth requirements when rule exists', async () => {
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(MOCK_AUTH_RULE);

      const result = await router.requiresPriorAuth('1.01.01.09-6', BillingSystem.TUSS, 'ins-sulamerica');

      expect(result).toEqual({
        required: true,
        windowDays: 5,
        urgentWindowHours: 24,
        requiredDocuments: ['medical_report', 'referral_letter'],
        requiredDiagnoses: ['Z00.0'],
        notes: 'Requires specialist referral',
      });
    });

    it('returns required=false when no rule exists', async () => {
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await router.requiresPriorAuth('1.01.01.09-6', BillingSystem.TUSS, 'ins-bradesco');

      expect(result).toEqual({
        required: false,
        windowDays: null,
        urgentWindowHours: null,
        requiredDocuments: [],
        requiredDiagnoses: [],
        notes: null,
      });
    });

    it('queries with expiration filter (null or future)', async () => {
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(null);

      await router.requiresPriorAuth('1.01.01.09-6', BillingSystem.TUSS, 'ins-test');

      const call = (db.priorAuthRule.findFirst as jest.Mock).mock.calls[0][0];
      expect(call.where.OR).toEqual([
        { expirationDate: null },
        { expirationDate: { gte: expect.any(Date) } },
      ]);
    });
  });

  // ── routeClaim ──────────────────────────────────────────────────────────────

  describe('routeClaim', () => {
    it('returns full routing with contracted rate and no prior auth', async () => {
      // crosswalkCode
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(MOCK_CROSSWALK);
      // lookupRate
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_SCHEDULE);
      (db.feeScheduleLine.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_LINE);
      // requiresPriorAuth
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await router.routeClaim({
        snomedConceptId: '11429006',
        country: 'BR',
        insurerId: 'ins-bradesco',
      });

      expect(result.billingCode).toBe('1.01.01.09-6');
      expect(result.billingSystem).toBe('TUSS');
      expect(result.procedureDescription).toBe('Consulta em Consultório — Clínico Geral');
      expect(result.actuarialWeight).toBe(0.1);
      expect(result.rate!.negotiatedRate).toBe(280.0);
      expect(result.rate!.usedFallback).toBe(false);
      expect(result.priorAuth.required).toBe(false);
      expect(result.clinicianNetwork).toBeNull();
      expect(result.routingConfidence).toBe(0.95);
      expect(result.usedFallback).toBe(false);
      expect(result.resolvedAt).toBeDefined();
    });

    it('degrades gracefully when crosswalk not found', async () => {
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await router.routeClaim({
        snomedConceptId: '999999999',
        country: 'BR',
        insurerId: 'ins-bradesco',
      });

      expect(result.billingCode).toBeNull();
      expect(result.billingSystem).toBeNull();
      expect(result.rate).toBeNull();
      expect(result.routingConfidence).toBe(0);
      expect(result.usedFallback).toBe(true);
    });

    it('includes clinician network status when clinicianId provided', async () => {
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(MOCK_CROSSWALK);
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_SCHEDULE);
      (db.feeScheduleLine.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_LINE);
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.clinicianNetwork.findUnique as jest.Mock).mockResolvedValue({
        isInNetwork: true,
        networkTier: 'PREFERRED',
      });

      const result = await router.routeClaim({
        snomedConceptId: '11429006',
        country: 'BR',
        insurerId: 'ins-bradesco',
        clinicianId: 'user-dr-123',
      });

      expect(result.clinicianNetwork).toEqual({
        isInNetwork: true,
        networkTier: 'PREFERRED',
      });
      expect(db.clinicianNetwork.findUnique).toHaveBeenCalledWith({
        where: { userId_insurerId: { userId: 'user-dr-123', insurerId: 'ins-bradesco' } },
        select: { isInNetwork: true, networkTier: true },
      });
    });

    it('returns isInNetwork=false when clinician not in network table', async () => {
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(MOCK_CROSSWALK);
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_SCHEDULE);
      (db.feeScheduleLine.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_LINE);
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.clinicianNetwork.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await router.routeClaim({
        snomedConceptId: '11429006',
        country: 'BR',
        insurerId: 'ins-bradesco',
        clinicianId: 'user-unknown',
      });

      expect(result.clinicianNetwork).toEqual({
        isInNetwork: false,
        networkTier: null,
      });
    });

    it('penalizes confidence when rate uses fallback', async () => {
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(MOCK_CROSSWALK);
      // No fee schedule → triggers fallback
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue({
        code: '1.01.01.09-6',
        system: 'TUSS',
        referenceRateBRL: 189.0,
        referenceRateARS: null,
        referenceRateBOB: null,
      });
      (db.insurer.findUnique as jest.Mock).mockResolvedValue({ country: 'BR' });
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await router.routeClaim({
        snomedConceptId: '11429006',
        country: 'BR',
        insurerId: 'ins-bradesco',
      });

      // crosswalk confidence 0.95 - 0.1 fallback penalty = 0.85
      expect(result.routingConfidence).toBe(0.85);
      expect(result.usedFallback).toBe(true);
    });

    it('penalizes confidence further when no rate found at all', async () => {
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(MOCK_CROSSWALK);
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (db.procedureCode.findFirst as jest.Mock).mockResolvedValue(null);
      (getTUSSByCode as jest.Mock).mockReturnValue(undefined);
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await router.routeClaim({
        snomedConceptId: '11429006',
        country: 'BR',
        insurerId: 'ins-bradesco',
      });

      // 0.95 - 0.1 (fallback) - 0.1 (no rate) = 0.75
      expect(result.routingConfidence).toBe(0.75);
      expect(result.rate).toBeNull();
    });

    it('includes prior auth in full route when rule exists', async () => {
      (db.snomedCrosswalk.findFirst as jest.Mock).mockResolvedValue(MOCK_CROSSWALK);
      (db.feeSchedule.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_SCHEDULE);
      (db.feeScheduleLine.findFirst as jest.Mock).mockResolvedValue(MOCK_FEE_LINE);
      (db.priorAuthRule.findFirst as jest.Mock).mockResolvedValue(MOCK_AUTH_RULE);

      const result = await router.routeClaim({
        snomedConceptId: '11429006',
        country: 'BR',
        insurerId: 'ins-sulamerica',
      });

      expect(result.priorAuth.required).toBe(true);
      expect(result.priorAuth.windowDays).toBe(5);
      expect(result.priorAuth.requiredDocuments).toContain('medical_report');
    });
  });

  // ── getBillingRouter singleton ──────────────────────────────────────────────

  describe('getBillingRouter', () => {
    it('returns a BillingRouter instance', () => {
      const router = getBillingRouter(db);
      expect(router).toBeInstanceOf(BillingRouter);
    });

    it('returns the same instance on subsequent calls', () => {
      const r1 = getBillingRouter(db);
      const r2 = getBillingRouter(db);
      expect(r1).toBe(r2);
    });
  });
});
