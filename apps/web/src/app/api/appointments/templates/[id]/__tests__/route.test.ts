/**
 * Tests for GET/PATCH/DELETE /api/appointments/templates/[id]
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notificationTemplate: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  params: { id: 'tpl-1' },
};

const mockTemplate = {
  id: 'tpl-1',
  name: 'Appointment Reminder',
  type: 'REMINDER',
  channel: 'WHATSAPP',
  isDefault: false,
  isActive: true,
  doctor: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
};

describe('GET /api/appointments/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns template by ID (200)', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost:3000/api/appointments/templates/tpl-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.template.id).toBe('tpl-1');
  });

  it('returns 400 when template ID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/templates/');
    const response = await GET(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 404 when template not found', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/templates/nonexistent');
    const response = await GET(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});

describe('PATCH /api/appointments/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates template (200)', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.notificationTemplate.update as jest.Mock).mockResolvedValue({
      ...mockTemplate,
      name: 'Updated Reminder',
      doctor: mockTemplate.doctor,
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const request = new NextRequest('http://localhost:3000/api/appointments/templates/tpl-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Reminder' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when template not found', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/templates/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const response = await PATCH(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});

describe('DELETE /api/appointments/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes template (200)', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.notificationTemplate.delete as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const request = new NextRequest('http://localhost:3000/api/appointments/templates/tpl-1', { method: 'DELETE' });
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when template not found', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/appointments/templates/nonexistent', { method: 'DELETE' });
    const response = await DELETE(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 400 when trying to delete default template', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue({ ...mockTemplate, isDefault: true });

    const request = new NextRequest('http://localhost:3000/api/appointments/templates/tpl-1', { method: 'DELETE' });
    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('default');
  });
});
