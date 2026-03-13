import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findFirst: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    notification: { create: jest.fn().mockResolvedValue({ id: 'notif-1' }) },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/auth/patient-session', () => ({
  requirePatientSession: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: { PORTAL_DOCUMENT_UPLOADED: 'portal_document_uploaded' },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { requirePatientSession } = require('@/lib/auth/patient-session');

const mockSession = {
  patientId: 'pat-1',
  userId: 'user-1',
  email: 'patient@test.com',
};

const mockDocument = {
  id: 'doc-1',
  fileName: 'blood-test.pdf',
  fileType: 'pdf',
  fileSize: 1024,
  documentType: 'LAB_RESULTS',
  documentHash: 'abc123',
  createdAt: new Date('2025-01-01'),
};

function makeFormDataRequest(options: {
  file?: { name: string; type: string; size: number };
  documentType?: string;
}) {
  const formData = new FormData();

  if (options.file) {
    const blob = new Blob(['fake-content'], { type: options.file.type });
    Object.defineProperty(blob, 'size', { value: options.file.size });
    const file = new File([blob], options.file.name, { type: options.file.type });
    Object.defineProperty(file, 'size', { value: options.file.size });
    formData.append('file', file);
  }

  if (options.documentType) {
    formData.append('documentType', options.documentType);
  }

  return new NextRequest('http://localhost:3000/api/portal/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/portal/documents/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads a document successfully (200)', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.document.create as jest.Mock).mockResolvedValue(mockDocument);

    const res = await POST(
      makeFormDataRequest({
        file: { name: 'blood-test.pdf', type: 'application/pdf', size: 1024 },
        documentType: 'LAB_RESULTS',
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.document.id).toBe('doc-1');
  });

  it('returns 400 when no file is provided', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue(mockSession);

    const res = await POST(
      makeFormDataRequest({ documentType: 'LAB_RESULTS' })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/no file/i);
  });

  it('returns 400 for invalid file type', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue(mockSession);

    const res = await POST(
      makeFormDataRequest({
        file: { name: 'malware.exe', type: 'application/x-msdownload', size: 500 },
        documentType: 'OTHER',
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/invalid file type/i);
  });

  it('returns 409 when document already uploaded (duplicate hash)', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.document.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-doc' });

    const res = await POST(
      makeFormDataRequest({
        file: { name: 'blood-test.pdf', type: 'application/pdf', size: 1024 },
        documentType: 'LAB_RESULTS',
      })
    );
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/already been uploaded/i);
  });
});
