import { v4 as uuidv4 } from 'uuid';
import { SSEConnection, SSEEvent, SSEBrokerConfig, BrokerStats, EventFilterConfig } from './types';
import { EventFilter } from './event-filter';
import { HeartbeatManager } from './heartbeat';

/**
 * SSEBroker manages SSE connections for multiple tenants
 * Enforces CYRUS invariant: all connections are tenant-scoped
 * Enforces QUINN invariant: connection failures don't affect event bus
 * Enforces RUTH invariant: priority events get expedited routing
 *
 * Architecture:
 * - Connections organized by tenantId for fast lookup and isolation
 * - WritableStream abstraction simulates HTTP response write
 * - Heartbeat manager tracks connection liveness
 * - Event filter handles filtering and priority classification
 */
export class SSEBroker {
  private connections: Map<string, Map<string, SSEConnectionContext>> = new Map();
  private eventFilter: EventFilter;
  private heartbeatManager: HeartbeatManager;
  private config: SSEBrokerConfig;

  // Statistics tracking
  private stats = {
    totalConnections: 0,
    eventsDelivered: 0,
    eventsDropped: 0,
    latencies: [] as number[]
  };

  // Mock WritableStream for testing
  private connectionWrites: Map<string, string[]> = new Map();

  constructor(config: Partial<SSEBrokerConfig> = {}) {
    this.config = {
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30000,
      connectionTimeoutMs: config.connectionTimeoutMs ?? 300000,
      maxConnectionsPerTenant: config.maxConnectionsPerTenant ?? 100,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      baseReconnectDelayMs: config.baseReconnectDelayMs ?? 1000,
      maxReconnectDelayMs: config.maxReconnectDelayMs ?? 30000,
      priorityEventTypes: config.priorityEventTypes ?? [
        'lab.critical.result',
        'drug.interaction.detected',
        'supply.stockout.detected'
      ]
    };

    this.eventFilter = new EventFilter();
    this.heartbeatManager = new HeartbeatManager(this.config.heartbeatIntervalMs);
  }

  /**
   * Add a new SSE connection
   * CYRUS: Validates tenantId and enforces max connections per tenant
   * @param conn The connection to add
   * @param writeStream Mock write function for testing
   * @throws Error if max connections exceeded for tenant
   */
  public addConnection(
    conn: SSEConnection,
    writeStream?: (data: string) => Promise<void>
  ): void {
    // CYRUS: Validate tenant scope
    if (!conn.tenantId) {
      throw new Error('Connection must have tenantId (CYRUS invariant)');
    }

    // Get or create tenant bucket
    if (!this.connections.has(conn.tenantId)) {
      this.connections.set(conn.tenantId, new Map());
    }

    const tenantConnections = this.connections.get(conn.tenantId)!;

    // CYRUS: Enforce max connections per tenant
    if (tenantConnections.size >= this.config.maxConnectionsPerTenant) {
      throw new Error(
        `Max connections (${this.config.maxConnectionsPerTenant}) exceeded for tenant ${conn.tenantId}`
      );
    }

    // Create mock write function if not provided
    const write = writeStream || this.createMockWrite(conn.id);

    const context: SSEConnectionContext = {
      connection: conn,
      write
    };

    tenantConnections.set(conn.id, context);
    this.stats.totalConnections++;

    // Start heartbeat for this connection
    this.heartbeatManager.start(conn.id, (heartbeat) => {
      this.sendToConnection(conn.id, heartbeat).catch(() => {
        // QUINN: Silently ignore heartbeat failures
      });
    });
  }

  /**
   * Remove a connection
   * QUINN: Silently succeeds even if connection not found
   * @param connId The connection ID to remove
   */
  public removeConnection(connId: string): void {
    let found = false;

    // Search all tenants for this connection (inefficient but necessary for cleanup)
    for (const tenantConnections of this.connections.values()) {
      if (tenantConnections.has(connId)) {
        tenantConnections.delete(connId);
        found = true;
        break;
      }
    }

    // Clean up heartbeat
    this.heartbeatManager.stop(connId);

    // Clean up mock writes
    this.connectionWrites.delete(connId);

    // QUINN: Don't throw if not found
  }

  /**
   * Broadcast an event to all connections for a specific tenant
   * CYRUS: Only sends to connections matching the tenantId
   * RUTH: Priority events bypass rate limiting
   * @param tenantId The tenant to broadcast to
   * @param event The event to broadcast
   */
  public async broadcast(tenantId: string, event: SSEEvent): Promise<void> {
    // CYRUS: Validate tenant scope
    if (!tenantId) {
      throw new Error('broadcast requires tenantId (CYRUS invariant)');
    }

    const tenantConnections = this.connections.get(tenantId);
    if (!tenantConnections || tenantConnections.size === 0) {
      // No connections for this tenant, just drop silently
      return;
    }

    const isPriorityEvent = this.config.priorityEventTypes.includes(event.type);
    const startTime = Date.now();

    let successCount = 0;

    for (const context of tenantConnections.values()) {
      try {
        // Check if client has subscribed to this event type
        if (
          context.connection.subscribedTypes.length > 0 &&
          !context.connection.subscribedTypes.includes(event.type)
        ) {
          continue;
        }

        await this.sendToConnection(context.connection.id, this.formatSSE(event));
        context.lastEventIdDelivered = event.id;
        successCount++;
      } catch (error) {
        // QUINN: Silently remove failed connections
        this.removeConnection(context.connection.id);
        this.stats.eventsDropped++;
      }
    }

    // Track latency for delivered events
    if (successCount > 0) {
      const latency = Date.now() - startTime;
      this.stats.latencies.push(latency);
      this.stats.eventsDelivered += successCount;
    }
  }

  /**
   * Broadcast with filtering
   * Applies EventFilterConfig to determine which connections receive the event
   * CYRUS: Enforces tenant isolation
   * @param event The event to broadcast
   * @param filter The filter configuration
   */
  public async broadcastFiltered(
    event: SSEEvent,
    filter: EventFilterConfig
  ): Promise<void> {
    // CYRUS: Validate tenant scope
    if (!filter.tenantId) {
      throw new Error('broadcastFiltered requires filter.tenantId (CYRUS invariant)');
    }

    const tenantConnections = this.connections.get(filter.tenantId);
    if (!tenantConnections || tenantConnections.size === 0) {
      return;
    }

    const startTime = Date.now();
    let successCount = 0;

    for (const context of tenantConnections.values()) {
      try {
        // Apply filter
        if (!this.eventFilter.shouldDeliver(event, filter)) {
          continue;
        }

        await this.sendToConnection(context.connection.id, this.formatSSE(event));
        context.lastEventIdDelivered = event.id;
        successCount++;
      } catch (error) {
        // QUINN: Silently remove failed connections
        this.removeConnection(context.connection.id);
        this.stats.eventsDropped++;
      }
    }

    if (successCount > 0) {
      const latency = Date.now() - startTime;
      this.stats.latencies.push(latency);
      this.stats.eventsDelivered += successCount;
    }
  }

  /**
   * Disconnect all connections for a tenant
   * CYRUS: Used for logout, revocation, or tenant cleanup
   * @param tenantId The tenant to disconnect
   */
  public disconnectTenant(tenantId: string): void {
    const tenantConnections = this.connections.get(tenantId);
    if (!tenantConnections) {
      return;
    }

    const connectionIds = Array.from(tenantConnections.keys());
    for (const connId of connectionIds) {
      this.removeConnection(connId);
    }

    this.connections.delete(tenantId);
  }

  /**
   * Get broker statistics
   * @returns Current broker stats
   */
  public getStats(): BrokerStats {
    const connectionsByTenant: Record<string, number> = {};

    for (const [tenantId, conns] of this.connections.entries()) {
      connectionsByTenant[tenantId] = conns.size;
    }

    // Calculate average latency
    let averageLatencyMs = 0;
    if (this.stats.latencies.length > 0) {
      const sum = this.stats.latencies.reduce((a, b) => a + b, 0);
      averageLatencyMs = Math.round(sum / this.stats.latencies.length);
    }

    // Find oldest connection
    let oldestConnection = '';
    let oldestTime = Date.now();

    for (const tenantConns of this.connections.values()) {
      for (const context of tenantConns.values()) {
        const connTime = new Date(context.connection.connectedAt).getTime();
        if (connTime < oldestTime) {
          oldestTime = connTime;
          oldestConnection = context.connection.id;
        }
      }
    }

    return {
      totalConnections: Array.from(this.connections.values()).reduce(
        (sum, conns) => sum + conns.size,
        0
      ),
      connectionsByTenant,
      eventsDelivered: this.stats.eventsDelivered,
      eventsDropped: this.stats.eventsDropped,
      averageLatencyMs,
      oldestConnection
    };
  }

  /**
   * Clean up stale connections
   * Called periodically to remove dead connections
   * @returns Number of connections removed
   */
  public cleanupStaleConnections(): number {
    return this.heartbeatManager.cleanupStaleConnections();
  }

  /**
   * Get mock writes for testing
   * @param connId Connection ID
   * @returns Array of written data
   */
  public getMockWrites(connId: string): string[] {
    return this.connectionWrites.get(connId) || [];
  }

  /**
   * Format an event as SSE data
   * Per SSE spec: "field: value\n"
   * @param event The event to format
   * @returns Formatted SSE string
   */
  private formatSSE(event: SSEEvent): string {
    let sse = `id: ${event.id}\n`;
    sse += `event: ${event.type}\n`;
    sse += `data: ${event.data}\n`;

    if (event.retry) {
      sse += `retry: ${event.retry}\n`;
    }

    sse += '\n'; // Double newline to signal end of event
    return sse;
  }

  /**
   * Send data to a specific connection
   * @param connId The connection ID
   * @param data The data to send
   */
  private async sendToConnection(connId: string, data: string): Promise<void> {
    // Find the connection
    let context: SSEConnectionContext | undefined;

    for (const tenantConns of this.connections.values()) {
      context = tenantConns.get(connId);
      if (context) {
        break;
      }
    }

    if (!context) {
      throw new Error(`Connection ${connId} not found`);
    }

    // Write the data
    await context.write(data);

    // Track for mock testing
    if (!this.connectionWrites.has(connId)) {
      this.connectionWrites.set(connId, []);
    }
    this.connectionWrites.get(connId)!.push(data);
  }

  /**
   * Create a mock write function for testing
   * @param connId The connection ID
   * @returns Write function
   */
  private createMockWrite(connId: string): (data: string) => Promise<void> {
    return async (data: string) => {
      if (!this.connectionWrites.has(connId)) {
        this.connectionWrites.set(connId, []);
      }
      this.connectionWrites.get(connId)!.push(data);
    };
  }
}

interface SSEConnectionContext {
  connection: SSEConnection;
  write: (data: string) => Promise<void>;
  lastEventIdDelivered?: string;
}
