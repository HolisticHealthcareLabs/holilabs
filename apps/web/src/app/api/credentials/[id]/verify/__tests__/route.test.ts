import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/nppes/npi-verification', () => ({
  verifyNPI: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    providerCredential: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    credentialVerification: {
      create: jest.fn(),
    },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id: 'cred-1' },
};

describe('POST /api/credentials/[id]/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initiates verification for a pending credential', async () => {
    const mockCredential = {
      id: 'cred-1',
      credentialType: 'MEDICAL_LICENSE',
      verificationStatus: 'PENDING',
      autoVerified: false,
      manualVerified: false,
    };
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(mockCredential);
    (prisma.credentialVerification.create as jest.Mock).mockResolvedValue({
      id: 'cv-1',
      credentialId: 'cred-1',
      verificationMethod: 'STATE_BOARD_API',
      status: 'PENDING',
    });
    (prisma.providerCredential.update as jest.Mock).mockResolvedValue({
      ...mockCredential,
      verificationStatus: 'IN_REVIEW',
    });

    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/verify', {
      method: 'POST',
      body: JSON.stringify({ autoVerify: false }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Verification initiated');
    expect(prisma.credentialVerification.create).toHaveBeenCalled();
    expect(prisma.providerCredential.update).toHaveBeenCalled();
  });

  it('returns 404 when credential not found', async () => {
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/verify', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('rejects already verified credential', async () => {
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue({
      id: 'cred-1',
      credentialType: 'NPI',
      verificationStatus: 'VERIFIED',
    });

    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/verify', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already verified');
  });

  it('handles database errors gracefully', async () => {
    (prisma.providerCredential.findUnique as jest.Mock).mockRejectedValue(new Error('DB timeout'));

    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/verify', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to initiate verification');
  });
});
