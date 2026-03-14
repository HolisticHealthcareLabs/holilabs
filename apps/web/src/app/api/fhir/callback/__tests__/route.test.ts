import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

jest.mock('@/lib/fhir/smart-client', () => ({
  getSmartConfiguration: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  createLaunchContext: jest.fn(),
  encodeSmartSession: jest.fn().mockReturnValue('encoded-session'),
}));

const { GET } = require('../route');
const { getSmartConfiguration, exchangeCodeForToken, createLaunchContext } = require('@/lib/fhir/smart-client');
const { cookies } = require('next/headers');

describe('GET /api/fhir/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMART_CLIENT_ID = 'test-client-id';
    process.env.SMART_REDIRECT_URI = 'http://localhost:3000/api/fhir/callback';
  });

  afterEach(() => {
    delete process.env.SMART_CLIENT_ID;
    delete process.env.SMART_REDIRECT_URI;
  });

  it('returns 400 when code param is missing', async () => {
    const mockCookieStore = { get: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const req = new NextRequest('http://localhost:3000/api/fhir/callback?state=some-state');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_request');
  });

  it('returns 400 when state param is missing', async () => {
    const mockCookieStore = { get: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const req = new NextRequest('http://localhost:3000/api/fhir/callback?code=auth-code-123');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_request');
  });

  it('returns 400 when state does not match stored cookie', async () => {
    const mockCookieStore = {
      get: jest.fn().mockImplementation((name: string) => {
        if (name === 'smart_state') return { value: 'expected-state' };
        if (name === 'smart_iss') return { value: 'https://fhir.example.com' };
        return null;
      }),
      set: jest.fn(),
      delete: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const req = new NextRequest('http://localhost:3000/api/fhir/callback?code=abc&state=wrong-state');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error_description).toContain('State mismatch');
  });

  it('redirects to error page when OAuth error param is present', async () => {
    const mockCookieStore = { get: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const req = new NextRequest('http://localhost:3000/api/fhir/callback?error=access_denied&error_description=User+denied');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/auth/error');
  });
});
