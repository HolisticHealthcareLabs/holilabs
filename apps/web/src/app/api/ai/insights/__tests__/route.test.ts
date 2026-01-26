/**
 * AI Insights API Tests
 *
 * Tests for GET /api/ai/insights and POST /api/ai/insights
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock CDSS service
jest.mock('@/lib/services/cdss.service', () => ({
  cdssService: {
    generateInsights: jest.fn(),
    clearCache: jest.fn(),
  },
}));

// Mock middleware
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

const { cdssService } = require('@/lib/services/cdss.service');

describe('GET /api/ai/insights', () => {
  const mockContext = {
    user: {
      id: 'clinician-1',
      email: 'dr.smith@holilabs.com',
      role: 'clinician',
    },
  };

  const mockInsights = [
    {
      id: 'insight-1',
      type: 'interaction_warning',
      priority: 'high',
      title: 'Drug Interaction',
      description: 'Warfarin + Aspirin interaction detected',
      confidence: 90,
      category: 'clinical',
      patientId: 'patient-1',
      patientName: 'John Doe',
      actionable: true,
    },
    {
      id: 'insight-2',
      type: 'risk_alert',
      priority: 'critical',
      title: 'Sepsis Risk',
      description: 'Patient has qSOFA score of 2',
      confidence: 95,
      category: 'clinical',
      patientId: 'patient-2',
      patientName: 'Jane Smith',
      actionable: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return insights for authenticated user', async () => {
    cdssService.generateInsights.mockResolvedValue(mockInsights);

    const request = new NextRequest('http://localhost:3000/api/ai/insights');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.insights).toHaveLength(2);
    expect(data.data.insights[0].title).toBe('Drug Interaction');
  });

  it('should return correct summary statistics', async () => {
    // Use unique context to avoid cache hits
    const summaryContext = {
      user: {
        id: 'clinician-summary-test-' + Date.now(),
        email: 'dr.summary@holilabs.com',
        role: 'clinician',
      },
    };

    cdssService.generateInsights.mockResolvedValue(mockInsights);

    const request = new NextRequest('http://localhost:3000/api/ai/insights');
    const response = await GET(request, summaryContext);
    const data = await response.json();

    // Match actual API response format from route.ts
    expect(data.data.summary).toBeDefined();
    expect(data.data.summary.total).toBe(2);
    expect(data.data.summary.priorities.critical).toBe(1);
    expect(data.data.summary.priorities.high).toBe(1);
  });

  it('should use cached insights within 5 minutes', async () => {
    // Use unique context for this test
    const cacheContext = {
      user: {
        id: 'clinician-cache-test-' + Date.now(),
        email: 'dr.cache@holilabs.com',
        role: 'clinician',
      },
    };

    cdssService.generateInsights.mockClear();
    cdssService.generateInsights.mockResolvedValue(mockInsights);

    // First call - should generate fresh insights
    const request1 = new NextRequest('http://localhost:3000/api/ai/insights');
    await GET(request1, cacheContext);

    // Second call with same context (should use cache)
    const request2 = new NextRequest('http://localhost:3000/api/ai/insights');
    await GET(request2, cacheContext);

    // generateInsights should only be called once
    expect(cdssService.generateInsights).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    // Clear any cached data first
    cdssService.generateInsights.mockClear();
    cdssService.generateInsights.mockRejectedValueOnce(new Error('Database error'));

    // Use a unique user ID to avoid cache hits
    const errorContext = {
      user: {
        id: 'clinician-error-test-' + Date.now(),
        email: 'dr.error@holilabs.com',
        role: 'clinician',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/ai/insights');
    const response = await GET(request, errorContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate AI insights');
  });

  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/insights');
    const contextNoUser = {};

    // This would normally be handled by middleware, but we're testing the route handler
    await expect(async () => {
      await GET(request, contextNoUser);
    }).rejects.toThrow();
  });
});

describe('POST /api/ai/insights', () => {
  const mockContext = {
    user: {
      id: 'clinician-1',
      email: 'dr.smith@holilabs.com',
      role: 'clinician',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear cache for clinician', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/insights', {
      method: 'POST',
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    // The route uses an in-memory insightsCache.delete(), not cdssService.clearCache
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('cache cleared');
  });

  it('should handle POST without error', async () => {
    // The POST handler uses insightsCache.delete() which doesn't throw
    // This test verifies the handler completes successfully
    const request = new NextRequest('http://localhost:3000/api/ai/insights', {
      method: 'POST',
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/insights', {
      method: 'POST',
    });
    const contextNoUser = {};

    await expect(async () => {
      await POST(request, contextNoUser);
    }).rejects.toThrow();
  });
});
