/**
 * Tests for GET/POST /api/agent
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/security/require-secret', () => ({
  requireSecret: jest.fn(),
}));

// Mock global fetch for internal forwarding
global.fetch = jest.fn();

const { GET, POST } = require('../route');
const { requireSecret } = require('@/lib/security/require-secret');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  (requireSecret as jest.Mock).mockReturnValue('test-secret-32-chars-long-enough');
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ success: true, data: [] }),
  });
});

describe('GET /api/agent', () => {
  it('returns list of available tools', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.tools)).toBe(true);
    expect(data.tools.length).toBeGreaterThan(0);
    expect(data.tools[0]).toHaveProperty('name');
    expect(data.tools[0]).toHaveProperty('method');
    expect(data.tools[0]).toHaveProperty('path');
  });

  it('includes known tools like list-patients and list-appointments', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent');
    const response = await GET(request, mockContext);
    const data = await response.json();

    const names = data.tools.map((t: any) => t.name);
    expect(names).toContain('list-patients');
    expect(names).toContain('list-appointments');
  });
});

describe('POST /api/agent', () => {
  it('returns 400 when tool name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent', {
      method: 'POST',
      body: JSON.stringify({ arguments: {} }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/tool/i);
  });

  it('returns 400 for unknown tool', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent', {
      method: 'POST',
      body: JSON.stringify({ tool: 'non-existent-tool' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/unknown tool/i);
    expect(Array.isArray(data.availableTools)).toBe(true);
  });

  it('forwards a known tool call and returns wrapped response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [{ id: 'p-1' }] }),
    });

    const request = new NextRequest('http://localhost:3000/api/agent', {
      method: 'POST',
      body: JSON.stringify({ tool: 'list-patients', arguments: {} }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tool).toBe('list-patients');
    expect(data.success).toBe(true);
  });

  it('returns 400 for invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent', {
      method: 'POST',
      body: 'not-valid-json',
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
