/**
 * Send Form API Route Tests
 *
 * POST /api/forms/send - Send a form to a patient
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    formTemplate: { findUnique: jest.fn(), update: jest.fn() },
    formInstance: { create: jest.fn() },
    formAuditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/email', () => ({
  sendFormNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/forms/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends a form to a patient successfully', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      firstName: 'Maria',
      lastName: 'Lopez',
      email: 'maria@test.com',
    });
    (prisma.formTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 'tpl-1',
      title: 'Intake Form',
      structure: {},
    });
    (prisma.formInstance.create as jest.Mock).mockResolvedValue({
      id: 'fi-1',
      patientId: 'patient-1',
      templateId: 'tpl-1',
      status: 'PENDING',
    });
    (prisma.formTemplate.update as jest.Mock).mockResolvedValue({});
    (prisma.formAuditLog.create as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/forms/send', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', templateId: 'tpl-1' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.formInstanceId).toBe('fi-1');
    expect(data.accessToken).toBeDefined();
    expect(data.publicUrl).toContain('/portal/forms/');
    expect(prisma.formInstance.create).toHaveBeenCalled();
    expect(prisma.formAuditLog.create).toHaveBeenCalled();
  });

  it('returns 400 when patientId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/forms/send', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'tpl-1' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
    expect(prisma.formInstance.create).not.toHaveBeenCalled();
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/forms/send', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'nonexistent', templateId: 'tpl-1' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });

  it('returns 404 when template not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      firstName: 'Maria',
      lastName: 'Lopez',
      email: 'maria@test.com',
    });
    (prisma.formTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/forms/send', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', templateId: 'nonexistent' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Form template not found');
  });
});
