/**
 * Tests for DELETE /api/auth/webauthn/credentials/[id]
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
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'cred-1' },
  requestId: 'req-1',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DELETE /api/auth/webauthn/credentials/[id]', () => {
  it('returns 400 when credential id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/credentials/');
    const response = await DELETE(request, { user: mockContext.user, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/missing credential/i);
  });

  it('returns 404 when credential does not exist', async () => {
    (prisma.webAuthnCredential.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/credentials/cred-999');
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 404 when credential belongs to a different user', async () => {
    (prisma.webAuthnCredential.findUnique as jest.Mock).mockResolvedValue({ userId: 'other-user' });

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/credentials/cred-1');
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('deletes credential and returns success', async () => {
    (prisma.webAuthnCredential.findUnique as jest.Mock).mockResolvedValue({ userId: 'user-1' });
    (prisma.webAuthnCredential.delete as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/credentials/cred-1');
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.webAuthnCredential.delete).toHaveBeenCalledWith({ where: { id: 'cred-1' } });
  });
});
