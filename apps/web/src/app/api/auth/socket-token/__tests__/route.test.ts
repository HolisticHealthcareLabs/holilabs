import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/socket-auth', () => ({
  getUserSessionToken: jest.fn(),
}));

const { GET } = require('../route');
const { auth } = require('@/lib/auth/auth');
const { getUserSessionToken } = require('@/lib/socket-auth');

describe('GET /api/auth/socket-token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns socket token for authenticated user', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u1' } });
    (getUserSessionToken as jest.Mock).mockResolvedValue('socket-jwt-xyz');

    const req = new NextRequest('http://localhost:3000/api/auth/socket-token');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.token).toBe('socket-jwt-xyz');
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/socket-token');
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('returns 500 when token minting fails', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u1' } });
    (getUserSessionToken as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/socket-token');
    const res = await GET(req);

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to mint socket token');
  });
});
