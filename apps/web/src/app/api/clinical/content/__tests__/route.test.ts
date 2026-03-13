/**
 * Tests for GET /api/clinical/content
 *
 * - GET returns content matrix for a clinician user
 * - GET returns content matrix with ADMIN persona for admin role
 * - GET handles service errors gracefully with empty definitions
 * - GET normalizes nurse role to NURSE persona
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/services/content-matrix.service', () => ({
  ContentMatrixService: {
    resolve: jest.fn(),
  },
}));

const { ContentMatrixService } = require('@/services/content-matrix.service');
const { GET } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN', organizationId: 'org-1' },
  requestId: 'req-1',
};

const mockContent = {
  definitions: [{ id: 'def-1', slug: 'hypertension', title: 'Hypertension' }],
  totalDefinitions: 1,
};

describe('GET /api/clinical/content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ContentMatrixService.resolve as jest.Mock).mockResolvedValue(mockContent);
  });

  it('returns content matrix for a clinician user', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/content');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.definitions).toBeDefined();
    expect(Array.isArray(data.definitions)).toBe(true);
    expect(ContentMatrixService.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'org-1', persona: 'CLINICIAN' })
    );
  });

  it('maps ADMIN role to ORG_ADMIN persona', async () => {
    const adminContext = { ...mockContext, user: { ...mockContext.user, role: 'ADMIN' } };
    const request = new NextRequest('http://localhost:3000/api/clinical/content');
    await GET(request, adminContext);

    expect(ContentMatrixService.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ persona: 'ORG_ADMIN' })
    );
  });

  it('handles service errors gracefully with empty definitions', async () => {
    (ContentMatrixService.resolve as jest.Mock).mockRejectedValue(new Error('Service unavailable'));
    const request = new NextRequest('http://localhost:3000/api/clinical/content');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.definitions).toEqual([]);
    expect(data.totalDefinitions).toBe(0);
    expect(data.error).toBeDefined();
  });

  it('maps NURSE role to NURSE persona', async () => {
    const nurseContext = { ...mockContext, user: { ...mockContext.user, role: 'NURSE' } };
    const request = new NextRequest('http://localhost:3000/api/clinical/content');
    await GET(request, nurseContext);

    expect(ContentMatrixService.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ persona: 'NURSE' })
    );
  });
});
