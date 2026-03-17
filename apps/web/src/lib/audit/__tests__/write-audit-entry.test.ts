jest.mock('@/lib/api/audit-buffer', () => {
  const enqueueMock = jest.fn();
  return {
    auditBuffer: {
      enqueue: enqueueMock,
      start: jest.fn(),
      shutdown: jest.fn(),
      _getBufferLength: jest.fn().mockReturnValue(0),
      _flush: jest.fn(),
    },
  };
});

const { auditBuffer } = require('@/lib/api/audit-buffer');
const { writeAuditEntry } = require('@/lib/audit/write-audit-entry');

describe('writeAuditEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls auditBuffer.enqueue with correct params for agent execution', () => {
    writeAuditEntry({
      action: 'mcp.tool.get_patient',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-1',
      accessReason: 'Agent tool execution: get_patient',
      metadata: { toolName: 'get_patient', sessionId: 'sess-1', success: true },
      clinicId: 'clinic-456',
    });

    expect(auditBuffer.enqueue).toHaveBeenCalledTimes(1);
    const entry = (auditBuffer.enqueue as jest.Mock).mock.calls[0][0];
    expect(entry.action).toBe('mcp.tool.get_patient');
    expect(entry.resource).toBe('MCP_TOOL_EXECUTION');
    expect(entry.resourceId).toBe('get_patient');
    expect(entry.userId).toBe('clinician-123');
    expect(entry.actorType).toBe('AGENT');
    expect(entry.agentId).toBe('cortex-agent-1');
    expect(entry.accessReason).toBe('Agent tool execution: get_patient');
    expect(entry.success).toBe(true);
    expect(entry.details).toEqual({
      toolName: 'get_patient',
      sessionId: 'sess-1',
      success: true,
      clinicId: 'clinic-456',
    });
  });

  it('sets userEmail to agent identifier for AGENT actorType', () => {
    writeAuditEntry({
      action: 'mcp.tool.search_patients',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'search_patients',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-2',
      accessReason: 'Agent tool execution: search_patients',
    });

    const entry = (auditBuffer.enqueue as jest.Mock).mock.calls[0][0];
    expect(entry.userEmail).toBe('agent:cortex-agent-2');
    expect(entry.ipAddress).toBe('internal');
  });

  it('handles missing optional fields gracefully', () => {
    writeAuditEntry({
      action: 'mcp.tool.list_medications',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'list_medications',
      userId: 'clinician-789',
      actorType: 'SYSTEM',
      accessReason: 'System tool execution: list_medications',
    });

    expect(auditBuffer.enqueue).toHaveBeenCalledTimes(1);
    const entry = (auditBuffer.enqueue as jest.Mock).mock.calls[0][0];
    expect(entry.actorType).toBe('SYSTEM');
    expect(entry.agentId).toBeUndefined();
    expect(entry.userEmail).toBe('');
    expect(entry.details).toEqual({});
  });

  it('handles AGENT actorType without agentId', () => {
    writeAuditEntry({
      action: 'mcp.tool.get_patient',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      accessReason: 'Agent tool execution: get_patient',
    });

    const entry = (auditBuffer.enqueue as jest.Mock).mock.calls[0][0];
    expect(entry.userEmail).toBe('agent:unknown');
  });

  it('creates audit entry with error metadata for failed executions', () => {
    writeAuditEntry({
      action: 'mcp.tool.get_patient.error',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-1',
      accessReason: 'Agent tool execution failed: get_patient',
      metadata: { toolName: 'get_patient', sessionId: 'sess-1', success: false, error: 'Database timeout' },
    });

    const entry = (auditBuffer.enqueue as jest.Mock).mock.calls[0][0];
    expect(entry.action).toBe('mcp.tool.get_patient.error');
    expect(entry.details).toEqual({
      toolName: 'get_patient',
      sessionId: 'sess-1',
      success: false,
      error: 'Database timeout',
    });
  });

  it('includes clinicId in details when provided', () => {
    writeAuditEntry({
      action: 'mcp.tool.create_note',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'create_note',
      userId: 'clinician-123',
      actorType: 'USER',
      accessReason: 'User tool execution: create_note',
      clinicId: 'clinic-abc',
    });

    const entry = (auditBuffer.enqueue as jest.Mock).mock.calls[0][0];
    expect(entry.details).toEqual({ clinicId: 'clinic-abc' });
  });
});
