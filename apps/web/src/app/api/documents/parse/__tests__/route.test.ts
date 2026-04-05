import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/encryption', () => ({
  sanitizeFilename: jest.fn((name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_')),
  isAllowedFileType: jest.fn(() => true),
  isAllowedFileSize: jest.fn(() => true),
}));

jest.mock('@/lib/services/document.service', () => ({
  createDocumentService: jest.fn(() => ({
    enqueueParseJob: jest.fn().mockResolvedValue({ jobId: 'job-1', bullmqJobId: 'bmq-1' }),
  })),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { isAllowedFileType, isAllowedFileSize } = require('@/lib/encryption');

function makeFormData(fields: Record<string, any>): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    fd.append(key, val);
  }
  return fd;
}

const ctx = { user: { id: 'clinician-1', role: 'CLINICIAN' } };

describe('POST /api/documents/parse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when no file is provided', async () => {
    const fd = makeFormData({ patientId: 'p1' });
    const req = new NextRequest('http://localhost:3000/api/documents/parse', {
      method: 'POST',
      body: fd,
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('No file provided');
  });

  it('returns 400 when patientId is missing', async () => {
    const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
    const fd = makeFormData({ file });
    const req = new NextRequest('http://localhost:3000/api/documents/parse', {
      method: 'POST',
      body: fd,
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Patient ID is required');
  });

  it('returns 404 when patient does not exist', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
    const fd = makeFormData({ file, patientId: 'nonexistent' });
    const req = new NextRequest('http://localhost:3000/api/documents/parse', {
      method: 'POST',
      body: fd,
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Patient not found');
  });

  it('returns 400 for disallowed file type', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
    (isAllowedFileType as jest.Mock).mockReturnValue(false);

    const file = new File(['test'], 'malware.exe', { type: 'application/x-msdownload' });
    const fd = makeFormData({ file, patientId: 'p1' });
    const req = new NextRequest('http://localhost:3000/api/documents/parse', {
      method: 'POST',
      body: fd,
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('File type not allowed');
  });
});
