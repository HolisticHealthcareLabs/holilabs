import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { groupBy: jest.fn() },
    diagnosis: { groupBy: jest.fn() },
    medication: { groupBy: jest.fn() },
    $queryRaw: jest.fn(),
    userBehaviorEvent: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any) =>
    require('next/server').NextResponse.json({ error: 'Internal error' }, { status: 500 })
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = { user: { id: 'researcher-1', email: 'res@test.com' } };

describe('POST /api/research/query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    (prisma as any).userBehaviorEvent = { create: jest.fn().mockResolvedValue({}) };
  });

  it('executes demographics query', async () => {
    (prisma.patient.groupBy as jest.Mock).mockResolvedValue([
      { ageBand: '40-49', gender: 'F', region: 'SP', _count: { id: 15 } },
    ]);

    const req = new NextRequest('http://localhost:3000/api/research/query', {
      method: 'POST',
      body: JSON.stringify({ queryType: 'demographics' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.queryType).toBe('demographics');
    expect(data.data.metadata.hipaaCompliant).toBe(true);
  });

  it('returns 400 for invalid query type', async () => {
    const req = new NextRequest('http://localhost:3000/api/research/query', {
      method: 'POST',
      body: JSON.stringify({ queryType: 'patient_list' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid query type');
    expect(data.validTypes).toContain('demographics');
  });

  it('returns 400 when query contains PHI fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/research/query', {
      method: 'POST',
      body: JSON.stringify({
        queryType: 'demographics',
        filters: { patientId: 'patient-1' },
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('HIPAA Safe Harbor');
    expect(data.violations).toBeDefined();
  });

  it('returns 501 for outcomes query type (not yet implemented)', async () => {
    const req = new NextRequest('http://localhost:3000/api/research/query', {
      method: 'POST',
      body: JSON.stringify({ queryType: 'outcomes' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(501);
    expect(data.error).toBe('Outcomes query not yet implemented');
  });
});
