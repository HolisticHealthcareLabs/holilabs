/**
 * Tests for POST /api/auth/patient/magic-link/send
 *
 * - POST sends a magic link email to a patient
 * - POST rejects invalid email
 * - POST returns 200 even if patient not found (prevent enumeration)
 * - POST handles service failure
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
  prisma: {
    patientUser: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(null),
}));

const mockGenerateMagicLink = jest.fn();
const mockSendMagicLinkEmail = jest.fn();

jest.mock('@/lib/auth/magic-link', () => ({
  generateMagicLink: (...args: any[]) => mockGenerateMagicLink(...args),
  sendMagicLinkEmail: (...args: any[]) => mockSendMagicLinkEmail(...args),
}));

const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { POST } = require('../route');

const mockPatientUser = {
  id: 'pu-1',
  email: 'patient@example.com',
  patientId: 'patient-1',
  patient: {
    firstName: 'Maria',
    lastName: 'Garcia',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
});

describe('POST /api/auth/patient/magic-link/send', () => {
  it('returns 200 and sends magic link for registered patient', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(mockPatientUser);
    mockGenerateMagicLink.mockResolvedValue({
      success: true,
      magicLinkUrl: 'http://localhost:3000/api/auth/patient/magic-link/verify?token=abc123',
    });
    mockSendMagicLinkEmail.mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/auth/patient/magic-link/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'patient@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGenerateMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'patient@example.com' })
    );
    expect(mockSendMagicLinkEmail).toHaveBeenCalledWith(
      'patient@example.com',
      expect.any(String),
      'Maria Garcia'
    );
  });

  it('returns 400 for invalid email', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/patient/magic-link/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-valid' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(mockGenerateMagicLink).not.toHaveBeenCalled();
  });

  it('returns 200 even if patient is not found (prevent email enumeration)', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(null);
    mockGenerateMagicLink.mockResolvedValue({
      success: true,
      magicLinkUrl: 'http://localhost:3000/api/auth/patient/magic-link/verify?token=abc123',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/patient/magic-link/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'unknown@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendMagicLinkEmail).not.toHaveBeenCalled();
  });

  it('returns 429 when magic link generation is rate limited', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(mockPatientUser);
    mockGenerateMagicLink.mockResolvedValue({
      success: false,
      error: 'Too many requests',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/patient/magic-link/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'patient@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
  });
});
