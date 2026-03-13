/**
 * GET/POST /api/imaging - Imaging studies tests
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
    imagingStudy: { findMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/imaging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns 400 when patientId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/imaging');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('patientId');
  });

  it('returns imaging studies for a patient', async () => {
    (prisma.imagingStudy.findMany as jest.Mock).mockResolvedValue([
      { id: 'img-1', modality: 'CT', bodyPart: 'CHEST', patientId: 'p-1' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/imaging?patientId=p-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('applies modality filter', async () => {
    (prisma.imagingStudy.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/imaging?patientId=p-1&modality=MRI');
    await GET(request, mockContext);

    expect(prisma.imagingStudy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientId: 'p-1', modality: 'MRI' }),
      })
    );
  });
});

describe('POST /api/imaging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/imaging', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p-1' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('creates imaging study and returns data', async () => {
    const mockStudy = {
      id: 'img-1',
      patientId: 'p-1',
      modality: 'CT',
      bodyPart: 'CHEST',
      description: 'Chest CT',
      studyDate: new Date(),
    };
    (prisma.imagingStudy.create as jest.Mock).mockResolvedValue(mockStudy);

    const request = new NextRequest('http://localhost:3000/api/imaging', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'p-1',
        modality: 'CT',
        bodyPart: 'CHEST',
        description: 'Chest CT',
        studyDate: '2024-01-15',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.imagingStudy.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('calls safeErrorResponse on database error', async () => {
    const { safeErrorResponse } = require('@/lib/api/safe-error-response');
    (prisma.imagingStudy.create as jest.Mock).mockRejectedValue(new Error('DB down'));

    const request = new NextRequest('http://localhost:3000/api/imaging', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'p-1',
        modality: 'CT',
        bodyPart: 'CHEST',
        description: 'Chest CT',
        studyDate: '2024-01-15',
      }),
    });
    await POST(request, mockContext);

    expect(safeErrorResponse).toHaveBeenCalled();
  });
});
