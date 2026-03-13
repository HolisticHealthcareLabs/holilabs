import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    outcomeGroundTruth: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, PUT, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = (id: string) => ({
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { id },
});

describe('GET /api/assurance/outcome/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns outcome details with related event', async () => {
    (prisma.outcomeGroundTruth.findUnique as jest.Mock).mockResolvedValue({
      id: 'out-1',
      outcomeType: 'SUCCESS',
      matchScore: 0.95,
      assuranceEvent: { id: 'ev-1', eventType: 'DIAGNOSIS' },
    });

    const req = new NextRequest('http://localhost:3000/api/assurance/outcome/out-1');
    const res = await GET(req, mockContext('out-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.outcomeType).toBe('SUCCESS');
  });

  it('returns 404 when outcome not found', async () => {
    (prisma.outcomeGroundTruth.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance/outcome/out-missing');
    const res = await GET(req, mockContext('out-missing'));

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/assurance/outcome/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates outcome fields', async () => {
    (prisma.outcomeGroundTruth.findUnique as jest.Mock).mockResolvedValue({ id: 'out-1' });
    (prisma.outcomeGroundTruth.update as jest.Mock).mockResolvedValue({
      id: 'out-1',
      outcomeType: 'GLOSA',
      glosaCode: 'G100',
      glosaAmount: 500,
    });

    const req = new NextRequest('http://localhost:3000/api/assurance/outcome/out-1', {
      method: 'PUT',
      body: JSON.stringify({ outcomeType: 'GLOSA', glosaCode: 'G100', glosaAmount: 500 }),
    });

    const res = await PUT(req, mockContext('out-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.glosaCode).toBe('G100');
  });

  it('returns 404 when outcome not found for update', async () => {
    (prisma.outcomeGroundTruth.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance/outcome/out-missing', {
      method: 'PUT',
      body: JSON.stringify({ outcomeType: 'SUCCESS' }),
    });

    const res = await PUT(req, mockContext('out-missing'));

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/assurance/outcome/out-1', {
      method: 'PUT',
      body: JSON.stringify({ outcomeType: 'INVALID_TYPE' }),
    });

    const res = await PUT(req, mockContext('out-1'));

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/assurance/outcome/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes outcome', async () => {
    (prisma.outcomeGroundTruth.findUnique as jest.Mock).mockResolvedValue({
      id: 'out-1',
      assuranceEventId: 'ev-1',
      outcomeType: 'SUCCESS',
    });
    (prisma.outcomeGroundTruth.delete as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/assurance/outcome/out-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('out-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
  });

  it('returns 404 when outcome not found for deletion', async () => {
    (prisma.outcomeGroundTruth.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance/outcome/out-missing', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('out-missing'));

    expect(res.status).toBe(404);
  });
});
