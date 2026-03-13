/**
 * Tests for GET/POST /api/appointments/situations
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    situation: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockSituations = [
  { id: 'sit-1', name: 'Urgente', color: '#FF0000', priority: 1, isActive: true },
  { id: 'sit-2', name: 'Seguimiento', color: '#FFA500', priority: 2, isActive: true },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/appointments/situations', () => {
  it('returns active situations ordered by priority', async () => {
    (prisma.situation.findMany as jest.Mock).mockResolvedValue(mockSituations);

    const request = new NextRequest('http://localhost:3000/api/appointments/situations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.situations).toHaveLength(2);
    expect(data.data.situations[0].name).toBe('Urgente');
  });

  it('returns empty list when no active situations exist', async () => {
    (prisma.situation.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/appointments/situations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.situations).toHaveLength(0);
  });

  it('queries only active situations', async () => {
    (prisma.situation.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/appointments/situations');
    await GET(request, mockContext);

    expect(prisma.situation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    );
  });
});

describe('POST /api/appointments/situations', () => {
  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/situations', {
      method: 'POST',
      body: JSON.stringify({ name: 'Urgente' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/missing required fields/i);
  });

  it('creates situation with valid payload', async () => {
    const newSituation = {
      id: 'sit-new',
      name: 'Emergencia',
      color: '#FF0000',
      priority: 0,
      isActive: true,
    };
    (prisma.situation.create as jest.Mock).mockResolvedValue(newSituation);

    const request = new NextRequest('http://localhost:3000/api/appointments/situations', {
      method: 'POST',
      body: JSON.stringify({ name: 'Emergencia', color: '#FF0000', priority: 0 }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.situation.name).toBe('Emergencia');
  });
});
