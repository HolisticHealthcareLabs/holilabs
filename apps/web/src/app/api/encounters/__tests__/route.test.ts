/**
 * Tests for GET /api/encounters
 *
 * - GET returns encounter list for patient
 * - Filters by patientId
 * - Returns 404 for missing patient, 403 for unauthorized
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    clinicalEncounter: { findMany: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockEncounters = [
  {
    id: 'enc-1',
    status: 'COMPLETED',
    chiefComplaint: 'Annual checkup',
    scheduledAt: new Date('2024-01-15'),
    startedAt: new Date('2024-01-15T10:00:00'),
    endedAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: 'enc-2',
    status: 'SCHEDULED',
    chiefComplaint: 'Follow-up',
    scheduledAt: new Date('2024-01-20'),
    startedAt: null,
    endedAt: null,
  },
];

describe('GET /api/encounters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns encounter list for patient when clinician has access', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-123',
      assignedClinicianId: 'clinician-1',
    });
    (prisma.clinicalEncounter.findMany as jest.Mock).mockResolvedValue(mockEncounters);

    const request = new NextRequest('http://localhost:3000/api/encounters?patientId=patient-123');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].id).toBe('enc-1');
    expect(data.data[0].chiefComplaint).toBe('Annual checkup');
    expect(prisma.clinicalEncounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: 'patient-123' },
        orderBy: { scheduledAt: 'desc' },
        take: 20,
      })
    );
  });

  it('returns 400 when patientId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/encounters');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('patientId');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/encounters?patientId=nonexistent');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });

  it('returns 403 when clinician is not assigned to patient', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-123',
      assignedClinicianId: 'other-clinician',
    });

    const request = new NextRequest('http://localhost:3000/api/encounters?patientId=patient-123');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });
});
