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
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { GET, POST } = require('../route');
const prisma = require('@/lib/prisma').default;

const mockContext = {
  user: { id: 'user-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockTemplate = {
  id: 'tpl-1',
  name: 'SOAP Note',
  category: 'PROGRESS_NOTE',
  content: 'S: {{chief_complaint}}',
  isPublic: true,
  createdById: 'user-1',
  useCount: 5,
  isOfficial: false,
  favorites: [],
  createdBy: { id: 'user-1', firstName: 'Dr', lastName: 'Test' },
};

describe('GET /api/templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns templates list with success', async () => {
    prisma.clinicalTemplate.findMany.mockResolvedValue([mockTemplate]);
    const req = new NextRequest('http://localhost:3000/api/templates');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
  });

  it('returns empty array when no templates match', async () => {
    prisma.clinicalTemplate.findMany.mockResolvedValue([]);
    const req = new NextRequest('http://localhost:3000/api/templates');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.count).toBe(0);
  });

  it('returns 500 on database error', async () => {
    prisma.clinicalTemplate.findMany.mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost:3000/api/templates');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(500);
  });
});

describe('POST /api/templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates template and returns 201', async () => {
    prisma.clinicalTemplate.findUnique.mockResolvedValue(null);
    prisma.clinicalTemplate.create.mockResolvedValue({ ...mockTemplate, createdBy: { id: 'user-1', firstName: 'Dr', lastName: 'Test' } });
    const req = new NextRequest('http://localhost:3000/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'SOAP Note', category: 'PROGRESS_NOTE', content: 'S: complaint' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when shortcut is already in use', async () => {
    prisma.clinicalTemplate.findUnique.mockResolvedValue({ id: 'existing', shortcut: '.soap' });
    const req = new NextRequest('http://localhost:3000/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', category: 'PROGRESS_NOTE', content: 'content', shortcut: '.soap' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Shortcut already in use');
  });
});
