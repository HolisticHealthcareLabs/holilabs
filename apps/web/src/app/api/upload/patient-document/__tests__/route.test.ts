import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn(), auditView: jest.fn(), auditCreate: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    document: { findFirst: jest.fn(), create: jest.fn() },
  },
}));
jest.mock('@/lib/encryption', () => ({
  encryptFile: jest.fn(),
  hashFile: jest.fn(),
  generateFileId: jest.fn(),
  sanitizeFilename: jest.fn().mockImplementation((name: string) => name),
  getFileExtension: jest.fn(),
  isAllowedFileType: jest.fn(),
  isAllowedFileSize: jest.fn(),
}));
jest.mock('@/lib/storage/r2-client', () => ({
  uploadToR2: jest.fn(),
  generateStorageKey: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const enc = require('@/lib/encryption');
const r2 = require('@/lib/storage/r2-client');
const { createAuditLog } = require('@/lib/audit');

const mockContext = {
  user: { id: 'user-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockPatient = { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', state: 'SP' };
const mockDocument = {
  id: 'doc-1', patientId: 'patient-1', fileName: 'report.pdf',
  fileType: 'pdf', fileSize: 1024, createdAt: new Date(),
};

function makeDocumentRequest(patientId?: string, file?: File) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (patientId) formData.append('patientId', patientId);
  formData.append('category', 'lab_results');
  return new NextRequest('http://localhost:3000/api/upload/patient-document', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/upload/patient-document', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads document successfully and returns 201', async () => {
    enc.isAllowedFileType.mockReturnValue(true);
    enc.isAllowedFileSize.mockReturnValue(true);
    enc.hashFile.mockReturnValue('abc123hash');
    enc.encryptFile.mockReturnValue(Buffer.from('encrypted'));
    enc.generateFileId.mockReturnValue('file-id-1');
    enc.getFileExtension.mockReturnValue('pdf');
    r2.generateStorageKey.mockReturnValue('patients/patient-1/file-id-1.pdf');
    r2.uploadToR2.mockResolvedValue(undefined);
    prisma.patient.findUnique.mockResolvedValue(mockPatient);
    prisma.document.findFirst.mockResolvedValue(null);
    prisma.document.create.mockResolvedValue(mockDocument);
    createAuditLog.mockResolvedValue({ id: 'a1' });

    const file = new File(['pdf content'], 'report.pdf', { type: 'application/pdf' });
    const req = makeDocumentRequest('patient-1', file);
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.file.id).toBe('doc-1');
  });

  it('returns 400 when no file is provided', async () => {
    const req = makeDocumentRequest('patient-1', undefined);
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when patientId is missing', async () => {
    const file = new File(['content'], 'file.pdf', { type: 'application/pdf' });
    const req = makeDocumentRequest(undefined, file);
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when patient not found', async () => {
    enc.isAllowedFileType.mockReturnValue(true);
    enc.isAllowedFileSize.mockReturnValue(true);
    prisma.patient.findUnique.mockResolvedValue(null);
    const file = new File(['content'], 'file.pdf', { type: 'application/pdf' });
    const req = makeDocumentRequest('nonexistent', file);
    const res = await POST(req, mockContext);
    expect(res.status).toBe(404);
  });
});
