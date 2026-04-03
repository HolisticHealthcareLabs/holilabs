import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    escalation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('POST /api/escalations/[id]/resolve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);
  });

  it('resolves an escalation successfully', async () => {
    (prisma.escalation.findUnique as jest.Mock).mockResolvedValue({
      id: 'esc-1',
      status: 'OPEN',
      patientId: 'pat-1',
    });
    (prisma.escalation.update as jest.Mock).mockResolvedValue({
      id: 'esc-1',
      status: 'RESOLVED',
      resolvedBy: 'doc-1',
      resolvedAt: new Date(),
      patientId: 'pat-1',
      title: 'Test escalation',
      category: 'CLINICAL',
      severity: 'HIGH',
      patient: { id: 'pat-1', firstName: 'João', lastName: 'Silva' },
    });

    const req = new NextRequest('http://localhost:3000/api/escalations/esc-1/resolve', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Patient contacted and rescheduled' }),
    });

    const res = await POST(req, {
      user: { id: 'doc-1', email: 'doc@test.com' },
      userId: 'doc-1',
      params: { id: 'esc-1' },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('RESOLVED');
  });

  it('resolves without optional notes', async () => {
    (prisma.escalation.findUnique as jest.Mock).mockResolvedValue({
      id: 'esc-2',
      status: 'OPEN',
    });
    (prisma.escalation.update as jest.Mock).mockResolvedValue({
      id: 'esc-2',
      status: 'RESOLVED',
      resolvedAt: new Date(),
      patientId: 'pat-2',
      title: 'Another escalation',
      category: 'ADMIN',
      severity: 'LOW',
      patient: null,
    });

    const req = new NextRequest('http://localhost:3000/api/escalations/esc-2/resolve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, {
      user: { id: 'doc-1', email: 'doc@test.com' },
      userId: 'doc-1',
      params: { id: 'esc-2' },
    });

    expect(res.status).toBe(200);
  });

  it('returns 404 when escalation not found', async () => {
    (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/escalations/esc-missing/resolve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, {
      user: { id: 'doc-1', email: 'doc@test.com' },
      userId: 'doc-1',
      params: { id: 'esc-missing' },
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Escalation not found');
  });

  it('returns idempotent response when escalation already resolved', async () => {
    (prisma.escalation.findUnique as jest.Mock).mockResolvedValue({
      id: 'esc-1',
      status: 'RESOLVED',
      resolvedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/escalations/esc-1/resolve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, {
      user: { id: 'doc-1', email: 'doc@test.com' },
      userId: 'doc-1',
      params: { id: 'esc-1' },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain('already resolved');
  });
});
