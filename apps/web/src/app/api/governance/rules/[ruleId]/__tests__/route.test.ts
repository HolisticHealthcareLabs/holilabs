import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    governanceRule: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/governance/governance.rules', () => ({
  FAST_LANE_RULES: [
    {
      ruleId: 'STATIC-RULE-001',
      name: 'Static Rule',
      severity: 'HARD_BLOCK',
      logic: { '===': [1, 1] },
      intervention: { message: 'Static message', recommendation: 'Static recommendation' },
    },
  ],
}));

jest.mock('json-logic-js', () => ({
  apply: jest.fn().mockReturnValue(true),
}));

const { GET, PUT, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = (ruleId: string) => ({
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { ruleId },
});

const mockDbRule = {
  id: 'rule-db-1',
  ruleId: 'CUSTOM-RULE-001',
  name: 'Custom Rule',
  severity: 'SOFT_NUDGE',
  isActive: true,
  priority: 100,
};

describe('GET /api/governance/rules/[ruleId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns static rule when ruleId matches a static rule', async () => {
    (prisma.governanceRule.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/governance/rules/STATIC-RULE-001');
    const res = await GET(req, mockContext('STATIC-RULE-001'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.editable).toBe(false);
    expect(data.data.source).toBe('static');
  });

  it('returns database rule when ruleId matches a db rule', async () => {
    (prisma.governanceRule.findUnique as jest.Mock).mockResolvedValue(mockDbRule);
    const req = new NextRequest('http://localhost:3000/api/governance/rules/CUSTOM-RULE-001');
    const res = await GET(req, mockContext('CUSTOM-RULE-001'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.editable).toBe(true);
    expect(data.data.source).toBe('database');
  });

  it('returns 404 when rule not found', async () => {
    (prisma.governanceRule.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/governance/rules/NONEXISTENT');
    const res = await GET(req, mockContext('NONEXISTENT'));

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/governance/rules/[ruleId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.governanceRule.update as jest.Mock).mockResolvedValue({ ...mockDbRule, name: 'Updated Rule' });
  });

  it('returns 403 when trying to edit a static rule', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules/STATIC-RULE-001', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Attempt Override' }),
    });
    const res = await PUT(req, mockContext('STATIC-RULE-001'));

    expect(res.status).toBe(403);
  });

  it('updates a database rule successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules/CUSTOM-RULE-001', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Rule Name Here' }),
    });
    const res = await PUT(req, mockContext('CUSTOM-RULE-001'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('DELETE /api/governance/rules/[ruleId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.governanceRule.update as jest.Mock).mockResolvedValue(mockDbRule);
    (prisma.governanceRule.delete as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 403 when trying to delete a static rule', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules/STATIC-RULE-001', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext('STATIC-RULE-001'));

    expect(res.status).toBe(403);
  });

  it('soft-deletes by default (deactivates rule)', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules/CUSTOM-RULE-001', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext('CUSTOM-RULE-001'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deactivated');
    expect(prisma.governanceRule.update).toHaveBeenCalled();
    expect(prisma.governanceRule.delete).not.toHaveBeenCalled();
  });

  it('hard-deletes when hard=true query param is passed', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules/CUSTOM-RULE-001?hard=true', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext('CUSTOM-RULE-001'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain('permanently deleted');
    expect(prisma.governanceRule.delete).toHaveBeenCalled();
  });
});
