/**
 * GET /api/dicomweb/studies - QIDO-RS study query tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    imagingStudy: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockStudy = {
  id: 'img-1',
  studyInstanceUID: '1.2.3.4',
  studyDate: new Date('2025-06-01'),
  modality: 'CT',
  bodyPart: 'CHEST',
  description: 'CT Chest',
  accessionNumber: 'ACC001',
  imageCount: 5,
  patientId: 'p-1',
  patient: { id: 'p-1', firstName: 'Ana', lastName: 'Lopez', mrn: 'MRN001' },
  referringDoctor: null,
};

describe('GET /api/dicomweb/studies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns studies in DICOM JSON format', async () => {
    (prisma.imagingStudy.findMany as jest.Mock).mockResolvedValue([mockStudy]);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/dicom+json');

    const data = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0]['0020000D'].Value[0]).toBe('1.2.3.4');
    expect(data[0]['00080061'].Value[0]).toBe('CT');
  });

  it('filters by PatientID parameter', async () => {
    (prisma.imagingStudy.findMany as jest.Mock).mockResolvedValue([mockStudy]);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies?PatientID=p-1');
    await GET(request);

    const call = (prisma.imagingStudy.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.patientId).toBe('p-1');
  });

  it('returns empty array when no studies found', async () => {
    (prisma.imagingStudy.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(0);
  });
});
