import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/escalations/escalation-service', () => ({
  resolveEscalation: jest.fn(),
}));

const { POST } = require('../route');
const { resolveEscalation } = require('@/lib/escalations/escalation-service');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

describe('POST /api/escalations/[id]/resolve', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves an escalation successfully', async () => {
    (resolveEscalation as jest.Mock).mockResolvedValue({
      id: 'esc-1',
      status: 'RESOLVED',
      resolvedBy: 'doc-1',
    });

    const req = new NextRequest('http://localhost:3000/api/escalations/esc-1/resolve', {
      method: 'POST',
      body: JSON.stringify({ resolution: 'Patient contacted and rescheduled' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('RESOLVED');
    expect(resolveEscalation).toHaveBeenCalledWith({
      escalationId: 'esc-1',
      resolvedBy: 'doc-1',
      resolution: 'Patient contacted and rescheduled',
    });
  });

  it('resolves without optional resolution text', async () => {
    (resolveEscalation as jest.Mock).mockResolvedValue({
      id: 'esc-2',
      status: 'RESOLVED',
    });

    const req = new NextRequest('http://localhost:3000/api/escalations/esc-2/resolve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, mockContext);

    expect(res.status).toBe(200);
  });

  it('returns 404 when escalation not found', async () => {
    (resolveEscalation as jest.Mock).mockRejectedValue(new Error('Escalation not found'));

    const req = new NextRequest('http://localhost:3000/api/escalations/esc-missing/resolve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Escalation not found');
  });

  it('returns 401 when user context is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/escalations/esc-1/resolve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, { user: {} });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('User not found');
  });
});
