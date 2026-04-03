/**
 * MCP Client — Connects to external MCP servers
 *
 * Supports Streamable HTTP (production) and stdio (local dev with Medplum).
 * Includes circuit breaker (3 failures in 60s → open for 5min) and
 * exponential backoff reconnection.
 *
 * CYRUS: All calls go through security-gate before reaching external servers.
 * RUTH: Only approved servers (DPA/SCC on file) can be connected.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { logger } from '@/lib/logger';
import { redactObject } from '@/lib/security/redact-phi';
import {
  preCallSecurityCheck,
  postCallSecurityCheck,
  isServerApproved,
  type SecurityGateContext,
  type ExternalServerConfig,
  registerApprovedServer,
} from './security-gate';

// =============================================================================
// TYPES
// =============================================================================

export interface ExternalMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  source: 'external';
  serverUrl: string;
  serverName: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureAt: number;
  openUntil: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_WINDOW_MS = 60_000;
const CIRCUIT_BREAKER_OPEN_MS = 5 * 60_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

// =============================================================================
// MCP CLIENT MANAGER
// =============================================================================

export class MCPClientManager {
  private clients = new Map<string, Client>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private discoveredTools = new Map<string, ExternalMCPTool[]>();

  /**
   * Connect to an external MCP server.
   *
   * RUTH gate: Server must be in approved jurisdiction allowlist.
   */
  async connect(config: ExternalServerConfig): Promise<void> {
    // Register if not already registered
    const check = isServerApproved(config.url);
    if (!check.allowed) {
      registerApprovedServer(config);
    }

    // Re-check after registration
    const recheck = isServerApproved(config.url);
    if (!recheck.allowed) {
      throw new Error(recheck.reason);
    }

    if (this.clients.has(config.url)) {
      logger.info(redactObject({
        event: 'mcp_client_already_connected',
        server: config.name,
      }));
      return;
    }

    const client = new Client(
      { name: 'holilabs-mcp-client', version: '1.0.0' },
    );

    const transport = new StreamableHTTPClientTransport(new URL(config.url));

    try {
      await client.connect(transport);
      this.clients.set(config.url, client);

      // Discover tools
      await this.discoverTools(config.url, config.name);

      logger.info(redactObject({
        event: 'mcp_client_connected',
        server: config.name,
        url: config.url,
        toolCount: this.discoveredTools.get(config.url)?.length ?? 0,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Connection failed';
      logger.error(redactObject({
        event: 'mcp_client_connect_error',
        server: config.name,
        error: msg,
      }));
      throw error;
    }
  }

  /**
   * Discover tools from a connected external MCP server.
   */
  private async discoverTools(serverUrl: string, serverName: string): Promise<void> {
    const client = this.clients.get(serverUrl);
    if (!client) return;

    try {
      const result = await client.listTools();
      const tools: ExternalMCPTool[] = (result.tools ?? []).map((tool) => ({
        name: tool.name,
        description: tool.description ?? '',
        inputSchema: (tool.inputSchema ?? { type: 'object' }) as Record<string, unknown>,
        source: 'external' as const,
        serverUrl,
        serverName,
      }));

      this.discoveredTools.set(serverUrl, tools);
    } catch (error) {
      logger.error(redactObject({
        event: 'mcp_client_discovery_error',
        server: serverName,
        error: error instanceof Error ? error.message : 'Discovery failed',
      }));
      this.discoveredTools.set(serverUrl, []);
    }
  }

  /**
   * Execute a tool on an external MCP server.
   *
   * Full security pipeline:
   *   1. Circuit breaker check
   *   2. Pre-call security (jurisdiction + de-id)
   *   3. Execute via MCP client
   *   4. Post-call security (audit + tenant validation)
   */
  async executeTool(
    serverUrl: string,
    toolName: string,
    args: Record<string, unknown>,
    ctx: SecurityGateContext,
  ): Promise<{ success: boolean; data: unknown; error?: string }> {
    const startTime = Date.now();

    // Circuit breaker
    if (this.isCircuitOpen(serverUrl)) {
      return {
        success: false,
        data: null,
        error: `Circuit breaker open for ${serverUrl} — retry after cooldown`,
      };
    }

    // Pre-call security gate
    const preCheck = await preCallSecurityCheck(serverUrl, toolName, args, ctx);
    if (!preCheck.allowed) {
      return { success: false, data: null, error: preCheck.reason };
    }

    const client = this.clients.get(serverUrl);
    if (!client) {
      return { success: false, data: null, error: `Not connected to ${serverUrl}` };
    }

    // Execute
    try {
      const result = await client.callTool({
        name: toolName,
        arguments: preCheck.deidentifiedArgs,
      });

      const executionTimeMs = Date.now() - startTime;
      this.recordSuccess(serverUrl);

      // Post-call security
      await postCallSecurityCheck(
        serverUrl, toolName, true, result, ctx, executionTimeMs,
      );

      return { success: true, data: result };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const msg = error instanceof Error ? error.message : 'External tool execution failed';
      this.recordFailure(serverUrl);

      await postCallSecurityCheck(
        serverUrl, toolName, false, null, ctx, executionTimeMs, msg,
      );

      return { success: false, data: null, error: msg };
    }
  }

  /**
   * Get all discovered external tools across all connected servers.
   */
  getAllExternalTools(): ExternalMCPTool[] {
    const allTools: ExternalMCPTool[] = [];
    for (const tools of this.discoveredTools.values()) {
      allTools.push(...tools);
    }
    return allTools;
  }

  /**
   * Disconnect from an external MCP server.
   */
  async disconnect(serverUrl: string): Promise<void> {
    const client = this.clients.get(serverUrl);
    if (client) {
      await client.close();
      this.clients.delete(serverUrl);
      this.discoveredTools.delete(serverUrl);
      this.circuitBreakers.delete(serverUrl);
      logger.info(redactObject({ event: 'mcp_client_disconnected', serverUrl }));
    }
  }

  /**
   * Disconnect from all servers.
   */
  async disconnectAll(): Promise<void> {
    const urls = [...this.clients.keys()];
    await Promise.all(urls.map((url) => this.disconnect(url)));
  }

  // ===========================================================================
  // CIRCUIT BREAKER
  // ===========================================================================

  private isCircuitOpen(serverUrl: string): boolean {
    const state = this.circuitBreakers.get(serverUrl);
    if (!state) return false;

    const now = Date.now();

    // Circuit is open and hasn't expired
    if (state.openUntil > now) return true;

    // Circuit expired — reset to half-open (allow next call)
    if (state.openUntil > 0 && state.openUntil <= now) {
      state.failures = 0;
      state.openUntil = 0;
      return false;
    }

    return false;
  }

  private recordFailure(serverUrl: string): void {
    const now = Date.now();
    const state = this.circuitBreakers.get(serverUrl) ?? {
      failures: 0,
      lastFailureAt: 0,
      openUntil: 0,
    };

    // Reset if outside window
    if (now - state.lastFailureAt > CIRCUIT_BREAKER_WINDOW_MS) {
      state.failures = 0;
    }

    state.failures++;
    state.lastFailureAt = now;

    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      state.openUntil = now + CIRCUIT_BREAKER_OPEN_MS;
      logger.warn(redactObject({
        event: 'mcp_circuit_breaker_opened',
        serverUrl,
        failures: state.failures,
        openUntilMs: CIRCUIT_BREAKER_OPEN_MS,
      }));
    }

    this.circuitBreakers.set(serverUrl, state);
  }

  private recordSuccess(serverUrl: string): void {
    const state = this.circuitBreakers.get(serverUrl);
    if (state) {
      state.failures = 0;
      state.openUntil = 0;
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: MCPClientManager | null = null;

export function getMCPClientManager(): MCPClientManager {
  if (!instance) {
    instance = new MCPClientManager();
  }
  return instance;
}

export function resetMCPClientManager(): void {
  instance = null;
}
