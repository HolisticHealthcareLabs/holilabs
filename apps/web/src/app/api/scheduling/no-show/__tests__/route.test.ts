/**
 * Tests for POST/GET /api/scheduling/no-show
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
    noShowHistory: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
  validatedBody: {
    appointmentId: 'apt-1',
    contacted: true,
    contactMethod: 'PHONE',
  },
};

const mockAppointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  startTime: new Date('2025-06-15T10:00:00Z'),
  endTime: new Date('2025-06-15T10:30:00Z'),
  status: 'SCHEDULED',
  title: 'Checkup',
  type: 'IN_PERSON',
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', email: 'p@e.com', phone: '+55' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@e.com' },
};

const mockNoShowRecord = {
  id: 'ns-1',
  appointmentId: 'apt-1',
  patientId: 'patient-1',
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', tokenId: 'tok-1', email: 'p@e.com', phone: '+55' },
  appointment: { id: 'apt-1', startTime: new Date(), endTime: new Date(), title: 'Checkup', type: 'IN_PERSON', clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@e.com', specialty: 'GP' } },
};

describe('POST /api/scheduling/no-show', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks appointment as no-show (201)', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (prisma.noShowHistory.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.noShowHistory.count as jest.Mock).mockResolvedValue(0);
    (prisma.appointment.count as jest.Mock).mockResolvedValue(5);
    (prisma.$transaction as jest.Mock).mockResolvedValue([{ status: 'NO_SHOW' }, mockNoShowRecord]);

    const request = new NextRequest('http://localhost:3000/api/scheduling/no-show', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.analytics).toBeDefined();
  });

  it('returns 404 when appointment not found', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scheduling/no-show', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('NOT_FOUND');
  });

  it('returns 400 when appointment status is invalid', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({ ...mockAppointment, status: 'COMPLETED' });

    const request = new NextRequest('http://localhost:3000/api/scheduling/no-show', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('INVALID_STATUS');
  });

  it('returns 409 when no-show record already exists', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (prisma.noShowHistory.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-ns-1' });

    const request = new NextRequest('http://localhost:3000/api/scheduling/no-show', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('DUPLICATE');
  });
});

describe('GET /api/scheduling/no-show', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns no-show records with analytics (200)', async () => {
    (prisma.noShowHistory.findMany as jest.Mock).mockResolvedValue([mockNoShowRecord]);

    const request = new NextRequest('http://localhost:3000/api/scheduling/no-show');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.analytics).toBeDefined();
    expect(data.count).toBe(1);
  });
});
