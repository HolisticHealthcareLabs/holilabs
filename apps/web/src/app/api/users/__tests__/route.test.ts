import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }), auditView: jest.fn(), auditCreate: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const mockUser = {
  id: 'new-user-1',
  email: 'dr.silva@clinic.com',
  firstName: 'Ana',
  lastName: 'Silva',
  role: 'CLINICIAN',
  specialty: 'Cardiology',
  licenseNumber: 'CRM-12345',
  mfaEnabled: false,
};

describe('POST /api/users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a user and returns 201', async () => {
    prisma.user.create.mockResolvedValue(mockUser);
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'dr.silva@clinic.com',
        firstName: 'Ana',
        lastName: 'Silva',
        role: 'CLINICIAN',
        supabaseId: 'supabase-uid-1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.email).toBe('dr.silva@clinic.com');
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'someone@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Missing required field/);
  });

  it('returns 409 when email already exists', async () => {
    const uniqueError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.user.create.mockRejectedValue(uniqueError);
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'dup@test.com', firstName: 'A', lastName: 'B', role: 'CLINICIAN' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.error).toMatch(/already exists/);
  });
});
