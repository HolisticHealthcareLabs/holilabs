import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/ai/patient-data-fetcher', () => ({
  fetchPatientWithContext: jest.fn(),
}));

jest.mock('@/lib/ai/patient-context-formatter', () => ({
  formatPatientContext: jest.fn(),
  formatPatientContextForSOAP: jest.fn(),
  formatPatientContextForScribe: jest.fn(),
  formatPatientSummary: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500 }
    )
  ),
}));

const { GET } = require('../route');
const { fetchPatientWithContext } = require('@/lib/ai/patient-data-fetcher');
const {
  formatPatientContext,
  formatPatientContextForSOAP,
  formatPatientContextForScribe,
  formatPatientSummary,
} = require('@/lib/ai/patient-context-formatter');

const mockPatient = {
  id: 'p1',
  firstName: 'Juan',
  lastName: 'Garcia',
  mrn: 'MRN-001',
};

const ctx = { user: { id: 'doc-1' } };

describe('GET /api/ai/patient-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (formatPatientContext as jest.Mock).mockReturnValue({ formatted: 'full context' });
    (formatPatientContextForSOAP as jest.Mock).mockReturnValue({ formatted: 'soap context' });
    (formatPatientContextForScribe as jest.Mock).mockReturnValue({ formatted: 'scribe context' });
    (formatPatientSummary as jest.Mock).mockReturnValue({ formatted: 'summary' });
  });

  it('returns full patient context by default', async () => {
    (fetchPatientWithContext as jest.Mock).mockResolvedValue(mockPatient);

    const req = new NextRequest('http://localhost:3000/api/ai/patient-context?patientId=p1');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.format).toBe('full');
    expect(json.patient.name).toBe('Juan Garcia');
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/patient-context');
    const res = await GET(req, ctx);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('patientId is required');
  });

  it('returns 404 when patient not found', async () => {
    (fetchPatientWithContext as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/ai/patient-context?patientId=unknown');
    const res = await GET(req, ctx);

    expect(res.status).toBe(404);
  });

  it('requires chiefComplaint for SOAP format', async () => {
    (fetchPatientWithContext as jest.Mock).mockResolvedValue(mockPatient);

    const req = new NextRequest('http://localhost:3000/api/ai/patient-context?patientId=p1&format=soap');
    const res = await GET(req, ctx);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('chiefComplaint');
  });
});
