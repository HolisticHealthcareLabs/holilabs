import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn() }));

const mockBuildFhirBundle = jest.fn();
jest.mock('../../../../../../../../packages/shared-kernel/src/clinical/fhir-mapper', () => ({
  buildFhirBundle: mockBuildFhirBundle,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const { POST } = require('../route');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/interop/fhir/export', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validPayload = {
  patientId: 'pat-1',
  providerId: 'doc-1',
  soapNote: 'Patient presents with headache.',
  diagnoses: [{ code: 'G43.909', name: 'Migraine', type: 'primary' }],
  billingCodes: [{ code: '99213', name: 'Office visit', system: 'CBHPM', estimatedValueBRL: 150 }],
};

describe('POST /api/interop/fhir/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/interop/fhir/export', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ patientId: 'pat-1' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/validation failed/i);
  });

  it('returns 502 when EHR endpoint fails', async () => {
    mockBuildFhirBundle.mockReturnValue({
      resourceType: 'Bundle',
      type: 'transaction',
      timestamp: new Date().toISOString(),
      entry: [{ resource: {} }],
    });
    mockFetch.mockResolvedValue({ ok: false, status: 503, text: () => Promise.resolve('Service Unavailable') });

    const res = await POST(makeRequest(validPayload), mockContext);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/ehr export failed/i);
  });

  it('exports FHIR bundle successfully (200)', async () => {
    mockBuildFhirBundle.mockReturnValue({
      resourceType: 'Bundle',
      type: 'transaction',
      timestamp: new Date().toISOString(),
      entry: [{ resource: {} }, { resource: {} }],
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const res = await POST(makeRequest(validPayload), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.entryCount).toBe(2);
  });
});
