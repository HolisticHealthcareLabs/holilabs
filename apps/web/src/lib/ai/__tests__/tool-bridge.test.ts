/**
 * Tests for MCP ↔ LLM Tool Bridge
 * All data is synthetic — NO PHI
 */

jest.mock('@/lib/logger', () => {
  const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: logger };
});

import {
  mcpToolsToDefinitions,
  executeToolCalls,
  toolResultsToMessages,
  type ToolCallResult,
} from '../tool-bridge';

const logger = require('@/lib/logger').default;

// ── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_SCHEMAS = [
  {
    name: 'get_patient',
    description: 'Fetch patient by ID',
    category: 'patient',
    inputSchema: { type: 'object', properties: { patientId: { type: 'string' } }, required: ['patientId'] },
    requiredPermissions: ['patient:read'],
  },
  {
    name: 'create_note',
    description: 'Create a clinical note',
    category: 'clinical-note',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    requiredPermissions: ['note:write'],
  },
  {
    name: 'list_medications',
    description: 'List patient medications',
    category: 'medication',
    inputSchema: { type: 'object', properties: { patientId: { type: 'string' } } },
    requiredPermissions: ['medication:read'],
  },
];

const MOCK_CONTEXT = {
  clinicianId: 'doc-1',
  agentId: 'agent-1',
  sessionId: 'sess-1',
  roles: ['CLINICIAN'],
};

// ── mcpToolsToDefinitions ───────────────────────────────────────────────────

describe('mcpToolsToDefinitions', () => {
  it('converts all schemas to ToolDefinition[]', () => {
    const defs = mcpToolsToDefinitions(MOCK_SCHEMAS);
    expect(defs).toHaveLength(3);
    expect(defs[0]).toEqual({
      name: 'get_patient',
      description: 'Fetch patient by ID',
      parameters: MOCK_SCHEMAS[0].inputSchema,
    });
  });

  it('filters by category', () => {
    const defs = mcpToolsToDefinitions(MOCK_SCHEMAS, { categories: ['patient'] });
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('get_patient');
  });

  it('filters by name', () => {
    const defs = mcpToolsToDefinitions(MOCK_SCHEMAS, { names: ['create_note', 'list_medications'] });
    expect(defs).toHaveLength(2);
    expect(defs.map((d) => d.name)).toEqual(['create_note', 'list_medications']);
  });

  it('returns empty array when no schemas match filter', () => {
    const defs = mcpToolsToDefinitions(MOCK_SCHEMAS, { categories: ['billing'] });
    expect(defs).toEqual([]);
  });

  it('strips requiredPermissions from output (not exposed to LLM)', () => {
    const defs = mcpToolsToDefinitions(MOCK_SCHEMAS);
    for (const def of defs) {
      expect(def).not.toHaveProperty('requiredPermissions');
      expect(def).not.toHaveProperty('category');
    }
  });
});

// ── executeToolCalls ────────────────────────────────────────────────────────

describe('executeToolCalls', () => {
  const mockExecutor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes each tool call and returns results', async () => {
    mockExecutor.mockResolvedValue({
      success: true,
      result: { success: true, data: { id: 'p-1', name: 'Synthetic' }, error: undefined },
    });

    const results = await executeToolCalls(
      [{ id: 'tc-1', name: 'get_patient', arguments: { patientId: 'p-1' } }],
      MOCK_CONTEXT,
      mockExecutor,
    );

    expect(results).toHaveLength(1);
    expect(results[0].toolCallId).toBe('tc-1');
    expect(results[0].success).toBe(true);
    expect(results[0].result.data).toEqual({ id: 'p-1', name: 'Synthetic' });
  });

  it('passes context to executor', async () => {
    mockExecutor.mockResolvedValue({ success: true, result: { success: true, data: null } });

    await executeToolCalls(
      [{ id: 'tc-1', name: 'get_patient', arguments: { patientId: 'p-1' } }],
      MOCK_CONTEXT,
      mockExecutor,
    );

    expect(mockExecutor).toHaveBeenCalledWith({
      tool: 'get_patient',
      input: { patientId: 'p-1' },
      context: MOCK_CONTEXT,
    });
  });

  it('handles executor failure gracefully', async () => {
    mockExecutor.mockRejectedValue(new Error('Tool not found'));

    const results = await executeToolCalls(
      [{ id: 'tc-1', name: 'nonexistent', arguments: {} }],
      MOCK_CONTEXT,
      mockExecutor,
    );

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].result.error).toBe('Tool not found');
  });

  it('logs errors on executor failure', async () => {
    mockExecutor.mockRejectedValue(new Error('DB timeout'));

    await executeToolCalls(
      [{ id: 'tc-1', name: 'get_patient', arguments: {} }],
      MOCK_CONTEXT,
      mockExecutor,
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'tool_bridge_execution_error',
        tool: 'get_patient',
      }),
    );
  });

  it('executes multiple tool calls sequentially', async () => {
    const order: string[] = [];
    mockExecutor.mockImplementation(async (req: any) => {
      order.push(req.tool);
      return { success: true, result: { success: true, data: null } };
    });

    await executeToolCalls(
      [
        { id: 'tc-1', name: 'get_patient', arguments: { patientId: 'p-1' } },
        { id: 'tc-2', name: 'list_medications', arguments: { patientId: 'p-1' } },
      ],
      MOCK_CONTEXT,
      mockExecutor,
    );

    expect(order).toEqual(['get_patient', 'list_medications']);
  });
});

// ── toolResultsToMessages ───────────────────────────────────────────────────

describe('toolResultsToMessages', () => {
  const successResult: ToolCallResult = {
    toolCallId: 'tc-1',
    toolName: 'get_patient',
    success: true,
    result: { success: true, data: { id: 'p-1' } },
  };

  const failResult: ToolCallResult = {
    toolCallId: 'tc-2',
    toolName: 'create_note',
    success: false,
    result: { success: false, data: null, error: 'Permission denied' },
  };

  it('converts to tool-role messages by default', () => {
    const messages = toolResultsToMessages([successResult]);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('tool');
    expect(messages[0].toolCallId).toBe('tc-1');
    expect(JSON.parse(messages[0].content)).toEqual({ id: 'p-1' });
  });

  it('serializes error for failed results', () => {
    const messages = toolResultsToMessages([failResult]);
    expect(messages).toHaveLength(1);
    expect(JSON.parse(messages[0].content)).toEqual({ error: 'Permission denied' });
  });

  it('falls back to user-role when useToolRole=false', () => {
    const messages = toolResultsToMessages([successResult, failResult], false);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('[Tool: get_patient] (OK)');
    expect(messages[0].content).toContain('[Tool: create_note] (ERROR)');
    expect(messages[0].content).toContain('Permission denied');
  });
});

// ── Task config fallback chains ─────────────────────────────────────────────

describe('UNIFIED_TASK_CONFIG fallback chains (updated)', () => {
  const { UNIFIED_TASK_CONFIG } = require('../types');

  it('safety-critical tasks include openai in fallback', () => {
    const critical = ['drug-interaction', 'diagnosis-support', 'prescription-review', 'lab-interpretation'];
    for (const task of critical) {
      expect(UNIFIED_TASK_CONFIG[task].fallbackProviders).toContain('openai');
    }
  });

  it('commodity tasks include mistral or groq in fallback', () => {
    const commodity = ['translation', 'summarization', 'clinical-notes'];
    for (const task of commodity) {
      const fb = UNIFIED_TASK_CONFIG[task].fallbackProviders;
      expect(fb.some((p: string) => p === 'mistral' || p === 'groq')).toBe(true);
    }
  });

  it('transcript-summary falls back to deepseek then together', () => {
    const fb = UNIFIED_TASK_CONFIG['transcript-summary'].fallbackProviders;
    expect(fb[0]).toBe('deepseek');
    expect(fb[1]).toBe('together');
  });

  it('icd-coding falls back to deepseek then gemini', () => {
    const fb = UNIFIED_TASK_CONFIG['icd-coding'].fallbackProviders;
    expect(fb).toEqual(['deepseek', 'gemini']);
  });

  it('general task has broad fallback chain', () => {
    const fb = UNIFIED_TASK_CONFIG['general'].fallbackProviders;
    expect(fb.length).toBeGreaterThanOrEqual(3);
  });
});
