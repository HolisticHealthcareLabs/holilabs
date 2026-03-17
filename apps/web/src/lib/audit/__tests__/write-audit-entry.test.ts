jest.mock('@/lib/security/audit-chain', () => {
  const createChainedAuditEntryMock = jest.fn();
  return {
    createChainedAuditEntry: createChainedAuditEntryMock,
  };
});

const { createChainedAuditEntry } = require('@/lib/security/audit-chain');
const { writeAuditEntry } = require('@/lib/audit/write-audit-entry');

describe('writeAuditEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createChainedAuditEntry as jest.Mock).mockResolvedValue({
      id: 'audit-123',
      hashVersion: 2,
    });
  });

  it('uses createChainedAuditEntry for agent audit writes', async () => {
    await writeAuditEntry({
      action: 'mcp.tool.get_patient',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-1',
      accessReason: 'DIRECT_PATIENT_CARE',
      metadata: { toolName: 'get_patient', sessionId: 'sess-1', success: true },
      clinicId: 'clinic-456',
    });

    expect(createChainedAuditEntry).toHaveBeenCalledTimes(1);
    const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
    expect(call.action).toBe('mcp.tool.get_patient');
    expect(call.resource).toBe('MCP_TOOL_EXECUTION');
    expect(call.resourceId).toBe('get_patient');
    expect(call.userId).toBe('clinician-123');
    expect(call.userEmail).toBe('agent:cortex-agent-1');
    expect(call.hashVersion).toBe(2);
  });

  it('auto-populates legalBasis from accessReason mapping', async () => {
    await writeAuditEntry({
      action: 'mcp.tool.get_patient',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-1',
      accessReason: 'DIRECT_PATIENT_CARE',
      metadata: { toolName: 'get_patient' },
    });

    const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
    expect(call.legalBasis).toBe('LGPD Art. 7(VIII) — health protection (direct care)');
  });

  it('respects explicit legalBasis when provided', async () => {
    await writeAuditEntry({
      action: 'mcp.tool.get_patient',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-1',
      accessReason: 'DIRECT_PATIENT_CARE',
      legalBasis: 'Custom legal basis citation',
    });

    const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
    expect(call.legalBasis).toBe('Custom legal basis citation');
  });

  it('sets hashVersion to 2 for new entries', async () => {
    await writeAuditEntry({
      action: 'mcp.tool.get_patient',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-1',
      accessReason: 'DIRECT_PATIENT_CARE',
    });

    const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
    expect(call.hashVersion).toBe(2);
  });

  it('passes all 6 new extended fields through to createChainedAuditEntry', async () => {
    await writeAuditEntry({
      action: 'mcp.tool.get_patient',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-1',
      accessReason: 'DIRECT_PATIENT_CARE',
      modelVersion: 'claude-3.5-sonnet',
      promptHash: 'sha256:abc123',
      consentBasis: 'explicit',
      legalBasis: 'LGPD Art. 7(VIII)',
      phiAccessScore: 0.95,
    });

    const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
    expect(call.modelVersion).toBe('claude-3.5-sonnet');
    expect(call.promptHash).toBe('sha256:abc123');
    expect(call.consentBasis).toBe('explicit');
    expect(call.legalBasis).toBe('LGPD Art. 7(VIII)');
    expect(call.phiAccessScore).toBe(0.95);
  });

  it('sets userEmail to agent identifier for AGENT actorType', async () => {
    await writeAuditEntry({
      action: 'mcp.tool.search_patients',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'search_patients',
      userId: 'clinician-123',
      actorType: 'AGENT',
      agentId: 'cortex-agent-2',
      accessReason: 'CARE_COORDINATION',
    });

    const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
    expect(call.userEmail).toBe('agent:cortex-agent-2');
    expect(call.ipAddress).toBe('internal');
  });

  it('handles AGENT actorType without agentId', async () => {
    await writeAuditEntry({
      action: 'mcp.tool.get_patient',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'get_patient',
      userId: 'clinician-123',
      actorType: 'AGENT',
      accessReason: 'DIRECT_PATIENT_CARE',
    });

    const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
    expect(call.userEmail).toBe('agent:unknown');
  });

  it('includes clinicId in details when provided', async () => {
    await writeAuditEntry({
      action: 'mcp.tool.create_note',
      resourceType: 'MCP_TOOL_EXECUTION',
      resourceId: 'create_note',
      userId: 'clinician-123',
      actorType: 'USER',
      accessReason: 'ADMINISTRATIVE',
      clinicId: 'clinic-abc',
    });

    const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
    expect(call.details).toEqual({ clinicId: 'clinic-abc' });
  });

  it('maps all AccessReason enum values to legal basis citations', async () => {
    const reasonMap = {
      EMERGENCY_ACCESS: 'LGPD Art. 7(VII) — vital interest protection',
      BILLING: 'LGPD Art. 7(V) — contract execution',
      LEGAL_COMPLIANCE: 'LGPD Art. 7(II) — legal obligation compliance',
      RESEARCH_IRB_APPROVED: 'LGPD Art. 7(IV) — research with anonymization',
      PUBLIC_HEALTH: 'LGPD Art. 7(VIII) — public health protection',
    };

    for (const [reason, expectedBasis] of Object.entries(reasonMap)) {
      jest.clearAllMocks();
      (createChainedAuditEntry as jest.Mock).mockResolvedValue({ id: 'audit-123' });

      await writeAuditEntry({
        action: 'audit.test',
        resourceType: 'TEST',
        resourceId: 'test-1',
        userId: 'user-1',
        actorType: 'USER',
        accessReason: reason as any,
      });

      const call = (createChainedAuditEntry as jest.Mock).mock.calls[0][0];
      expect(call.legalBasis).toBe(expectedBasis);
    }
  });
});
