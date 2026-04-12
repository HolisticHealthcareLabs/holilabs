/**
 * Idempotency deduplication tests for MCP registry create_* mutations.
 *
 * Verifies that duplicate tool calls with the same idempotency key
 * return cached results instead of re-executing the tool handler.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentIdempotencyLog: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn({})),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../tools/patient.tools', () => ({ patientTools: [] }));
jest.mock('../tools/patient-crud.tools', () => ({ patientCrudTools: [] }));
jest.mock('../tools/governance.tools', () => ({ governanceTools: [] }));
jest.mock('../tools/clinical-note.tools', () => ({ clinicalNoteTools: [] }));
jest.mock('../tools/medication.tools', () => ({ medicationTools: [] }));
jest.mock('../tools/diagnosis.tools', () => ({ diagnosisTools: [] }));
jest.mock('../tools/allergy.tools', () => ({ allergyTools: [] }));
jest.mock('../tools/feature-flag.tools', () => ({ featureFlagTools: [] }));
jest.mock('../tools/messaging.tools', () => ({ messagingTools: [] }));
jest.mock('../tools/prescription.tools', () => ({ prescriptionTools: [] }));
jest.mock('../tools/appointment.tools', () => ({ appointmentTools: [] }));
jest.mock('../tools/lab-order.tools', () => ({ labOrderTools: [] }));
jest.mock('../tools/document.tools', () => ({ documentTools: [] }));
jest.mock('../tools/form.tools', () => ({ formTools: [] }));
jest.mock('../tools/portal.tools', () => ({ portalTools: [] }));
jest.mock('../tools/ai.tools', () => ({ aiTools: [] }));
jest.mock('../tools/consent.tools', () => ({ consentTools: [] }));
jest.mock('../tools/scribe.tools', () => ({ scribeTools: [] }));
jest.mock('../tools/prevention.tools', () => ({ preventionTools: [] }));
jest.mock('../tools/scheduling.tools', () => ({ schedulingTools: [] }));
jest.mock('../tools/notification.tools', () => ({ notificationTools: [] }));
jest.mock('../tools/search.tools', () => ({ searchTools: [] }));
jest.mock('../tools/analytics.tools', () => ({ analyticsTools: [] }));
jest.mock('../tools/clinical-decision.tools', () => ({ clinicalDecisionTools: [] }));
jest.mock('../workflows', () => ({
  getWorkflowTemplates: jest.fn().mockReturnValue([]),
  getWorkflowById: jest.fn(),
  getWorkflowsByCategory: jest.fn().mockReturnValue([]),
  searchWorkflows: jest.fn().mockReturnValue([]),
  getWorkflowSchemas: jest.fn().mockReturnValue([]),
  executeWorkflow: jest.fn(),
}));

const { prisma } = require('@/lib/prisma');
const { registry } = require('../registry');

import { z } from 'zod';
import type { MCPContext, MCPTool, MCPResult } from '../types';

const mockHandler = jest.fn();

const createPatientTool: MCPTool = {
  name: 'create_patient',
  description: 'Create a new patient record',
  category: 'patient',
  inputSchema: z.object({ name: z.string() }),
  requiredPermissions: ['patient:write'],
  handler: mockHandler,
};

const getPatientTool: MCPTool = {
  name: 'get_patient',
  description: 'Get patient by ID',
  category: 'patient',
  inputSchema: z.object({ id: z.string() }),
  requiredPermissions: ['patient:read'],
  handler: mockHandler,
};

function buildContext(overrides: Partial<MCPContext> = {}): MCPContext {
  return {
    clinicianId: 'clinician-1',
    agentId: 'agent-1',
    sessionId: 'session-1',
    roles: ['ADMIN'],
    ...overrides,
  };
}

const successResult: MCPResult = {
  success: true,
  data: { id: 'patient-abc', name: 'Test Patient' },
};

describe('MCP Registry — Idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockHandler.mockResolvedValue(successResult);
    (prisma.agentIdempotencyLog.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.agentIdempotencyLog.create as jest.Mock).mockResolvedValue({});

    // Register test tools on the singleton
    (registry as any).tools.set('create_patient', createPatientTool);
    (registry as any).tools.set('get_patient', getPatientTool);
  });

  it('executes tool and stores result on first call with idempotency key', async () => {
    const response = await registry.executeTool({
      tool: 'create_patient',
      input: { name: 'Test Patient' },
      context: buildContext({ idempotencyKey: 'key-001' }),
    });

    expect(response.success).toBe(true);
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(prisma.agentIdempotencyLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idempotencyKey: 'key-001',
        toolName: 'create_patient',
        result: successResult,
      }),
    });
  });

  it('returns cached result on second call with same idempotency key', async () => {
    (prisma.agentIdempotencyLog.findUnique as jest.Mock).mockResolvedValue({
      idempotencyKey: 'key-002',
      toolName: 'create_patient',
      result: successResult,
    });

    const response = await registry.executeTool({
      tool: 'create_patient',
      input: { name: 'Test Patient' },
      context: buildContext({ idempotencyKey: 'key-002' }),
    });

    expect(response.success).toBe(true);
    expect(response.result).toEqual(successResult);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('always executes tool when no idempotency key is provided', async () => {
    await registry.executeTool({
      tool: 'create_patient',
      input: { name: 'Test Patient' },
      context: buildContext(),
    });

    await registry.executeTool({
      tool: 'create_patient',
      input: { name: 'Test Patient' },
      context: buildContext(),
    });

    expect(mockHandler).toHaveBeenCalledTimes(2);
    expect(prisma.agentIdempotencyLog.findUnique).not.toHaveBeenCalled();
    expect(prisma.agentIdempotencyLog.create).not.toHaveBeenCalled();
  });

  it('ignores idempotency key for non-create tools', async () => {
    await registry.executeTool({
      tool: 'get_patient',
      input: { id: 'patient-123' },
      context: buildContext({ idempotencyKey: 'key-003' }),
    });

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(prisma.agentIdempotencyLog.findUnique).not.toHaveBeenCalled();
  });

  it('handles P2002 race condition gracefully', async () => {
    const p2002Error = new Error('Unique constraint failed');
    (p2002Error as any).code = 'P2002';

    (prisma.agentIdempotencyLog.create as jest.Mock).mockRejectedValue(p2002Error);
    (prisma.agentIdempotencyLog.findUnique as jest.Mock)
      .mockResolvedValueOnce(null) // first lookup: not found
      .mockResolvedValueOnce({     // second lookup after P2002: found
        idempotencyKey: 'key-race',
        toolName: 'create_patient',
        result: successResult,
      });

    const response = await registry.executeTool({
      tool: 'create_patient',
      input: { name: 'Test Patient' },
      context: buildContext({ idempotencyKey: 'key-race' }),
    });

    expect(response.success).toBe(true);
    expect(response.result).toEqual(successResult);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('does not store idempotency record when tool execution fails', async () => {
    mockHandler.mockResolvedValue({ success: false, data: null, error: 'Validation failed' });

    await registry.executeTool({
      tool: 'create_patient',
      input: { name: 'Test Patient' },
      context: buildContext({ idempotencyKey: 'key-fail' }),
    });

    expect(prisma.agentIdempotencyLog.create).not.toHaveBeenCalled();
  });
});
