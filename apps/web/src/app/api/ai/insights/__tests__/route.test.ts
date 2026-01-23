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

// Mock logger to reduce noise
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { cdssService } = require('@/lib/services/cdss.service');

// Use unique clinician IDs per test to avoid cache conflicts
let testCounter = 0;
function getUniqueClinicianId() {
  return `clinician-${Date.now()}-${testCounter++}`;
}

describe('GET /api/ai/insights', () => {
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
    const mockContext = {
      user: {
        id: getUniqueClinicianId(),
        email: 'dr.smith@holilabs.com',
        role: 'clinician',
      },
    };

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
    const mockContext = {
      user: {
        id: getUniqueClinicianId(),
        email: 'dr.smith@holilabs.com',
        role: 'clinician',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/ai/insights');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(data.data.summary).toBeDefined();
    // Route returns summary.total, summary.priorities.critical, summary.priorities.high
    expect(data.data.summary.total).toBe(2);
    expect(data.data.summary.priorities.critical).toBe(1);
    expect(data.data.summary.priorities.high).toBe(1);
  });

  it('should use cached insights within 5 minutes', async () => {
    cdssService.generateInsights.mockResolvedValue(mockInsights);
    // Use same clinician ID for both requests to test caching
    const clinicianId = getUniqueClinicianId();
    const mockContext = {
      user: {
        id: clinicianId,
        email: 'dr.smith@holilabs.com',
        role: 'clinician',
      },
    };

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
    const mockContext = {
      user: {
        id: getUniqueClinicianId(),
        email: 'dr.smith@holilabs.com',
        role: 'clinician',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/ai/insights');
    const response = await GET(request, mockContext);
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
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear cache for clinician', async () => {
    const mockContext = {
      user: {
        id: getUniqueClinicianId(),
        email: 'dr.smith@holilabs.com',
        role: 'clinician',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/ai/insights', {
      method: 'POST',
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('cache cleared');
  });

  it('should invalidate cache so next GET generates fresh insights', async () => {
    cdssService.generateInsights.mockResolvedValue(mockInsights);
    // Use same clinician ID for all requests
    const clinicianId = getUniqueClinicianId();
    const mockContext = {
      user: {
        id: clinicianId,
        email: 'dr.smith@holilabs.com',
        role: 'clinician',
      },
    };

    // First GET - generates insights
    const getRequest1 = new NextRequest('http://localhost:3000/api/ai/insights');
    await GET(getRequest1, mockContext);
    expect(cdssService.generateInsights).toHaveBeenCalledTimes(1);

    // POST - clears cache
    const postRequest = new NextRequest('http://localhost:3000/api/ai/insights', {
      method: 'POST',
    });
    await POST(postRequest, mockContext);

    // Second GET - should generate fresh insights since cache was cleared
    const getRequest2 = new NextRequest('http://localhost:3000/api/ai/insights');
    await GET(getRequest2, mockContext);
    expect(cdssService.generateInsights).toHaveBeenCalledTimes(2);
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
