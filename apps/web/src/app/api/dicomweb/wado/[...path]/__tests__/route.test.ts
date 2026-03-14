import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    imagingStudy: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/storage/r2-client', () => ({
  downloadFromR2: jest.fn(),
  generatePresignedUrl: jest.fn(),
}));

jest.mock('@/lib/imaging/dicom-parser', () => ({
  parseDicomFile: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: unknown, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: opts?.userMessage || 'Internal server error' }, { status: 500 });
  }),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { generatePresignedUrl, downloadFromR2 } = require('@/lib/storage/r2-client');

const ctx = {
  user: { id: 'clinician-1', role: 'CLINICIAN' },
  params: { path: ['studies', '1.2.3.4.5'] },
};

const mockStudy = {
  id: 'study-1',
  studyInstanceUID: '1.2.3.4.5',
  modality: 'CT',
  studyDate: new Date('2026-01-15'),
  imageUrls: ['https://r2.example.com/dicom/study-1/image.dcm'],
  patient: { id: 'patient-1', firstName: 'Ana', lastName: 'García', mrn: 'MRN-001' },
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(mockStudy);
});

describe('GET /api/dicomweb/wado/[...path]', () => {
  it('returns DICOM metadata as application/dicom+json', async () => {
    const req = new NextRequest('http://localhost:3000/api/dicomweb/wado/studies/1.2.3.4.5/metadata');
    const ctxWithMeta = {
      ...ctx,
      params: { path: ['studies', '1.2.3.4.5', 'metadata'] },
    };
    const res = await GET(req, ctxWithMeta);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/dicom+json');
  });

  it('returns presigned URL when Accept header is application/json', async () => {
    (generatePresignedUrl as jest.Mock).mockResolvedValue('https://presigned.r2.example.com/dicom');

    const req = new NextRequest('http://localhost:3000/api/dicomweb/wado/studies/1.2.3.4.5', {
      headers: { Accept: 'application/json' },
    });
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toContain('presigned');
    expect(json.contentType).toBe('application/dicom');
  });

  it('returns 400 when studyInstanceUID is not in path', async () => {
    const req = new NextRequest('http://localhost:3000/api/dicomweb/wado/');
    const res = await GET(req, { ...ctx, params: { path: [] } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/study instance uid/i);
  });

  it('returns 404 when study is not found', async () => {
    (prisma.imagingStudy.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/dicomweb/wado/studies/nonexistent');
    const res = await GET(req, { ...ctx, params: { path: ['studies', 'nonexistent'] } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/study not found/i);
  });
});
