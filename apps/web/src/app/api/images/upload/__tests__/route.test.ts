import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  ),
}));

const mockDeidentify = jest.fn();
jest.mock('@/lib/deidentification/image-deidentifier', () => ({
  deidentifyMedicalImage: mockDeidentify,
}));

jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

const { POST, GET } = require('../route');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
};

describe('POST /api/images/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when no file provided', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/images/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/no file/i);
  });

  it('returns 400 for unsupported file type', async () => {
    const file = new File(['data'], 'doc.exe', { type: 'application/x-msdownload' });
    const formData = new FormData();
    formData.append('file', file);

    const req = new NextRequest('http://localhost:3000/api/images/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/invalid file type/i);
  });

  it('uploads and de-identifies image successfully', async () => {
    mockDeidentify.mockResolvedValue({
      pseudonymizedId: 'pseudo-001',
      originalHash: 'hash-abc',
      removedPHI: ['patientName'],
      timestamp: new Date().toISOString(),
      auditLogId: 'audit-001',
    });

    const file = new File(['png-data'], 'xray.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', 'pat-1');

    const req = new NextRequest('http://localhost:3000/api/images/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.pseudonymizedId).toBe('pseudo-001');
  });
});

describe('GET /api/images/upload', () => {
  it('returns upload endpoint info', async () => {
    const res = await GET(new NextRequest('http://localhost:3000/api/images/upload'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.endpoint).toBe('/api/images/upload');
    expect(data.method).toBe('POST');
  });
});
