import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn() },
    document: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/patients/dossier-queue', () => ({
  enqueuePatientDossierJob: jest.fn(() => Promise.resolve()),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

const mockDoc = {
  id: 'doc-1',
  fileName: 'lab-results.pdf',
  fileType: 'application/pdf',
  fileSize: 1024,
  storageUrl: 'https://storage.example.com/doc-1',
  documentType: 'LAB_RESULT',
  processingStatus: 'SYNCHRONIZED',
  createdAt: new Date(),
  uploadedBy: 'clinician-1',
};

describe('GET /api/patients/[id]/documents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns document list for authorized clinician', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.document.findMany as jest.Mock).mockResolvedValue([mockDoc]);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/documents'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].fileName).toBe('lab-results.pdf');
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/documents'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/documents'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});

describe('POST /api/patients/[id]/documents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads a new document', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.document.create as jest.Mock).mockResolvedValue({
      id: 'doc-new', fileName: 'report.pdf', fileType: 'application/pdf',
      fileSize: 2048, documentType: 'CLINICAL_NOTE', processingStatus: 'SYNCHRONIZED',
      createdAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/documents', {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'report.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
        dataUrl: 'data:application/pdf;base64,dGVzdA==',
        documentType: 'CLINICAL_NOTE',
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('returns 400 when required fields are missing', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/documents', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'test.pdf' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('deduplicates document with same content hash for same patient', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: 'doc-existing' });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/documents', {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'report.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
        dataUrl: 'data:application/pdf;base64,dGVzdA==',
        documentType: 'CLINICAL_NOTE',
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.deduped).toBe(true);
  });
});
