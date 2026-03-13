import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/enterprise/auth', () => ({
  validateEnterpriseKey: jest.fn(),
}));

jest.mock('@/services/outcome-tracker.service', () => ({
  outcomeTrackerService: {
    recordOutcome: jest.fn(),
  },
}));

const { POST } = require('../route');
const { validateEnterpriseKey } = require('@/lib/enterprise/auth');
const { outcomeTrackerService } = require('@/services/outcome-tracker.service');

describe('POST /api/enterprise/outcomes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
  });

  it('records a patient outcome', async () => {
    (outcomeTrackerService.recordOutcome as jest.Mock).mockReturnValue({
      id: 'outcome-1',
      outcomeType: 'RESOLVED',
    });

    const req = new NextRequest('http://localhost:3000/api/enterprise/outcomes', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({
        anonymizedPatientId: 'anon-p1',
        outcomeType: 'RESOLVED',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.__format).toBe('enterprise_outcome_v1');
  });

  it('returns 401 when API key is invalid', async () => {
    const errorResponse = new (require('next/server').NextResponse)(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 },
    );
    (validateEnterpriseKey as jest.Mock).mockReturnValue({
      authorized: false,
      response: errorResponse,
    });

    const req = new NextRequest('http://localhost:3000/api/enterprise/outcomes', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 when anonymizedPatientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/outcomes', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({ outcomeType: 'RESOLVED' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain('anonymizedPatientId');
  });

  it('returns 400 when outcomeType is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/outcomes', {
      method: 'POST',
      headers: { 'x-pharma-partner-key': 'test-key-123' },
      body: JSON.stringify({
        anonymizedPatientId: 'anon-p1',
        outcomeType: 'INVALID_TYPE',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain('outcomeType');
  });
});
