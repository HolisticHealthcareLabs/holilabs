/**
 * Tests for POST/PUT/GET /api/auth/reset-password
 *
 * - POST requests a password reset email
 * - PUT resets password with token
 * - GET validates a reset token
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

const mockRequestReset = jest.fn();
const mockResetPassword = jest.fn();
const mockValidateToken = jest.fn();

jest.mock('@/lib/auth/password-reset', () => ({
  getPasswordResetService: () => ({
    requestClinicianReset: mockRequestReset,
    requestPatientReset: mockRequestReset,
    resetClinicianPassword: mockResetPassword,
    resetPatientPassword: mockResetPassword,
    validateResetToken: mockValidateToken,
  }),
}));

jest.mock('@/lib/auth/session-security', () => ({
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: jest.fn().mockReturnValue('test-agent'),
}));

const { createAuditLog } = require('@/lib/audit');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { POST, PUT, GET } = require('../route');

beforeEach(() => {
  jest.clearAllMocks();
  (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
});

describe('POST /api/auth/reset-password (request reset)', () => {
  it('returns 200 with success message for valid email', async () => {
    mockRequestReset.mockResolvedValue({
      success: true,
      message: 'If an account exists, a reset email has been sent.',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'patient@example.com', userType: 'PATIENT' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
    expect(mockRequestReset).toHaveBeenCalled();
    expect(mockRequestReset.mock.calls[0][0]).toBe('patient@example.com');
    expect(createAuditLog).toHaveBeenCalled();
  });

  it('returns 400 for invalid email', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
    expect(mockRequestReset).not.toHaveBeenCalled();
  });

  it('routes CLINICIAN userType to requestClinicianReset', async () => {
    mockRequestReset.mockResolvedValue({
      success: true,
      message: 'Reset link sent.',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'dr@holilabs.com', userType: 'CLINICIAN' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockRequestReset).toHaveBeenCalled();
  });

  it('returns 500 when service throws', async () => {
    mockRequestReset.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'patient@example.com', userType: 'PATIENT' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('PUT /api/auth/reset-password (execute reset)', () => {
  it('returns 200 when password is reset successfully', async () => {
    mockResetPassword.mockResolvedValue({
      success: true,
      message: 'Password has been reset successfully.',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'PUT',
      body: JSON.stringify({
        token: 'valid-reset-token',
        newPassword: 'NewPass1!secure',
        userType: 'PATIENT',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockResetPassword).toHaveBeenCalled();
    expect(mockResetPassword.mock.calls[0][0]).toBe('valid-reset-token');
    expect(mockResetPassword.mock.calls[0][1]).toBe('NewPass1!secure');
    expect(createAuditLog).toHaveBeenCalled();
  });

  it('returns 400 for weak password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'PUT',
      body: JSON.stringify({
        token: 'valid-token',
        newPassword: 'weak',
        userType: 'PATIENT',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('returns 400 when service indicates invalid/expired token', async () => {
    mockResetPassword.mockResolvedValue({
      success: false,
      message: 'Token has expired.',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'PUT',
      body: JSON.stringify({
        token: 'expired-token',
        newPassword: 'NewPass1!secure',
        userType: 'PATIENT',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Token has expired.');
  });

  it('returns 500 when service throws', async () => {
    mockResetPassword.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'PUT',
      body: JSON.stringify({
        token: 'valid-token',
        newPassword: 'NewPass1!secure',
        userType: 'PATIENT',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('GET /api/auth/reset-password (validate token)', () => {
  it('returns valid:true for a valid token', async () => {
    mockValidateToken.mockResolvedValue({ valid: true, reason: 'Token is valid' });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/reset-password?token=valid-token'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(mockValidateToken).toHaveBeenCalledWith('valid-token');
  });

  it('returns 400 when token query param is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.valid).toBe(false);
    expect(data.message).toBe('Token is required');
  });

  it('returns valid:false for an expired token', async () => {
    mockValidateToken.mockResolvedValue({ valid: false, reason: 'Token expired' });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/reset-password?token=expired-token'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.message).toBe('Token expired');
  });

  it('returns 500 when service throws', async () => {
    mockValidateToken.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest(
      'http://localhost:3000/api/auth/reset-password?token=some-token'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.valid).toBe(false);
  });
});
