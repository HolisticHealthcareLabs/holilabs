import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { create: jest.fn() },
  },
}));

jest.mock('@/lib/fhir/patient-mapper', () => ({
  generateMRN: jest.fn().mockReturnValue('MRN-001'),
  generateTokenId: jest.fn().mockReturnValue('TK-001'),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err, opts) =>
    new (require('next/server').NextResponse)(JSON.stringify({ error: opts?.userMessage }), { status: 500 }),
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

describe('POST /api/patients/bulk', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates multiple patients successfully', async () => {
    (prisma.patient.create as jest.Mock).mockResolvedValue({ id: 'p-new', firstName: 'Maria' });

    const req = new NextRequest('http://localhost:3000/api/patients/bulk', {
      method: 'POST',
      body: JSON.stringify({
        patients: [
          { firstName: 'Maria', lastName: 'Lopez', dateOfBirth: '1990-01-01' },
          { firstName: 'Juan', lastName: 'Perez', dateOfBirth: '1985-06-15' },
        ],
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.created).toBe(2);
  });

  it('returns 400 when patients array is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/bulk', {
      method: 'POST',
      body: JSON.stringify({ patients: [] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('patients array');
  });

  it('returns 400 when batch size exceeds 100', async () => {
    const patients = Array.from({ length: 101 }, (_, i) => ({
      firstName: `Patient${i}`, lastName: 'Test', dateOfBirth: '2000-01-01',
    }));

    const req = new NextRequest('http://localhost:3000/api/patients/bulk', {
      method: 'POST',
      body: JSON.stringify({ patients }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Batch size');
  });

  it('reports partial failures in response', async () => {
    let callCount = 0;
    (prisma.patient.create as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 2) throw new Error('Duplicate email');
      return Promise.resolve({ id: `p-${callCount}` });
    });

    const req = new NextRequest('http://localhost:3000/api/patients/bulk', {
      method: 'POST',
      body: JSON.stringify({
        patients: [
          { firstName: 'A', lastName: 'B', dateOfBirth: '2000-01-01' },
          { firstName: 'C', lastName: 'D', dateOfBirth: '2000-02-01' },
          { firstName: 'E', lastName: 'F', dateOfBirth: '2000-03-01' },
        ],
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.created).toBe(2);
    expect(data.failed).toBe(1);
  });
});
