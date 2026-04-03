/**
 * POST /api/imaging/upload-dicom - DICOM upload tests
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
    imagingStudy: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

const mockUploadFile = jest.fn();
jest.mock('@/lib/storage', () => ({
  uploadFile: (...args: any[]) => mockUploadFile(...args),
}));

const mockParseDicomFile = jest.fn();
const mockIsDicomFile = jest.fn();
const mockGenerateStudyDescription = jest.fn();
const mockSanitizeDicomMetadata = jest.fn();
const mockNormalizeBodyPart = jest.fn();

jest.mock('@/lib/imaging/dicom-parser', () => ({
  parseDicomFile: (...args: any[]) => mockParseDicomFile(...args),
  isDicomFile: (...args: any[]) => mockIsDicomFile(...args),
  generateStudyDescription: (...args: any[]) => mockGenerateStudyDescription(...args),
  sanitizeDicomMetadata: (...args: any[]) => mockSanitizeDicomMetadata(...args),
  normalizeBodyPart: (...args: any[]) => mockNormalizeBodyPart(...args),
}));

const mockSafeErrorResponse = jest.fn();
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: (...args: any[]) => mockSafeErrorResponse(...args),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

function createMockFormDataRequest(fields: Record<string, any>): NextRequest {
  const request = new NextRequest('http://localhost:3000/api/imaging/upload-dicom', {
    method: 'POST',
  });
  const mockFormData = {
    get: (key: string) => fields[key] ?? null,
  };
  request.formData = jest.fn().mockResolvedValue(mockFormData);
  return request;
}

function createMockFile(): any {
  const buffer = new Uint8Array(132);
  return {
    name: 'test.dcm',
    type: 'application/dicom',
    arrayBuffer: () => Promise.resolve(buffer.buffer),
  };
}

describe('POST /api/imaging/upload-dicom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    mockIsDicomFile.mockReturnValue(true);
    mockParseDicomFile.mockResolvedValue({
      study: { studyInstanceUID: '1.2.3.4', studyDate: '20240115', accessionNumber: 'ACC-001', studyDescription: 'Chest CT' },
      series: { modality: 'CT', bodyPartExamined: 'CHEST', seriesDescription: 'Axial' },
      equipment: { institutionName: 'Hospital ABC' },
    });
    mockGenerateStudyDescription.mockReturnValue('CT CHEST');
    mockSanitizeDicomMetadata.mockReturnValue({});
    mockNormalizeBodyPart.mockReturnValue('CHEST');
    mockUploadFile.mockResolvedValue({ url: 'https://storage.example.com/dicom/test.dcm' });
    const { NextResponse } = require('next/server');
    mockSafeErrorResponse.mockReturnValue(
      NextResponse.json({ error: 'Internal error' }, { status: 500 })
    );
  });

  it('returns 400 when no file is provided', async () => {
    const request = createMockFormDataRequest({ patientId: 'p-1' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No file');
  });

  it('returns 400 when patientId is missing', async () => {
    const request = createMockFormDataRequest({ file: createMockFile() });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('patientId');
  });

  it('returns 400 for non-DICOM file', async () => {
    mockIsDicomFile.mockReturnValueOnce(false);
    const request = createMockFormDataRequest({ file: createMockFile(), patientId: 'p-1' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid DICOM');
  });

  it('creates imaging study from valid DICOM upload', async () => {
    const mockStudy = {
      id: 'img-1',
      studyInstanceUID: '1.2.3.4',
      modality: 'CT',
      bodyPart: 'CHEST',
      patient: { id: 'p-1', firstName: 'John', lastName: 'Doe', mrn: 'MRN001' },
    };
    (prisma.imagingStudy.create as jest.Mock).mockResolvedValue(mockStudy);

    const request = createMockFormDataRequest({ file: createMockFile(), patientId: 'p-1' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.metadata.modality).toBe('CT');
    expect(prisma.imagingStudy.create).toHaveBeenCalled();
  });
});
