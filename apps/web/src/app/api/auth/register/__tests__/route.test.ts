/**
 * Tests for POST /api/auth/register
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: (req: NextRequest) => Promise<Response>) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

jest.mock('@/lib/validation', () => ({
  withValidation: (schema: any) => async (req: NextRequest) => {
    const body = await req.json();
    if (!body.firstName || !body.lastName || !body.email || !body.password) {
      return { success: false, error: 'Missing required fields', status: 400 };
    }
    return { success: true, data: body };
  },
  registrationSchema: {},
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(() => null),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
}));

jest.mock('@/lib/email', () => ({
  sendWelcomeEmail: jest.fn(() => Promise.resolve({ data: {} })),
}));

jest.mock('@/lib/auth/username', () => ({
  generateUsername: jest.fn(() => Promise.resolve('dr_silva_abc1')),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const validPayload = {
  firstName: 'Maria',
  lastName: 'Silva',
  email: 'maria@holilabs.com',
  password: 'SecurePass123!',
  role: 'doctor',
  organization: 'Clinica Test',
  reason: 'New practice',
};

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new clinician account with valid data', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'maria@holilabs.com',
      firstName: 'Maria',
      lastName: 'Silva',
      username: 'dr_silva_abc1',
      role: 'PHYSICIAN',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.username).toBe('dr_silva_abc1');
  });

  it('returns 409 when email already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already exists');
  });

  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
