import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mcp/workflows/prevention-workflow', () => ({
  preventionScreeningWorkflow: { id: 'prevention-screening', name: 'Prevention', description: '', category: 'clinical', version: '1.0', steps: [] },
}));

jest.mock('@/lib/mcp/workflows/cds-workflow', () => ({
  clinicalDecisionWorkflow: { id: 'clinical-decision-support', name: 'CDS', description: '', category: 'clinical', version: '1.0', steps: [] },
}));

jest.mock('@/lib/mcp/workflows/billing-check-workflow', () => ({
  billingPreCheckWorkflow: { id: 'billing-pre-check', name: 'Billing', description: '', category: 'billing', version: '1.0', steps: [] },
}));

const { auth } = require('@/lib/auth/auth');
const { POST, GET } = require('../route');

beforeEach(() => {
  jest.clearAllMocks();
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ success: true, data: 'result' }),
  } as any);
});

describe('POST /api/agent/orchestrate', () => {
  it('executes tools in parallel and returns aggregated results', async () => {
    const req = new NextRequest('http://localhost:3000/api/agent/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        tools: [
          { tool: 'get-patient', arguments: { id: 'p1' } },
          { tool: 'check-vitals', arguments: { patientId: 'p1' } },
        ],
        mode: 'parallel',
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.totalTools).toBe(2);
    expect(json.mode).toBe('parallel');
    expect(json.metrics).toBeDefined();
    expect(json.results).toHaveLength(2);
  });

  it('returns 400 when tools array is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/agent/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ tools: [] }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/tools array/i);
  });

  it('returns 400 when a tool is missing its name', async () => {
    const req = new NextRequest('http://localhost:3000/api/agent/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ tools: [{ arguments: {} }] }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing required 'tool' field/i);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/agent/orchestrate', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid json/i);
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/agent/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ tools: [{ tool: 'test', arguments: {} }] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/agent/orchestrate', () => {
  it('returns orchestration capabilities', async () => {
    const req = new NextRequest('http://localhost:3000/api/agent/orchestrate');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.modes).toContain('parallel');
    expect(json.modes).toContain('sequential');
    expect(json.defaultTimeout).toBeDefined();
  });
});
