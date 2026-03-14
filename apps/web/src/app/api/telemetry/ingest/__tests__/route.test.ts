import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/security/require-secret', () => ({
  requireSecret: jest.fn().mockReturnValue('test-secret-key'),
}));

import crypto from 'crypto';

function makeValidSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

const SECRET = 'test-secret-key';

describe('POST /api/telemetry/ingest', () => {
  const { POST } = require('../route');

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when security headers are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/telemetry/ingest', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Missing security headers');
  });

  it('returns 403 when signature is invalid', async () => {
    const body = JSON.stringify({ events: [] });
    const req = new NextRequest('http://localhost:3000/api/telemetry/ingest', {
      method: 'POST',
      headers: {
        'X-Signature': 'invalidsignature',
        'X-Node-ID': 'fog-node-1',
      },
      body,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('Invalid signature');
  });

  it('processes events and returns command-and-control response', async () => {
    const body = JSON.stringify({
      events: [
        { type: 'METRIC', value: 0.85, timestamp: Date.now() },
        { type: 'LOG', message: 'Inference completed', timestamp: Date.now() },
      ],
    });
    const signature = makeValidSignature(body, SECRET);

    const req = new NextRequest('http://localhost:3000/api/telemetry/ingest', {
      method: 'POST',
      headers: {
        'X-Signature': signature,
        'X-Node-ID': 'fog-node-1',
      },
      body,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.received).toBe(2);
    expect(data.killSwitch).toBe(false);
    expect(data.logLevel).toBe('info');
  });

  it('handles empty events array', async () => {
    const body = JSON.stringify({ events: [] });
    const signature = makeValidSignature(body, SECRET);

    const req = new NextRequest('http://localhost:3000/api/telemetry/ingest', {
      method: 'POST',
      headers: {
        'X-Signature': signature,
        'X-Node-ID': 'fog-node-1',
      },
      body,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.received).toBe(0);
  });
});
