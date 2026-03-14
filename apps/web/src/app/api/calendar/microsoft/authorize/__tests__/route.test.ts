import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

const { GET } = require('../route');

const ctx = { user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' } };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MICROSOFT_CLIENT_ID = 'test-client-id';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
});

describe('GET /api/calendar/microsoft/authorize', () => {
  it('redirects to Microsoft OAuth consent screen', async () => {
    const req = new NextRequest('http://localhost:3000/api/calendar/microsoft/authorize');
    const res = await GET(req, ctx);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('login.microsoftonline.com');
    expect(location).toContain('oauth2/v2.0/authorize');
  });

  it('includes the correct OAuth scopes', async () => {
    const req = new NextRequest('http://localhost:3000/api/calendar/microsoft/authorize');
    const res = await GET(req, ctx);

    const location = res.headers.get('location') || '';
    expect(location).toContain('Calendars.ReadWrite');
    expect(location).toContain('User.Read');
    expect(location).toContain('offline_access');
  });

  it('passes user ID as the OAuth state parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/calendar/microsoft/authorize');
    const res = await GET(req, ctx);

    const location = res.headers.get('location') || '';
    expect(location).toContain(`state=${ctx.user.id}`);
  });

  it('includes the client ID in the redirect URL', async () => {
    const req = new NextRequest('http://localhost:3000/api/calendar/microsoft/authorize');
    const res = await GET(req, ctx);

    const location = res.headers.get('location') || '';
    expect(location).toContain('client_id=test-client-id');
  });
});
