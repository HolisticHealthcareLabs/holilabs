/**
 * Tests for GET/POST/DELETE /api/admin/invitations
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Shared prisma mock object — same reference the route's module-level `prisma` uses
const sharedPrisma = {
  invitationCode: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  signupCounter: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => sharedPrisma),
}));

const { GET, POST, DELETE } = require('../route');

const ADMIN_KEY = 'test-admin-key';

const mockCode = {
  id: 'code-1',
  code: 'HOLI-ABC-XYZ',
  email: 'test@example.com',
  role: 'CLINICIAN',
  expiresAt: new Date('2026-01-01'),
  maxUses: 1,
  uses: 0,
  isActive: true,
  createdBy: 'admin-1',
  createdByUser: { id: 'admin-1', email: 'admin@holilabs.com', firstName: 'Admin', lastName: 'User' },
  _count: { users: 0 },
  createdAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_API_KEY = ADMIN_KEY;
});

describe('GET /api/admin/invitations', () => {
  it('returns 401 when missing admin key', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/invitations');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns invitation codes list with valid admin key', async () => {
    sharedPrisma.invitationCode.findMany.mockResolvedValue([mockCode]);
    sharedPrisma.signupCounter.findUnique.mockResolvedValue({ signups: 10 });

    const request = new NextRequest('http://localhost:3000/api/admin/invitations', {
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.codes).toHaveLength(1);
    expect(data.codes[0].code).toBe('HOLI-ABC-XYZ');
    expect(data.first100Remaining).toBe(90);
  });

  it('returns 500 when database throws', async () => {
    sharedPrisma.invitationCode.findMany.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost:3000/api/admin/invitations', {
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
    });
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

describe('POST /api/admin/invitations', () => {
  it('returns 401 when missing admin key', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/invitations', {
      method: 'POST',
      body: JSON.stringify({ createdBy: 'admin-1' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when createdBy is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/invitations', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('creates invitation code with valid payload', async () => {
    sharedPrisma.invitationCode.create.mockResolvedValue(mockCode);
    sharedPrisma.signupCounter.upsert.mockResolvedValue({ date: new Date(), invitations: 1 });

    const request = new NextRequest('http://localhost:3000/api/admin/invitations', {
      method: 'POST',
      body: JSON.stringify({ createdBy: 'admin-1', email: 'test@example.com', role: 'CLINICIAN' }),
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.code.code).toBe('HOLI-ABC-XYZ');
  });
});

describe('DELETE /api/admin/invitations', () => {
  it('returns 401 when missing admin key', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/invitations', {
      method: 'DELETE',
      body: JSON.stringify({ code: 'HOLI-ABC-XYZ' }),
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when code is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/invitations', {
      method: 'DELETE',
      body: JSON.stringify({}),
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('deactivates code with valid payload', async () => {
    sharedPrisma.invitationCode.update.mockResolvedValue({ ...mockCode, isActive: false });

    const request = new NextRequest('http://localhost:3000/api/admin/invitations', {
      method: 'DELETE',
      body: JSON.stringify({ code: 'HOLI-ABC-XYZ' }),
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.code.isActive).toBe(false);
  });
});
