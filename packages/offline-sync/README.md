# @holi/offline-sync

Production-grade offline-first synchronization package for the Health 3.0 platform. Provides clinical-aware caching strategies, background sync queue with exponential backoff, and conflict resolution for offline writes.

## Features

- **Clinical-Aware Caching**: Different caching strategies per resource type (CACHE_FIRST, NETWORK_FIRST, STALE_WHILE_REVALIDATE, NETWORK_ONLY)
- **Background Sync Queue**: Queues offline writes with automatic retry using exponential backoff
- **Conflict Resolution**: Handles sync conflicts with clinical safety checks (medication conflicts require manual review)
- **IndexedDB Offline Store**: Local patient data storage for offline access
- **Service Worker Registration**: Helpers for SW lifecycle management and network detection

## Safety Invariants

This package enforces four critical clinical safety invariants:

### CYRUS: Tenant-Scoped Caching
All cache keys include `tenantId` for strict isolation. Cross-tenant data is never served. On logout, all tenant data is completely evicted.

### ELENA: Offline Data Watermarking
Offline cached data displays "offline — pending review" watermark. Medication and prescription data ALWAYS requires human review before server sync.

### RUTH: Stale Data Warning
Cached data includes recency indicators. When data exceeds `staleWarningMs`, clinicians see "data may be stale" warning. For safety-critical data like medications, stale warnings appear within minutes.

### QUINN: Non-Blocking Sync Failures
Sync failures never block clinical workflow. Failed syncs are queued for retry with exponential backoff. Clinicians continue working while background sync processes.

## Installation

```bash
pnpm add @holi/offline-sync
```

## Quick Start

```typescript
import {
  ClinicalCacheManager,
  SyncQueue,
  ConflictResolver,
  initializeOfflineSync,
} from '@holi/offline-sync';

// Initialize service worker
const registration = await initializeOfflineSync({
  scriptPath: '/sw.js',
  scope: '/',
  onOnline: () => {
    // Sync when coming back online
    syncQueue.process(syncFn);
  },
  onOffline: () => {
    console.log('Offline - writes will be queued');
  },
});

// Initialize cache manager
const cacheManager = new ClinicalCacheManager();

// Initialize sync queue
const syncQueue = new SyncQueue();

// Initialize conflict resolver
const conflictResolver = new ConflictResolver();
```

## Core Components

### ClinicalCacheManager

Manages caching of clinical data with different strategies per resource type.

```typescript
// Store data with automatic metadata
await cacheManager.put('vitals-001', tenantId, vitalData, 'vital-signs');

// Retrieve with freshness check
const data = await cacheManager.get('vitals-001', tenantId);

// Check staleness (RUTH warning)
const isStale = await cacheManager.isStale('vitals-001', tenantId);

// Evict all tenant data on logout (CYRUS)
await cacheManager.evict(tenantId);
```

**Default Rules:**
- `patient-demographics`: CACHE_FIRST, 24h max, 12h stale warning
- `active-medications`: NETWORK_FIRST, 15min max, 5min stale warning ⚠️
- `lab-results`: STALE_WHILE_REVALIDATE, 4h max, 1h stale warning
- `vital-signs`: STALE_WHILE_REVALIDATE, 30min max, 10min stale warning
- `prevention-alerts`: NETWORK_FIRST, 1h max, 30min stale warning
- `reference-data`: CACHE_FIRST, 7 days max, 3 days stale warning
- `imaging-metadata`: CACHE_FIRST, 24h max, 12h stale warning
- `encounter-active`: NETWORK_FIRST, 5min max, 2min stale warning
- `clinical-notes`: NETWORK_FIRST, 30min max, 10min stale warning

### SyncQueue

Manages offline writes with automatic retry and exponential backoff.

```typescript
// Enqueue an offline write
const itemId = await syncQueue.enqueue({
  tenantId: 'clinic-123',
  resourceType: 'vital-signs',
  method: 'POST',
  url: '/api/vitals',
  body: { heart_rate: 72 },
  maxRetries: 5,
  conflictResolution: 'LAST_WRITE_WINS',
});

// Monitor queue
const depth = await syncQueue.getQueueDepth();
const oldest = await syncQueue.getOldestPendingItem();

// Process queue (called when back online)
await syncQueue.process(async (item) => {
  const response = await fetch(item.url, {
    method: item.method,
    body: JSON.stringify(item.body),
  });
  if (!response.ok) throw new Error('Sync failed');
});

// Listen for events
syncQueue.on('sync-completed', (event) => {
  console.log(`Synced ${event.itemsCompleted} items`);
});

syncQueue.on('sync-failed', (event) => {
  console.log(`Retry ${event.retryCount}: ${event.itemId}`);
});
```

**Exponential Backoff Delays:**
- Retry 1: 1 second
- Retry 2: 2 seconds
- Retry 3: 4 seconds
- Retry 4: 8 seconds
- Retry 5+: 16 seconds (capped)

### ConflictResolver

Handles conflicts between local and server data with clinical safety checks.

```typescript
// Detect conflict
const conflict = await conflictResolver.detectConflict(
  'active-medications',
  localVersion,
  serverVersion,
);

// ELENA: Medication conflicts ALWAYS require manual review
console.log(conflict.requiresHumanReview); // true for medications

// Auto-resolve safe resources
if (conflict.resourceType === 'patient-demographics') {
  const resolution = await conflictResolver.resolve(conflict);
  // Returns 'LOCAL_WINS' for demographics
}

// Manual review for safety-critical resources
const pending = conflictResolver.getConflictsRequiringReview();
for (const conflict of pending) {
  // Display in UI for clinician review
  const resolved = await conflictResolver.manuallyResolve(
    conflict.id,
    'LOCAL_WINS',
    'dr-smith-id'
  );
}
```

**Resolution Strategies by Resource Type:**
- `patient-demographics`: LAST_WRITE_WINS (safe)
- `active-medications`: MANUAL_REVIEW (ELENA invariant)
- `lab-results`: SERVER_WINS (lab is authoritative)
- `vital-signs`: LAST_WRITE_WINS (clinician entry is authoritative)
- `clinical-notes`: MANUAL_REVIEW (never auto-merge)
- Other safety-critical: MANUAL_REVIEW (default)

### IndexedDB Offline Store

Local storage for patient data during offline periods.

```typescript
import { createOfflineStore } from '@holi/offline-sync';

// Create store (uses IndexedDB in browser, in-memory in tests)
const store = createOfflineStore(true); // true = use IndexedDB

// Store patient data (CYRUS: tenant-scoped)
await store.savePatientData(tenantId, patientId, patientData);

// Retrieve patient data
const data = await store.getPatientData(tenantId, patientId);

// Logout: clear all tenant data (CYRUS)
await store.clearTenantData(tenantId);
```

### Service Worker Registration

Helpers for SW lifecycle and network detection.

```typescript
import {
  registerServiceWorker,
  detectNetworkStatus,
  isOnline,
  sendMessageToServiceWorker,
} from '@holi/offline-sync';

// Register SW
const registration = await registerServiceWorker({
  scriptPath: '/sw.js',
  scope: '/',
  updateCheckIntervalMs: 60000,
  onSuccess: (reg) => console.log('SW registered'),
  onError: (err) => console.error('SW failed:', err),
  onUpdate: (reg) => console.log('SW updated'),
});

// Detect network changes
detectNetworkStatus(
  () => console.log('Online - start syncing'),
  () => console.log('Offline - queue writes'),
);

// Check current status
if (isOnline()) {
  // Start sync
}

// Send message to SW
const response = await sendMessageToServiceWorker({
  type: 'SYNC_DATA',
  tenantId: 'clinic-123',
});
```

## Testing

```bash
pnpm test

# Run specific test file
pnpm test cache-strategies.test.ts

# Generate coverage
pnpm test --coverage
```

## Architecture

```
packages/offline-sync/
├── src/
│   ├── types.ts                  # Type definitions and interfaces
│   ├── cache-strategies.ts       # Clinical caching logic
│   ├── sync-queue.ts            # Background sync with retry
│   ├── conflict-resolver.ts      # Conflict detection and resolution
│   ├── indexed-store.ts         # IndexedDB wrapper
│   ├── sw-register.ts           # Service worker helpers
│   ├── index.ts                 # Public exports
│   └── __tests__/               # Comprehensive test suite
│       ├── cache-strategies.test.ts
│       ├── sync-queue.test.ts
│       └── conflict-resolver.test.ts
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Safety and Compliance

This package is designed for clinical use in environments like Brazilian public health clinics with intermittent connectivity (3G networks). Key design decisions:

1. **CYRUS (Tenant Isolation)**: Every cache operation includes `tenantId`. Cross-tenant data access is prevented at all levels.

2. **ELENA (Medication Safety)**: All medication and prescription conflicts require human review. Auto-merge is disabled for safety-critical resources.

3. **RUTH (Data Freshness)**: Stale data warning thresholds are clinically appropriate (e.g., 5 minutes for medications vs 24 hours for demographics).

4. **QUINN (Non-Blocking)**: No sync failure ever blocks clinical workflow. Queue processing is always optional/background.

## Performance

- **Cache First**: 0ms latency for cached reference data (ICD-10, drug formulary)
- **Network First**: Immediate server freshness for safety-critical data with fallback to cache
- **Stale While Revalidate**: Instant results while background refresh improves freshness
- **Queue Depth**: Handles 1000+ offline writes before memory pressure
- **Conflict Detection**: O(1) for identical versions, O(n) for complex objects where n is property count

## Error Handling

The package follows the QUINN principle: **failures are never blocking**.

```typescript
try {
  await syncQueue.process(syncFn);
} catch (error) {
  // Never thrown - QUINN: failures don't block clinical workflow
  // All failures are queued for retry
}

// Check failed items for monitoring
const stats = await syncQueue.getStatistics();
if (stats.failedItems > 0) {
  console.warn(`${stats.failedItems} items queued for retry`);
}
```

## Monitoring

```typescript
// Cache statistics
const cacheStats = await cacheManager.getStatistics();
console.log(`${cacheStats.totalEntries} cache entries`);
console.log(cacheStats.entriesByTenant); // { tenant-123: 45 }

// Sync queue statistics
const queueStats = await syncQueue.getStatistics();
console.log(`${queueStats.pendingItems} items pending`);
console.log(`Oldest item age: ${queueStats.oldestItemAgeMs}ms`);

// Conflict statistics
const conflictStats = conflictResolver.getStatistics();
console.log(`${conflictStats.requiresManualReview} conflicts need review`);
```

## Browser Support

- Chrome/Edge 40+ (Service Workers)
- Firefox 44+ (Service Workers)
- Safari 11.1+ (Service Workers, partial IndexedDB)
- iOS Safari 12+ (limited Service Worker support)

## Dependencies

- `uuid`: For generating unique IDs
- `zod`: For runtime type validation (future use)

## License

Part of Health 3.0 platform for HoliLabs.
