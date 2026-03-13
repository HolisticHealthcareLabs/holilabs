/**
 * Tests for POST /api/demo/provision
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: (req: NextRequest) => Promise<Response>) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn(() => Promise.resolve('hashed-password')) },
}));

jest.mock('@/lib/demo/personas', () => ({
  getPersonaForDiscipline: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { getPersonaForDiscipline } = require('@/lib/demo/personas');

const mockPersona = {
  disciplineSlug: 'general-practice',
  doctorTitle: 'Dr.',
  doctorFirst: 'Carlos',
  doctorLast: 'Medina',
  specialty: 'General Practice',
  patients: [
    { firstName: 'Ana', lastName: 'Souza', age: 35, sex: 'F', chiefComplaint: 'Headache', status: 'WAITING', vitals: {} },
  ],
  soapNote: {},
  cdssAlerts: [],
};

describe('POST /api/demo/provision', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    (getPersonaForDiscipline as jest.Mock).mockReturnValue(mockPersona);
  });

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('provisions a demo environment with workspace and user', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue({
      tenantId: 'ws-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      userName: 'Dr. Carlos Medina',
    });

    const request = new NextRequest('http://localhost:3000/api/demo/provision', {
      method: 'POST',
      body: JSON.stringify({ role: 'CLINICIAN', disciplines: ['general-practice'], jurisdiction: 'BR' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.credentials).toBeDefined();
    expect(data.credentials.email).toContain('demo-');
    expect(data.redirectTo).toBe('/dashboard/my-day');
  });

  it('returns 404 in production environment', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

    const request = new NextRequest('http://localhost:3000/api/demo/provision', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('disabled in production');
  });

  it('returns 500 when transaction fails', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    const request = new NextRequest('http://localhost:3000/api/demo/provision', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
