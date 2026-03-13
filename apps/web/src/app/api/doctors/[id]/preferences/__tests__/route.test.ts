/**
 * Doctor Preferences API Route Tests
 *
 * GET   /api/doctors/[id]/preferences - Get doctor scheduling preferences
 * PATCH /api/doctors/[id]/preferences - Update doctor preferences
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    doctorPreferences: { findUnique: jest.fn(), upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

const { GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'clinician-1' },
};

describe('GET /api/doctors/[id]/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns saved preferences for a valid clinician', async () => {
    const mockPrefs = {
      id: 'pref-1',
      doctorId: 'clinician-1',
      workingDays: [1, 2, 3, 4, 5],
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      appointmentDuration: 30,
      doctor: { id: 'clinician-1', firstName: 'Ana', lastName: 'Garcia', email: 'dr@holilabs.com' },
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'clinician-1', role: 'CLINICIAN' });
    (prisma.doctorPreferences.findUnique as jest.Mock).mockResolvedValue(mockPrefs);

    const request = new NextRequest('http://localhost:3000/api/doctors/clinician-1/preferences');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.preferences.doctorId).toBe('clinician-1');
    expect(data.data.preferences.workingHoursStart).toBe('08:00');
  });

  it('returns default preferences when none saved', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'clinician-1', role: 'CLINICIAN' });
    (prisma.doctorPreferences.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/doctors/clinician-1/preferences');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.preferences.workingHoursStart).toBe('09:00');
    expect(data.message).toContain('default preferences');
  });

  it('returns 404 when doctor not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/doctors/nonexistent/preferences');
    const response = await GET(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Doctor not found');
  });

  it('returns 400 when user is not a clinician', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1', role: 'PATIENT' });

    const request = new NextRequest('http://localhost:3000/api/doctors/patient-1/preferences');
    const response = await GET(request, { ...mockContext, params: { id: 'patient-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('User is not a clinician');
  });
});

describe('PATCH /api/doctors/[id]/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates preferences for own doctor', async () => {
    const mockUpdated = {
      id: 'pref-1',
      doctorId: 'clinician-1',
      workingHoursStart: '07:00',
      workingHoursEnd: '15:00',
      doctor: { id: 'clinician-1', firstName: 'Ana', lastName: 'Garcia', email: 'dr@holilabs.com' },
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'clinician-1', role: 'CLINICIAN' });
    (prisma.doctorPreferences.upsert as jest.Mock).mockResolvedValue(mockUpdated);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const request = new NextRequest('http://localhost:3000/api/doctors/clinician-1/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ workingHoursStart: '07:00', workingHoursEnd: '15:00' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('updated successfully');
    expect(prisma.doctorPreferences.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('returns 403 when non-admin updates another doctor', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'clinician-2', role: 'CLINICIAN' });

    const request = new NextRequest('http://localhost:3000/api/doctors/clinician-2/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ workingHoursStart: '07:00' }),
    });
    const response = await PATCH(request, { ...mockContext, params: { id: 'clinician-2' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('returns 400 when workingDays is not an array', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'clinician-1', role: 'CLINICIAN' });

    const request = new NextRequest('http://localhost:3000/api/doctors/clinician-1/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ workingDays: 'monday' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('workingDays must be an array');
  });
});
