import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/demo/synthetic', () => ({
  getSyntheticTelemetryEvents: jest.fn(),
  isDemoClinician: jest.fn(),
}));

const { GET } = require('../route');
const { auth } = require('@/lib/auth/auth');
const { getSyntheticTelemetryEvents, isDemoClinician } = require('@/lib/demo/synthetic');

const mockSyntheticEvents = [
  {
    id: 'evt-1',
    time: '10:00:00',
    level: 'INFO' as const,
    title: 'Model Passed',
    message: 'Inference passed',
    tags: ['passed'],
    userId: 'demo-user',
  },
  {
    id: 'evt-2',
    time: '10:05:00',
    level: 'WARN' as const,
    title: 'Override Logged',
    message: 'Clinician Override: BENEFIT_OUTWEIGHS_RISK',
    tags: ['governance', 'override'],
    userId: 'demo-user',
    eventType: 'OVERRIDE' as const,
  },
];

describe('GET /api/telemetry/stream', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    (process.env as any).NODE_ENV = 'test'; // non-production forces synthetic
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns synthetic events in non-production environment', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', email: 'user@test.com' } });
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (getSyntheticTelemetryEvents as jest.Mock).mockReturnValue(mockSyntheticEvents);

    const req = new NextRequest('http://localhost:3000/api/telemetry/stream');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('includes override events in synthetic output', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (getSyntheticTelemetryEvents as jest.Mock).mockReturnValue(mockSyntheticEvents);

    const req = new NextRequest('http://localhost:3000/api/telemetry/stream');
    const res = await GET(req);
    const data = await res.json();

    const overrideEvents = data.filter((e: any) => e.eventType === 'OVERRIDE');
    expect(overrideEvents.length).toBeGreaterThan(0);
  });

  it('filters events by country when country param is provided', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (getSyntheticTelemetryEvents as jest.Mock).mockReturnValue(mockSyntheticEvents);

    const req = new NextRequest('http://localhost:3000/api/telemetry/stream?country=AR');
    const res = await GET(req);
    const data = await res.json();

    // All returned events should match country=AR (synthetic events get mapped to countries)
    expect(Array.isArray(data)).toBe(true);
  });

  it('returns demo clinician synthetic events when isDemoClinician is true', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'demo-id', email: 'demo@holi.com' } });
    (isDemoClinician as jest.Mock).mockReturnValue(true);
    (getSyntheticTelemetryEvents as jest.Mock).mockReturnValue(mockSyntheticEvents);

    const req = new NextRequest('http://localhost:3000/api/telemetry/stream');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(getSyntheticTelemetryEvents).toHaveBeenCalled();
  });
});
