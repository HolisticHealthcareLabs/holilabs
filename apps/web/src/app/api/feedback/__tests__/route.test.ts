import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

const mockAuditLogCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });

jest.mock('@/lib/prisma', () => {
  const prismaInstance = {
    auditLog: {
      create: mockAuditLogCreate,
    },
  };
  return {
    __esModule: true,
    default: prismaInstance,
    prisma: prismaInstance,
  };
});

const { POST } = require('../route');

const ctx = { user: { id: 'doc-1', email: 'doc@test.com', role: 'CLINICIAN' } };

describe('POST /api/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLogCreate.mockResolvedValue({ id: 'audit-1' });
  });

  it('accepts valid feedback and returns success', async () => {
    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bug',
        message: 'The patient search bar does not filter properly',
      }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Feedback received successfully');
  });

  it('returns 400 for message too short', async () => {
    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ type: 'bug', message: 'short' }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Validation failed');
  });

  it('returns 400 for invalid feedback type', async () => {
    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ type: 'complaint', message: 'This is a long enough message' }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
  });

  it('stores feedback in audit log', async () => {
    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'feature',
        message: 'Please add export to CSV for patient lists',
      }),
    });
    await POST(req, ctx);

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          resource: 'feedback',
        }),
      })
    );
  });
});
