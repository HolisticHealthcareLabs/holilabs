import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    patient: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const ctx = { user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' } };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/dev/attach-demo-patients', () => {
  it('returns 404 when not in development environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });

    const req = new NextRequest('http://localhost:3000/api/dev/attach-demo-patients', {
      method: 'POST',
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Not found');

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
  });

  it('returns success immediately when clinician already has patients', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    (prisma.patient.count as jest.Mock).mockResolvedValue(5);

    const req = new NextRequest('http://localhost:3000/api/dev/attach-demo-patients', {
      method: 'POST',
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.attached).toBe(0);
    expect(json.message).toMatch(/already has patients/i);

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', configurable: true });
  });

  it('attaches existing unassigned patients to the clinician', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    (prisma.patient.count as jest.Mock).mockResolvedValue(0);
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1' }, { id: 'p2' }, { id: 'p3' },
    ]);
    (prisma.patient.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

    const req = new NextRequest('http://localhost:3000/api/dev/attach-demo-patients', {
      method: 'POST',
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.attached).toBe(3);
    expect(prisma.patient.updateMany).toHaveBeenCalled();

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', configurable: true });
  });

  it('creates demo patients when no candidates exist', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    (prisma.patient.count as jest.Mock).mockResolvedValue(0);
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.patient.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/dev/attach-demo-patients', {
      method: 'POST',
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/created demo patients/i);
    expect(prisma.patient.create).toHaveBeenCalled();

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', configurable: true });
  });
});
