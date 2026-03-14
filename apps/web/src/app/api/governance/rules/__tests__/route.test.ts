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
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/governance/governance.rules', () => ({
  FAST_LANE_RULES: [
    {
      ruleId: 'static-rule-1',
      name: 'Static Rule One',
      severity: 'HARD_BLOCK',
      logic: { '===': [1, 1] },
      intervention: { message: 'This is a message', recommendation: 'This is a recommendation' },
    },
  ],
}));

jest.mock('json-logic-js', () => ({
  apply: jest.fn().mockReturnValue(true),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: {},
};

const mockDbRule = {
  id: 'rule-db-1',
  ruleId: 'CUSTOM-RULE-001',
  name: 'Custom Rule One',
  severity: 'SOFT_NUDGE',
  isActive: true,
  priority: 100,
};

describe('GET /api/governance/rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.governanceRule.findMany as jest.Mock).mockResolvedValue([mockDbRule]);
  });

  it('returns combined static and database rules', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.rules.length).toBeGreaterThan(0);
    expect(data.data.meta.staticRules).toBe(1);
    expect(data.data.meta.dbRules).toBe(1);
  });

  it('excludes static rules when includeStatic=false', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules?includeStatic=false');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.meta.staticRules).toBe(0);
  });

  it('filters by severity when provided', async () => {
    (prisma.governanceRule.findMany as jest.Mock).mockResolvedValue([]);
    const req = new NextRequest('http://localhost:3000/api/governance/rules?severity=HARD_BLOCK');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.governanceRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ severity: 'HARD_BLOCK' }) })
    );
  });
});

describe('POST /api/governance/rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.governanceRule.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.governanceRule.create as jest.Mock).mockResolvedValue({ ...mockDbRule, id: 'rule-new' });
  });

  it('creates a new governance rule', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleId: 'CUSTOM-RULE-002',
        name: 'New Custom Rule',
        severity: 'SOFT_NUDGE',
        logic: { '===': [1, 1] },
        intervention: {
          message: 'This is a clinical message',
          recommendation: 'This is a clinical recommendation',
        },
        isActive: true,
        priority: 100,
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('returns 409 when ruleId already exists', async () => {
    (prisma.governanceRule.findUnique as jest.Mock).mockResolvedValue(mockDbRule);
    const req = new NextRequest('http://localhost:3000/api/governance/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleId: 'CUSTOM-RULE-001',
        name: 'Duplicate Rule',
        severity: 'SOFT_NUDGE',
        logic: { '===': [1, 1] },
        intervention: { message: 'Some message here', recommendation: 'Some recommendation here' },
        isActive: true,
        priority: 100,
      }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(409);
  });

  it('returns 400 when body fails Zod validation', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId: '', name: 'x' }), // too short name, invalid ruleId
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(400);
  });
});
