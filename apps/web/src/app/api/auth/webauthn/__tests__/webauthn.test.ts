/**
 * Tests for WebAuthn API routes
 *
 * @simplewebauthn/server is mocked entirely.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — must be declared before any imports that transitively require them
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webAuthnCredential: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

// In-memory challenge store — no Redis needed in tests
jest.mock('@/lib/auth/webauthn-challenge-store', () => {
  const store = new Map<string, any>();
  return {
    storeRegistrationChallenge: jest.fn((uid: string, ch: string) => {
      store.set(`reg:${uid}`, ch);
    }),
    getRegistrationChallenge: jest.fn((uid: string) => store.get(`reg:${uid}`) ?? null),
    deleteRegistrationChallenge: jest.fn((uid: string) => store.delete(`reg:${uid}`)),
    storeSignChallenge: jest.fn((uid: string, payload: any) => {
      store.set(`sign:${uid}`, payload);
    }),
    getSignChallenge: jest.fn((uid: string) => store.get(`sign:${uid}`) ?? null),
    deleteSignChallenge: jest.fn((uid: string) => store.delete(`sign:${uid}`)),
  };
});

jest.mock('@/lib/auth/webauthn-token', () => ({
  issueWebAuthnToken: jest.fn().mockResolvedValue('mock-jwt-token'),
  verifyWebAuthnToken: jest.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Requires (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const { prisma } = require('@/lib/prisma');
const {
  storeRegistrationChallenge,
  getRegistrationChallenge,
  storeSignChallenge,
  getSignChallenge,
} = require('@/lib/auth/webauthn-challenge-store');
const { issueWebAuthnToken } = require('@/lib/auth/webauthn-token');

import { NextRequest } from 'next/server';
import { POST as registerOptions } from '../register-options/route';
import { POST as verifyRegistration } from '../verify-registration/route';
import { POST as signOptions } from '../sign-options/route';
import { POST as verifySignature } from '../verify-signature/route';

function makeRequest(method: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/webauthn', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const userCtx = { user: { id: 'user-1', email: 'doc@holi.app', role: 'PHYSICIAN' } };

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /register-options', () => {
  it('generates options and stores challenge', async () => {
    (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue([]);
    (generateRegistrationOptions as jest.Mock).mockResolvedValue({
      challenge: 'test-challenge-abc',
      rp: { name: 'Holilabs', id: 'localhost' },
    });

    const res = await (registerOptions as any)(makeRequest('POST', {}), userCtx);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.challenge).toBe('test-challenge-abc');
    expect(storeRegistrationChallenge).toHaveBeenCalledWith('user-1', 'test-challenge-abc');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /verify-registration', () => {
  it('creates credential on successful verification', async () => {
    (getRegistrationChallenge as jest.Mock).mockResolvedValue('stored-challenge');
    (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'cred-id-123',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    });
    (prisma.webAuthnCredential.create as jest.Mock).mockResolvedValue({
      id: 'saved-id',
      name: 'MacBook',
      deviceType: 'singleDevice',
      createdAt: new Date(),
    });

    const res = await (verifyRegistration as any)(
      makeRequest('POST', { response: {}, deviceName: 'MacBook' }),
      userCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(true);
  });

  it('returns 400 when challenge is expired / not found', async () => {
    (getRegistrationChallenge as jest.Mock).mockResolvedValue(null);

    const res = await (verifyRegistration as any)(
      makeRequest('POST', { response: {} }),
      userCtx
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/challenge/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /sign-options', () => {
  it('generates auth options and stores sign challenge', async () => {
    (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue([
      { credentialId: 'cred-id-123', transports: ['internal'] },
    ]);
    (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
      challenge: 'sign-challenge-xyz',
    });

    const res = await (signOptions as any)(
      makeRequest('POST', { prescriptionNonce: 'nonce-abc' }),
      userCtx
    );
    expect(res.status).toBe(200);
    expect(storeSignChallenge).toHaveBeenCalledWith('user-1', {
      challenge: 'sign-challenge-xyz',
      prescriptionNonce: 'nonce-abc',
    });
  });

  it('returns 400 when no credentials registered', async () => {
    (prisma.webAuthnCredential.findMany as jest.Mock).mockResolvedValue([]);

    const res = await (signOptions as any)(
      makeRequest('POST', { prescriptionNonce: 'nonce-abc' }),
      userCtx
    );
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /verify-signature', () => {
  const credentialRecord = {
    id: 'db-cred-1',
    userId: 'user-1',
    credentialId: 'cred-id-123',
    publicKey: Buffer.from([1, 2, 3]),
    counter: BigInt(0),
    transports: ['internal'],
  };

  it('issues signatureToken on successful verification', async () => {
    (getSignChallenge as jest.Mock).mockResolvedValue({
      challenge: 'sign-challenge-xyz',
      prescriptionNonce: 'nonce-abc',
    });
    (prisma.webAuthnCredential.findUnique as jest.Mock).mockResolvedValue(credentialRecord);
    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
    (prisma.webAuthnCredential.update as jest.Mock).mockResolvedValue({});
    (issueWebAuthnToken as jest.Mock).mockResolvedValue('jwt-signed-token');

    const res = await (verifySignature as any)(
      makeRequest('POST', { id: 'cred-id-123', response: {} }),
      userCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.signatureToken).toBe('jwt-signed-token');
    expect(prisma.webAuthnCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ counter: BigInt(1) }) })
    );
  });

  it('returns 400 on nonce mismatch (challenge expired)', async () => {
    (getSignChallenge as jest.Mock).mockResolvedValue(null);

    const res = await (verifySignature as any)(
      makeRequest('POST', { id: 'cred-id-123' }),
      userCtx
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/challenge/i);
  });

  it('returns 400 when credential does not belong to user', async () => {
    (getSignChallenge as jest.Mock).mockResolvedValue({
      challenge: 'x',
      prescriptionNonce: 'n',
    });
    (prisma.webAuthnCredential.findUnique as jest.Mock).mockResolvedValue({
      ...credentialRecord,
      userId: 'other-user',
    });

    const res = await (verifySignature as any)(
      makeRequest('POST', { id: 'cred-id-123' }),
      userCtx
    );
    expect(res.status).toBe(400);
  });
});
