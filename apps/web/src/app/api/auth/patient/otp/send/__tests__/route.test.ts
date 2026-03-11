/**
 * Patient OTP Send API Tests
 *
 * POST /api/auth/patient/otp/send
 * Tests for OTP code request via SMS/WhatsApp
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: (req: NextRequest, ctx?: any) => Promise<Response>) => handler,
}));

jest.mock('@/lib/auth/otp', () => ({
  generateOTP: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { generateOTP } = require('@/lib/auth/otp');
const { checkRateLimit } = require('@/lib/rate-limit');
const { createAuditLog } = require('@/lib/audit');

describe('POST /api/auth/patient/otp/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockResolvedValue(null);
  });

  function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/auth/patient/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('POST sends OTP successfully', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    (generateOTP as jest.Mock).mockResolvedValue({
      success: true,
      expiresAt,
    });

    const { POST } = require('../route');
    const res = await POST(makeRequest({ phone: '5511999999999' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/Código enviado/);
    expect(data.expiresAt).toBeDefined();
    expect(generateOTP).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '5511999999999', channel: 'SMS' })
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN',
        resource: 'PatientAuth',
        success: true,
      })
    );
  });

  it('POST rejects missing phone', async () => {
    const { POST } = require('../route');
    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(generateOTP).not.toHaveBeenCalled();
  });

  it('POST rejects invalid phone (too short)', async () => {
    const { POST } = require('../route');
    const res = await POST(makeRequest({ phone: '123' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/10|dígitos/i);
    expect(generateOTP).not.toHaveBeenCalled();
  });

  it('POST rate-limits excessive requests', async () => {
    const rateLimitResponse = new Response(
      JSON.stringify({
        success: false,
        error: 'Too many requests. Please try again later.',
      }),
      { status: 429 }
    );
    (checkRateLimit as jest.Mock).mockResolvedValue(rateLimitResponse);

    const { POST } = require('../route');
    const res = await POST(makeRequest({ phone: '5511999999999' }));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/Too many|try again/i);
    expect(generateOTP).not.toHaveBeenCalled();
  });
});
