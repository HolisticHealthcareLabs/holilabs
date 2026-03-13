import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn() },
    appointment: { findFirst: jest.fn() },
    scribeSession: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: opts?.userMessage ?? 'Internal server error' }, { status: 500 });
  }),
}));

jest.mock('@/lib/consent/recording-consent', () => ({
  verifyRecordingConsent: jest.fn(),
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn(),
  ServerAnalyticsEvents: { SCRIBE_SESSION_STARTED: 'SCRIBE_SESSION_STARTED' },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyRecordingConsent } = require('@/lib/consent/recording-consent');
const { trackEvent } = require('@/lib/analytics/server-analytics');

const ctx = { user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' } };

describe('POST /api/scribe/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyRecordingConsent as jest.Mock).mockResolvedValue({ allowed: true });
    (trackEvent as jest.Mock).mockResolvedValue(undefined);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('creates a scribe session with valid data', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'p1', state: 'SP' });
    (prisma.scribeSession.create as jest.Mock).mockResolvedValue({
      id: 'sess-1',
      patientId: 'p1',
      status: 'RECORDING',
      patient: { id: 'p1', firstName: 'Ana' },
      clinician: { id: 'doc-1', firstName: 'Dr' },
    });

    const req = new NextRequest('http://localhost:3000/api/scribe/sessions', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'p1',
        accessReason: 'DIRECT_PATIENT_CARE',
      }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('RECORDING');
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions', {
      method: 'POST',
      body: JSON.stringify({ accessReason: 'DIRECT_PATIENT_CARE' }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Patient ID is required');
  });

  it('returns 400 when accessReason is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p1', accessReason: 'CURIOSITY' }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Access reason is required');
  });

  it('returns 403 when recording consent denied', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'p1', state: 'CA' });
    (verifyRecordingConsent as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: 'Two-party consent required',
      requiresConsent: true,
    });

    const req = new NextRequest('http://localhost:3000/api/scribe/sessions', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p1', accessReason: 'DIRECT_PATIENT_CARE' }),
    });

    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });
});
