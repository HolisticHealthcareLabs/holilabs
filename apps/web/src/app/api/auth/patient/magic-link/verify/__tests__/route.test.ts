/**
 * POST /api/auth/patient/magic-link/verify - Magic link verification tests
 *
 * Tests: POST verifies valid magic link token, rejects expired token, rejects invalid token.
 */

import { NextRequest } from 'next/server';

let mockCookieSet: jest.Mock;

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: (req: NextRequest, ctx?: any) => Promise<Response>) => handler,
}));

jest.mock('@/lib/auth/magic-link', () => ({
  verifyMagicLink: jest.fn(),
}));

jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-jwt-session-token'),
  })),
}));

jest.mock('next/headers', () => {
  mockCookieSet = jest.fn();
  return {
    cookies: jest.fn(() => ({
      set: mockCookieSet,
    })),
  };
});

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { verifyMagicLink } = require('@/lib/auth/magic-link');

const mockPatientUser = {
  id: 'pu-001',
  patientId: 'patient-001',
  email: 'patient@example.com',
  patient: {
    firstName: 'Juan',
    lastName: 'Pérez',
  },
};

describe('POST /api/auth/patient/magic-link/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/auth/patient/magic-link/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('POST verifies valid magic link token', async () => {
    (verifyMagicLink as jest.Mock).mockResolvedValue({
      success: true,
      patientUser: mockPatientUser,
    });

    const { POST } = require('../route');
    const res = await POST(makeRequest({ token: 'valid-token-123' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/Inicio de sesión exitoso/i);
    expect(data.patient).toBeDefined();
    expect(data.patient.id).toBe('pu-001');
    expect(data.patient.patientId).toBe('patient-001');
    expect(mockCookieSet).toHaveBeenCalledWith(
      'patient-session',
      'mock-jwt-session-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
      })
    );
  });

  it('rejects expired token', async () => {
    (verifyMagicLink as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Enlace inválido o expirado',
    });

    const { POST } = require('../route');
    const res = await POST(makeRequest({ token: 'expired-token' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/inválido|expirado/i);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('rejects invalid token', async () => {
    (verifyMagicLink as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Token inválido',
    });

    const { POST } = require('../route');
    const res = await POST(makeRequest({ token: 'invalid-token' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('rejects missing token', async () => {
    const { POST } = require('../route');
    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(verifyMagicLink).not.toHaveBeenCalled();
  });
});
