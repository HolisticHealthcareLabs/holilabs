/**
 * Tests for GET /api/search/patients
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const prisma = require('@/lib/prisma').default;
const { createAuditLog } = require('@/lib/audit');
const { safeErrorResponse } = require('@/lib/api/safe-error-response');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockPatients = [
  {
    id: 'patient-1',
    tokenId: 'tok-1',
    firstName: 'Maria',
    lastName: 'Silva',
    dateOfBirth: new Date('1990-03-15'),
    mrn: 'MRN-001',
    phone: '+5511999990001',
    gender: 'F',
    isActive: true,
    isPalliativeCare: false,
    updatedAt: new Date('2025-01-01'),
  },
];

describe('GET /api/search/patients', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns matched patients with computed age', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

    const req = new NextRequest('http://localhost:3000/api/search/patients?q=maria');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.patients).toHaveLength(1);
    expect(data.patients[0].firstName).toBe('Maria');
    expect(typeof data.patients[0].age).toBe('number');
    expect(data.query).toBe('maria');
    expect(data.count).toBe(1);
  });

  it('returns empty array without querying DB when query is shorter than 2 chars', async () => {
    const req = new NextRequest('http://localhost:3000/api/search/patients?q=m');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.patients).toEqual([]);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('emits an audit log on successful search', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

    const req = new NextRequest('http://localhost:3000/api/search/patients?q=silva');
    await GET(req, mockContext);

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SEARCH',
        resource: 'Patient',
        success: true,
      })
    );
  });

  it('delegates to safeErrorResponse when database throws', async () => {
    (prisma.patient.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = new NextRequest('http://localhost:3000/api/search/patients?q=silva');
    await GET(req, mockContext);

    expect(safeErrorResponse).toHaveBeenCalledWith(
      expect.any(Error),
      { userMessage: 'Failed to search patients' }
    );
  });
});
