import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ai/chat', () => ({
  chat: jest.fn(),
}));

jest.mock('@/lib/services/deid.service', () => ({
  createDeidService: () => ({
    redactBatch: jest.fn((texts: string[]) => Promise.resolve(texts)),
  }),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(() => Promise.resolve()),
}));

const { POST } = require('../route');
const { chat } = require('@/lib/ai/chat');

const ctx = { user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' } };

const validAnalysis = JSON.stringify({
  extractedDiagnoses: [
    { code: 'I50.9', name: 'Insuficiencia Cardiaca', type: 'primary' },
  ],
  suggestedServices: [
    { code: 'CBHPM 31603017', name: 'Consulta', system: 'CBHPM', estimatedValueBRL: 250 },
  ],
  totalEstimatedValue: 250,
  cdiWarnings: ['ECG result missing'],
});

describe('POST /api/billing/analyze', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns billing analysis from AI', async () => {
    (chat as jest.Mock).mockResolvedValue({ success: true, message: validAnalysis });

    const req = new NextRequest('http://localhost:3000/api/billing/analyze', {
      method: 'POST',
      body: JSON.stringify({ soapNote: 'Patient presents with chest pain and dyspnea.' }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.extractedDiagnoses).toHaveLength(1);
    expect(json.data.totalEstimatedValue).toBe(250);
  });

  it('falls back to mock analysis when AI fails', async () => {
    (chat as jest.Mock).mockResolvedValue({ success: false, error: 'LLM unavailable' });

    const req = new NextRequest('http://localhost:3000/api/billing/analyze', {
      method: 'POST',
      body: JSON.stringify({ soapNote: 'Patient presents with chest pain.' }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.extractedDiagnoses.length).toBeGreaterThan(0);
  });

  it('returns 400 when soapNote is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/billing/analyze', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Validation failed');
  });
});
