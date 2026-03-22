# Quick Reference - @holi/offline-sync

Fast lookup guide for the offline-sync package.

## Installation & Setup

```bash
# Install dependencies
cd /sessions/vigilant-happy-edison/mnt/prototypes/holilabsv2
pnpm install

# Build package
cd packages/offline-sync
pnpm build

# Run tests
pnpm test

# Run specific test
pnpm test cache-strategies.test.ts
```

## Safety Invariants at a Glance

| Invariant | What it Does | Where Enforced | Tests |
|-----------|-------------|-----------------|-------|
| **CYRUS** | Tenant-scoped caching | cache-strategies.ts | 6 tests |
| **ELENA** | Medication conflicts require manual review | conflict-resolver.ts | 8 tests |
| **RUTH** | Stale data warnings | cache-strategies.ts | 4 tests |
| **QUINN** | Non-blocking sync failures | sync-queue.ts | 5 tests |

## Core Classes

### ClinicalCacheManager
```typescript
const cacheManager = new ClinicalCacheManager();

// Store data
await cacheManager.put(key, tenantId, data, 'vital-signs');

// Retrieve data
const data = await cacheManager.get(key, tenantId);

// Check staleness
const isStale = await cacheManager.isStale(key, tenantId);

// Logout (clear tenant)
await cacheManager.evict(tenantId);
```

### SyncQueue
```typescript
const syncQueue = new SyncQueue();

// Queue offline write
const itemId = await syncQueue.enqueue({
  tenantId, resourceType, method, url, body,
  maxRetries: 5, conflictResolution: 'LAST_WRITE_WINS'
});

// Process queue
await syncQueue.process(syncFn);

// Monitor queue
const depth = await syncQueue.getQueueDepth();
```

### ConflictResolver
```typescript
const resolver = new ConflictResolver();

// Detect conflict
const conflict = await resolver.detectConflict(
  resourceType, localVersion, serverVersion
);

// Check if manual review needed
if (conflict.requiresHumanReview) {
  // Show UI for clinician decision
}

// Resolve manually
await resolver.manuallyResolve(conflictId, 'LOCAL_WINS', userId);
```

## Default Cache Rules

| Resource Type | Strategy | Max Age | Stale Warning | Writable |
|---------------|----------|---------|---------------|----------|
| patient-demographics | CACHE_FIRST | 24h | 12h | ❌ |
| active-medications | NETWORK_FIRST | 15m | 5m | ❌ |
| lab-results | STALE_WHILE_REVALIDATE | 4h | 1h | ❌ |
| vital-signs | STALE_WHILE_REVALIDATE | 30m | 10m | ✅ |
| prevention-alerts | NETWORK_FIRST | 1h | 30m | ❌ |
| reference-data | CACHE_FIRST | 7d | 3d | ❌ |
| imaging-metadata | CACHE_FIRST | 24h | 12h | ❌ |
| encounter-active | NETWORK_FIRST | 5m | 2m | ✅ |
| clinical-notes | NETWORK_FIRST | 30m | 10m | ✅ |

## Retry Backoff

```
Attempt 1: Wait 1s
Attempt 2: Wait 2s
Attempt 3: Wait 4s
Attempt 4: Wait 8s
Attempt 5: Wait 16s
Attempt 6+: Wait 16s (capped)
```

## Conflict Resolution by Type

| Resource Type | Strategy | Notes |
|---------------|----------|-------|
| patient-demographics | LAST_WRITE_WINS | Safe to auto-resolve |
| active-medications | MANUAL_REVIEW | ⚠️ ELENA: Always manual |
| lab-results | SERVER_WINS | Lab is authoritative |
| vital-signs | LAST_WRITE_WINS | Clinician is authoritative |
| prevention-alerts | SERVER_WINS | System-generated |
| reference-data | SERVER_WINS | Authoritative source |
| imaging-metadata | SERVER_WINS | System-computed |
| encounter-active | LAST_WRITE_WINS | Current work |
| clinical-notes | MANUAL_REVIEW | ⚠️ ELENA: Never auto-merge |

## Event Types

### SyncQueue Events
```typescript
syncQueue.on('sync-started', (event) => {
  // { type: 'sync-started', itemCount, oldestItemAgeMs }
});

syncQueue.on('sync-completed', (event) => {
  // { type: 'sync-completed', itemsCompleted, itemsFailed }
});

syncQueue.on('sync-failed', (event) => {
  // { type: 'sync-failed', itemId, error, retryCount }
});

syncQueue.on('conflict-detected', (event) => {
  // { type: 'conflict-detected', conflict }
});
```

## Code Snippets

### Initialize Everything
```typescript
import {
  ClinicalCacheManager,
  SyncQueue,
  ConflictResolver,
  initializeOfflineSync,
  detectNetworkStatus,
} from '@holi/offline-sync';

// Initialize SW
const registration = await initializeOfflineSync({
  scriptPath: '/sw.js',
  scope: '/',
  onOnline: () => syncQueue.process(syncFn),
  onOffline: () => console.log('Offline mode'),
});

// Create components
const cache = new ClinicalCacheManager();
const queue = new SyncQueue();
const resolver = new ConflictResolver();

// Monitor events
queue.on('sync-completed', (e) => {
  if (e.type === 'sync-completed') {
    console.log(`Synced ${e.itemsCompleted} items`);
  }
});
```

### Fetch with Caching
```typescript
async function getVitals(patientId: string) {
  const key = `vitals:${patientId}`;

  // Try cache first
  const cached = await cache.get(key, tenantId);
  if (cached && !await cache.isStale(key, tenantId)) {
    return cached;
  }

  // Fetch fresh
  try {
    const response = await fetch(`/api/patients/${patientId}/vitals`);
    const data = await response.json();
    await cache.put(key, tenantId, data, 'vital-signs');
    return data;
  } catch (error) {
    // Return stale cache if available
    return cached || throw error;
  }
}
```

### Queue Offline Writes
```typescript
async function recordVitals(patientId: string, vitals: any) {
  try {
    // Try sync immediately
    if (navigator.onLine) {
      const response = await fetch(`/api/patients/${patientId}/vitals`, {
        method: 'POST',
        body: JSON.stringify(vitals),
      });
      if (response.ok) return { success: true };
    }
  } catch (error) {
    // Fall through
  }

  // Queue for later (QUINN: non-blocking)
  const itemId = await queue.enqueue({
    tenantId,
    resourceType: 'vital-signs',
    method: 'POST',
    url: `/api/patients/${patientId}/vitals`,
    body: vitals,
    maxRetries: 5,
    conflictResolution: 'LAST_WRITE_WINS',
  });

  return { success: true, queued: itemId };
}
```

### Handle Conflicts
```typescript
async function resolveConflicts() {
  const pending = resolver.getConflictsRequiringReview();

  for (const conflict of pending) {
    if (conflict.resourceType === 'active-medications') {
      // ELENA: Show detailed review UI
      const decision = await showMedicationConflictUI(conflict);
      await resolver.manuallyResolve(conflict.id, decision, userId);
    }
  }
}
```

## Monitoring Commands

```typescript
// Cache stats
const stats = await cache.getStatistics();
console.log(`${stats.totalEntries} cache entries`);

// Queue stats
const queueStats = await queue.getStatistics();
console.log(`${queueStats.pendingItems} pending items`);

// Conflict stats
const conflictStats = resolver.getStatistics();
console.log(`${conflictStats.requiresManualReview} conflicts need review`);

// Check network
console.log(isOnline() ? 'Online' : 'Offline');
```

## Common Patterns

### Pattern 1: Safe Auto-Resolve (Demographics)
```typescript
const conflict = await resolver.detectConflict(
  'patient-demographics',
  { name: 'John' },
  { name: 'Jane' },
);

// Safe - demographics use LAST_WRITE_WINS
const resolution = await resolver.resolve(conflict!);
// Returns: LOCAL_WINS
```

### Pattern 2: Manual Review Required (Medications)
```typescript
const conflict = await resolver.detectConflict(
  'active-medications',
  { med: 'aspirin' },
  { med: 'ibuprofen' },
);

// ELENA: Always requires manual review
if (conflict.requiresHumanReview) {
  // Display in UI, wait for clinician decision
  const decision = await showConflictUI(conflict);
  await resolver.manuallyResolve(conflict.id, decision, userId);
}
```

### Pattern 3: Background Sync
```typescript
// On reconnection
window.addEventListener('online', async () => {
  const queueDepth = await queue.getQueueDepth();
  if (queueDepth > 0) {
    console.log(`Syncing ${queueDepth} items...`);
    await queue.process(performSync);
  }
});
```

### Pattern 4: Data Freshness Indicator
```typescript
// Show watermark if stale
const isStale = await cache.isStale(key, tenantId);
if (isStale) {
  showWatermark('Offline — pending review'); // RUTH + ELENA
}
```

## File Locations

- **Types**: `/packages/offline-sync/src/types.ts`
- **Cache**: `/packages/offline-sync/src/cache-strategies.ts`
- **Queue**: `/packages/offline-sync/src/sync-queue.ts`
- **Conflicts**: `/packages/offline-sync/src/conflict-resolver.ts`
- **Storage**: `/packages/offline-sync/src/indexed-store.ts`
- **SW Helpers**: `/packages/offline-sync/src/sw-register.ts`
- **Tests**: `/packages/offline-sync/src/__tests__/`
- **Docs**: README.md, EXAMPLES.md, IMPLEMENTATION_SUMMARY.md

## Test Files

- `cache-strategies.test.ts` - 35 tests covering caching
- `sync-queue.test.ts` - 40 tests covering background sync
- `conflict-resolver.test.ts` - 45 tests covering conflicts

Run with: `pnpm test`

## Performance Notes

- **Cache hits**: O(1) latency
- **Conflict detection**: O(1) for identical, O(n) for complex objects
- **Queue operations**: O(1) for enqueue/dequeue
- **Eviction**: O(n) where n = entries for tenant

## Browser Support

- Chrome/Edge 40+ ✅
- Firefox 44+ ✅
- Safari 11.1+ ✅
- iOS Safari 12+ (limited)
- IE 11 ❌

## Errors & Troubleshooting

### Service Worker Not Registering
```
navigator.serviceWorker not available
→ Check browser support
→ Check HTTPS/localhost (not HTTP)
```

### Cache Not Persisting
```
Storage quota exceeded
→ Implement quota management
→ Use smaller datasets
```

### Conflicts Not Detected
```
Versions are JSON stringified and compared
→ Ensure consistent object structure
→ Check for circular references
```

## Next Steps

1. **Setup**: Run `pnpm install` in monorepo root
2. **Build**: Run `pnpm build` in package directory
3. **Test**: Run `pnpm test` to validate all tests pass
4. **Integrate**: Import into your app and follow examples
5. **Monitor**: Use diagnostics for queue/cache/conflict tracking

## Documentation Links

- Full README: `/packages/offline-sync/README.md`
- Examples: `/packages/offline-sync/EXAMPLES.md`
- Implementation: `/packages/offline-sync/IMPLEMENTATION_SUMMARY.md`
- Files: `/packages/offline-sync/FILES_MANIFEST.md`
- This guide: `/packages/offline-sync/QUICK_REFERENCE.md`
