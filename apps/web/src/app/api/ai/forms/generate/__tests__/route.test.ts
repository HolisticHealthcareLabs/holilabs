/**
 * Tests for POST /api/ai/forms/generate
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

const { POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: '¿Qué tipo de formulario necesitas?' }],
  });
});

describe('POST /api/ai/forms/generate', () => {
  it('returns 400 when messages array is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/forms/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/messages/i);
  });

  it('returns 400 when messages is not an array', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/forms/generate', {
      method: 'POST',
      body: JSON.stringify({ messages: 'not-an-array' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/messages/i);
  });

  it('returns AI response for valid message list', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/forms/generate', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Necesito un formulario de consentimiento' }],
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
    expect(data.generatedForm).toBeNull();
  });

  it('parses and returns generated form when FORM_JSON marker is present', async () => {
    const formJson = {
      title: 'Consentimiento Informado',
      description: 'Test',
      category: 'CONSENT',
      fields: [{ id: 'field_1', type: 'text', label: 'Nombre', required: true }],
    };

    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: `Aquí está el formulario.\n\nFORM_JSON:\n${JSON.stringify(formJson)}`,
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/forms/generate', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'quiero un formulario de consentimiento con nombre y firma' },
        ],
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generatedForm).not.toBeNull();
    expect(data.generatedForm.title).toBe('Consentimiento Informado');
    expect(data.generatedForm.fields).toHaveLength(1);
  });
});
