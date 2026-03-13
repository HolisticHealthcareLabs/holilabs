/**
 * Tests for POST/DELETE /api/appointments/[id]/situations
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn() },
    appointmentSituation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  ),
}));

const { POST, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'apt-1' },
  requestId: 'req-1',
};

const mockAppointment = {
  id: 'apt-1',
  patient: { id: 'patient-1', firstName: 'Maria' },
  clinician: { id: 'clinician-1' },
};

const mockSituation = {
  id: 'sit-1',
  name: 'Urgente',
  color: '#FF0000',
  situation: { id: 'sit-1', name: 'Urgente', color: '#FF0000' },
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
  (prisma.appointmentSituation.findUnique as jest.Mock).mockResolvedValue(null);
});

describe('POST /api/appointments/[id]/situations', () => {
  it('returns 400 when appointment id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments//situations', {
      method: 'POST',
      body: JSON.stringify({ situationId: 'sit-1' }),
    });
    const response = await POST(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/appointment id/i);
  });

  it('returns 400 when situationId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/situations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/validation failed/i);
  });

  it('returns 404 when appointment does not exist', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/situations', {
      method: 'POST',
      body: JSON.stringify({ situationId: 'sit-1' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('adds situation to appointment successfully', async () => {
    (prisma.appointmentSituation.create as jest.Mock).mockResolvedValue(mockSituation);

    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/situations', {
      method: 'POST',
      body: JSON.stringify({ situationId: 'sit-1', notes: 'Dolor intenso' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.appointmentSituation).toBeDefined();
  });
});

describe('DELETE /api/appointments/[id]/situations', () => {
  it('returns 400 when situationId query param is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/apt-1/situations', {
      method: 'DELETE',
    });
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/situationId/i);
  });

  it('returns 404 when appointment does not exist', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/apt-1/situations?situationId=sit-1',
      { method: 'DELETE' }
    );
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it('removes situation from appointment', async () => {
    (prisma.appointmentSituation.delete as jest.Mock).mockResolvedValue({});

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/apt-1/situations?situationId=sit-1',
      { method: 'DELETE' }
    );
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.appointmentSituation.delete).toHaveBeenCalled();
  });
});
