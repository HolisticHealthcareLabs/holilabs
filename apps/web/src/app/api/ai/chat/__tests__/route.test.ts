import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/ai/chat', () => ({
  buildPatientContext: jest.fn(() => 'Age: 45, Male'),
}));

jest.mock('@/lib/ai/gateway', () => ({
  aiGateway: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/security/input-sanitization', () => ({
  sanitizeAIInput: jest.fn((text: string) => text),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500 }
    )
  ),
}));

const { POST } = require('../route');
const { aiGateway } = require('@/lib/ai/gateway');

const ctx = { user: { id: 'doc-1', email: 'doc@test.com', role: 'CLINICIAN' } };

describe('POST /api/ai/chat', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns AI response for valid messages', async () => {
    (aiGateway as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Consider prescribing X',
      usage: { tokens: 150 },
      provenance: { source: 'claude' },
    });

    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What about hypertension?' }],
      }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.message).toBe('Consider prescribing X');
  });

  it('returns 400 when messages array is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ provider: 'claude' }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Messages array is required');
  });

  it('returns 500 when AI gateway fails', async () => {
    (aiGateway as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Rate limited',
    });

    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
      }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(500);
  });

  it('sanitizes user messages before sending to AI', async () => {
    (aiGateway as jest.Mock).mockResolvedValue({ success: true, message: 'ok' });
    const { sanitizeAIInput } = require('@/lib/security/input-sanitization');

    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: '<script>alert(1)</script>' }],
      }),
    });
    await POST(req, ctx);

    expect(sanitizeAIInput).toHaveBeenCalled();
  });
});
