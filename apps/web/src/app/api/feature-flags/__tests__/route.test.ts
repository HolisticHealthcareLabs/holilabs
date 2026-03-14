import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    featureFlag: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: {},
  requestId: 'req-1',
};

const mockFlag = { id: 'flag-1', name: 'dark_mode', enabled: false, createdAt: new Date() };

describe('GET /api/feature-flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.featureFlag.findMany as jest.Mock).mockResolvedValue([mockFlag]);
    (prisma.featureFlag.count as jest.Mock).mockResolvedValue(1);
  });

  it('returns paginated feature flags', async () => {
    const req = new NextRequest('http://localhost:3000/api/feature-flags?limit=50&offset=0');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination.total).toBe(1);
  });

  it('filters by enabled status when provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/feature-flags?enabled=true');
    await GET(req, mockContext);

    expect(prisma.featureFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ enabled: true }) })
    );
  });

  it('returns 400 for invalid query params', async () => {
    const req = new NextRequest('http://localhost:3000/api/feature-flags?limit=999');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/feature-flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.featureFlag.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.featureFlag.create as jest.Mock).mockResolvedValue({ ...mockFlag, id: 'flag-new' });
  });

  it('creates a feature flag successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'dark_mode', enabled: false }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('flag-new');
  });

  it('returns 409 when flag name already exists', async () => {
    (prisma.featureFlag.findFirst as jest.Mock).mockResolvedValue(mockFlag);
    const req = new NextRequest('http://localhost:3000/api/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'dark_mode', enabled: false }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(409);
  });

  it('returns 400 when flag name fails validation', async () => {
    const req = new NextRequest('http://localhost:3000/api/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', enabled: false }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(400);
  });
});
