/**
 * Real-Time Task Updates Hook
 *
 * React hook for subscribing to real-time task events
 * Provides instant updates for task creation, updates, completion, and deletion
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  initSocketClient,
  subscribeToEvent,
  subscribeToEvents,
  getSocketStatus,
  joinRoom,
  leaveRoom,
} from '@/lib/socket/client';
import { SocketEvent, SocketRoom, SocketNotification } from '@/lib/socket/events';
import type { TaskEvent } from '@/lib/socket/events';

export interface ProviderTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
  assignedTo: string;
  dueDate?: Date | null;
  relatedType?: string | null;
  relatedId?: string | null;
  completedAt?: Date | null;
  dismissedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UseTaskRealtimeConfig {
  userId?: string;
  clinicId?: string;
  autoConnect?: boolean;
  onTaskCreated?: (task: TaskEvent) => void;
  onTaskUpdated?: (task: TaskEvent) => void;
  onTaskCompleted?: (task: TaskEvent) => void;
  onTaskDismissed?: (task: TaskEvent) => void;
  onTaskDeleted?: (task: TaskEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface UseTaskRealtimeReturn {
  connected: boolean;
  recentTaskEvents: TaskEvent[];
  clearEvents: () => void;
  // Helpers for UI optimistic updates
  handleTaskCreated: (task: TaskEvent) => void;
  handleTaskUpdated: (task: TaskEvent) => void;
  handleTaskCompleted: (task: TaskEvent) => void;
  handleTaskDeleted: (task: TaskEvent) => void;
}

/**
 * Hook for real-time task updates
 * Pushes to assignee's room for immediate UI refresh
 */
export function useTaskRealtime(
  config: UseTaskRealtimeConfig = {}
): UseTaskRealtimeReturn {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [recentTaskEvents, setRecentTaskEvents] = useState<TaskEvent[]>([]);

  const unsubscribersRef = useRef<(() => void)[]>([]);
  const userId = config.userId || session?.user?.id;

  // Handle task created event
  const handleTaskCreated = useCallback(
    (event: TaskEvent) => {
      console.log('[Tasks] Real-time task created:', event);

      setRecentTaskEvents((prev) => {
        const newEvents = [event, ...prev].slice(0, 100);
        return newEvents;
      });

      config.onTaskCreated?.(event);
    },
    [config]
  );

  // Handle task updated event
  const handleTaskUpdated = useCallback(
    (event: TaskEvent) => {
      console.log('[Tasks] Real-time task updated:', event);

      setRecentTaskEvents((prev) => {
        // Update existing event or add new one
        const existing = prev.findIndex((e) => e.id === event.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = event;
          return updated;
        }
        return [event, ...prev].slice(0, 100);
      });

      config.onTaskUpdated?.(event);
    },
    [config]
  );

  // Handle task completed event
  const handleTaskCompleted = useCallback(
    (event: TaskEvent) => {
      console.log('[Tasks] Real-time task completed:', event);

      setRecentTaskEvents((prev) => {
        // Update existing event or add new one
        const existing = prev.findIndex((e) => e.id === event.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = event;
          return updated;
        }
        return [event, ...prev].slice(0, 100);
      });

      config.onTaskCompleted?.(event);
    },
    [config]
  );

  // Handle task dismissed event
  const handleTaskDismissed = useCallback(
    (event: TaskEvent) => {
      console.log('[Tasks] Real-time task dismissed:', event);

      setRecentTaskEvents((prev) => {
        const existing = prev.findIndex((e) => e.id === event.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = event;
          return updated;
        }
        return [event, ...prev].slice(0, 100);
      });

      config.onTaskDismissed?.(event);
    },
    [config]
  );

  // Handle task deleted event
  const handleTaskDeleted = useCallback(
    (event: TaskEvent) => {
      console.log('[Tasks] Real-time task deleted:', event);

      setRecentTaskEvents((prev) => {
        // Remove the deleted task from events
        return prev.filter((e) => e.id !== event.id);
      });

      config.onTaskDeleted?.(event);
    },
    [config]
  );

  // Clear all events
  const clearEvents = useCallback(() => {
    setRecentTaskEvents([]);
  }, []);

  // Initialize socket and subscribe to events
  useEffect(() => {
    if (!userId || config.autoConnect === false) {
      return;
    }

    try {
      const socket = initSocketClient({
        userId,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        setConnected(true);
        config.onConnect?.();

        // Join user room for task notifications
        joinRoom(SocketRoom.USER, userId);

        // Join clinic room if available
        if (config.clinicId) {
          joinRoom(SocketRoom.CLINIC, config.clinicId);
        }
      });

      socket.on('disconnect', () => {
        setConnected(false);
        config.onDisconnect?.();
      });

      // Subscribe to all task events
      const unsubCreated = subscribeToEvent(
        SocketEvent.TASK_CREATED,
        handleTaskCreated as any
      );

      const unsubUpdated = subscribeToEvent(
        SocketEvent.TASK_UPDATED,
        handleTaskUpdated as any
      );

      const unsubCompleted = subscribeToEvent(
        SocketEvent.TASK_COMPLETED,
        handleTaskCompleted as any
      );

      const unsubDismissed = subscribeToEvent(
        SocketEvent.TASK_DISMISSED,
        handleTaskDismissed as any
      );

      const unsubDeleted = subscribeToEvent(
        SocketEvent.TASK_DELETED,
        handleTaskDeleted as any
      );

      unsubscribersRef.current = [
        unsubCreated,
        unsubUpdated,
        unsubCompleted,
        unsubDismissed,
        unsubDeleted,
      ];

      console.log('[Tasks] Real-time subscriptions initialized for user:', userId);
    } catch (error) {
      console.error('[Tasks] Socket initialization error:', error);
    }

    return () => {
      // Cleanup subscriptions
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];

      // Leave rooms
      if (userId) {
        leaveRoom(SocketRoom.USER, userId);
      }
      if (config.clinicId) {
        leaveRoom(SocketRoom.CLINIC, config.clinicId);
      }
    };
  }, [
    userId,
    config.autoConnect,
    config.clinicId,
    handleTaskCreated,
    handleTaskUpdated,
    handleTaskCompleted,
    handleTaskDismissed,
    handleTaskDeleted,
    config,
  ]);

  // Update connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const status = getSocketStatus();
      setConnected(status.connected);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    connected,
    recentTaskEvents,
    clearEvents,
    handleTaskCreated,
    handleTaskUpdated,
    handleTaskCompleted,
    handleTaskDeleted,
  };
}

/**
 * Hook for subscribing to a specific task event
 */
export function useTaskEvent(
  event: SocketEvent,
  callback: (data: TaskEvent) => void
) {
  useEffect(() => {
    const unsubscribe = subscribeToEvent(event, callback as any);
    return unsubscribe;
  }, [event, callback]);
}

/**
 * Hook for subscribing to all task events with a single callback
 */
export function useAllTaskEvents(callback: (data: TaskEvent) => void) {
  const taskEvents: SocketEvent[] = [
    SocketEvent.TASK_CREATED,
    SocketEvent.TASK_UPDATED,
    SocketEvent.TASK_COMPLETED,
    SocketEvent.TASK_DISMISSED,
    SocketEvent.TASK_DELETED,
  ];

  useEffect(() => {
    const unsubscribers = taskEvents.map((event) =>
      subscribeToEvent(event, callback as any)
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [callback]);
}
