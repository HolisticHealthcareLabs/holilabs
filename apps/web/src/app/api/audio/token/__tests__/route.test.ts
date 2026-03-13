/**
 * Tests for GET /api/audio/token
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

const { GET } = require('../route');
const { auth } = require('@/lib/auth');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DEEPGRAM_API_KEY = 'test-deepgram-key';
  (auth as jest.Mock).mockResolvedValue({ user: { id: 'clinician-1' } });
});

afterEach(() => {
  delete process.env.DEEPGRAM_API_KEY;
});

describe('GET /api/audio/token', () => {
  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/audio/token');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 500 when DEEPGRAM_API_KEY is not configured', async () => {
    delete process.env.DEEPGRAM_API_KEY;

    const request = new NextRequest('http://localhost:3000/api/audio/token');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/DEEPGRAM_API_KEY/i);
  });

  it('returns token and model config when authenticated and key is set', async () => {
    const request = new NextRequest('http://localhost:3000/api/audio/token');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe('test-deepgram-key');
    expect(data.model).toBe('nova-2-medical');
    expect(data.language).toBe('en');
  });
});
