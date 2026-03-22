# Usage Examples - @holi/offline-sync

Real-world examples for integrating the offline-sync package into Health 3.0 applications.

## 1. Complete Application Setup

```typescript
// app-bootstrap.ts
import {
  ClinicalCacheManager,
  SyncQueue,
  ConflictResolver,
  createOfflineStore,
  initializeOfflineSync,
  isOnline,
} from '@holi/offline-sync';

// Initialize all components
export async function bootstrapOfflineSync(tenantId: string) {
  // Initialize service worker
  const swRegistration = await initializeOfflineSync({
    scriptPath: '/sw.js',
    scope: '/',
    onOnline: () => {
      console.log('Back online - syncing pending data');
      syncQueue.process(performSync);
    },
    onOffline: () => {
      console.log('Offline - writes will be queued');
    },
  });

  // Create cache manager
  const cacheManager = new ClinicalCacheManager();

  // Create sync queue
  const syncQueue = new SyncQueue();

  // Create conflict resolver
  const conflictResolver = new ConflictResolver();

  // Create offline store
  const offlineStore = createOfflineStore(true); // Use IndexedDB

  // Set up event listeners
  syncQueue.on('sync-completed', (event) => {
    if (event.type === 'sync-completed') {
      console.log(`Synced ${event.itemsCompleted} items`);
      if (event.itemsFailed > 0) {
        console.warn(`${event.itemsFailed} items failed, will retry`);
      }
    }
  });

  syncQueue.on('conflict-detected', (event) => {
    if (event.type === 'conflict-detected') {
      const conflict = event.conflict;
      if (conflict.requiresHumanReview) {
        // Display in UI for clinician decision
        showConflictReviewDialog(conflict);
      }
    }
  });

  // Schedule periodic sync
  setInterval(async () => {
    if (isOnline()) {
      await syncQueue.process(performSync);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  return {
    cacheManager,
    syncQueue,
    conflictResolver,
    offlineStore,
    swRegistration,
    tenantId,
  };
}
```

## 2. Fetching Clinical Data with Smart Caching

```typescript
// clinical-api.ts
import { ClinicalCacheManager } from '@holi/offline-sync';

class ClinicalAPI {
  constructor(
    private cacheManager: ClinicalCacheManager,
    private tenantId: string,
  ) {}

  /**
   * Fetch patient vitals with intelligent caching
   * - Returns cached data if available
   * - Shows stale warning if data is old
   * - Updates cache in background
   */
  async getVitalSigns(patientId: string): Promise<VitalData> {
    const cacheKey = `vitals:${patientId}`;

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey, this.tenantId);
    if (cached) {
      const isStale = await this.cacheManager.isStale(cacheKey, this.tenantId);
      if (isStale) {
        // Background update (don't await)
        this.fetchAndCacheVitals(patientId).catch((err) => {
          console.warn('Background vitals update failed:', err);
        });
      }
      return { data: cached as VitalData, fromCache: true, isStale };
    }

    // Cache miss - fetch from server
    return this.fetchAndCacheVitals(patientId);
  }

  private async fetchAndCacheVitals(patientId: string): Promise<VitalData> {
    try {
      const response = await fetch(`/api/patients/${patientId}/vitals`);
      if (!response.ok) throw new Error('Failed to fetch vitals');

      const vitals = await response.json();
      const cacheKey = `vitals:${patientId}`;

      await this.cacheManager.put(
        cacheKey,
        this.tenantId,
        vitals,
        'vital-signs'
      );

      return { data: vitals, fromCache: false, isStale: false };
    } catch (error) {
      // On error, try cache as fallback
      const cacheKey = `vitals:${patientId}`;
      const cached = await this.cacheManager.get(cacheKey, this.tenantId);
      if (cached) {
        return { data: cached as VitalData, fromCache: true, fromCacheFallback: true };
      }
      throw error;
    }
  }

  /**
   * Fetch active medications (NETWORK_FIRST - safety critical)
   * Always tries to get fresh data due to safety requirements
   */
  async getActiveMedications(patientId: string): Promise<Medication[]> {
    const cacheKey = `meds:${patientId}`;

    try {
      // Always fetch fresh (safety-critical)
      const response = await fetch(
        `/api/patients/${patientId}/medications/active`
      );
      if (!response.ok) throw new Error('Failed to fetch medications');

      const meds = await response.json();
      await this.cacheManager.put(
        cacheKey,
        this.tenantId,
        meds,
        'active-medications'
      );

      return meds;
    } catch (error) {
      // Fallback to cache if available
      const cached = await this.cacheManager.get(cacheKey, this.tenantId);
      if (cached) {
        console.warn('Using cached medications due to network error');
        return cached as Medication[];
      }

      // No cache - critical error
      throw new Error(
        'Cannot fetch medications and no cached version available'
      );
    }
  }

  /**
   * Fetch reference data (ICD-10 codes, drug formulary)
   * Safe to cache for extended periods
   */
  async getICD10Codes(searchTerm: string): Promise<ICD10Code[]> {
    const cacheKey = `icd10:${searchTerm}`;

    // Check cache first
    const cached = await this.cacheManager.get(cacheKey, this.tenantId);
    if (cached) {
      return cached as ICD10Code[];
    }

    // Fetch and cache
    const response = await fetch(`/api/reference/icd10?search=${searchTerm}`);
    const codes = await response.json();

    await this.cacheManager.put(
      cacheKey,
      this.tenantId,
      codes,
      'reference-data'
    );

    return codes;
  }
}
```

## 3. Offline Write Handling with Sync Queue

```typescript
// offline-writes.ts
import { SyncQueue } from '@holi/offline-sync';

class OfflineVitalWriter {
  constructor(private syncQueue: SyncQueue, private tenantId: string) {}

  /**
   * Record vital signs locally, queue for sync
   * Returns immediately even if offline (QUINN principle)
   */
  async recordVitals(
    patientId: string,
    vitals: VitalSignsInput
  ): Promise<{ success: boolean; queuedItemId?: string; error?: string }> {
    try {
      // First, try to sync to server immediately if online
      if (navigator.onLine) {
        const response = await fetch(`/api/patients/${patientId}/vitals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vitals),
        });

        if (response.ok) {
          return { success: true };
        }
      }

      // If offline or sync failed, queue for later (QUINN: non-blocking)
      const itemId = await this.syncQueue.enqueue({
        tenantId: this.tenantId,
        resourceType: 'vital-signs',
        method: 'POST',
        url: `/api/patients/${patientId}/vitals`,
        body: vitals,
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      return { success: true, queuedItemId: itemId };
    } catch (error) {
      // QUINN: Log error but don't throw - clinician continues working
      console.error('Failed to record vitals:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Record clinical note with offline support
   * Notes require manual conflict resolution (ELENA)
   */
  async addClinicalNote(
    patientId: string,
    note: string
  ): Promise<{ success: boolean; queuedItemId?: string }> {
    // Try immediate sync
    if (navigator.onLine) {
      try {
        const response = await fetch(
          `/api/patients/${patientId}/clinical-notes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: note, createdAt: new Date() }),
          }
        );

        if (response.ok) {
          return { success: true };
        }
      } catch (error) {
        // Fall through to queue
      }
    }

    // Queue for sync (clinical notes require review on conflict - ELENA)
    const itemId = await this.syncQueue.enqueue({
      tenantId: this.tenantId,
      resourceType: 'clinical-notes',
      method: 'POST',
      url: `/api/patients/${patientId}/clinical-notes`,
      body: { content: note, createdAt: new Date() },
      maxRetries: 5,
      conflictResolution: 'MANUAL_REVIEW', // ELENA: always manual for notes
    });

    return { success: true, queuedItemId: itemId };
  }
}
```

## 4. Conflict Resolution Workflow

```typescript
// conflict-management.ts
import { ConflictResolver } from '@holi/offline-sync';

class ConflictManagementUI {
  constructor(private conflictResolver: ConflictResolver) {}

  /**
   * Display pending conflicts to clinician
   */
  async showPendingConflicts(): Promise<void> {
    const conflicts = this.conflictResolver.getConflictsRequiringReview();

    for (const conflict of conflicts) {
      if (conflict.resourceType === 'active-medications') {
        // ELENA: Show detailed medication conflict review
        await this.showMedicationConflictReview(conflict);
      } else if (conflict.resourceType === 'clinical-notes') {
        // Show note merge dialog
        await this.showNoteMergeDialog(conflict);
      } else {
        // Show generic conflict review
        await this.showGenericConflictReview(conflict);
      }
    }
  }

  /**
   * ELENA invariant: Special handling for medication conflicts
   * Never auto-resolve, require pharmacist/clinician review
   */
  private async showMedicationConflictReview(conflict: any): Promise<void> {
    const dialog = createDialog({
      title: 'Medication Conflict Requires Review',
      content: `
        <div class="conflict-review medication-conflict">
          <p class="warning">
            ⚠️ Medication change detected. This requires clinical review before approval.
          </p>

          <div class="version-comparison">
            <div class="local-version">
              <h4>Your Version (Offline Edit)</h4>
              <pre>${JSON.stringify(conflict.localVersion, null, 2)}</pre>
            </div>

            <div class="server-version">
              <h4>Server Version</h4>
              <pre>${JSON.stringify(conflict.serverVersion, null, 2)}</pre>
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-local" data-action="LOCAL_WINS">
              Use Local Version (Your Edit)
            </button>
            <button class="btn btn-server" data-action="SERVER_WINS">
              Use Server Version (Discard Your Edit)
            </button>
            <button class="btn btn-pharmacist" data-action="ESCALATE">
              Escalate to Pharmacist
            </button>
          </div>
        </div>
      `,
    });

    const resolution = await dialog.waitForResolution();

    if (resolution === 'ESCALATE') {
      // Assign to pharmacist
      await this.conflictResolver.manuallyResolve(
        conflict.id,
        'MANUAL', // Keep pending
        'escalated-to-pharmacy'
      );
      showNotification('Escalated to pharmacy for review');
    } else {
      const outcome = resolution === 'LOCAL_WINS' ? 'LOCAL_WINS' : 'SERVER_WINS';
      await this.conflictResolver.manuallyResolve(
        conflict.id,
        outcome,
        getCurrentUserId()
      );
    }
  }

  /**
   * Show conflict for clinical notes (manual merge)
   */
  private async showNoteMergeDialog(conflict: any): Promise<void> {
    const dialog = createDialog({
      title: 'Clinical Note Conflict - Manual Merge Required',
      content: `
        <div class="note-merge">
          <p>Both local and server versions of this note have changes.</p>
          <p>Review and select which version to keep:</p>

          <textarea class="local-note" readonly>
            ${conflict.localVersion.content}
          </textarea>

          <textarea class="server-note" readonly>
            ${conflict.serverVersion.content}
          </textarea>

          <textarea class="merged-note" placeholder="Manually merge if needed..."></textarea>

          <button class="btn" data-action="LOCAL_WINS">Use Local</button>
          <button class="btn" data-action="SERVER_WINS">Use Server</button>
          <button class="btn primary" data-action="MERGED">Use Merged</button>
        </div>
      `,
    });

    const resolution = await dialog.waitForResolution();
    await this.conflictResolver.manuallyResolve(
      conflict.id,
      resolution === 'MERGED' ? 'LOCAL_WINS' : resolution,
      getCurrentUserId()
    );
  }
}
```

## 5. Monitoring and Diagnostics

```typescript
// diagnostics.ts
import { ClinicalCacheManager, SyncQueue, ConflictResolver } from '@holi/offline-sync';

class OfflineSyncDiagnostics {
  constructor(
    private cacheManager: ClinicalCacheManager,
    private syncQueue: SyncQueue,
    private conflictResolver: ConflictResolver
  ) {}

  /**
   * Generate diagnostics report
   */
  async getDiagnosticsReport(): Promise<DiagnosticsReport> {
    const [cacheStats, queueStats, conflictStats] = await Promise.all([
      this.cacheManager.getStatistics(),
      this.syncQueue.getStatistics(),
      this.getConflictStats(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      networkStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
      cache: {
        totalEntries: cacheStats.totalEntries,
        entriesByTenant: cacheStats.entriesByTenant,
      },
      syncQueue: {
        totalItems: queueStats.totalItems,
        pendingItems: queueStats.pendingItems,
        failedItems: queueStats.failedItems,
        completedItems: queueStats.completedItems,
        oldestItemAgeMinutes: queueStats.oldestItemAgeMs
          ? Math.round(queueStats.oldestItemAgeMs / 60000)
          : null,
      },
      conflicts: {
        totalConflicts: conflictStats.totalConflicts,
        pendingConflicts: conflictStats.pendingConflicts,
        requiresManualReview: conflictStats.requiresManualReview,
        resolvedConflicts: conflictStats.resolvedConflicts,
      },
      health: this.calculateHealthScore(cacheStats, queueStats, conflictStats),
    };
  }

  private getConflictStats() {
    return this.conflictResolver.getStatistics();
  }

  private calculateHealthScore(
    cacheStats: any,
    queueStats: any,
    conflictStats: any
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    // CRITICAL if many pending conflicts or old sync items
    if (
      conflictStats.requiresManualReview > 5 ||
      (queueStats.oldestItemAgeMs && queueStats.oldestItemAgeMs > 60 * 60 * 1000)
    ) {
      return 'CRITICAL';
    }

    // WARNING if any pending items or conflicts
    if (queueStats.pendingItems > 0 || conflictStats.pendingConflicts > 0) {
      return 'WARNING';
    }

    // HEALTHY if everything looks good
    return 'HEALTHY';
  }

  /**
   * Log performance metrics
   */
  logMetrics(): void {
    this.getDiagnosticsReport().then((report) => {
      console.group('📊 Offline Sync Diagnostics');
      console.log('Network:', report.networkStatus);
      console.log('Cache:', report.cache);
      console.log('Sync Queue:', report.syncQueue);
      console.log('Conflicts:', report.conflicts);
      console.log('Health:', report.health);
      console.groupEnd();
    });
  }
}
```

## 6. React Component Example

```typescript
// PatientVitalsForm.tsx
import React, { useEffect, useState } from 'react';
import { useOfflineSync } from './hooks/useOfflineSync';

export function PatientVitalsForm({ patientId }: { patientId: string }) {
  const { cacheManager, syncQueue, isStale } = useOfflineSync();
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    // Load vitals from cache
    (async () => {
      const cached = await cacheManager.get(`vitals:${patientId}`, 'current-tenant');
      if (cached) {
        setVitals(cached);
        const stale = await isStale(`vitals:${patientId}`);
        setIsStale(stale);
      }
      setLoading(false);
    })();

    // Update queue count
    const updateQueueCount = async () => {
      const depth = await syncQueue.getQueueDepth();
      setQueuedCount(depth);
    };

    const interval = setInterval(updateQueueCount, 5000);
    return () => clearInterval(interval);
  }, [patientId]);

  const handleSaveVitals = async (newVitals: any) => {
    setSaving(true);

    try {
      // Try immediate sync
      const response = await fetch(`/api/patients/${patientId}/vitals`, {
        method: 'POST',
        body: JSON.stringify(newVitals),
      });

      if (response.ok) {
        setVitals(newVitals);
        showSuccess('Vitals saved');
      } else {
        // Queue for later
        await syncQueue.enqueue({
          tenantId: 'current-tenant',
          resourceType: 'vital-signs',
          method: 'POST',
          url: `/api/patients/${patientId}/vitals`,
          body: newVitals,
          maxRetries: 5,
          conflictResolution: 'LAST_WRITE_WINS',
        });
        setVitals(newVitals);
        showInfo('Vitals saved locally, will sync when online');
      }
    } catch (error) {
      // Queue for sync
      await syncQueue.enqueue({
        tenantId: 'current-tenant',
        resourceType: 'vital-signs',
        method: 'POST',
        url: `/api/patients/${patientId}/vitals`,
        body: newVitals,
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });
      showInfo('Offline: vitals queued for sync');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="vital-signs-form">
      {/* RUTH: Show stale warning if data is old */}
      {isStale && (
        <div className="alert alert-warning">
          ⚠️ Vital signs data may be stale. Syncing fresh data...
        </div>
      )}

      {/* QUINN: Show queue status */}
      {queuedCount > 0 && (
        <div className="alert alert-info">
          📤 {queuedCount} item(s) queued for sync. Will sync when online.
        </div>
      )}

      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleSaveVitals(Object.fromEntries(formData));
      }}>
        <input name="heart_rate" defaultValue={vitals?.heart_rate} />
        <input name="blood_pressure" defaultValue={vitals?.blood_pressure} />
        <input name="temperature" defaultValue={vitals?.temperature} />
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Vitals'}
        </button>
      </form>
    </div>
  );
}
```

## 7. Service Worker Implementation

```typescript
// sw.ts - Service Worker
import { SyncQueue } from '@holi/offline-sync';

const syncQueue = new SyncQueue();

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      syncQueue.process(async (item) => {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body),
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.status}`);
        }
      })
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'TRIGGER_SYNC') {
    const stats = await syncQueue.getStatistics();
    event.ports[0].postMessage({ success: true, stats });
  }
});
```

These examples show practical integration patterns for using the offline-sync package in real clinical applications.
