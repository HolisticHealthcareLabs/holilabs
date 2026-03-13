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
    providerCredential: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    credentialVerification: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id: 'cred-1' },
};

describe('POST /api/credentials/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('approves a credential', async () => {
    const mockCredential = { id: 'cred-1', verificationStatus: 'PENDING', verificationNotes: null };
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(mockCredential);
    (prisma.providerCredential.update as jest.Mock).mockResolvedValue({
      ...mockCredential,
      verificationStatus: 'VERIFIED',
      verifiedBy: 'admin-1',
      manualVerified: true,
    });
    (prisma.credentialVerification.findFirst as jest.Mock).mockResolvedValue({ id: 'cv-1' });
    (prisma.credentialVerification.update as jest.Mock).mockResolvedValue({ id: 'cv-1' });

    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/approve', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', adminNotes: 'Looks good' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('approved');
    expect(prisma.providerCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cred-1' },
        data: expect.objectContaining({ verificationStatus: 'VERIFIED', manualVerified: true }),
      })
    );
  });

  it('rejects a credential', async () => {
    const mockCredential = { id: 'cred-1', verificationStatus: 'PENDING', verificationNotes: null };
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(mockCredential);
    (prisma.providerCredential.update as jest.Mock).mockResolvedValue({
      ...mockCredential,
      verificationStatus: 'REJECTED',
    });
    (prisma.credentialVerification.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/approve', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', adminNotes: 'Expired document' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('rejected');
  });

  it('rejects invalid action', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/approve', {
      method: 'POST',
      body: JSON.stringify({ action: 'suspend' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid action');
    expect(prisma.providerCredential.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when user is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/approve', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    });
    const response = await POST(request, { ...mockContext, user: {} });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Authentication required');
  });

  it('returns 404 when credential not found', async () => {
    (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/credentials/cred-1/approve', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});
