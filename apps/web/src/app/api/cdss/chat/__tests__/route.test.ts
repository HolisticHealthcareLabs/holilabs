import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
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
    redact: jest.fn((text: string) => Promise.resolve(text)),
  }),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../../../../../../packages/shared-kernel/src/clinical/prompt-engine', () => ({
  buildCdssSystemPrompt: jest.fn(() => 'mock-system-prompt'),
  buildDeidentifiedClinicalContext: jest.fn(() => 'mock-clinical-context'),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { chat } = require('@/lib/ai/chat');

const ctx = { user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' } };

describe('POST /api/cdss/chat', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns AI response for valid request', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      dateOfBirth: '1985-03-10',
      gender: 'M',
      diagnoses: [],
      medications: [],
    });
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Consider ordering troponin levels.',
    });

    const req = new NextRequest('http://localhost:3000/api/cdss/chat', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'p1',
        message: 'Patient has chest pain',
      }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.response).toContain('troponin');
    expect(json.disclaimer).toBeDefined();
  });

  it('returns 400 when message is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/cdss/chat', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p1' }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Validation failed');
  });

  it('returns 404 when patient not found and no context', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/cdss/chat', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'missing', message: 'test' }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Patient not found');
  });
});
