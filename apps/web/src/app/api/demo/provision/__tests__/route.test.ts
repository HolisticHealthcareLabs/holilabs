/**
 * Tests for POST /api/demo/provision
 *
 * Creates unique ephemeral demo users per session.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
    },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('POST /api/demo/provision', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
  });

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('creates an ephemeral user and returns unique credentials', async () => {
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'cuid-123',
      firstName: 'Dr. Demo',
      lastName: 'ABCD1234',
      email: 'demo-abcd1234@holilabs.xyz',
    });

    const request = new NextRequest('http://localhost:3000/api/demo/provision', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.credentials.email).toMatch(/^demo-[a-f0-9]+@holilabs\.xyz$/);
    expect(data.credentials.password).toBe('Cortex2026!');
    expect(data.redirectTo).toBe('/dashboard');
    expect(data.user.id).toBe('cuid-123');

    const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.isEphemeral).toBe(true);
    expect(createCall.data.role).toBe('CLINICIAN');
  });

  it('returns 404 in production environment', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

    const request = new NextRequest('http://localhost:3000/api/demo/provision', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('disabled in production');
  });

  it('returns 500 when database fails', async () => {
    (prisma.user.create as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    const request = new NextRequest('http://localhost:3000/api/demo/provision', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
