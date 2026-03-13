/**
 * Tests for GET/POST /api/agent/tools
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockTool = {
  name: 'list-patients',
  description: 'List all patients',
  category: 'patients',
  requiredPermissions: ['CLINICIAN'],
  deprecated: false,
  inputSchema: { safeParse: jest.fn().mockReturnValue({ success: true, data: {} }) },
};

jest.mock('@/lib/mcp', () => ({
  getAllRegisteredTools: jest.fn().mockReturnValue([mockTool]),
  getToolsByCategory: jest.fn().mockReturnValue([mockTool]),
  searchTools: jest.fn().mockReturnValue([mockTool]),
}));

const { GET, POST } = require('../route');
const { getAllRegisteredTools, getToolsByCategory, searchTools } = require('@/lib/mcp');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  (getAllRegisteredTools as jest.Mock).mockReturnValue([mockTool]);
  (getToolsByCategory as jest.Mock).mockReturnValue([mockTool]);
  (searchTools as jest.Mock).mockReturnValue([mockTool]);
  mockTool.inputSchema.safeParse.mockReturnValue({ success: true, data: {} });
});

describe('GET /api/agent/tools', () => {
  it('returns all tools when no filter is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent/tools');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
    expect(data.tools[0].name).toBe('list-patients');
  });

  it('filters by category when category param provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent/tools?category=patients');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getToolsByCategory).toHaveBeenCalledWith('patients');
  });

  it('searches tools when q param provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent/tools?q=patient');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(searchTools).toHaveBeenCalledWith('patient');
  });

  it('returns minimal format when format=minimal', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent/tools?format=minimal');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tools[0]).not.toHaveProperty('requiredPermissions');
    expect(data.tools[0]).toHaveProperty('name');
  });
});

describe('POST /api/agent/tools', () => {
  it('returns 400 when tool name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent/tools', {
      method: 'POST',
      body: JSON.stringify({ input: {} }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/tool name/i);
  });

  it('returns 404 when tool does not exist', async () => {
    (getAllRegisteredTools as jest.Mock).mockReturnValue([]);

    const request = new NextRequest('http://localhost:3000/api/agent/tools', {
      method: 'POST',
      body: JSON.stringify({ tool: 'non-existent', input: {} }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('validates input and returns success for valid tool', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent/tools', {
      method: 'POST',
      body: JSON.stringify({ tool: 'list-patients', input: {} }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tool.name).toBe('list-patients');
  });

  it('returns 400 when input validation fails', async () => {
    mockTool.inputSchema.safeParse.mockReturnValue({
      success: false,
      error: { errors: [{ path: ['field'], message: 'required' }] },
    });

    const request = new NextRequest('http://localhost:3000/api/agent/tools', {
      method: 'POST',
      body: JSON.stringify({ tool: 'list-patients', input: {} }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.validationErrors).toBeDefined();
  });
});
