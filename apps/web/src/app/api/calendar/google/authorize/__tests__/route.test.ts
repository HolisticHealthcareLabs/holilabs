/**
 * GET /api/calendar/google/authorize - Google OAuth initiation tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/calendar/google/authorize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  it('redirects to Google OAuth consent screen', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar/google/authorize');
    const response = await GET(request, mockContext);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
  });

  it('includes client_id in redirect URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar/google/authorize');
    const response = await GET(request, mockContext);

    const location = response.headers.get('location');
    expect(location).toContain('client_id=test-client-id');
  });

  it('passes user ID as state parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar/google/authorize');
    const response = await GET(request, mockContext);

    const location = response.headers.get('location');
    expect(location).toContain('state=user-1');
  });

  it('requests calendar and events scopes', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar/google/authorize');
    const response = await GET(request, mockContext);

    const location = response.headers.get('location') || '';
    expect(location).toContain('googleapis.com%2Fauth%2Fcalendar');
  });
});
