import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webAuthnCredential: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/webauthn-challenge-store', () => ({
  getSignChallenge: jest.fn(),
  deleteSignChallenge: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/auth/webauthn-token', () => ({
  issueWebAuthnToken: jest.fn(),
}));

const { POST } = require('../route');
const { verifyAuthenticationResponse } = require('@simplewebauthn/server');
const { prisma } = require('@/lib/prisma');
const { getSignChallenge } = require('@/lib/auth/webauthn-challenge-store');
const { issueWebAuthnToken } = require('@/lib/auth/webauthn-token');

const ctx = { user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' } };

const mockCredentialRecord = {
  id: 'db-cred-id',
  credentialId: 'cred-abc123',
  userId: 'clinician-1',
  publicKey: Buffer.from('mock-public-key'),
  counter: BigInt(5),
  transports: ['internal'],
};

beforeEach(() => {
  jest.clearAllMocks();
  (getSignChallenge as jest.Mock).mockResolvedValue({
    challenge: 'test-challenge',
    prescriptionNonce: 'rx-nonce-abc',
  });
  (prisma.webAuthnCredential.findUnique as jest.Mock).mockResolvedValue(mockCredentialRecord);
  (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
    verified: true,
    authenticationInfo: { newCounter: 6 },
  });
  (prisma.webAuthnCredential.update as jest.Mock).mockResolvedValue({});
  (issueWebAuthnToken as jest.Mock).mockResolvedValue('jwt-token-xyz');
});

describe('POST /api/auth/webauthn/verify-signature', () => {
  it('verifies signature and returns signatureToken on success', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/webauthn/verify-signature', {
      method: 'POST',
      body: JSON.stringify({ id: 'cred-abc123', response: {} }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.signatureToken).toBe('jwt-token-xyz');
    expect(prisma.webAuthnCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'db-cred-id' } })
    );
  });

  it('returns 400 when challenge has expired or not found', async () => {
    (getSignChallenge as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/webauthn/verify-signature', {
      method: 'POST',
      body: JSON.stringify({ id: 'cred-abc123' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/challenge expired/i);
  });

  it('returns 400 when credential is not found or belongs to different user', async () => {
    (prisma.webAuthnCredential.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/webauthn/verify-signature', {
      method: 'POST',
      body: JSON.stringify({ id: 'unknown-cred' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/credential not found/i);
  });

  it('returns 400 when assertion is not verified', async () => {
    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({ verified: false });

    const req = new NextRequest('http://localhost:3000/api/auth/webauthn/verify-signature', {
      method: 'POST',
      body: JSON.stringify({ id: 'cred-abc123' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/assertion not verified/i);
  });
});
