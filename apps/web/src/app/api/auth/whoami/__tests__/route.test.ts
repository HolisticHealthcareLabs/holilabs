import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));

const { GET } = require('../route');
const { auth } = require('@/lib/auth/auth');

describe('GET /api/auth/whoami', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns session when authenticated', async () => {
    const mockSession = { user: { id: 'u1', email: 'doc@test.com', role: 'CLINICIAN' } };
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const req = new NextRequest('http://localhost:3000/api/auth/whoami');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.session.user.id).toBe('u1');
  });

  it('returns null session when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/whoami');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.session).toBeNull();
  });

  it('calls auth() exactly once per request', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/whoami');
    await GET(req);

    expect(auth).toHaveBeenCalledTimes(1);
  });
});
