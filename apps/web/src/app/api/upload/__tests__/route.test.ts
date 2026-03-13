import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn() }));
jest.mock('@/lib/storage/file-storage', () => ({ uploadFile: jest.fn() }));
jest.mock('@/lib/api/safe-error-response', () => ({ safeErrorResponse: jest.fn() }));

const { POST } = require('../route');
const { checkRateLimit } = require('@/lib/rate-limit');
const { uploadFile } = require('@/lib/storage/file-storage');

const mockContext = {
  user: { id: 'user-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

function makeFileRequest(file: File | null) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  return new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 when file is uploaded successfully', async () => {
    checkRateLimit.mockResolvedValue(null);
    uploadFile.mockResolvedValue({
      url: 'https://storage.example.com/file.pdf',
      fileSize: 1024,
      key: 'uploads/user-1/file.pdf',
    });
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const req = makeFileRequest(file);
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('returns 400 when no file is provided', async () => {
    checkRateLimit.mockResolvedValue(null);
    const req = makeFileRequest(null);
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns rate limit response when rate limit is exceeded', async () => {
    checkRateLimit.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
    );
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const req = makeFileRequest(file);
    const res = await POST(req, mockContext);
    expect(res.status).toBe(429);
  });

  it('returns 500 when upload storage throws an error', async () => {
    checkRateLimit.mockResolvedValue(null);
    uploadFile.mockRejectedValue(new Error('Storage unavailable'));
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const req = makeFileRequest(file);
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
