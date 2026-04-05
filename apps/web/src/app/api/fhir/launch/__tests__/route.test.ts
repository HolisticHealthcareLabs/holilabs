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
  buildAuthorizationUrl: jest.fn().mockReturnValue('https://fhir.example.com/auth?client_id=test'),
  generateStateToken: jest.fn().mockReturnValue('csrf-state-token'),
}));

const { GET } = require('../route');
const { getSmartConfiguration, buildAuthorizationUrl, generateStateToken } = require('@/lib/fhir/smart-client');
const { cookies } = require('next/headers');

describe('GET /api/fhir/launch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMART_CLIENT_ID = 'test-client-id';
    process.env.SMART_REDIRECT_URI = 'http://localhost:3000/api/fhir/callback';
    (getSmartConfiguration as jest.Mock).mockResolvedValue({
      authorization_endpoint: 'https://fhir.example.com/auth',
      token_endpoint: 'https://fhir.example.com/token',
    });
    (buildAuthorizationUrl as jest.Mock).mockReturnValue('https://fhir.example.com/auth?client_id=test');
    (generateStateToken as jest.Mock).mockReturnValue('csrf-state-token');
    (cookies as jest.Mock).mockResolvedValue({ set: jest.fn(), get: jest.fn(), delete: jest.fn() });
  });

  afterEach(() => {
    delete process.env.SMART_CLIENT_ID;
    delete process.env.SMART_REDIRECT_URI;
  });

  it('returns 400 when iss param is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/fhir/launch');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('missing_parameter');
  });

  it('returns 500 when iss is not a valid URL (throws in pre-validation logging)', async () => {
    const req = new NextRequest('http://localhost:3000/api/fhir/launch?iss=not-a-url');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('server_error');
  });

  it('returns 500 when SMART_CLIENT_ID is not configured', async () => {
    delete process.env.SMART_CLIENT_ID;
    const req = new NextRequest('http://localhost:3000/api/fhir/launch?iss=https://fhir.example.com');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('server_error');
  });

  it('redirects to EHR authorization endpoint on valid launch', async () => {
    const req = new NextRequest('http://localhost:3000/api/fhir/launch?iss=https://fhir.example.com&launch=token123');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('fhir.example.com');
  });
});
