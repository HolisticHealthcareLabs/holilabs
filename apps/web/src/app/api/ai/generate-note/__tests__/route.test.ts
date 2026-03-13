import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/clinical-notes/soap-generator', () => ({
  soapGenerator: {
    generateFromTranscription: jest.fn(),
  },
}));

jest.mock('@/lib/ai/confidence-scoring', () => ({
  confidenceScoringService: {
    scoreSOAPNote: jest.fn(() => ({
      overall: 0.88,
      breakdown: { completeness: 0.9, entityQuality: 0.85, consistency: 0.9, clinicalStandards: 0.87 },
      flags: [],
      recommendations: [],
      requiresReview: false,
    })),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500 }
    )
  ),
}));

const { POST, GET } = require('../route');
const { soapGenerator } = require('@/lib/clinical-notes/soap-generator');

const ctx = { user: { id: 'doc-1' } };

const validBody = {
  transcription: 'Patient presents with a persistent cough lasting two weeks. No fever. History of asthma.',
  patientId: 'p1',
  patientContext: {
    id: 'p1',
    mrn: 'MRN-001',
    firstName: 'Juan',
    lastName: 'Garcia',
    dateOfBirth: '1980-01-15',
    age: 45,
    gender: 'M',
    deidentifiedName: 'P-001',
    deidentifiedDOB: '1980-XX-XX',
  },
};

describe('POST /api/ai/generate-note', () => {
  beforeEach(() => jest.clearAllMocks());

  it('generates SOAP note from transcription', async () => {
    (soapGenerator.generateFromTranscription as jest.Mock).mockResolvedValue({
      noteId: 'note-1',
      sections: { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' },
      chiefComplaint: 'persistent cough',
      diagnosis: ['J06.9'],
      medicalEntities: [],
      metadata: { generatedAt: new Date().toISOString(), transcriptLength: 100, processingTime: 500, modelUsed: 'claude' },
    });

    const req = new NextRequest('http://localhost:3000/api/ai/generate-note', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.noteId).toBe('note-1');
    expect(json.data.status).toBe('draft');
  });

  it('returns 400 for missing transcription', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/generate-note', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, transcription: '' }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
  });

  it('returns 400 for transcription too short', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/generate-note', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, transcription: 'Short' }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/generate-note', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/ai/generate-note', () => {
  it('returns API documentation', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/generate-note');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.endpoint).toBe('/api/ai/generate-note');
    expect(json.methods).toContain('POST');
  });
});
