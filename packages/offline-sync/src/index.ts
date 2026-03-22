/**
 * Health 3.0 Offline Sync Package
 * Production-grade offline-first sync for clinical data
 */

// Type exports
export * from './types';

// Cache strategies
export {
  ClinicalCacheManager,
  CacheStrategyExecutor,
  InMemoryStorageBackend,
} from './cache-strategies';

// Sync queue
export {
  SyncQueue,
  InMemorySyncStorage,
} from './sync-queue';

// Conflict resolver
export {
  ConflictResolver,
  defaultConflictResolver,
} from './conflict-resolver';

// Offline store
export {
  InMemoryOfflineStore,
  IndexedDBOfflineStore,
  createOfflineStore,
} from './indexed-store';

// Service worker registration
export {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerRegistered,
  getServiceWorkerRegistration,
  sendMessageToServiceWorker,
  listenToServiceWorker,
  detectNetworkStatus,
  isOnline,
  initializeOfflineSync,
  type SWRegistrationOptions,
} from './sw-register';
