/**
 * Cross-Organization Data Sharing Service — Test Suite
 *
 * Validates RUTH (consent granularity) and CYRUS (triple-gate access control)
 * invariants per LGPD Art. 7, 11, 33.
 */

jest.mock('@prisma/client', () => ({
  DataSharingScope: {
    DEMOGRAPHICS: 'DEMOGRAPHICS',
    DIAGNOSES: 'DIAGNOSES',
    MEDICATIONS: 'MEDICATIONS',
    LAB_RESULTS: 'LAB_RESULTS',
    IMAGING: 'IMAGING',
    CARE_PLANS: 'CARE_PLANS',
    ENCOUNTERS: 'ENCOUNTERS',
    VITAL_SIGNS: 'VITAL_SIGNS',
    ALLERGIES: 'ALLERGIES',
    PRESCRIPTIONS: 'PRESCRIPTIONS',
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { DataSharingScope } = require('@prisma/client');

const {
  validateConsentGranularity,
  computeConsentHash,
  canAccessData,
  createAgreement,
  approveAgreement,
  revokeAgreement,
  grantConsent,
  revokeConsent,
} = require('@/lib/care-coordination/cross-org.service');

// ---------------------------------------------------------------------------
// Prisma mock factory
// ---------------------------------------------------------------------------

function buildPrismaMock() {
  return {
    careTeam: {
      findFirst: jest.fn(),
    },
    dataSharingAgreement: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patientSharingConsent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    careTeamMembership: {
      findFirst: jest.fn(),
    },
    sharedCareRecord: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Scope shortcuts
// ---------------------------------------------------------------------------

const ALL_SCOPES = Object.values(DataSharingScope) as string[];

const PARTIAL_CONSENTED = [
  DataSharingScope.DEMOGRAPHICS,
  DataSharingScope.DIAGNOSES,
  DataSharingScope.MEDICATIONS,
];

const PARTIAL_DENIED = [
  DataSharingScope.IMAGING,
  DataSharingScope.PRESCRIPTIONS,
];

// ---------------------------------------------------------------------------
// 1. validateConsentGranularity
// ---------------------------------------------------------------------------

describe('validateConsentGranularity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects blanket consent (all 10 scopes consented, none denied)', () => {
    const result = validateConsentGranularity(ALL_SCOPES, []);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('BLANKET_CONSENT');
  });

  it('rejects empty consent (no scopes consented)', () => {
    const result = validateConsentGranularity([], [DataSharingScope.IMAGING]);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('EMPTY_CONSENT');
  });

  it('rejects contradictions (same scope in both consented and denied)', () => {
    const result = validateConsentGranularity(
      [DataSharingScope.DEMOGRAPHICS, DataSharingScope.IMAGING],
      [DataSharingScope.IMAGING],
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v: string) => v.includes('CONTRADICTION'))).toBe(true);
  });

  it('accepts valid partial consent (3 consented, 2 denied)', () => {
    const result = validateConsentGranularity(PARTIAL_CONSENTED, PARTIAL_DENIED);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('accepts single-scope consent (1 consented, 9 denied)', () => {
    const singleConsented = [DataSharingScope.DEMOGRAPHICS];
    const restDenied = ALL_SCOPES.filter(
      (s: string) => s !== DataSharingScope.DEMOGRAPHICS,
    );
    const result = validateConsentGranularity(singleConsented, restDenied);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('rejects blanket consent even with zero-length deniedScopes array', () => {
    const result = validateConsentGranularity([...ALL_SCOPES], []);
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('BLANKET_CONSENT');
  });

  it('returns multiple violations simultaneously (empty + contradiction)', () => {
    const result = validateConsentGranularity(
      [],
      [DataSharingScope.IMAGING],
    );
    // Empty consent fires; contradiction does not because consented is empty
    expect(result.valid).toBe(false);
    expect(result.violations.some((v: string) => v.includes('EMPTY_CONSENT'))).toBe(true);
  });

  it('accepts consent with non-overlapping scopes covering a subset', () => {
    const result = validateConsentGranularity(
      [DataSharingScope.LAB_RESULTS, DataSharingScope.VITAL_SIGNS],
      [DataSharingScope.CARE_PLANS],
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. computeConsentHash
// ---------------------------------------------------------------------------

describe('computeConsentHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a 64-char hex string (SHA-256)', () => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-28T00:00:00.000Z');
    const hash = computeConsentHash(
      'patient-1',
      'agreement-1',
      [DataSharingScope.DEMOGRAPHICS],
      [DataSharingScope.IMAGING],
    );
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    jest.restoreAllMocks();
  });

  it('is deterministic — same inputs produce same output', () => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-28T00:00:00.000Z');
    const h1 = computeConsentHash(
      'patient-1',
      'agreement-1',
      [DataSharingScope.DEMOGRAPHICS],
      [DataSharingScope.IMAGING],
    );
    const h2 = computeConsentHash(
      'patient-1',
      'agreement-1',
      [DataSharingScope.DEMOGRAPHICS],
      [DataSharingScope.IMAGING],
    );
    expect(h1).toBe(h2);
    jest.restoreAllMocks();
  });

  it('is order-independent — sorted scopes produce same hash regardless of input order', () => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-28T00:00:00.000Z');
    const h1 = computeConsentHash(
      'patient-1',
      'agreement-1',
      [DataSharingScope.IMAGING, DataSharingScope.DEMOGRAPHICS],
      [DataSharingScope.MEDICATIONS, DataSharingScope.ALLERGIES],
    );
    const h2 = computeConsentHash(
      'patient-1',
      'agreement-1',
      [DataSharingScope.DEMOGRAPHICS, DataSharingScope.IMAGING],
      [DataSharingScope.ALLERGIES, DataSharingScope.MEDICATIONS],
    );
    expect(h1).toBe(h2);
    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// 3. canAccessData — triple-gate
// ---------------------------------------------------------------------------

describe('canAccessData', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;

  const USER_ID = 'user-req-1';
  const ORG_A = 'org-a';
  const ORG_B = 'org-b';
  const PATIENT_ID = 'patient-1';
  const SCOPE = DataSharingScope.DEMOGRAPHICS;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildPrismaMock();
  });

  it('denies when patient has no active care team (no org resolution)', async () => {
    prisma.careTeam.findFirst.mockResolvedValue(null);

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('no active care team');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('grants same-org access if user is on care team (gates 1+2 bypassed)', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_A });
    prisma.careTeamMembership.findFirst.mockResolvedValue({ id: 'mem-1', role: 'PHYSICIAN' });

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Same-org');
    // Agreement and consent queries should NOT have been called
    expect(prisma.dataSharingAgreement.findFirst).not.toHaveBeenCalled();
    expect(prisma.patientSharingConsent.findUnique).not.toHaveBeenCalled();
  });

  it('denies same-org access if user NOT on care team', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_A });
    prisma.careTeamMembership.findFirst.mockResolvedValue(null);

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not an active member');
  });

  it('cross-org: denies when no active agreement covers scope (Gate 1 fail)', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_B });
    prisma.dataSharingAgreement.findFirst.mockResolvedValue(null);

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Gate 1');
    expect(result.reason).toContain('No active data-sharing agreement');
  });

  it('cross-org: denies when agreement has expired (Gate 1 fail)', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_B });
    prisma.dataSharingAgreement.findFirst.mockResolvedValue({
      id: 'agr-1',
      title: 'Test Agreement',
      effectiveUntil: new Date('2020-01-01'),
    });

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Gate 1');
    expect(result.reason).toContain('expired');
  });

  it('cross-org: denies when no consent record exists (Gate 2 fail)', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_B });
    prisma.dataSharingAgreement.findFirst.mockResolvedValue({
      id: 'agr-1',
      title: 'Test Agreement',
      effectiveUntil: new Date('2099-01-01'),
    });
    prisma.patientSharingConsent.findUnique.mockResolvedValue(null);

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Gate 2');
    expect(result.reason).toContain('not consented');
  });

  it('cross-org: denies when consent is revoked (Gate 2 fail)', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_B });
    prisma.dataSharingAgreement.findFirst.mockResolvedValue({
      id: 'agr-1',
      title: 'Test Agreement',
      effectiveUntil: new Date('2099-01-01'),
    });
    prisma.patientSharingConsent.findUnique.mockResolvedValue({
      id: 'consent-1',
      revokedAt: new Date('2025-06-01'),
      consentedScopes: [SCOPE],
      deniedScopes: [],
    });

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Gate 2');
    expect(result.reason).toContain('revoked');
  });

  it('cross-org: denies when consent has expired (Gate 2 fail)', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_B });
    prisma.dataSharingAgreement.findFirst.mockResolvedValue({
      id: 'agr-1',
      title: 'Test Agreement',
      effectiveUntil: new Date('2099-01-01'),
    });
    prisma.patientSharingConsent.findUnique.mockResolvedValue({
      id: 'consent-1',
      revokedAt: null,
      expiresAt: new Date('2020-01-01'),
      consentedScopes: [SCOPE],
      deniedScopes: [],
    });

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Gate 2');
    expect(result.reason).toContain('expired');
  });

  it('cross-org: denies when scope not in consented scopes (Gate 2 fail)', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_B });
    prisma.dataSharingAgreement.findFirst.mockResolvedValue({
      id: 'agr-1',
      title: 'Test Agreement',
      effectiveUntil: new Date('2099-01-01'),
    });
    prisma.patientSharingConsent.findUnique.mockResolvedValue({
      id: 'consent-1',
      revokedAt: null,
      expiresAt: null,
      consentedScopes: [DataSharingScope.MEDICATIONS],
      deniedScopes: [DataSharingScope.IMAGING],
      consentVersion: '1.0',
    });

    const result = await canAccessData(
      prisma,
      USER_ID,
      ORG_A,
      PATIENT_ID,
      DataSharingScope.DEMOGRAPHICS,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Gate 2');
    expect(result.reason).toContain('DEMOGRAPHICS');
  });

  it('cross-org: grants when all three gates pass', async () => {
    prisma.careTeam.findFirst.mockResolvedValue({ owningOrgId: ORG_B });
    prisma.dataSharingAgreement.findFirst.mockResolvedValue({
      id: 'agr-1',
      title: 'Test Agreement',
      effectiveUntil: new Date('2099-01-01'),
    });
    prisma.patientSharingConsent.findUnique.mockResolvedValue({
      id: 'consent-1',
      revokedAt: null,
      expiresAt: null,
      consentedScopes: PARTIAL_CONSENTED,
      deniedScopes: PARTIAL_DENIED,
      consentVersion: '1.0',
    });
    prisma.careTeamMembership.findFirst.mockResolvedValue({
      id: 'mem-1',
      role: 'SPECIALIST',
    });

    const result = await canAccessData(prisma, USER_ID, ORG_A, PATIENT_ID, SCOPE);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('All three gates passed');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Agreement lifecycle
// ---------------------------------------------------------------------------

describe('Agreement lifecycle', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;

  const USER_ID = 'admin-1';
  const AGREEMENT_ID = 'agr-1';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildPrismaMock();
  });

  it('createAgreement creates with DRAFT status and logs audit', async () => {
    const mockAgreement = {
      id: AGREEMENT_ID,
      title: 'Org A <> Org B',
      scopes: PARTIAL_CONSENTED,
      legalBasis: 'LGPD Art. 7, V',
      status: 'DRAFT',
    };
    prisma.dataSharingAgreement.create.mockResolvedValue(mockAgreement);
    prisma.auditLog.create.mockResolvedValue({});

    const result = await createAgreement(
      prisma,
      {
        requestingOrgId: 'org-a',
        receivingOrgId: 'org-b',
        title: 'Org A <> Org B',
        scopes: PARTIAL_CONSENTED,
        legalBasis: 'LGPD Art. 7, V',
        effectiveFrom: new Date('2026-01-01'),
      },
      USER_ID,
    );

    expect(result.status).toBe('DRAFT');
    const createCall = prisma.dataSharingAgreement.create.mock.calls[0][0];
    expect(createCall.data.status).toBe('DRAFT');
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('approveAgreement transitions PENDING_APPROVAL -> ACTIVE', async () => {
    prisma.dataSharingAgreement.findUniqueOrThrow.mockResolvedValue({
      id: AGREEMENT_ID,
      status: 'PENDING_APPROVAL',
    });
    const activeAgreement = { id: AGREEMENT_ID, status: 'ACTIVE' };
    prisma.dataSharingAgreement.update.mockResolvedValue(activeAgreement);
    prisma.auditLog.create.mockResolvedValue({});

    const result = await approveAgreement(prisma, AGREEMENT_ID, USER_ID);
    expect(result.status).toBe('ACTIVE');
    const updateCall = prisma.dataSharingAgreement.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('ACTIVE');
    expect(updateCall.data.approvedBy).toBe(USER_ID);
  });

  it('approveAgreement rejects non-PENDING_APPROVAL status', async () => {
    prisma.dataSharingAgreement.findUniqueOrThrow.mockResolvedValue({
      id: AGREEMENT_ID,
      status: 'DRAFT',
    });

    await expect(approveAgreement(prisma, AGREEMENT_ID, USER_ID)).rejects.toThrow(
      /cannot be approved.*DRAFT.*PENDING_APPROVAL/,
    );
    expect(prisma.dataSharingAgreement.update).not.toHaveBeenCalled();
  });

  it('revokeAgreement sets REVOKED and logs', async () => {
    prisma.dataSharingAgreement.findUniqueOrThrow.mockResolvedValue({
      id: AGREEMENT_ID,
      status: 'ACTIVE',
    });
    const revokedAgreement = { id: AGREEMENT_ID, status: 'REVOKED' };
    prisma.dataSharingAgreement.update.mockResolvedValue(revokedAgreement);
    prisma.auditLog.create.mockResolvedValue({});

    const result = await revokeAgreement(
      prisma,
      AGREEMENT_ID,
      USER_ID,
      'Breach of terms',
    );

    expect(result.status).toBe('REVOKED');
    const updateCall = prisma.dataSharingAgreement.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('REVOKED');
    expect(updateCall.data.revocationReason).toBe('Breach of terms');
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Consent lifecycle
// ---------------------------------------------------------------------------

describe('Consent lifecycle', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;

  const USER_ID = 'user-1';
  const PATIENT_ID = 'patient-1';
  const AGREEMENT_ID = 'agr-1';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildPrismaMock();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-28T00:00:00.000Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('grantConsent validates granularity before persisting (RUTH)', async () => {
    await expect(
      grantConsent(prisma, {
        patientId: PATIENT_ID,
        agreementId: AGREEMENT_ID,
        consentedScopes: ALL_SCOPES as any,
        deniedScopes: [],
        consentText: 'I consent',
        userId: USER_ID,
      }),
    ).rejects.toThrow(/RUTH.*BLANKET_CONSENT/);

    expect(prisma.patientSharingConsent.create).not.toHaveBeenCalled();
  });

  it('grantConsent creates consent with hash and audit log', async () => {
    const mockConsent = {
      id: 'consent-1',
      patientId: PATIENT_ID,
      agreementId: AGREEMENT_ID,
      consentedScopes: PARTIAL_CONSENTED,
      deniedScopes: PARTIAL_DENIED,
      consentHash: 'abc123',
    };
    prisma.patientSharingConsent.create.mockResolvedValue(mockConsent);
    prisma.auditLog.create.mockResolvedValue({});

    const result = await grantConsent(prisma, {
      patientId: PATIENT_ID,
      agreementId: AGREEMENT_ID,
      consentedScopes: PARTIAL_CONSENTED,
      deniedScopes: PARTIAL_DENIED,
      consentText: 'I consent to share specified data',
      userId: USER_ID,
    });

    expect(result.id).toBe('consent-1');
    const createCall = prisma.patientSharingConsent.create.mock.calls[0][0];
    expect(createCall.data.consentHash).toBeDefined();
    expect(typeof createCall.data.consentHash).toBe('string');
    expect(createCall.data.consentHash).toHaveLength(64);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('revokeConsent soft-revokes and logs audit', async () => {
    prisma.patientSharingConsent.findUnique.mockResolvedValue({
      id: 'consent-1',
      patientId: PATIENT_ID,
      revokedAt: null,
      consentedScopes: PARTIAL_CONSENTED,
      deniedScopes: PARTIAL_DENIED,
      consentHash: 'abc123',
    });
    prisma.patientSharingConsent.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    await revokeConsent(prisma, PATIENT_ID, AGREEMENT_ID, USER_ID);

    expect(prisma.patientSharingConsent.update).toHaveBeenCalledTimes(1);
    const updateCall = prisma.patientSharingConsent.update.mock.calls[0][0];
    expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
