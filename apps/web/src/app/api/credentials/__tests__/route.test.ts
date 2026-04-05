/**
 * Tests for GET/POST /api/credentials
 *
 * - GET returns credentials list for a given userId
 * - GET returns 400 when userId is missing
 * - POST creates a credential and returns 200
 * - POST returns 409 when credential already exists
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
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@prisma/client', () => ({
  CredentialType: {
    MEDICAL_LICENSE: 'MEDICAL_LICENSE',
    DEA_REGISTRATION: 'DEA_REGISTRATION',
    BOARD_CERTIFICATION: 'BOARD_CERTIFICATION',
    NPI: 'NPI',
  },
  VerificationStatus: {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
  },
}));

const { prisma } = require('@/lib/prisma');
const { GET, POST } = require('../route');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const mockCredential = {
  id: 'cred-1',
  userId: 'user-1',
  credentialType: 'MEDICAL_LICENSE',
  credentialNumber: 'ML-12345',
  issuingAuthority: 'State Medical Board',
  issuingCountry: 'US',
  issuedDate: new Date('2020-01-01'),
  verificationStatus: 'PENDING',
  verificationHistory: [],
  createdAt: new Date(),
};

describe('GET /api/credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.providerCredential.findMany as jest.Mock).mockResolvedValue([mockCredential]);
  });

  it('returns credentials list for a given userId', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials?userId=user-1');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.credentials)).toBe(true);
    expect(data.credentials[0].credentialType).toBe('MEDICAL_LICENSE');
  });

  it('returns 400 when userId query parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });
});

describe('POST /api/credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.providerCredential.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.providerCredential.create as jest.Mock).mockResolvedValue(mockCredential);
  });

  it('creates a credential and returns success', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        credentialType: 'MEDICAL_LICENSE',
        credentialNumber: 'ML-12345',
        issuingAuthority: 'State Medical Board',
        issuingCountry: 'US',
        issuedDate: '2020-01-01',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('created');
  });

  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('returns 409 when credential already exists', async () => {
    (prisma.providerCredential.findFirst as jest.Mock).mockResolvedValue(mockCredential);

    const request = new NextRequest('http://localhost:3000/api/credentials', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        credentialType: 'MEDICAL_LICENSE',
        credentialNumber: 'ML-12345',
        issuingAuthority: 'State Medical Board',
        issuingCountry: 'US',
        issuedDate: '2020-01-01',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already exists');
  });
});
