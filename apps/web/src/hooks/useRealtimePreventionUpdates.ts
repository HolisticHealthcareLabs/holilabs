/**
 * Real-Time Prevention Updates Hook
 *
 * React hook for subscribing to real-time prevention plan and template updates
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  initSocketClient,
  getSocketClient,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  subscribeToEvent,
  subscribeToEvents,
  isSocketConnected,
  getSocketStatus,
} from '@/lib/socket/client';
import {
  SocketEvent,
  SocketRoom,
  SocketNotification,
  NotificationPriority,
} from '@/lib/socket/events';
import { logger } from '@/lib/logger';

export interface UseRealtimePreventionUpdatesConfig {
  userId?: string;
  autoConnect?: boolean;
  events?: SocketEvent[];
  onNotification?: (notification: SocketNotification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface UseRealtimePreventionUpdatesReturn {
  // Connection state
  connected: boolean;
  socketId: string | undefined;

  // Notifications
  notifications: SocketNotification[];
  unreadCount: number;
  clearNotifications: () => void;
  markAsRead: (notificationId: string) => void;

  // Room management
  joinPlanRoom: (planId: string) => void;
  leavePlanRoom: (planId: string) => void;
  joinTemplateRoom: (templateId: string) => void;
  leaveTemplateRoom: (templateId: string) => void;

  // Connection control
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * Hook for real-time prevention updates
 */
export function useRealtimePreventionUpdates(
  config: UseRealtimePreventionUpdatesConfig = {}
): UseRealtimePreventionUpdatesReturn {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>(undefined);
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Track read notifications
  const readNotificationsRef = useRef<Set<string>>(new Set());

  // Get userId from config or session
  const userId = config.userId || session?.user?.id;

  // Default events to subscribe to
  const defaultEvents: SocketEvent[] = [
    SocketEvent.PLAN_CREATED,
    SocketEvent.PLAN_UPDATED,
    SocketEvent.PLAN_DELETED,
    SocketEvent.PLAN_STATUS_CHANGED,
    SocketEvent.TEMPLATE_CREATED,
    SocketEvent.TEMPLATE_UPDATED,
    SocketEvent.TEMPLATE_DELETED,
    SocketEvent.TEMPLATE_USED,
    SocketEvent.TEMPLATE_ACTIVATED,
    SocketEvent.TEMPLATE_DEACTIVATED,
    SocketEvent.GOAL_ADDED,
    SocketEvent.GOAL_UPDATED,
    SocketEvent.GOAL_COMPLETED,
  ];

  const eventsToSubscribe = config.events || defaultEvents;

  // Handle incoming notifications
  const handleNotification = useCallback(
    (notification: SocketNotification) => {
      logger.info({
        event: 'realtime_notification_received',
        notificationId: notification.id,
        notificationType: notification.event,
        priority: notification.priority
      });

      // Add to notifications list
      setNotifications((prev) => [notification, ...prev]);

      // Increment unread count if not already read
      if (!readNotificationsRef.current.has(notification.id)) {
        setUnreadCount((prev) => prev + 1);
      }

      // Call custom callback if provided
      config.onNotification?.(notification);
    },
    [config]
  );

  // Initialize socket connection
  const connect = useCallback(() => {
    if (!userId) {
      logger.warn({
        event: 'realtime_connect_failed',
        reason: 'no_user_id'
      });
      return;
    }

    try {
      const socket = initSocketClient({
        userId,
        autoConnect: config.autoConnect !== false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Update connection state
      socket.on('connect', () => {
        setConnected(true);
        setSocketId(socket.id);
        config.onConnect?.();
      });

      socket.on('disconnect', () => {
        setConnected(false);
        setSocketId(undefined);
        config.onDisconnect?.();
      });

      socket.on('error', (error: Error) => {
        logger.error({
          event: 'realtime_socket_error',
          error: error.message,
          userId
        });
        config.onError?.(error);
      });

      // Subscribe to prevention events
      subscribeToEvents(eventsToSubscribe, handleNotification);

      logger.info({
        event: 'realtime_socket_initialized',
        userId,
        eventsCount: eventsToSubscribe.length
      });
    } catch (error) {
      logger.error({
        event: 'realtime_socket_init_failed',
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      config.onError?.(error as Error);
    }
  }, [userId, config, eventsToSubscribe, handleNotification]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    disconnectSocket();
    setConnected(false);
    setSocketId(undefined);
  }, []);

  // Reconnect socket
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Room management functions
  const joinPlanRoom = useCallback((planId: string) => {
    joinRoom(SocketRoom.PLAN, planId);
  }, []);

  const leavePlanRoom = useCallback((planId: string) => {
    leaveRoom(SocketRoom.PLAN, planId);
  }, []);

  const joinTemplateRoom = useCallback((templateId: string) => {
    joinRoom(SocketRoom.TEMPLATE, templateId);
  }, []);

  const leaveTemplateRoom = useCallback((templateId: string) => {
    leaveRoom(SocketRoom.TEMPLATE, templateId);
  }, []);

  // Notification management
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    readNotificationsRef.current.clear();
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    if (!readNotificationsRef.current.has(notificationId)) {
      readNotificationsRef.current.add(notificationId);
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  // Auto-connect on mount if user is available
  useEffect(() => {
    if (userId && config.autoConnect !== false) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [userId, config.autoConnect]); // Only run when userId or autoConnect changes

  // Update connection state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const status = getSocketStatus();
      setConnected(status.connected);
      setSocketId(status.id);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Connection state
    connected,
    socketId,

    // Notifications
    notifications,
    unreadCount,
    clearNotifications,
    markAsRead,

    // Room management
    joinPlanRoom,
    leavePlanRoom,
    joinTemplateRoom,
    leaveTemplateRoom,

    // Connection control
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Hook for subscribing to specific prevention events
 */
export function usePreventionEvent(
  event: SocketEvent,
  callback: (notification: SocketNotification) => void
) {
  useEffect(() => {
    const unsubscribe = subscribeToEvent(event, callback);
    return unsubscribe;
  }, [event, callback]);
}

/**
 * Hook for checking socket connection status
 */
export function useSocketConnection() {
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const updateStatus = () => {
      const status = getSocketStatus();
      setConnected(status.connected);
      setSocketId(status.id);
    };

    // Initial check
    updateStatus();

    // Update every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  return { connected, socketId };
}
