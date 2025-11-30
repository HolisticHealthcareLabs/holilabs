/**
 * React Query Configuration
 * Offline-first sync with persistent cache and background updates
 */

import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Query Client Configuration
 * Optimized for clinical workflows with appropriate stale times
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Patient data stale time: 5 minutes (clinical data changes frequently)
      staleTime: 5 * 60 * 1000,
      // Cache time: 1 hour (keep in memory for quick access)
      gcTime: 60 * 60 * 1000,
      // Retry configuration for network resilience
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Network mode: offlineFirst (use cache while refetching)
      networkMode: 'offlineFirst',
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on window focus (mobile app)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry mutations on network failure
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Async Storage Persister
 * Persist query cache to device storage for offline access
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'HOLI_QUERY_CACHE',
  // Serialize with compression for PHI data
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
  // Throttle writes to reduce I/O
  throttleTime: 1000,
});

/**
 * Network Status Manager
 * Track online/offline status and pause queries when offline
 */
export class NetworkStatusManager {
  private static isOnline: boolean = true;
  private static listeners: Set<(isOnline: boolean) => void> = new Set();

  static initialize() {
    // Subscribe to network state changes
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Notify listeners if status changed
      if (wasOnline !== this.isOnline) {
        this.notifyListeners();

        // Resume queries when coming back online
        if (this.isOnline) {
          queryClient.resumePausedMutations().then(() => {
            queryClient.invalidateQueries();
          });
        }
      }
    });
  }

  static getIsOnline(): boolean {
    return this.isOnline;
  }

  static subscribe(listener: (isOnline: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isOnline));
  }
}

/**
 * Sync Queue Manager
 * Queue mutations for offline operation and sync when online
 */
interface QueuedMutation {
  id: string;
  mutationFn: () => Promise<any>;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'normal' | 'low';
}

export class SyncQueueManager {
  private static queue: QueuedMutation[] = [];
  private static STORAGE_KEY = 'HOLI_SYNC_QUEUE';
  private static isSyncing: boolean = false;

  /**
   * Load queue from storage on app start
   */
  static async initialize() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }

    // Auto-sync when network becomes available
    NetworkStatusManager.subscribe((isOnline) => {
      if (isOnline && this.queue.length > 0) {
        this.processSyncQueue();
      }
    });
  }

  /**
   * Add mutation to sync queue
   */
  static async addToQueue(
    id: string,
    mutationFn: () => Promise<any>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ) {
    const mutation: QueuedMutation = {
      id,
      mutationFn,
      timestamp: Date.now(),
      retryCount: 0,
      priority,
    };

    // Insert based on priority (high priority first)
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const insertIndex = this.queue.findIndex(
      (m) => priorityOrder[m.priority] > priorityOrder[priority]
    );

    if (insertIndex === -1) {
      this.queue.push(mutation);
    } else {
      this.queue.splice(insertIndex, 0, mutation);
    }

    await this.persistQueue();

    // Try to sync immediately if online
    if (NetworkStatusManager.getIsOnline()) {
      this.processSyncQueue();
    }
  }

  /**
   * Process sync queue
   */
  static async processSyncQueue() {
    if (this.isSyncing || this.queue.length === 0) return;

    this.isSyncing = true;

    while (this.queue.length > 0 && NetworkStatusManager.getIsOnline()) {
      const mutation = this.queue[0];

      try {
        await mutation.mutationFn();
        // Success - remove from queue
        this.queue.shift();
      } catch (error) {
        console.error('Sync queue mutation failed:', error);
        mutation.retryCount++;

        // Max 3 retries
        if (mutation.retryCount >= 3) {
          console.error('Max retries reached for mutation:', mutation.id);
          // Move to failed queue (could implement later)
          this.queue.shift();
        } else {
          // Keep in queue, will retry next time
          break;
        }
      }

      await this.persistQueue();
    }

    this.isSyncing = false;
  }

  /**
   * Get pending sync count
   */
  static getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Clear all pending syncs (use with caution)
   */
  static async clearQueue() {
    this.queue = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Persist queue to storage
   */
  private static async persistQueue() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }
}

/**
 * Query Keys
 * Centralized query key management for type safety
 */
export const queryKeys = {
  // Patients
  patients: ['patients'] as const,
  patient: (id: string) => ['patients', id] as const,
  patientVitals: (id: string) => ['patients', id, 'vitals'] as const,
  patientLabs: (id: string) => ['patients', id, 'labs'] as const,
  patientMedications: (id: string) => ['patients', id, 'medications'] as const,
  patientAllergies: (id: string) => ['patients', id, 'allergies'] as const,
  patientConsultations: (id: string) => ['patients', id, 'consultations'] as const,

  // EHR Access
  ehrPermissions: (patientId: string) => ['ehr-permissions', patientId] as const,
  ehrAccessLog: (patientId: string) => ['ehr-access-log', patientId] as const,

  // Consultations
  consultations: ['consultations'] as const,
  consultation: (id: string) => ['consultations', id] as const,
  consultationTranscript: (id: string) => ['consultations', id, 'transcript'] as const,
  consultationSoapNote: (id: string) => ['consultations', id, 'soap-note'] as const,

  // Diagnoses
  diagnoses: (consultationId: string) => ['diagnoses', consultationId] as const,
  diagnosisInsights: (consultationId: string) =>
    ['diagnoses', consultationId, 'insights'] as const,

  // Appointments
  appointments: ['appointments'] as const,
  appointment: (id: string) => ['appointments', id] as const,
  upcomingAppointments: ['appointments', 'upcoming'] as const,

  // User/Doctor
  currentUser: ['current-user'] as const,
  userPreferences: ['user-preferences'] as const,
} as const;

/**
 * Cache Invalidation Helpers
 */
export const invalidateQueries = {
  patient: (patientId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patient(patientId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.patientVitals(patientId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.patientLabs(patientId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.patientMedications(patientId) });
  },
  consultation: (consultationId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.consultation(consultationId) });
    queryClient.invalidateQueries({
      queryKey: queryKeys.consultationTranscript(consultationId),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.consultationSoapNote(consultationId) });
  },
  allPatients: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patients });
  },
};

/**
 * Prefetch Helpers
 * Optimize performance by prefetching related data
 */
export const prefetchQueries = {
  patientDetails: async (patientId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.patient(patientId),
        queryFn: () => fetch(`/api/patients/${patientId}`).then((r) => r.json()),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.patientVitals(patientId),
        queryFn: () => fetch(`/api/patients/${patientId}/vitals`).then((r) => r.json()),
      }),
    ]);
  },
};
