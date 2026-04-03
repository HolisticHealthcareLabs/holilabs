/**
 * Tests for GET /api/credentials/[id]/status
 *
 * - GET returns verification status and progress for a known credential
 * - GET returns 404 when credential not found
 * - GET computes progress fields correctly (isComplete, hasAttempt)
 * - GET includes verification history in response
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    providerCredential: { findUnique: jest.fn() },
  },
}));

const { prisma } = require('@/lib/prisma');
const { GET } = require('../route');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id: 'cred-1' },
  requestId: 'req-1',
};

const mockVerifiedCredential = {
  id: 'cred-1',
  credentialType: 'MEDICAL_LICENSE',
  credentialNumber: 'ML-12345',
  verificationStatus: 'VERIFIED',
  verifiedAt: new Date('2024-01-15'),
  verifiedBy: 'admin-1',
  autoVerified: true,
  manualVerified: false,
  verificationSource: 'State API',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  verificationHistory: [
    {
      id: 'vh-1',
      verificationMethod: 'API',
      verificationSource: 'State API',
      requestedAt: new Date('2024-01-10'),
      completedAt: new Date('2024-01-15'),
      status: 'VERIFIED',
      matchScore: 0.98,
      verificationNotes: 'Match found',
      adminReviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
    },
  ],
};

describe('GET /api/credentials/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(mockVerifiedCredential);
  });

  it('returns verification status and progress for a verified credential', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/status');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.credential.status).toBe('VERIFIED');
    expect(data.credential.verificationMethod).toBe('Automated');
    expect(data.progress).toBeDefined();
  });

  it('returns 404 when credential is not found', async () => {
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/credentials/nonexistent/status');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Credential not found');
  });

  it('computes progress.isComplete=true for VERIFIED status', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/status');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(data.progress.isComplete).toBe(true);
    expect(data.progress.hasAttempt).toBe(true);
    expect(data.progress.attemptsCount).toBe(1);
  });

  it('includes verification history sorted by most recent', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/status');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(Array.isArray(data.history)).toBe(true);
    expect(data.history[0].status).toBe('VERIFIED');
    expect(data.progress.latestAttempt).toBeDefined();
    expect(data.progress.latestAttempt.matchScore).toBe(0.98);
  });
});
