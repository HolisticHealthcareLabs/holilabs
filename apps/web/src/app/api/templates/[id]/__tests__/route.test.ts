import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }), auditView: jest.fn(), auditCreate: jest.fn(), logAudit: jest.fn().mockResolvedValue({ id: 'a1' }) }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    clinicalTemplate: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { GET, PATCH, DELETE } = require('../route');
const prisma = require('@/lib/prisma').default;

const mockContext = {
  user: { id: 'user-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'tpl-1' },
};

const mockTemplate = {
  id: 'tpl-1',
  name: 'SOAP Note',
  category: 'PROGRESS_NOTE',
  content: 'S: complaint',
  isPublic: true,
  createdById: 'user-1',
  useCount: 5,
  shortcut: null,
  favorites: [],
  createdBy: { id: 'user-1', firstName: 'Dr', lastName: 'Test' },
};

describe('GET /api/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns template when found and accessible', async () => {
    prisma.clinicalTemplate.findUnique.mockResolvedValue(mockTemplate);
    const req = new NextRequest('http://localhost:3000/api/templates/tpl-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when template not found', async () => {
    prisma.clinicalTemplate.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/templates/nonexistent');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(404);
  });

  it('returns 403 when template is private and not owned by user', async () => {
    prisma.clinicalTemplate.findUnique.mockResolvedValue({
      ...mockTemplate,
      isPublic: false,
      createdById: 'other-user',
      favorites: [],
    });
    const req = new NextRequest('http://localhost:3000/api/templates/tpl-1');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('increments usage count when action is increment_usage', async () => {
    prisma.clinicalTemplate.update.mockResolvedValue({ ...mockTemplate, useCount: 6 });
    const req = new NextRequest('http://localhost:3000/api/templates/tpl-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'increment_usage' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when template not found for update', async () => {
    prisma.clinicalTemplate.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/templates/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes template when user is the creator', async () => {
    prisma.clinicalTemplate.findUnique.mockResolvedValue(mockTemplate);
    prisma.clinicalTemplate.delete.mockResolvedValue(mockTemplate);
    const req = new NextRequest('http://localhost:3000/api/templates/tpl-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when template not found', async () => {
    prisma.clinicalTemplate.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/templates/bad-id', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    expect(res.status).toBe(404);
  });
});
