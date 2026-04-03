import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findMany: jest.fn(), createMany: jest.fn() },
    auditLog: { createMany: jest.fn() },
    dataQualityEvent: { createMany: jest.fn() },
    userBehaviorEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/blockchain/hashing', () => ({
  generatePatientDataHash: jest.fn(() => 'mock-hash'),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

jest.mock('@/lib/fhir/patient-mapper', () => ({
  generateMRN: jest.fn(() => 'MRN-AUTO'),
  generateTokenId: jest.fn(() => 'tok-auto'),
}));

jest.mock('@/lib/security/validation', () => ({
  sanitizeString: jest.fn((s: string) => s),
  sanitizeCSVField: jest.fn((s: string) => s),
  validateFileSize: jest.fn(),
  isValidEmail: jest.fn(() => true),
  isValidPhone: jest.fn(() => true),
  isValidDate: jest.fn(() => true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: opts?.userMessage ?? 'Error' }, { status: 500 });
  }),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { sanitizeString, sanitizeCSVField, validateFileSize, isValidEmail, isValidPhone, isValidDate } = require('@/lib/security/validation');
const { generateMRN, generateTokenId } = require('@/lib/fhir/patient-mapper');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

function createCSVRequest(csvContent: string) {
  const file = new File([csvContent], 'patients.csv', { type: 'text/csv' });
  const formData = new FormData();
  formData.append('file', file);
  return new NextRequest('http://localhost:3000/api/patients/import', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/patients/import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sanitizeString as jest.Mock).mockImplementation((s: string) => s);
    (sanitizeCSVField as jest.Mock).mockImplementation((s: string) => s);
    (validateFileSize as jest.Mock).mockImplementation(() => {});
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhone as jest.Mock).mockReturnValue(true);
    (isValidDate as jest.Mock).mockReturnValue(true);
    (generateMRN as jest.Mock).mockReturnValue('MRN-AUTO');
    (generateTokenId as jest.Mock).mockReturnValue('tok-auto');
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userBehaviorEvent.create as jest.Mock).mockResolvedValue({});
    (prisma.dataQualityEvent.createMany as jest.Mock).mockResolvedValue({});
  });

  it('imports patients from valid CSV', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const mockTx = {
        patient: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest.fn().mockResolvedValue([
            { id: 'p-new', tokenId: 'tok-auto', firstName: 'John', lastName: 'Doe' },
          ]),
        },
        auditLog: { createMany: jest.fn().mockResolvedValue({}) },
      };
      return fn(mockTx);
    });

    const csv = 'firstName,lastName,dateOfBirth,gender\nJohn,Doe,1990-01-15,MALE';
    const res = await POST(createCSVRequest(csv), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.summary.total).toBe(1);
    expect(data.summary.imported).toBe(1);
  });

  it('returns 400 when no file provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/import', {
      method: 'POST',
      body: new FormData(),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('No file');
  });

  it('skips duplicate MRNs', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([{ mrn: 'MRN-001', id: 'existing' }]);
    (prisma.$transaction as jest.Mock).mockImplementation(async () => {});

    const csv = 'firstName,lastName,dateOfBirth,mrn\nJohn,Doe,1990-01-15,MRN-001';
    const res = await POST(createCSVRequest(csv), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.failed.length).toBeGreaterThanOrEqual(1);
    expect(data.failed[0].reason).toContain('already exists');
  });
});
