/**
 * Tests for GET/POST /api/appointments/templates
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notificationTemplate: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
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
};

const mockTemplate = {
  id: 'tpl-1',
  name: 'Appointment Reminder',
  type: 'REMINDER',
  channel: 'WHATSAPP',
  level: 'CLINIC',
  body: 'Hello {{firstName}}, reminder for your appointment.',
  isDefault: true,
  isActive: true,
  doctor: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
};

describe('GET /api/appointments/templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns template list (200)', async () => {
    (prisma.notificationTemplate.findMany as jest.Mock).mockResolvedValue([mockTemplate]);

    const request = new NextRequest('http://localhost:3000/api/appointments/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.templates).toHaveLength(1);
  });

  it('returns empty array when no templates', async () => {
    (prisma.notificationTemplate.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/appointments/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.templates).toHaveLength(0);
  });
});

describe('POST /api/appointments/templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new template (200)', async () => {
    (prisma.notificationTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const request = new NextRequest('http://localhost:3000/api/appointments/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Appointment Reminder',
        type: 'REMINDER',
        channel: 'WHATSAPP',
        body: 'Hello {{firstName}}',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.template.id).toBe('tpl-1');
  });

  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 when doctor-level template has no doctorId', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        type: 'REMINDER',
        channel: 'WHATSAPP',
        body: 'Hello',
        level: 'DOCTOR',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('doctorId');
  });
});
