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
    cdssService.generateInsights.mockResolvedValue(mockInsights);

    const request = new NextRequest('http://localhost:3000/api/ai/insights');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(data.data.summary).toBeDefined();
    expect(data.data.summary.totalInsights).toBe(2);
    expect(data.data.summary.criticalInsights).toBe(1);
    expect(data.data.summary.highPriorityInsights).toBe(1);
  });

  it('should use cached insights within 5 minutes', async () => {
    cdssService.generateInsights.mockResolvedValue(mockInsights);

    // First call
    const request1 = new NextRequest('http://localhost:3000/api/ai/insights');
    await GET(request1, mockContext);

    // Second call (should use cache)
    const request2 = new NextRequest('http://localhost:3000/api/ai/insights');
    await GET(request2, mockContext);

    // generateInsights should only be called once
    expect(cdssService.generateInsights).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    cdssService.generateInsights.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/ai/insights');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate insights');
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
    cdssService.clearCache.mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/ai/insights', {
      method: 'POST',
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('cache cleared');
    expect(cdssService.clearCache).toHaveBeenCalledWith(mockContext.user.id);
  });

  it('should handle clear cache errors', async () => {
    cdssService.clearCache.mockRejectedValue(new Error('Cache error'));

    const request = new NextRequest('http://localhost:3000/api/ai/insights', {
      method: 'POST',
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
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
