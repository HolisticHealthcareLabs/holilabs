/**
 * Offline Sync Hook
 * React hook for managing offline-first data synchronization
 */

import { useState, useEffect } from 'react';
import { NetworkStatusManager, SyncQueueManager } from '../config/queryClient';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingSyncCount: number;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const [isOnline, setIsOnline] = useState(NetworkStatusManager.getIsOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState(
    SyncQueueManager.getPendingCount()
  );
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = NetworkStatusManager.subscribe((online) => {
      setIsOnline(online);
    });

    // Poll for pending sync count updates
    const interval = setInterval(() => {
      setPendingSyncCount(SyncQueueManager.getPendingCount());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const syncNow = async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    setIsSyncing(true);
    try {
      await SyncQueueManager.processSyncQueue();
      setPendingSyncCount(SyncQueueManager.getPendingCount());
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    pendingSyncCount,
    syncNow,
    isSyncing,
  };
};
