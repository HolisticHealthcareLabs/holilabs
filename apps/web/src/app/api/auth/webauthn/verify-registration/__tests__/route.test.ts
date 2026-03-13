/**
 * Tests for POST /api/auth/webauthn/verify-registration
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
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/webauthn-challenge-store', () => ({
  getRegistrationChallenge: jest.fn(),
  deleteRegistrationChallenge: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@simplewebauthn/server', () => ({
  verifyRegistrationResponse: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyRegistrationResponse } = require('@simplewebauthn/server');
const {
  getRegistrationChallenge,
  deleteRegistrationChallenge,
} = require('@/lib/auth/webauthn-challenge-store');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockVerification = {
  verified: true,
  registrationInfo: {
    credential: {
      id: 'new-cred-id',
      publicKey: new Uint8Array([1, 2, 3]),
      counter: 0,
    },
    credentialDeviceType: 'multiDevice',
    credentialBackedUp: true,
  },
};

const mockSavedCredential = {
  id: 'db-cred-1',
  name: 'Dispositivo',
  deviceType: 'multiDevice',
  createdAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getRegistrationChallenge as jest.Mock).mockResolvedValue('stored-challenge');
  (verifyRegistrationResponse as jest.Mock).mockResolvedValue(mockVerification);
  (prisma.webAuthnCredential.create as jest.Mock).mockResolvedValue(mockSavedCredential);
});

describe('POST /api/auth/webauthn/verify-registration', () => {
  it('returns 400 for invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/verify-registration', {
      method: 'POST',
      body: 'invalid-json',
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON');
  });

  it('returns 400 when challenge is not found or expired', async () => {
    (getRegistrationChallenge as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/verify-registration', {
      method: 'POST',
      body: JSON.stringify({ response: {}, deviceName: 'My Device' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/challenge expired/i);
  });

  it('returns 400 when verification fails', async () => {
    (verifyRegistrationResponse as jest.Mock).mockRejectedValue(new Error('Invalid signature'));

    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/verify-registration', {
      method: 'POST',
      body: JSON.stringify({ response: {}, deviceName: 'My Device' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/verification failed/i);
  });

  it('saves credential and returns verified:true on success', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/webauthn/verify-registration', {
      method: 'POST',
      body: JSON.stringify({
        response: { transports: ['internal'] },
        deviceName: 'MacBook Pro',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.verified).toBe(true);
    expect(data.credential).toBeDefined();
    expect(prisma.webAuthnCredential.create).toHaveBeenCalled();
    expect(deleteRegistrationChallenge).toHaveBeenCalledWith('user-1');
  });
});
