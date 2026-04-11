/**
 * Tests for GET /api/appointments/[id]/export-calendar
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn() },
  },
}));

const mockGenerateICS = jest.fn().mockReturnValue('BEGIN:VCALENDAR\nEND:VCALENDAR');
const mockGenerateFilename = jest.fn().mockReturnValue('appointment-2025-06-15.ics');

jest.mock('@/lib/calendar/ics-generator', () => ({
  generateAppointmentICS: (...args: any[]) => mockGenerateICS(...args),
  generateICSFilename: (...args: any[]) => mockGenerateFilename(...args),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'apt-1' },
};

const mockAppointment = {
  id: 'apt-1',
  startTime: new Date('2025-06-15T10:00:00Z'),
  endTime: new Date('2025-06-15T10:30:00Z'),
  description: 'Routine checkup',
  type: 'IN_PERSON',
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
};

describe('GET /api/appointments/[id]/export-calendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateICS.mockReturnValue('BEGIN:VCALENDAR\nEND:VCALENDAR');
    mockGenerateFilename.mockReturnValue('appointment-2025-06-15.ics');
  });

  it('exports appointment as ICS file (200)', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/export-calendar');
    const response = await GET(request, mockContext);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toContain('.ics');
  });

  it('returns 400 when appointment ID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments//export-calendar');
    const response = await GET(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 404 when appointment not found', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/nonexistent/export-calendar');
    const response = await GET(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});
