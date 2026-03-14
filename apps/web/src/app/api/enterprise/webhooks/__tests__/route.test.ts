import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/enterprise/auth', () => ({
  validateEnterpriseKey: jest.fn(),
}));

jest.mock('@/lib/enterprise/webhook-dispatcher', () => ({
  webhookDispatcher: {
    register: jest.fn(),
    listSubscriptions: jest.fn(),
    deleteSubscription: jest.fn(),
  },
}));

const { POST, GET, DELETE } = require('../route');
const { validateEnterpriseKey } = require('@/lib/enterprise/auth');
const { webhookDispatcher } = require('@/lib/enterprise/webhook-dispatcher');

const makeUnauthorizedResponse = () =>
  new (require('next/server').NextResponse)(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

const mockSubscription = {
  id: 'sub-1',
  url: 'https://example.com/webhook',
  events: ['ASSESSMENT_COMPLETED'],
  secret: 'wh_secret_abc',
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
};

describe('POST /api/enterprise/webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (webhookDispatcher.register as jest.Mock).mockReturnValue(mockSubscription);
  });

  it('registers a webhook subscription', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/webhooks', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'valid-key-12345678', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/webhook', events: ['ASSESSMENT_COMPLETED'] }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.__format).toBe('enterprise_webhook_subscription_v1');
    expect(data.subscription.id).toBe('sub-1');
  });

  it('returns 400 when url is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/webhooks', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'valid-key-12345678', 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: ['ASSESSMENT_COMPLETED'] }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain('url');
  });

  it('returns 400 when events contains invalid event type', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/webhooks', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'valid-key-12345678', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/wh', events: ['INVALID_EVENT'] }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain('Invalid events');
  });

  it('returns 401 when API key is invalid', async () => {
    (validateEnterpriseKey as jest.Mock).mockReturnValue({
      authorized: false,
      response: makeUnauthorizedResponse(),
    });
    const req = new NextRequest('http://localhost:3000/api/enterprise/webhooks', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/enterprise/webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (webhookDispatcher.listSubscriptions as jest.Mock).mockReturnValue([mockSubscription]);
  });

  it('returns list of webhook subscriptions', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/webhooks', {
      headers: { 'x-pharma-partner-key': 'valid-key-12345678' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.__format).toBe('enterprise_webhook_list_v1');
    expect(Array.isArray(data.subscriptions)).toBe(true);
  });
});

describe('DELETE /api/enterprise/webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (webhookDispatcher.deleteSubscription as jest.Mock).mockReturnValue(true);
  });

  it('deletes a subscription successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/webhooks', {
      method: 'DELETE',
      headers: { 'x-pharma-partner-key': 'valid-key-12345678', 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: 'sub-1' }),
    });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when subscription not found', async () => {
    (webhookDispatcher.deleteSubscription as jest.Mock).mockReturnValue(false);
    const req = new NextRequest('http://localhost:3000/api/enterprise/webhooks', {
      method: 'DELETE',
      headers: { 'x-pharma-partner-key': 'valid-key-12345678', 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: 'nonexistent' }),
    });
    const res = await DELETE(req);

    expect(res.status).toBe(404);
  });
});
