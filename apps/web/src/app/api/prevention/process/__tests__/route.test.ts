import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/services', () => ({
  preventionEngine: {
    processTranscriptFindings: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST, GET } = require('../route');
const { preventionEngine } = require('@/lib/services');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const validBody = {
  patientId: 'p-1',
  encounterId: 'enc-1',
  findings: {
    chiefComplaint: 'chest pain',
    symptoms: ['shortness of breath'],
    diagnoses: ['hypertension'],
    entities: { vitals: [], procedures: [], medications: [], anatomy: [] },
    rawTranscript: 'Patient presents with chest pain.',
  },
};

describe('POST /api/prevention/process', () => {
  beforeEach(() => jest.clearAllMocks());

  it('processes transcript findings successfully', async () => {
    (preventionEngine.processTranscriptFindings as jest.Mock).mockResolvedValue({
      recommendations: [{ id: 'rec-1', type: 'SCREENING' }],
      detectedConditions: [{ code: 'I10', name: 'Hypertension' }],
      processingTimeMs: 45,
      encounterLinkId: 'link-1',
      errors: [],
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/process', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.recommendations).toHaveLength(1);
    expect(data.data.detectedConditions).toHaveLength(1);
  });

  it('returns 400 for missing required fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/process', {
      method: 'POST',
      body: JSON.stringify({ patientId: '' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid request data');
  });

  it('returns 500 on engine failure', async () => {
    (preventionEngine.processTranscriptFindings as jest.Mock).mockRejectedValue(new Error('Engine crash'));

    const req = new NextRequest('http://localhost:3000/api/prevention/process', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('Failed to process prevention findings');
  });
});

describe('GET /api/prevention/process', () => {
  it('returns service health status', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.service).toBe('Prevention Engine');
    expect(data.status).toBe('healthy');
    expect(data.supportedProtocols).toContain('USPSTF 2024');
  });
});
