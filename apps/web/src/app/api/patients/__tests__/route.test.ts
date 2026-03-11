/**
 * Patients API Tests - List and Create
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    userBehaviorEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/blockchain/hashing', () => ({
  generatePatientDataHash: jest.fn(() => 'mock-hash-abc123'),
}));

jest.mock('@/lib/security/token-generation', () => ({
  generateUniquePatientTokenId: jest.fn(() => Promise.resolve('token-xyz-789')),
}));

jest.mock('@/lib/audit/deid-audit', () => ({
  logDeIDOperation: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn(() => Promise.resolve()),
  ServerAnalyticsEvents: { PATIENT_CREATED: 'PATIENT_CREATED' },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/socket-server', () => ({
  emitPatientEvent: jest.fn(),
}));

jest.mock('@/lib/demo/synthetic', () => ({
  getSyntheticPatients: jest.fn(() => []),
  isDemoClinician: jest.fn(() => false),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: opts?.userMessage ?? 'Internal server error' },
      { status: 500 }
    );
  }),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { isDemoClinician } = require('@/lib/demo/synthetic');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockPatient = {
  id: 'patient-1',
  firstName: 'Maria',
  lastName: 'Silva',
  dateOfBirth: new Date('1990-01-15'),
  mrn: 'MRN-001',
  assignedClinicianId: 'clinician-1',
  assignedClinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@holilabs.com', specialty: 'GP' },
  medications: [],
  appointments: [],
};

const validPatientPayload = {
  firstName: 'Maria',
  lastName: 'Silva',
  dateOfBirth: '1990-01-15T00:00:00.000Z',
  mrn: 'MRN-001',
  email: 'maria@example.com',
  phone: '+5511999999999',
};

describe('GET /api/patients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (prisma.userBehaviorEvent.create as jest.Mock).mockResolvedValue({});
  });

  it('returns paginated patient list', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([mockPatient]);
    (prisma.patient.count as jest.Mock).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/patients?page=1&limit=10');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].firstName).toBe('Maria');
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns empty list when no patients', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.patient.count as jest.Mock).mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/patients');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it('filters by search term', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([mockPatient]);
    (prisma.patient.count as jest.Mock).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/patients?search=Maria');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedClinicianId: 'clinician-1',
          OR: expect.arrayContaining([
            expect.objectContaining({ firstName: { contains: 'Maria', mode: 'insensitive' } }),
            expect.objectContaining({ lastName: { contains: 'Maria', mode: 'insensitive' } }),
          ]),
        }),
      })
    );
    expect(data.data).toHaveLength(1);
  });
});

describe('POST /api/patients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (prisma.userBehaviorEvent.create as jest.Mock).mockResolvedValue({});

    const mockTx = {
      patient: {
        create: jest.fn().mockResolvedValue({
          ...mockPatient,
          ageBand: '30-39',
          region: null,
          dataHash: 'mock-hash-abc123',
        }),
      },
      consent: { create: jest.fn().mockResolvedValue({ id: 'consent-1' }) },
      dataAccessGrant: { create: jest.fn().mockResolvedValue({ id: 'grant-1' }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(mockTx));
  });

  it('creates a new patient with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/patients', {
      method: 'POST',
      body: JSON.stringify(validPatientPayload),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.firstName).toBe('Maria');
    expect(data.data.lastName).toBe('Silva');
    expect(data.message).toBe('Patient created successfully');
  });

  it('rejects missing required fields (firstName, lastName, dateOfBirth)', async () => {
    const request = new NextRequest('http://localhost:3000/api/patients', {
      method: 'POST',
      body: JSON.stringify({
        mrn: 'MRN-002',
        email: 'test@example.com',
        phone: '+5511888888888',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
    const fields = data.details.map((d: any) => d.field);
    expect(fields).toContain('firstName');
    expect(fields).toContain('lastName');
    expect(fields).toContain('dateOfBirth');
  });

  it('returns 400 for invalid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/patients', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'A',
        lastName: 'B',
        dateOfBirth: 'invalid-date',
        mrn: 'X',
        email: 'not-an-email',
        phone: '123',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });
});
