/**
 * GET /api/dicomweb/studies/[studyInstanceUID]/series - QIDO-RS series query tests
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
  modality: 'MRI',
  bodyPart: 'HEAD',
  description: 'Brain MRI',
  imageCount: 10,
  patientId: 'p-1',
  patient: { id: 'p-1', firstName: 'Ana', lastName: 'Lopez' },
};

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { studyInstanceUID: '1.2.3.4' },
  requestId: 'req-1',
};

describe('GET /api/dicomweb/studies/[studyInstanceUID]/series', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns series data in DICOM JSON', async () => {
    (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies/1.2.3.4/series');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/dicom+json');
    expect(data).toHaveLength(1);
    expect(data[0]['00080060'].Value[0]).toBe('MRI');
  });

  it('returns 404 for unknown study', async () => {
    (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies/unknown/series');
    const response = await GET(request, { ...mockContext, params: { studyInstanceUID: 'unknown' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('includes body part and image count in series', async () => {
    (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);

    const request = new NextRequest('http://localhost:3000/api/dicomweb/studies/1.2.3.4/series');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(data[0]['00180015'].Value[0]).toBe('HEAD');
    expect(data[0]['00201209'].Value[0]).toBe('10');
  });
});
