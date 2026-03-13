/**
 * Tests for POST /api/auth/webauthn/register-options
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

jest.mock('@/lib/auth/webauthn-challenge-store', () => ({
  storeRegistrationChallenge: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { generateRegistrationOptions } = require('@simplewebauthn/server');
const { storeRegistrationChallenge } = require('@/lib/auth/webauthn-challenge-store');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockOptions = {
  challenge: 'mock-challenge-base64',
  rp: { name: 'Holilabs', id: 'localhost' },
  user: { id: 'dXNlci0x', name: 'dr@holilabs.com', displayName: 'dr@holilabs.com' },
  pubKeyCredParams: [],
  timeout: 60000,
  excludeCredentials: [],
  authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  attestation: 'none',
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue([]);
  (generateRegistrationOptions as jest.Mock).mockResolvedValue(mockOptions);
});

describe('POST /api/auth/webauthn/register-options', () => {
  it('returns registration options for user with no existing credentials', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/register-options', {
      method: 'POST',
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.challenge).toBe('mock-challenge-base64');
    expect(generateRegistrationOptions).toHaveBeenCalled();
  });

  it('excludes existing credentials from options', async () => {
    (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue([
      { credentialId: 'existing-cred-id', transports: ['internal'] },
    ]);

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/register-options', {
      method: 'POST',
    });
    await POST(request, mockContext);

    const call = (generateRegistrationOptions as jest.Mock).mock.calls[0][0];
    expect(call.excludeCredentials).toHaveLength(1);
    expect(call.excludeCredentials[0].id).toBe('existing-cred-id');
  });

  it('stores challenge for later verification', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/register-options', {
      method: 'POST',
    });
    await POST(request, mockContext);

    expect(storeRegistrationChallenge).toHaveBeenCalledWith('user-1', 'mock-challenge-base64');
  });
});
