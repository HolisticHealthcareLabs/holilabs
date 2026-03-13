/**
 * GET/PATCH/DELETE /api/imaging/[id] - Imaging study detail tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    imagingStudy: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'img-1' },
};

describe('GET /api/imaging/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns 404 when study not found', async () => {
    (prisma.imagingStudy.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/imaging/img-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns imaging study with patient data', async () => {
    (prisma.imagingStudy.findUnique as jest.Mock).mockResolvedValue({
      id: 'img-1',
      modality: 'CT',
      patient: { id: 'p-1', firstName: 'John', lastName: 'Doe', mrn: 'MRN001' },
      accessGrants: [],
    });

    const request = new NextRequest('http://localhost:3000/api/imaging/img-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.modality).toBe('CT');
  });

  it('returns 500 on database error', async () => {
    (prisma.imagingStudy.findUnique as jest.Mock).mockRejectedValue(new Error('DB down'));

    const request = new NextRequest('http://localhost:3000/api/imaging/img-1');
    const response = await GET(request, mockContext);

    expect(response.status).toBe(500);
  });
});

describe('PATCH /api/imaging/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('returns 404 when study not found', async () => {
    (prisma.imagingStudy.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/imaging/img-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it('updates study and creates audit log', async () => {
    (prisma.imagingStudy.findUnique as jest.Mock).mockResolvedValue({ id: 'img-1' });
    (prisma.imagingStudy.update as jest.Mock).mockResolvedValue({
      id: 'img-1',
      status: 'COMPLETED',
      findings: 'Normal',
    });

    const request = new NextRequest('http://localhost:3000/api/imaging/img-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED', findings: 'Normal' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});

describe('DELETE /api/imaging/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('returns 404 when study not found', async () => {
    (prisma.imagingStudy.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/imaging/img-1', { method: 'DELETE' });
    const response = await DELETE(request, mockContext);

    expect(response.status).toBe(404);
  });

  it('deletes study and creates audit log', async () => {
    (prisma.imagingStudy.findUnique as jest.Mock).mockResolvedValue({
      id: 'img-1',
      modality: 'CT',
      bodyPart: 'CHEST',
      studyDate: new Date(),
      patientId: 'p-1',
    });
    (prisma.imagingStudy.delete as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/imaging/img-1', { method: 'DELETE' });
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.imagingStudy.delete).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
