/**
 * Tests for GET/POST /api/lab-results
 *
 * - GET returns lab results list
 * - POST creates new lab result
 * - POST rejects missing required fields
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: () => Promise.resolve(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    labResult: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/prevention/lab-result-monitors', () => ({
  monitorLabResult: jest.fn().mockResolvedValue({ monitored: false }),
}));

jest.mock('@/lib/cache/patient-context-cache', () => ({
  onLabResultCreated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/socket-server', () => ({
  emitLabResultEvent: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((e: any) =>
    Promise.resolve(
      new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
        status: 500,
      })
    )
  ),
}));

jest.mock('@/lib/clinical/lab-reference-ranges', () => ({
  getReferenceRange: jest.fn().mockReturnValue(null),
  getReferenceRangeByTestName: jest.fn().mockReturnValue(null),
  interpretResult: jest.fn().mockReturnValue('normal'),
  getInterpretationText: jest.fn().mockReturnValue('Normal'),
  calculateAge: jest.fn().mockReturnValue(45),
  formatReferenceRange: jest.fn().mockReturnValue('0-100'),
}));

jest.mock('@/lib/clinical/lab-decision-rules', () => ({
  generateCriticalAlerts: jest.fn().mockReturnValue([]),
  generateTreatmentRecommendations: jest.fn().mockReturnValue([]),
  requiresImmediateNotification: jest.fn().mockReturnValue(false),
  getNotificationPriority: jest.fn().mockReturnValue('routine'),
}));

const { prisma } = require('@/lib/prisma');
const { GET, POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockLabResults = [
  {
    id: 'lab-1',
    patientId: 'patient-1',
    testName: 'Hemoglobin',
    value: '14.5',
    unit: 'g/dL',
    resultDate: new Date(),
    status: 'FINAL',
    isAbnormal: false,
    isCritical: false,
  },
];

const mockPatient = {
  id: 'patient-1',
  dateOfBirth: new Date('1980-01-01'),
  gender: 'M',
};

describe('GET /api/lab-results', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue(mockLabResults);
  });

  it('GET returns lab results list', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/lab-results?patientId=patient-1'
    );
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].testName).toBe('Hemoglobin');
    expect(prisma.labResult.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: 'patient-1' },
        orderBy: { resultDate: 'desc' },
      })
    );
  });
});

describe('POST /api/lab-results', () => {
  const mockCreatedLabResult = {
    id: 'lab-new',
    patientId: 'patient-1',
    testName: 'Glucose',
    value: '95',
    unit: 'mg/dL',
    resultDate: new Date('2025-01-15'),
    status: 'PRELIMINARY',
    isAbnormal: false,
    isCritical: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.labResult.create as jest.Mock).mockResolvedValue(mockCreatedLabResult);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);
  });

  it('POST creates new lab result', async () => {
    const request = new NextRequest('http://localhost:3000/api/lab-results', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        testName: 'Glucose',
        resultDate: '2025-01-15',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.testName).toBe('Glucose');
    expect(prisma.labResult.create).toHaveBeenCalled();
  });

  it('POST rejects missing required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/lab-results', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        // missing testName and resultDate
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
    expect(prisma.labResult.create).not.toHaveBeenCalled();
  });
});
