import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  requirePatientAccess: () => jest.fn(),
}));

jest.mock('@/lib/services/prevention-export.service', () => ({
  exportPreventionReport: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  auditExport: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { exportPreventionReport } = require('@/lib/services/prevention-export.service');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { patientId: 'patient-1' },
};

describe('GET /api/prevention/hub/[patientId]/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns CSV file download for valid request', async () => {
    (exportPreventionReport as jest.Mock).mockResolvedValue({
      content: 'id,name\npatient-1,Maria',
      contentType: 'text/csv',
      filename: 'prevention-report-patient-1.csv',
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/hub/patient-1/export?format=csv');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('prevention-report');
  });

  it('returns 400 when format parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/hub/patient-1/export');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid format');
  });

  it('returns 400 when format is not csv or pdf', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/hub/patient-1/export?format=xlsx');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 404 when patient not found in export service', async () => {
    (exportPreventionReport as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/hub/patient-1/export?format=pdf');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });
});
