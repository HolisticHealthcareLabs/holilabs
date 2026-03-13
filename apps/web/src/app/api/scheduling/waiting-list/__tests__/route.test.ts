/**
 * Tests for POST/GET /api/scheduling/waiting-list
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    waitingList: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
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
    patientId: 'patient-1',
    clinicianId: 'clinician-1',
    appointmentType: 'CONSULTATION',
    priority: 'NORMAL',
    reason: 'Follow-up needed',
  },
};

const mockPatient = { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', email: 'p@e.com', phone: '+55' };
const mockClinician = { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', role: 'CLINICIAN' };

const mockEntry = {
  id: 'wl-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  status: 'WAITING',
  priority: 'NORMAL',
  createdAt: new Date(),
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', tokenId: 'tok-1', email: 'p@e.com', phone: '+55' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@e.com', specialty: 'GP' },
};

describe('POST /api/scheduling/waiting-list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds patient to waiting list (201)', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockClinician);
    (prisma.waitingList.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.waitingList.create as jest.Mock).mockResolvedValue(mockEntry);
    (prisma.waitingList.count as jest.Mock).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/scheduling/waiting-list', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.queuePosition).toBe(1);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scheduling/waiting-list', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Patient not found');
  });

  it('returns 404 when clinician not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scheduling/waiting-list', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Clinician not found');
  });

  it('returns 409 when duplicate waiting list entry', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockClinician);
    (prisma.waitingList.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-wl' });

    const request = new NextRequest('http://localhost:3000/api/scheduling/waiting-list', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('DUPLICATE');
  });
});

describe('GET /api/scheduling/waiting-list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns waiting list with stats (200)', async () => {
    (prisma.waitingList.findMany as jest.Mock).mockResolvedValue([mockEntry]);

    const request = new NextRequest('http://localhost:3000/api/scheduling/waiting-list');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stats).toBeDefined();
    expect(data.count).toBe(1);
  });
});
