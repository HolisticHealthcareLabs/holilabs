/**
 * Patient OTP Verify API Tests
 *
 * POST /api/auth/patient/otp/verify
 * Tests for OTP code verification and session creation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

let mockCookieSet: jest.Mock;

jest.mock('@/lib/auth/otp', () => ({
  verifyOTP: jest.fn(),
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

const { verifyOTP } = require('@/lib/auth/otp');

const mockPatientUser = {
  id: 'pu-001',
  patientId: 'patient-001',
  email: 'patient@example.com',
  phone: '+5511999999999',
  phoneVerifiedAt: new Date(),
  patient: {
    firstName: 'Juan',
    lastName: 'Pérez',
  },
};

describe('POST /api/auth/patient/otp/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/auth/patient/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('POST verifies valid OTP', async () => {
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: true,
      patientUser: mockPatientUser,
    });

    const { POST } = require('../route');
    const res = await POST(makeRequest({ phone: '5511999999999', code: '123456' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/Inicio de sesión exitoso/i);
    expect(data.patient).toBeDefined();
    expect(data.patient.id).toBe('pu-001');
    expect(data.patient.patientId).toBe('patient-001');
    expect(data.patient.firstName).toBe('Juan');
    expect(data.patient.lastName).toBe('Pérez');
    expect(mockCookieSet).toHaveBeenCalledWith(
      'patient-session',
      'mock-jwt-session-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
      })
    );
  });

  it('POST rejects invalid OTP', async () => {
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Código inválido o expirado.',
      attemptsLeft: 2,
    });

    const { POST } = require('../route');
    const res = await POST(makeRequest({ phone: '5511999999999', code: '000000' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/inválido|inválido o expirado/i);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('POST rejects expired OTP', async () => {
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Este código ha expirado. Solicita uno nuevo.',
    });

    const { POST } = require('../route');
    const res = await POST(makeRequest({ phone: '5511999999999', code: '123456' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/expirado/i);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('POST rejects missing phone or code', async () => {
    const { POST } = require('../route');

    const resNoPhone = await POST(makeRequest({ code: '123456' }));
    expect(resNoPhone.status).toBe(400);
    expect((await resNoPhone.json()).success).toBe(false);

    const resNoCode = await POST(makeRequest({ phone: '5511999999999' }));
    expect(resNoCode.status).toBe(400);
    expect((await resNoCode.json()).success).toBe(false);
  });

  it('POST rejects invalid code length', async () => {
    const { POST } = require('../route');
    const res = await POST(makeRequest({ phone: '5511999999999', code: '12345' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(verifyOTP).not.toHaveBeenCalled();
  });
});
