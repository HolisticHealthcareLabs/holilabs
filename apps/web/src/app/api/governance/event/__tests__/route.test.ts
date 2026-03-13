import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/governance/governance.service', () => ({
  governance: {
    logOverride: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/socket-server', () => ({
  emitGovernanceLogEvent: jest.fn(),
  emitGovernanceOverrideEvent: jest.fn(),
  emitGovernanceBlockedEvent: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('@/lib/governance/shared-types', () => ({
  validateGovernanceEventRequest: jest.fn(),
}));

const { POST } = require('../route');
const { validateGovernanceEventRequest } = require('@/lib/governance/shared-types');
const { governance } = require('@/lib/governance/governance.service');
const { emitGovernanceOverrideEvent, emitGovernanceBlockedEvent, emitGovernanceLogEvent } = require('@/lib/socket-server');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
};

describe('POST /api/governance/event', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes OVERRIDE event', async () => {
    (validateGovernanceEventRequest as jest.Mock).mockReturnValue({
      success: true,
      data: {
        type: 'OVERRIDE',
        sessionId: 'session-1',
        ruleId: 'rule-1',
        reason: 'Clinical judgment',
        userId: 'clinician-1',
        userName: 'Dr. Smith',
        clinicId: 'clinic-1',
      },
    });

    const request = new NextRequest('http://localhost:3000/api/governance/event', {
      method: 'POST',
      body: JSON.stringify({
        type: 'OVERRIDE',
        sessionId: 'session-1',
        ruleId: 'rule-1',
        reason: 'Clinical judgment',
        userId: 'clinician-1',
        userName: 'Dr. Smith',
        clinicId: 'clinic-1',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Override Logged');
    expect(governance.logOverride).toHaveBeenCalled();
    expect(emitGovernanceOverrideEvent).toHaveBeenCalled();
    expect(emitGovernanceLogEvent).toHaveBeenCalled();
  });

  it('processes BLOCKED event', async () => {
    (validateGovernanceEventRequest as jest.Mock).mockReturnValue({
      success: true,
      data: {
        type: 'BLOCKED',
        sessionId: 'session-1',
        ruleId: 'rule-2',
        ruleName: 'Drug Interaction',
        severity: 'HARD_BLOCK',
        description: 'Contraindicated combination',
        clinicId: 'clinic-1',
        userId: 'clinician-1',
      },
    });

    const request = new NextRequest('http://localhost:3000/api/governance/event', {
      method: 'POST',
      body: JSON.stringify({ type: 'BLOCKED' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Block event broadcast');
    expect(emitGovernanceBlockedEvent).toHaveBeenCalled();
  });

  it('processes IMPRESSION event', async () => {
    (validateGovernanceEventRequest as jest.Mock).mockReturnValue({
      success: true,
      data: { type: 'IMPRESSION' },
    });

    const request = new NextRequest('http://localhost:3000/api/governance/event', {
      method: 'POST',
      body: JSON.stringify({ type: 'IMPRESSION' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tracked).toBe(true);
  });

  it('rejects invalid payload', async () => {
    (validateGovernanceEventRequest as jest.Mock).mockReturnValue({
      success: false,
      errors: [{ field: 'type', message: 'Unknown governance event type' }],
    });

    const request = new NextRequest('http://localhost:3000/api/governance/event', {
      method: 'POST',
      body: JSON.stringify({ type: 'INVALID' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid governance event payload');
    expect(data.details).toBeDefined();
  });

  it('returns 400 for unknown event type after validation', async () => {
    (validateGovernanceEventRequest as jest.Mock).mockReturnValue({
      success: true,
      data: { type: 'UNKNOWN_TYPE' },
    });

    const request = new NextRequest('http://localhost:3000/api/governance/event', {
      method: 'POST',
      body: JSON.stringify({ type: 'UNKNOWN_TYPE' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Unknown event type');
  });
});
