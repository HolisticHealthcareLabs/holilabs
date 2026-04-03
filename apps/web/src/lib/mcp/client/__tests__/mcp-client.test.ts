/**
 * MCP Client Manager Tests
 *
 * Validates:
 * - Connection to external MCP servers
 * - Tool discovery via tools/list
 * - Circuit breaker: 3 failures in 60s → open for 5min
 * - Security pipeline integration (pre/post call checks)
 */

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    listTools: jest.fn().mockResolvedValue({
      tools: [
        { name: 'fhir_search', description: 'Search FHIR resources', inputSchema: { type: 'object' } },
        { name: 'fhir_read', description: 'Read a FHIR resource', inputSchema: { type: 'object' } },
      ],
    }),
    callTool: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"results":[]}' }] }),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../security-gate', () => ({
  isServerApproved: jest.fn(() => ({ allowed: true })),
  registerApprovedServer: jest.fn(),
  preCallSecurityCheck: jest.fn().mockResolvedValue({
    allowed: true,
    deidentifiedArgs: { query: 'deidentified' },
  }),
  postCallSecurityCheck: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/security/redact-phi', () => ({
  redactObject: jest.fn((obj: unknown) => obj),
}));

const { Client } = require('@modelcontextprotocol/sdk/client/index.js') as {
  Client: jest.Mock;
};
const securityGate = require('../security-gate') as {
  isServerApproved: jest.Mock;
  registerApprovedServer: jest.Mock;
  preCallSecurityCheck: jest.Mock;
  postCallSecurityCheck: jest.Mock;
};

const { MCPClientManager } = require('../mcp-client') as typeof import('../mcp-client');

type SecurityGateContext = import('../security-gate').SecurityGateContext;

const SERVER_CONFIG = {
  url: 'https://medplum.test/mcp',
  name: 'medplum-test',
  jurisdiction: 'BR',
  dpaReference: 'DPA-TEST-001',
  approved: true,
};

const makeCtx = (): SecurityGateContext => ({
  tenantId: 'clinic-1',
  userId: 'doc-1',
  agentId: 'agent-1',
  sessionId: 'sess-1',
});

describe('MCPClientManager', () => {
  let manager: InstanceType<typeof MCPClientManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set Client constructor mock (clearAllMocks wipes mockImplementation)
    (Client as jest.Mock).mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({
        tools: [
          { name: 'fhir_search', description: 'Search FHIR resources', inputSchema: { type: 'object' } },
          { name: 'fhir_read', description: 'Read a FHIR resource', inputSchema: { type: 'object' } },
        ],
      }),
      callTool: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"results":[]}' }] }),
    }));
    // Re-set security gate mocks
    securityGate.isServerApproved.mockReturnValue({ allowed: true });
    securityGate.registerApprovedServer.mockReturnValue(undefined);
    securityGate.preCallSecurityCheck.mockResolvedValue({
      allowed: true,
      deidentifiedArgs: { query: 'deidentified' },
    });
    securityGate.postCallSecurityCheck.mockResolvedValue(undefined);
    manager = new MCPClientManager();
  });

  describe('connect', () => {
    it('connects to an approved external MCP server', async () => {
      await manager.connect(SERVER_CONFIG);

      expect(Client).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'holilabs-mcp-client' }),
      );
    });

    it('discovers tools on connection', async () => {
      await manager.connect(SERVER_CONFIG);
      const tools = manager.getAllExternalTools();

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('fhir_search');
      expect(tools[0].source).toBe('external');
      expect(tools[0].serverUrl).toBe(SERVER_CONFIG.url);
      expect(tools[0].serverName).toBe('medplum-test');
    });

    it('skips reconnection if already connected', async () => {
      await manager.connect(SERVER_CONFIG);
      await manager.connect(SERVER_CONFIG);

      // Client constructor called only once
      expect(Client).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeTool', () => {
    it('executes a tool through the security pipeline', async () => {
      await manager.connect(SERVER_CONFIG);

      const result = await manager.executeTool(
        SERVER_CONFIG.url,
        'fhir_search',
        { query: 'Patient?name=test' },
        makeCtx(),
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(securityGate.preCallSecurityCheck).toHaveBeenCalledWith(
        SERVER_CONFIG.url,
        'fhir_search',
        expect.any(Object),
        expect.objectContaining({ tenantId: 'clinic-1' }),
      );
    });

    it('blocks execution when pre-call security fails', async () => {
      securityGate.preCallSecurityCheck.mockResolvedValueOnce({
        allowed: false,
        reason: 'De-identification failed (RVI-006)',
      });

      await manager.connect(SERVER_CONFIG);
      const result = await manager.executeTool(
        SERVER_CONFIG.url,
        'fhir_search',
        { query: 'sensitive' },
        makeCtx(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('RVI-006');
    });

    it('returns error when not connected', async () => {
      const result = await manager.executeTool(
        'https://unknown.com/mcp',
        'tool',
        {},
        makeCtx(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
    });
  });

  describe('circuit breaker', () => {
    it('opens circuit after 3 failures within 60s', async () => {
      await manager.connect(SERVER_CONFIG);

      // Get the mock client and make callTool fail
      const mockClientInstance = (Client as jest.Mock).mock.results[0].value;
      mockClientInstance.callTool.mockRejectedValue(new Error('Server error'));

      // Trigger 3 failures
      for (let i = 0; i < 3; i++) {
        await manager.executeTool(SERVER_CONFIG.url, 'fhir_search', {}, makeCtx());
      }

      // 4th call should be blocked by circuit breaker
      const result = await manager.executeTool(
        SERVER_CONFIG.url,
        'fhir_search',
        {},
        makeCtx(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker open');
    });

    it('resets circuit breaker on success', async () => {
      await manager.connect(SERVER_CONFIG);
      const mockClientInstance = (Client as jest.Mock).mock.results[0].value;

      // 2 failures (not enough to trip)
      mockClientInstance.callTool.mockRejectedValueOnce(new Error('fail'));
      mockClientInstance.callTool.mockRejectedValueOnce(new Error('fail'));
      await manager.executeTool(SERVER_CONFIG.url, 'fhir_search', {}, makeCtx());
      await manager.executeTool(SERVER_CONFIG.url, 'fhir_search', {}, makeCtx());

      // Success resets counter
      mockClientInstance.callTool.mockResolvedValueOnce({ content: [] });
      await manager.executeTool(SERVER_CONFIG.url, 'fhir_search', {}, makeCtx());

      // 2 more failures should NOT trip (counter was reset)
      mockClientInstance.callTool.mockRejectedValueOnce(new Error('fail'));
      mockClientInstance.callTool.mockRejectedValueOnce(new Error('fail'));
      await manager.executeTool(SERVER_CONFIG.url, 'fhir_search', {}, makeCtx());
      const result = await manager.executeTool(SERVER_CONFIG.url, 'fhir_search', {}, makeCtx());

      // Should still execute (not circuit broken)
      expect(result.error).not.toContain('Circuit breaker');
    });
  });

  describe('disconnect', () => {
    it('disconnects and cleans up', async () => {
      await manager.connect(SERVER_CONFIG);
      expect(manager.getAllExternalTools()).toHaveLength(2);

      await manager.disconnect(SERVER_CONFIG.url);
      expect(manager.getAllExternalTools()).toHaveLength(0);
    });

    it('disconnectAll clears all connections', async () => {
      await manager.connect(SERVER_CONFIG);
      await manager.disconnectAll();
      expect(manager.getAllExternalTools()).toHaveLength(0);
    });
  });
});
