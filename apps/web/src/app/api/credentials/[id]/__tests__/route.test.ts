/**
 * Tests for GET/PATCH/DELETE /api/credentials/[id]
 *
 * - GET returns a specific credential by ID
 * - GET returns 404 when credential not found
 * - PATCH updates credential fields
 * - DELETE removes a credential and returns success
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
    providerCredential: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@prisma/client', () => ({
  VerificationStatus: {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
  },
}));

const { prisma } = require('@/lib/prisma');
const { GET, PATCH, DELETE } = require('../route');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id: 'cred-1' },
  requestId: 'req-1',
};

const mockCredential = {
  id: 'cred-1',
  credentialType: 'MEDICAL_LICENSE',
  credentialNumber: 'ML-12345',
  issuingAuthority: 'State Board',
  verificationStatus: 'PENDING',
  user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', specialty: 'Cardiology' },
  verificationHistory: [],
};

describe('GET /api/credentials/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(mockCredential);
  });

  it('returns a specific credential by ID with user details', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.credential.id).toBe('cred-1');
    expect(data.credential.user).toBeDefined();
  });

  it('returns 404 when credential does not exist', async () => {
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/credentials/nonexistent');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Credential not found');
  });
});

describe('PATCH /api/credentials/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(mockCredential);
    (prisma.providerCredential.update as jest.Mock).mockResolvedValue({
      ...mockCredential,
      issuingAuthority: 'Updated Board',
    });
  });

  it('updates credential fields and returns updated record', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1', {
      method: 'PATCH',
      body: JSON.stringify({ issuingAuthority: 'Updated Board' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('updated');
  });

  it('returns 404 when credential does not exist for PATCH', async () => {
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/credentials/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ issuingAuthority: 'Updated Board' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/credentials/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(mockCredential);
    (prisma.providerCredential.delete as jest.Mock).mockResolvedValue({});
  });

  it('deletes credential and returns success message', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
    expect(prisma.providerCredential.delete).toHaveBeenCalledWith({ where: { id: 'cred-1' } });
  });

  it('returns 404 when credential does not exist for DELETE', async () => {
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/credentials/nonexistent', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
  });
});
