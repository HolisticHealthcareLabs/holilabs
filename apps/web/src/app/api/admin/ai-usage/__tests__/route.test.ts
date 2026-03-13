/**
 * Tests for GET/POST /api/admin/ai-usage
 */

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
    aIUsageLog: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      $queryRaw: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/ai/usage-tracker', () => ({
  getUsageSummary: jest.fn(),
  checkCostAlerts: jest.fn().mockResolvedValue({
    currentSpend: 100,
    monthlyBudget: 500,
    percentUsed: 20,
    projectedMonthlySpend: 150,
    isOverBudget: false,
    isApproachingBudget: false,
  }),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const mockAggregateResult = {
  _sum: { estimatedCost: 42.5, totalTokens: 100000, responseTimeMs: 5000 },
  _count: { id: 200 },
  _avg: { responseTimeMs: 25 },
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.aIUsageLog.aggregate as jest.Mock).mockResolvedValue(mockAggregateResult);
  (prisma.aIUsageLog.groupBy as jest.Mock).mockResolvedValue([]);
  (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
});

describe('GET /api/admin/ai-usage', () => {
  it('returns usage statistics for default period (month)', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/ai-usage');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalCost');
    expect(data.data).toHaveProperty('totalRequests');
    expect(data.data.period.label).toBe('This Month');
  });

  it('accepts period query parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/ai-usage?period=week');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.period.label).toBe('Last 7 Days');
  });

  it('accepts clinicId query parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/ai-usage?clinicId=clinic-123');
    const response = await GET(request, mockContext);

    expect(response.status).toBe(200);
    expect(prisma.aIUsageLog.aggregate).toHaveBeenCalled();
  });

  it('returns 500 when database query fails', async () => {
    (prisma.aIUsageLog.aggregate as jest.Mock).mockRejectedValue(new Error('DB error'));
    const request = new NextRequest('http://localhost:3000/api/admin/ai-usage');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('POST /api/admin/ai-usage', () => {
  it('returns clinic breakdown for clinic_breakdown action', async () => {
    (prisma.aIUsageLog.groupBy as jest.Mock).mockResolvedValue([
      { clinicId: 'clinic-1', _sum: { estimatedCost: 20, totalTokens: 50000 }, _count: { id: 100 } },
    ]);

    const request = new NextRequest('http://localhost:3000/api/admin/ai-usage', {
      method: 'POST',
      body: JSON.stringify({ action: 'clinic_breakdown' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('returns 400 for unknown action', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/ai-usage', {
      method: 'POST',
      body: JSON.stringify({ action: 'unknown_action' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns CSV for export_csv action', async () => {
    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue([
      {
        createdAt: new Date('2025-01-01T00:00:00Z'),
        provider: 'anthropic',
        model: 'claude-3',
        clinicId: 'clinic-1',
        feature: 'notes',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        estimatedCost: 0.001,
        responseTimeMs: 500,
        fromCache: false,
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/admin/ai-usage', {
      method: 'POST',
      body: JSON.stringify({
        action: 'export_csv',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      }),
    });
    const response = await POST(request, mockContext);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
  });
});
