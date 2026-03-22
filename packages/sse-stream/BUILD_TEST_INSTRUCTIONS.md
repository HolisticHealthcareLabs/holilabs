# SSE Stream Package - Build & Test Instructions

## Package Overview
`@holi/sse-stream` is Step 5 of the Health 3.0 platform — a real-time Server-Sent Events (SSE) alert streaming package that bridges Redis Streams events from `@holi/event-bus` to browser clients.

## Files Created

### Configuration Files
- `package.json` — Package metadata with dependencies on uuid and event-bus
- `tsconfig.json` — TypeScript configuration for ES2020 target
- `jest.config.js` — Jest test configuration with ts-jest preset

### Source Files (src/)

#### Core Implementation
- `index.ts` — Public API exports for all classes and types
- `types.ts` — Complete type definitions for SSE events, connections, filters, and broker config
- `sse-broker.ts` — Core SSEBroker class managing tenant-scoped connections (CYRUS invariant)
- `event-filter.ts` — EventFilter class for client-side filtering and RUTH priority classification
- `reconnect-manager.ts` — ReconnectManager implementing exponential backoff with full jitter (QUINN invariant)
- `heartbeat.ts` — HeartbeatManager for connection liveness detection

#### Tests (src/__tests__/)
- `sse-broker.test.ts` — Tests for connection management, tenant isolation, broadcast, filtering, stats
- `event-filter.test.ts` — Tests for type matching (wildcard support), severity filtering, priority classification
- `reconnect-manager.test.ts` — Tests for exponential backoff, jitter bounds, max attempts, reset behavior

## How to Build & Test

### Prerequisites
From the monorepo root, ensure pnpm is installed:
```bash
npm install -g pnpm
```

### Build Steps

1. **Install dependencies from monorepo root:**
   ```bash
   cd /sessions/vigilant-happy-edison/mnt/prototypes/holilabsv2
   pnpm install
   ```

2. **Build the SSE Stream package:**
   ```bash
   cd packages/sse-stream
   pnpm build
   ```

   This runs `tsc` and generates:
   - `dist/index.js` — Compiled JavaScript
   - `dist/*.d.ts` — TypeScript type definitions

3. **Run tests:**
   ```bash
   pnpm test
   ```

   Or with coverage:
   ```bash
   pnpm test -- --coverage
   ```

### Expected Test Results

The package includes **40+ test cases** across three test suites:

#### SSEBroker Tests (18 test cases)
- ✓ Connection addition and tenant isolation (CYRUS invariant)
- ✓ Max connections enforcement per tenant
- ✓ Broadcast with filtering and subscription types
- ✓ Tenant disconnect and cleanup
- ✓ Statistics tracking (delivered/dropped events, latency)
- ✓ Graceful failure handling (QUINN invariant)

**Key CYRUS Invariant Tests:**
- Rejects connections without tenantId
- Enforces max connections per tenant
- Prevents cross-tenant event broadcasting
- Tenant isolation enforced at broadcast time

#### EventFilter Tests (20+ test cases)
- ✓ Type filtering with wildcard support ('prevention.*' matches all prevention.* events)
- ✓ Severity-based filtering (LOW, MEDIUM, HIGH, CRITICAL)
- ✓ Facility-based filtering
- ✓ Patient-based filtering
- ✓ Multi-filter AND logic

**Key RUTH Invariant Tests:**
- lab.critical.result → CRITICAL priority
- drug.interaction.detected → CRITICAL priority
- supply.stockout.detected → CRITICAL priority
- prevention.gap.detected, record.ingested → HIGH priority
- Other events → NORMAL priority

#### ReconnectManager Tests (12+ test cases)
- ✓ Exponential backoff calculation (base * 2^attempt)
- ✓ Full jitter implementation (random distribution)
- ✓ Maximum delay capping
- ✓ Max attempts enforcement
- ✓ Attempt counter reset on successful connection
- ✓ Statistics tracking (attempts, successes, failures)

**Key QUINN Invariant Tests:**
- Graceful failure handling without throwing
- Eventual give-up after max attempts
- Silent disconnection handling

## Safety Invariants Implemented

### CYRUS (Tenant Isolation)
- All SSE connections are tenant-scoped via `tenantId`
- Connections validated to have tenantId
- Max connections per tenant enforced (configurable, default 100)
- `disconnectTenant()` method for logout/revocation
- Broadcast operations never cross tenant boundaries

### ELENA (Alert Flags)
- `EventFilterConfig` supports `severityMin` for alert filtering
- Event payloads checked for `severity` or `level` fields
- Defaults to MEDIUM severity if not found

### RUTH (Priority Routing)
- CRITICAL: lab.critical.result, drug.interaction.detected, supply.stockout.detected
- HIGH: prevention.gap.detected, record.ingested
- NORMAL: all other events
- `getPriority()` method classifies events for routing
- Supports configuration of `priorityEventTypes` in broker config

### QUINN (Graceful Degradation)
- Connection failures don't affect event bus
- Failed connections silently removed
- Reconnection failures logged, never thrown
- Max reconnection attempts (configurable, default 10)
- Exponential backoff prevents thundering herd

## Architecture Highlights

### SSEBroker
- Multi-tenant connection management via `Map<tenantId, Map<connId, context>>`
- Supports subscription filtering by event type
- Includes mock WritableStream for testing (no real HTTP required)
- Heartbeat integration for liveness detection
- Tracks statistics: events delivered/dropped, average latency

### EventFilter
- Supports wildcard type matching (e.g., 'prevention.*')
- AND logic for multiple filters (type, severity, facility, patient)
- Gracefully handles malformed JSON in event payloads
- Supports alternate field names (severity/level, facilityId/facility_id, etc.)

### ReconnectManager
- AWS-style full jitter: `random(0, min(base * 2^attempt, max))`
- Better than simple exponential backoff for distributed systems
- Prevents thundering herd on reconnection
- Tracks reconnection statistics for observability

### HeartbeatManager
- Sends SSE-compliant heartbeat comments (`:heartbeat\n\n`)
- Detects stale connections via ACK tracking
- Configurable interval (default 30s) and failure threshold
- `getStaleConnections()` and `cleanupStaleConnections()` for maintenance

## Integration with event-bus

The `@holi/sse-stream` package expects:
- Redis Streams publishing events (from @holi/event-bus)
- EventEnvelope format with: eventId, type, payload, timestamp, tenantId, version
- Example event types: record.ingested, prevention.gap.detected, lab.critical.result, supply.stockout.detected, drug.interaction.detected

To bridge events from event-bus to SSE clients:

```typescript
import { SSEBroker, EventFilter } from '@holi/sse-stream';

const broker = new SSEBroker({
  heartbeatIntervalMs: 30000,
  maxConnectionsPerTenant: 100,
  priorityEventTypes: ['lab.critical.result', 'drug.interaction.detected']
});

// When client connects:
broker.addConnection({
  id: generateId(),
  tenantId: user.tenantId,
  userId: user.id,
  subscribedTypes: ['lab.*', 'prevention.gap.detected'],
  connectedAt: new Date().toISOString(),
  lastHeartbeat: new Date().toISOString(),
  priority: 'NORMAL'
});

// When event arrives from Redis Streams:
await broker.broadcast(event.tenantId, {
  id: event.eventId,
  type: event.type,
  data: JSON.stringify(event.payload)
});
```

## Monitoring & Observability

Use `broker.getStats()` to monitor:
```typescript
const stats = broker.getStats();
console.log(stats);
// {
//   totalConnections: 42,
//   connectionsByTenant: { 'tenant-1': 10, 'tenant-2': 32 },
//   eventsDelivered: 1250,
//   eventsDropped: 3,
//   averageLatencyMs: 14,
//   oldestConnection: 'conn-abc123'
// }
```

Use `reconnectManager.getStats()` for reconnection metrics:
```typescript
const stats = reconnectManager.getStats();
console.log(stats);
// {
//   totalAttempts: 42,
//   successfulReconnects: 8,
//   failedReconnects: 2,
//   averageAttempts: 5.25,
//   lastAttemptAt: '2026-03-20T...'
// }
```

## Next Steps

1. Run the build and test suite to verify all implementations
2. Integrate with @holi/event-bus Redis Streams subscription
3. Implement HTTP/Express middleware to:
   - Accept SSE client connections
   - Map HttpResponse to the WritableStream abstraction
   - Handle client disconnections
4. Add integration tests with real Redis Streams
5. Deploy to Health 3.0 platform infrastructure
