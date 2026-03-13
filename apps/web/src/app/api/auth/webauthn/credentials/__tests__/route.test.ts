/**
 * Tests for GET /api/auth/webauthn/credentials
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
    webAuthnCredential: {
      findMany: jest.fn(),
    },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockCredentials = [
  {
    id: 'cred-1',
    name: 'MacBook Pro',
    deviceType: 'multiDevice',
    backedUp: true,
    createdAt: new Date('2025-01-01'),
    lastUsedAt: new Date('2025-06-01'),
  },
  {
    id: 'cred-2',
    name: 'iPhone',
    deviceType: 'singleDevice',
    backedUp: false,
    createdAt: new Date('2025-02-01'),
    lastUsedAt: null,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/auth/webauthn/credentials', () => {
  it('returns empty list when user has no credentials', async () => {
    (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/credentials');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.credentials).toHaveLength(0);
  });

  it('returns credentials for authenticated user', async () => {
    (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue(mockCredentials);

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/credentials');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.credentials).toHaveLength(2);
    expect(data.credentials[0].name).toBe('MacBook Pro');
    expect(data.credentials[0]).toHaveProperty('deviceType');
  });

  it('queries only credentials belonging to the authenticated user', async () => {
    (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/credentials');
    await GET(request, mockContext);

    expect(prisma.webAuthnCredential.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      })
    );
  });
});
