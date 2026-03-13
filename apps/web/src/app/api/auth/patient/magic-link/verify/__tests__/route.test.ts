/**
 * Tests for POST/GET /api/auth/patient/magic-link/verify
 *
 * - POST verifies magic link token and creates session
 * - POST rejects invalid/expired token
 * - GET redirects to dashboard on valid token
 * - GET redirects to login with error on invalid token
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/security/require-secret', () => ({
  requireSecret: jest.fn().mockReturnValue('test-secret-key-that-is-long-enough-for-jwt-signing-0123456789'),
}));

const mockVerifyMagicLink = jest.fn();

jest.mock('@/lib/auth/magic-link', () => ({
  verifyMagicLink: (...args: any[]) => mockVerifyMagicLink(...args),
}));

const mockCookieSet = jest.fn();
const mockCookieStore = {
  set: mockCookieSet,
  get: jest.fn(),
  delete: jest.fn(),
};
jest.mock('next/headers', () => {
  return {
    __esModule: true,
    cookies: () => mockCookieStore,
  };
});

jest.mock('jose', () => {
  class MockSignJWT {
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    sign() { return Promise.resolve('mock-jwt-token'); }
  }
  return { SignJWT: MockSignJWT };
});

const { verifyPatientAccess } = require('@/lib/api/middleware');
const { POST, GET } = require('../route');

const mockPatientUser = {
  id: 'pu-1',
  patientId: 'patient-1',
  email: 'patient@example.com',
  emailVerifiedAt: new Date(),
  patient: {
    firstName: 'Maria',
    lastName: 'Garcia',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
});

describe('POST /api/auth/patient/magic-link/verify', () => {
  it('returns 200 with patient data on valid token', async () => {
    mockVerifyMagicLink.mockResolvedValue({
      success: true,
      patientUser: mockPatientUser,
    });

    const request = new NextRequest('http://localhost:3000/api/auth/patient/magic-link/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-magic-token' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.patient.id).toBe('pu-1');
    expect(data.patient.firstName).toBe('Maria');
    expect(data.patient.emailVerified).toBe(true);
    expect(mockCookieSet).toHaveBeenCalledWith(
      'patient-session',
      'mock-jwt-token',
      expect.objectContaining({ httpOnly: true })
    );
  });

  it('returns 400 for missing token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/patient/magic-link/verify', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(mockVerifyMagicLink).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid/expired token', async () => {
    mockVerifyMagicLink.mockResolvedValue({
      success: false,
      error: 'Token expired',
      patientUser: null,
    });

    const request = new NextRequest('http://localhost:3000/api/auth/patient/magic-link/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired-token' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Token expired');
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('returns 500 when service throws', async () => {
    mockVerifyMagicLink.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/patient/magic-link/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'any-token' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('GET /api/auth/patient/magic-link/verify', () => {
  it('redirects to /portal/dashboard on valid token', async () => {
    mockVerifyMagicLink.mockResolvedValue({
      success: true,
      patientUser: mockPatientUser,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/patient/magic-link/verify?token=valid-token'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/portal/dashboard');
    expect(mockCookieSet).toHaveBeenCalled();
  });

  it('redirects to /portal/login with error when token is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/auth/patient/magic-link/verify'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/portal/login');
    expect(response.headers.get('location')).toContain('error=missing_token');
  });

  it('redirects to /portal/login with error on invalid token', async () => {
    mockVerifyMagicLink.mockResolvedValue({
      success: false,
      error: 'invalid_link',
      patientUser: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/patient/magic-link/verify?token=bad-token'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/portal/login');
    expect(response.headers.get('location')).toContain('error=');
  });

  it('redirects to /portal/login on service error', async () => {
    mockVerifyMagicLink.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3000/api/auth/patient/magic-link/verify?token=some-token'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/portal/login');
    expect(response.headers.get('location')).toContain('error=server_error');
  });
});
