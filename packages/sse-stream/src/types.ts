/**
 * SSE Event as received by client
 * Maps to EventEnvelope from event-bus with SSE transport semantics
 */
export interface SSEEvent {
  id: string;                          // Maps to EventEnvelope.eventId
  type: string;                        // Maps to EventEnvelope.type
  data: string;                        // JSON-serialized payload
  retry?: number;                      // Reconnection interval hint (ms)
}

/**
 * Client SSE connection metadata
 * CYRUS: All connections are tenant-scoped via tenantId
 * QUINN: Supports reconnection with lastEventId for exactly-once semantics
 */
export interface SSEConnection {
  id: string;
  tenantId: string;                    // CYRUS: tenant scope
  userId: string;
  subscribedTypes: string[];           // Which event types this client wants
  lastEventId?: string;               // For reconnection (QUINN)
  connectedAt: string;
  lastHeartbeat: string;
  priority: 'NORMAL' | 'CRITICAL';    // RUTH: critical for ER/ICU clinicians
}

/**
 * Event filter configuration
 * Supports flexible filtering by type, severity, facility, and patient
 * CYRUS: tenantId is required and enforced
 */
export interface EventFilterConfig {
  tenantId: string;                    // Required (CYRUS)
  eventTypes?: string[];               // Whitelist (empty = all)
  severityMin?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';  // Minimum severity to receive
  facilityIds?: string[];              // Filter by facility
  patientIds?: string[];               // Watch specific patients
}

/**
 * SSE Broker configuration
 * Controls connection limits, reconnection behavior, heartbeat, and priority routing
 * RUTH: priorityEventTypes are always expedited and not dropped under load
 */
export interface SSEBrokerConfig {
  heartbeatIntervalMs: number;         // Default: 30000 (30s)
  connectionTimeoutMs: number;         // Default: 300000 (5min)
  maxConnectionsPerTenant: number;     // Default: 100
  maxReconnectAttempts: number;        // Default: 10
  baseReconnectDelayMs: number;        // Default: 1000
  maxReconnectDelayMs: number;         // Default: 30000
  priorityEventTypes: string[];        // RUTH: always expedited (lab.critical.result, drug.interaction.detected)
}

/**
 * Broker statistics for monitoring and observability
 * Tracks connections, event delivery, latency, and health
 */
export interface BrokerStats {
  totalConnections: number;
  connectionsByTenant: Record<string, number>;
  eventsDelivered: number;
  eventsDropped: number;
  averageLatencyMs: number;
  oldestConnection: string;
}

/**
 * Priority classification for events
 * RUTH invariant: critical events require priority routing to ANVISA-relevant clinicians
 */
export type EventPriority = 'NORMAL' | 'HIGH' | 'CRITICAL';

/**
 * Reconnection statistics
 * Used for observability and debugging of connection stability
 */
export interface ReconnectStats {
  totalAttempts: number;
  successfulReconnects: number;
  failedReconnects: number;
  lastAttemptAt?: string;
  averageAttempts: number;
}
