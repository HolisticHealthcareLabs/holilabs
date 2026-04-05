/**
 * Data Sharing API route tests.
 *
 * Covers agreements CRUD, approval/revocation, consent grant,
 * and scoped timeline retrieval.
 */

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — MUST be declared before any require()
// ---------------------------------------------------------------------------

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dataSharingAgreement: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    patientSharingConsent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patient: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  __esModule: true,
  safeErrorResponse: jest.fn((_error: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: opts?.userMessage ?? 'Internal server error' },
      { status: 500 },
    );
  }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/care-coordination/cross-org.service', () => ({
  createAgreement: jest.fn(),
  approveAgreement: jest.fn(),
  revokeAgreement: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
  getSharedTimeline: jest.fn(),
  validateConsentGranularity: jest.fn(),
  computeConsentHash: jest.fn(),
  canAccessData: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Require handlers AFTER mocks
// ---------------------------------------------------------------------------

const { prisma } = require('@/lib/prisma');
const crossOrg = require('@/lib/care-coordination/cross-org.service');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const agreementsRoot = require('../agreements/route');
const agreementApprove = require('../agreements/[id]/approve/route');
const agreementRevoke = require('../agreements/[id]/revoke/route');
const consentsRoot = require('../consents/route');
const timelineRoute = require('../timeline/[patientId]/route');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AGREEMENTS_URL = 'http://localhost:3000/api/data-sharing/agreements';
const CONSENTS_URL = 'http://localhost:3000/api/data-sharing/consents';
const TIMELINE_URL = 'http://localhost:3000/api/data-sharing/timeline';

function makeRequest(url: string, opts?: { method?: string; body?: any }): NextRequest {
  const init: RequestInit = { method: opts?.method ?? 'GET' };
  if (opts?.body) {
    init.method = opts.method ?? 'POST';
    init.body = JSON.stringify(opts.body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(new URL(url), init as any);
}

const adminContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN', organizationId: 'org-1' },
  params: {},
};

const clinicianContext = {
  user: { id: 'doc-1', email: 'dr@holilabs.com', role: 'CLINICIAN', organizationId: 'org-1' },
  params: {},
};

function ctxWith(base: any, overrides: Record<string, any> = {}) {
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
});

// ===========================================================================
// POST /data-sharing/agreements
// ===========================================================================

describe('POST /data-sharing/agreements', () => {
  const handler = agreementsRoot.POST;

  const validBody = {
    requestingOrgId: 'org-1',
    receivingOrgId: 'org-2',
    title: 'Lab Data Exchange',
    scopes: ['LAB_RESULTS', 'DIAGNOSES'],
    legalBasis: 'LGPD Art. 7, V',
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  };

  it('creates an agreement via the cross-org service', async () => {
    const mockAgreement = { id: 'agr-1', title: 'Lab Data Exchange', status: 'DRAFT' };
    (crossOrg.createAgreement as jest.Mock).mockResolvedValue(mockAgreement);

    const req = makeRequest(AGREEMENTS_URL, { body: validBody });
    const res = await handler(req, ctxWith(adminContext));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe('agr-1');
    expect(crossOrg.createAgreement).toHaveBeenCalledTimes(1);
  });

  it('returns 422 when scopes are empty', async () => {
    const req = makeRequest(AGREEMENTS_URL, {
      body: { ...validBody, scopes: [] },
    });
    const res = await handler(req, ctxWith(adminContext));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('Validation error');
  });

  it('returns 422 when title is missing', async () => {
    const { title: _removed, ...noTitle } = validBody;
    const req = makeRequest(AGREEMENTS_URL, { body: noTitle });
    const res = await handler(req, ctxWith(adminContext));

    expect(res.status).toBe(422);
  });
});

// ===========================================================================
// GET /data-sharing/agreements
// ===========================================================================

describe('GET /data-sharing/agreements', () => {
  const handler = agreementsRoot.GET;

  it('lists agreements for the user organization', async () => {
    const agreements = [{ id: 'agr-1', title: 'Lab Exchange' }];
    (prisma.dataSharingAgreement.findMany as jest.Mock).mockResolvedValue(agreements);
    (prisma.dataSharingAgreement.count as jest.Mock).mockResolvedValue(1);

    const req = makeRequest(AGREEMENTS_URL);
    const res = await handler(req, ctxWith(adminContext));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('filters by status query param', async () => {
    (prisma.dataSharingAgreement.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.dataSharingAgreement.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest(`${AGREEMENTS_URL}?status=ACTIVE`);
    const res = await handler(req, ctxWith(adminContext));

    expect(res.status).toBe(200);
    expect(prisma.dataSharingAgreement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });
});

// ===========================================================================
// PATCH /data-sharing/agreements/[id]/approve
// ===========================================================================

describe('PATCH /data-sharing/agreements/[id]/approve', () => {
  const handler = agreementApprove.PATCH;

  it('approves an agreement when user belongs to receiving org', async () => {
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      receivingOrgId: 'org-1',
      status: 'PENDING_APPROVAL',
    });
    (crossOrg.approveAgreement as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      status: 'ACTIVE',
    });

    const req = makeRequest(`${AGREEMENTS_URL}/agr-1/approve`, { method: 'PATCH', body: {} });
    const res = await handler(req, ctxWith(adminContext, { params: { id: 'agr-1' } }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('ACTIVE');
    expect(crossOrg.approveAgreement).toHaveBeenCalledWith(prisma, 'agr-1', 'admin-1');
  });

  it('returns 403 when user is not from the receiving org', async () => {
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      receivingOrgId: 'other-org',
      status: 'PENDING_APPROVAL',
    });

    const req = makeRequest(`${AGREEMENTS_URL}/agr-1/approve`, { method: 'PATCH', body: {} });
    const res = await handler(req, ctxWith(adminContext, { params: { id: 'agr-1' } }));

    expect(res.status).toBe(403);
  });

  it('returns 404 when agreement does not exist', async () => {
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest(`${AGREEMENTS_URL}/nope/approve`, { method: 'PATCH', body: {} });
    const res = await handler(req, ctxWith(adminContext, { params: { id: 'nope' } }));

    expect(res.status).toBe(404);
  });

  it('returns 409 when service throws cannot-be-approved error', async () => {
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      receivingOrgId: 'org-1',
      status: 'DRAFT',
    });
    (crossOrg.approveAgreement as jest.Mock).mockRejectedValue(
      new Error('Agreement agr-1 cannot be approved — current status is DRAFT'),
    );

    const req = makeRequest(`${AGREEMENTS_URL}/agr-1/approve`, { method: 'PATCH', body: {} });
    const res = await handler(req, ctxWith(adminContext, { params: { id: 'agr-1' } }));

    expect(res.status).toBe(409);
  });
});

// ===========================================================================
// PATCH /data-sharing/agreements/[id]/revoke
// ===========================================================================

describe('PATCH /data-sharing/agreements/[id]/revoke', () => {
  const handler = agreementRevoke.PATCH;

  it('revokes an agreement with a reason', async () => {
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      requestingOrgId: 'org-1',
      receivingOrgId: 'org-2',
    });
    (crossOrg.revokeAgreement as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      status: 'REVOKED',
    });

    const req = makeRequest(`${AGREEMENTS_URL}/agr-1/revoke`, {
      method: 'PATCH',
      body: { reason: 'No longer needed' },
    });
    const res = await handler(req, ctxWith(adminContext, { params: { id: 'agr-1' } }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('REVOKED');
    expect(crossOrg.revokeAgreement).toHaveBeenCalledWith(
      prisma,
      'agr-1',
      'admin-1',
      'No longer needed',
    );
  });

  it('returns 422 when reason is missing', async () => {
    const req = makeRequest(`${AGREEMENTS_URL}/agr-1/revoke`, {
      method: 'PATCH',
      body: {},
    });
    const res = await handler(req, ctxWith(adminContext, { params: { id: 'agr-1' } }));

    expect(res.status).toBe(422);
  });

  it('returns 403 when user org is neither requesting nor receiving', async () => {
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      requestingOrgId: 'org-X',
      receivingOrgId: 'org-Y',
    });

    const req = makeRequest(`${AGREEMENTS_URL}/agr-1/revoke`, {
      method: 'PATCH',
      body: { reason: 'Expired' },
    });
    const res = await handler(req, ctxWith(adminContext, { params: { id: 'agr-1' } }));

    expect(res.status).toBe(403);
  });

  it('returns 409 when agreement is already revoked', async () => {
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      requestingOrgId: 'org-1',
      receivingOrgId: 'org-2',
    });
    (crossOrg.revokeAgreement as jest.Mock).mockRejectedValue(
      new Error('Agreement agr-1 is already revoked'),
    );

    const req = makeRequest(`${AGREEMENTS_URL}/agr-1/revoke`, {
      method: 'PATCH',
      body: { reason: 'Duplicate' },
    });
    const res = await handler(req, ctxWith(adminContext, { params: { id: 'agr-1' } }));

    expect(res.status).toBe(409);
  });
});

// ===========================================================================
// POST /data-sharing/consents
// ===========================================================================

describe('POST /data-sharing/consents', () => {
  const handler = consentsRoot.POST;

  const validBody = {
    patientId: 'pat-1',
    agreementId: 'agr-1',
    consentedScopes: ['LAB_RESULTS', 'DIAGNOSES'],
    deniedScopes: ['IMAGING'],
    consentText: 'I consent to share lab results and diagnoses.',
  };

  it('grants consent when granularity is valid', async () => {
    (crossOrg.validateConsentGranularity as jest.Mock).mockReturnValue({
      valid: true,
      violations: [],
    });
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      status: 'ACTIVE',
    });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'pat-1' });
    (prisma.patientSharingConsent.findUnique as jest.Mock).mockResolvedValue(null);
    (crossOrg.computeConsentHash as jest.Mock).mockReturnValue('sha256-hash');
    (crossOrg.grantConsent as jest.Mock).mockResolvedValue({
      id: 'consent-1',
      patientId: 'pat-1',
      consentedScopes: ['LAB_RESULTS', 'DIAGNOSES'],
    });

    const req = makeRequest(CONSENTS_URL, { body: validBody });
    const res = await handler(req, ctxWith(clinicianContext));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe('consent-1');
    expect(crossOrg.grantConsent).toHaveBeenCalledTimes(1);
  });

  it('returns 422 when consent granularity validation fails', async () => {
    (crossOrg.validateConsentGranularity as jest.Mock).mockReturnValue({
      valid: false,
      violations: ['BLANKET_CONSENT: All scopes consented with no denials'],
    });

    const req = makeRequest(CONSENTS_URL, {
      body: {
        ...validBody,
        consentedScopes: [
          'DEMOGRAPHICS', 'DIAGNOSES', 'MEDICATIONS', 'LAB_RESULTS',
          'IMAGING', 'CARE_PLANS', 'ENCOUNTERS', 'VITAL_SIGNS',
          'ALLERGIES', 'PRESCRIPTIONS',
        ],
        deniedScopes: [],
      },
    });
    const res = await handler(req, ctxWith(clinicianContext));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.violations).toBeDefined();
  });

  it('returns 409 when active consent already exists', async () => {
    (crossOrg.validateConsentGranularity as jest.Mock).mockReturnValue({
      valid: true,
      violations: [],
    });
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      status: 'ACTIVE',
    });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'pat-1' });
    (prisma.patientSharingConsent.findUnique as jest.Mock).mockResolvedValue({
      id: 'consent-existing',
      revokedAt: null,
    });

    const req = makeRequest(CONSENTS_URL, { body: validBody });
    const res = await handler(req, ctxWith(clinicianContext));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('Active consent already exists');
  });

  it('returns 404 when agreement does not exist', async () => {
    (crossOrg.validateConsentGranularity as jest.Mock).mockReturnValue({
      valid: true,
      violations: [],
    });
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest(CONSENTS_URL, { body: validBody });
    const res = await handler(req, ctxWith(clinicianContext));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Agreement not found');
  });

  it('returns 409 when agreement is not ACTIVE', async () => {
    (crossOrg.validateConsentGranularity as jest.Mock).mockReturnValue({
      valid: true,
      violations: [],
    });
    (prisma.dataSharingAgreement.findUnique as jest.Mock).mockResolvedValue({
      id: 'agr-1',
      status: 'DRAFT',
    });

    const req = makeRequest(CONSENTS_URL, { body: validBody });
    const res = await handler(req, ctxWith(clinicianContext));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('DRAFT');
  });
});

// ===========================================================================
// GET /data-sharing/timeline/[patientId]
// ===========================================================================

describe('GET /data-sharing/timeline/[patientId]', () => {
  const handler = timelineRoute.GET;

  it('returns the shared timeline for a patient', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'pat-1' });
    (crossOrg.getSharedTimeline as jest.Mock).mockResolvedValue([
      { scope: 'LAB_RESULTS', records: [{ id: 'rec-1' }] },
    ]);

    const req = makeRequest(`${TIMELINE_URL}/pat-1`);
    const res = await handler(req, ctxWith(clinicianContext, { params: { patientId: 'pat-1' } }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].scope).toBe('LAB_RESULTS');
  });

  it('returns 404 when patient does not exist', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest(`${TIMELINE_URL}/nope`);
    const res = await handler(req, ctxWith(clinicianContext, { params: { patientId: 'nope' } }));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Patient not found');
  });

  it('returns 403 when scope filter access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'pat-1' });
    (crossOrg.canAccessData as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: 'CYRUS Gate 2: Patient has not consented to scope IMAGING',
    });

    const req = makeRequest(`${TIMELINE_URL}/pat-1?scope=IMAGING`);
    const res = await handler(req, ctxWith(clinicianContext, { params: { patientId: 'pat-1' } }));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('CYRUS Gate 2');
  });

  it('returns 400 when patientId param is missing', async () => {
    const req = makeRequest(`${TIMELINE_URL}/`);
    const res = await handler(req, ctxWith(clinicianContext, { params: {} }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing patient ID');
  });
});
