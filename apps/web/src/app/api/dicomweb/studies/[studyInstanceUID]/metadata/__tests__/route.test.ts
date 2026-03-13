/**
 * GET /api/dicomweb/studies/[studyInstanceUID]/metadata - WADO-RS metadata tests
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
    imagingStudy: { findFirst: jest.fn() },
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
  imageCount: 3,
  imageUrls: ['url1', 'url2', 'url3'],
  patientId: 'p-1',
  patient: { id: 'p-1', firstName: 'Ana', lastName: 'Lopez', mrn: 'MRN001' },
};

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { studyInstanceUID: '1.2.3.4' },
  requestId: 'req-1',
};

describe('GET /api/dicomweb/studies/[studyInstanceUID]/metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns instance metadata for a study', async () => {
    (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies/1.2.3.4/metadata');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/dicom+json');
    expect(data.length).toBeGreaterThanOrEqual(3);
    expect(data[0]['0020000D'].Value[0]).toBe('1.2.3.4');
  });

  it('returns 404 for unknown study', async () => {
    (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies/unknown/metadata');
    const response = await GET(request, { ...mockContext, params: { studyInstanceUID: 'unknown' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns correct instance count matching imageCount', async () => {
    (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies/1.2.3.4/metadata');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(data).toHaveLength(3);
    expect(data[2]['00200013'].Value[0]).toBe('3');
  });
});
