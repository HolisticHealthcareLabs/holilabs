/**
 * HeartbeatManager maintains connection liveness for SSE clients
 * Sends periodic heartbeat comments (per SSE spec: `:heartbeat\n\n`)
 * Detects stale connections when heartbeat acknowledgment timeout expires
 * QUINN: Stale connections are silently removed without throwing
 */
export class HeartbeatManager {
  private activeHeartbeats: Map<string, HeartbeatContext> = new Map();

  constructor(
    private heartbeatIntervalMs: number = 30000,
    private maxConsecutiveFailures: number = 2
  ) {}

  /**
   * Start sending heartbeats for a connection
   * Sends `:heartbeat` comment lines per SSE specification
   * @param connectionId The connection to heartbeat
   * @param onHeartbeat Callback to send heartbeat comment
   */
  public start(
    connectionId: string,
    onHeartbeat: (comment: string) => void
  ): void {
    // Clean up any existing heartbeat
    this.stop(connectionId);

    const context: HeartbeatContext = {
      lastHeartbeatAt: new Date().toISOString(),
      consecutiveFailures: 0,
      intervalId: setInterval(() => {
        try {
          context.lastHeartbeatAt = new Date().toISOString();
          onHeartbeat(':heartbeat');
        } catch (error) {
          context.consecutiveFailures++;
          // QUINN: Log silently, don't throw
        }
      }, this.heartbeatIntervalMs)
    };

    this.activeHeartbeats.set(connectionId, context);
  }

  /**
   * Stop heartbeats for a connection
   * Clears the interval and removes the context
   * @param connectionId The connection to stop heartbeating
   */
  public stop(connectionId: string): void {
    const context = this.activeHeartbeats.get(connectionId);
    if (context) {
      clearInterval(context.intervalId);
      this.activeHeartbeats.delete(connectionId);
    }
  }

  /**
   * Record that a heartbeat was acknowledged by the client
   * Resets the failure counter for this connection
   * @param connectionId The connection that acknowledged
   */
  public recordAck(connectionId: string): void {
    const context = this.activeHeartbeats.get(connectionId);
    if (context) {
      context.ackReceivedAt = new Date().toISOString();
      context.consecutiveFailures = 0;
    }
  }

  /**
   * Check if a connection is responsive (has recent heartbeat/ack)
   * A connection is alive if:
   * 1. Heartbeat was sent recently, OR
   * 2. Acknowledgment received within 2x heartbeat interval
   *
   * @param connectionId The connection to check
   * @returns true if connection appears healthy
   */
  public isAlive(connectionId: string): boolean {
    const context = this.activeHeartbeats.get(connectionId);
    if (!context) {
      return false;
    }

    // If we've had too many consecutive failures, connection is dead
    if (context.consecutiveFailures >= this.maxConsecutiveFailures) {
      return false;
    }

    // Check if ack was received recently
    if (context.ackReceivedAt) {
      const ackAge = Date.now() - new Date(context.ackReceivedAt).getTime();
      if (ackAge < this.heartbeatIntervalMs * 2) {
        return true;
      }
    }

    // Check if heartbeat was sent recently
    const heartbeatAge = Date.now() - new Date(context.lastHeartbeatAt).getTime();
    return heartbeatAge < this.heartbeatIntervalMs * 2;
  }

  /**
   * Get all stale connections (not responding to heartbeats)
   * QUINN: These should be disconnected without throwing
   * @returns Array of connection IDs that are stale
   */
  public getStaleConnections(): string[] {
    const stale: string[] = [];

    this.activeHeartbeats.forEach((context, connectionId) => {
      if (!this.isAlive(connectionId)) {
        stale.push(connectionId);
      }
    });

    return stale;
  }

  /**
   * Clean up all stale connections
   * Called periodically to remove dead connections
   * @returns Number of connections removed
   */
  public cleanupStaleConnections(): number {
    const staleConnections = this.getStaleConnections();

    staleConnections.forEach(connectionId => {
      this.stop(connectionId);
    });

    return staleConnections.length;
  }

  /**
   * Get the number of active heartbeats
   * @returns Count of connections with active heartbeats
   */
  public getActiveCount(): number {
    return this.activeHeartbeats.size;
  }

  /**
   * Get details about a specific heartbeat
   * @param connectionId The connection to check
   * @returns Heartbeat context or undefined if not found
   */
  public getHeartbeatInfo(connectionId: string): HeartbeatContext | undefined {
    return this.activeHeartbeats.get(connectionId);
  }
}

interface HeartbeatContext {
  intervalId: NodeJS.Timeout;
  lastHeartbeatAt: string;
  ackReceivedAt?: string;
  consecutiveFailures: number;
}
