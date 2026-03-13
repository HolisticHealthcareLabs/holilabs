import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    governanceLog: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    governanceEvent: {
      count: jest.fn(),
    },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
};

describe('GET /api/governance/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns aggregated governance stats', async () => {
    (prisma.governanceLog.count as jest.Mock).mockResolvedValue(42);
    (prisma.governanceEvent.count as jest.Mock).mockResolvedValue(3);
    (prisma.governanceLog.aggregate as jest.Mock).mockResolvedValue({
      _avg: { safetyScore: 96.5 },
    });

    const request = new NextRequest('http://localhost:3000/api/governance/stats');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.sessionsAudited).toBe(42);
    expect(data.data.interventionsTriggered).toBe(3);
    expect(data.data.avgSafetyScore).toBe(97);
    expect(prisma.governanceLog.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ timestamp: expect.any(Object) }) })
    );
  });

  it('returns demo stats when governance tables are not migrated', async () => {
    (prisma.governanceLog.count as jest.Mock).mockImplementation(() => {
      throw new Error('Table does not exist');
    });

    prisma.governanceLog.count = jest.fn().mockReturnValue({
      catch: jest.fn().mockReturnValue(null),
    });

    const request = new NextRequest('http://localhost:3000/api/governance/stats');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.sessionsAudited).toBe(0);
    expect(data.data.interventionsTriggered).toBe(0);
    expect(data.data.avgSafetyScore).toBe(0);
    expect(data.message).toContain('not yet migrated');
  });

  it('defaults avgSafetyScore to 100 when sessions exist but no scores', async () => {
    (prisma.governanceLog.count as jest.Mock).mockResolvedValue(5);
    (prisma.governanceEvent.count as jest.Mock).mockResolvedValue(0);
    (prisma.governanceLog.aggregate as jest.Mock).mockResolvedValue({
      _avg: { safetyScore: null },
    });

    const request = new NextRequest('http://localhost:3000/api/governance/stats');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.sessionsAudited).toBe(5);
    expect(data.data.avgSafetyScore).toBe(100);
  });

  it('handles database errors', async () => {
    (prisma.governanceLog.count as jest.Mock).mockImplementation(() => {
      throw new Error('Connection refused');
    });

    const request = new NextRequest('http://localhost:3000/api/governance/stats');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch safety stats');
    expect(data.data.sessionsAudited).toBe(0);
    expect(data.data.interventionsTriggered).toBe(0);
    expect(data.data.avgSafetyScore).toBe(0);
  });
});
