import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webAuthnCredential: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/webauthn-challenge-store', () => ({
  storeSignChallenge: jest.fn().mockResolvedValue(undefined),
}));

const { POST } = require('../route');
const { generateAuthenticationOptions } = require('@simplewebauthn/server');
const { prisma } = require('@/lib/prisma');

const ctx = { user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' } };

const mockCredentials = [
  { credentialId: 'cred-abc123', transports: ['internal'] },
];

const mockOptions = {
  challenge: 'test-challenge-base64',
  rpId: 'localhost',
  allowCredentials: [{ id: 'cred-abc123', transports: ['internal'] }],
  userVerification: 'preferred',
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue(mockCredentials);
  (generateAuthenticationOptions as jest.Mock).mockResolvedValue(mockOptions);
});

describe('POST /api/auth/webauthn/sign-options', () => {
  it('returns authentication options for registered credentials', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/webauthn/sign-options', {
      method: 'POST',
      body: JSON.stringify({ prescriptionNonce: 'rx-nonce-abc' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.challenge).toBe('test-challenge-base64');
    expect(generateAuthenticationOptions).toHaveBeenCalled();
  });

  it('returns 400 when prescriptionNonce is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/webauthn/sign-options', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/prescriptionNonce/i);
  });

  it('returns 400 when user has no registered credentials', async () => {
    (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/auth/webauthn/sign-options', {
      method: 'POST',
      body: JSON.stringify({ prescriptionNonce: 'rx-nonce-abc' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/no registered credentials/i);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/webauthn/sign-options', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid json/i);
  });
});
