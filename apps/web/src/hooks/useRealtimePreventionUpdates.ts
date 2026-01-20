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
  PreventionConditionDetectedEvent,
  PreventionRecommendationEvent,
  PreventionFindingsProcessedEvent,
} from '@/lib/socket/events';
import { logger } from '@/lib/logger';
import type { DetectedConditionLite, RecommendationLite } from '@/lib/prevention/realtime';

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
    // Real-time prevention detection events (Enhanced Prevention Hub)
    SocketEvent.CONDITION_DETECTED,
    SocketEvent.RECOMMENDATION_CREATED,
    SocketEvent.ALERT_TRIGGERED,
    SocketEvent.FINDINGS_PROCESSED,
    SocketEvent.ENCOUNTER_LINKED,
    // Prevention plan events
    SocketEvent.PLAN_CREATED,
    SocketEvent.PLAN_UPDATED,
    SocketEvent.PLAN_DELETED,
    SocketEvent.PLAN_STATUS_CHANGED,
    // Template events
    SocketEvent.TEMPLATE_CREATED,
    SocketEvent.TEMPLATE_UPDATED,
    SocketEvent.TEMPLATE_DELETED,
    SocketEvent.TEMPLATE_USED,
    SocketEvent.TEMPLATE_ACTIVATED,
    SocketEvent.TEMPLATE_DEACTIVATED,
    // Goal events
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

/**
 * Detection event from server-side Prevention Engine
 */
export type DetectedConditionFromServer = DetectedConditionLite;

/**
 * Recommendation from server-side Prevention Engine
 */
export type RecommendationFromServer = RecommendationLite;

/**
 * Hook config for real-time prevention detection in the sidebar
 */
export interface UsePreventionDetectionConfig {
  patientId: string;
  encounterId?: string;
  sessionId?: string;
  autoConnect?: boolean;
  onConditionDetected?: (conditions: DetectedConditionFromServer[]) => void;
  onRecommendationCreated?: (recommendations: RecommendationFromServer[]) => void;
  onFindingsProcessed?: (event: PreventionFindingsProcessedEvent) => void;
}

/**
 * Hook return type for real-time prevention detection
 */
export interface UsePreventionDetectionReturn {
  connected: boolean;
  conditions: DetectedConditionFromServer[];
  recommendations: RecommendationFromServer[];
  processingTimeMs: number | null;
  isProcessing: boolean;
  clearDetections: () => void;
}

/**
 * Hook for real-time prevention detection during AI Scribe sessions
 *
 * Subscribes to server-side Prevention Engine events and updates UI in real-time
 * when conditions are detected from transcript analysis.
 */
export function usePreventionDetection(
  config: UsePreventionDetectionConfig
): UsePreventionDetectionReturn {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [conditions, setConditions] = useState<DetectedConditionFromServer[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationFromServer[]>([]);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const userId = session?.user?.id;

  // Handle condition detected event
  const handleConditionDetected = useCallback(
    (data: PreventionConditionDetectedEvent) => {
      // Filter by patient if configured
      if (config.patientId && data.patientId !== config.patientId) {
        return;
      }

      // Filter by encounter if configured
      if (config.encounterId && data.encounterId !== config.encounterId) {
        return;
      }

      logger.info({
        event: 'realtime_condition_detected',
        patientId: data.patientId,
        conditionsCount: data.conditions.length,
      });

      setConditions((prev) => {
        // Merge new conditions, avoiding duplicates by ID
        const existingIds = new Set(prev.map((c) => c.id));
        const newConditions = data.conditions.filter((c) => !existingIds.has(c.id));
        return [...prev, ...newConditions];
      });

      config.onConditionDetected?.(data.conditions);
    },
    [config]
  );

  // Handle recommendation created event
  const handleRecommendationCreated = useCallback(
    (data: PreventionRecommendationEvent) => {
      if (config.patientId && data.patientId !== config.patientId) {
        return;
      }

      if (config.encounterId && data.encounterId !== config.encounterId) {
        return;
      }

      logger.info({
        event: 'realtime_recommendation_created',
        patientId: data.patientId,
        recommendationType: data.type,
        priority: data.priority,
      });

      const recommendation: RecommendationFromServer = {
        id: data.id,
        type: data.type,
        title: data.title,
        description: data.description,
        priority: data.priority,
        guidelineSource: data.guidelineSource,
        uspstfGrade: data.uspstfGrade,
      };

      setRecommendations((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        if (existingIds.has(recommendation.id)) {
          return prev;
        }
        return [...prev, recommendation];
      });

      config.onRecommendationCreated?.([recommendation]);
    },
    [config]
  );

  // Handle findings processed event (batch update)
  const handleFindingsProcessed = useCallback(
    (data: PreventionFindingsProcessedEvent) => {
      if (config.patientId && data.patientId !== config.patientId) {
        return;
      }

      if (config.encounterId && data.encounterId !== config.encounterId) {
        return;
      }

      logger.info({
        event: 'realtime_findings_processed',
        patientId: data.patientId,
        conditionsCount: data.conditions.length,
        recommendationsCount: data.recommendations.length,
        processingTimeMs: data.processingTimeMs,
      });

      setIsProcessing(false);
      setProcessingTimeMs(data.processingTimeMs);

      // Update conditions
      setConditions((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newConditions = data.conditions
          .filter((c) => !existingIds.has(c.id))
          .map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            confidence: c.confidence,
          }));
        return [...prev, ...newConditions];
      });

      // Update recommendations
      setRecommendations((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newRecommendations = data.recommendations
          .filter((r) => !existingIds.has(r.id))
          .map((r) => ({
            id: r.id,
            type: r.type as RecommendationFromServer['type'],
            title: r.title,
            description: '',
            priority: r.priority as RecommendationFromServer['priority'],
            guidelineSource: '',
          }));
        return [...prev, ...newRecommendations];
      });

      config.onFindingsProcessed?.(data);
    },
    [config]
  );

  // Initialize socket connection and subscribe to events
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
        logger.info({
          event: 'prevention_detection_socket_connected',
          userId,
          patientId: config.patientId,
        });
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      // Subscribe to prevention detection events
      // Cast through unknown to handle different event payload types
      const unsubCondition = subscribeToEvent(
        SocketEvent.CONDITION_DETECTED,
        handleConditionDetected as unknown as (notification: SocketNotification) => void
      );

      const unsubRecommendation = subscribeToEvent(
        SocketEvent.RECOMMENDATION_CREATED,
        handleRecommendationCreated as unknown as (notification: SocketNotification) => void
      );

      const unsubFindings = subscribeToEvent(
        SocketEvent.FINDINGS_PROCESSED,
        handleFindingsProcessed as unknown as (notification: SocketNotification) => void
      );

      // Cleanup on unmount
      return () => {
        unsubCondition();
        unsubRecommendation();
        unsubFindings();
      };
    } catch (error) {
      logger.error({
        event: 'prevention_detection_socket_error',
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
    }
  }, [
    userId,
    config.autoConnect,
    config.patientId,
    handleConditionDetected,
    handleRecommendationCreated,
    handleFindingsProcessed,
  ]);

  // Clear detections
  const clearDetections = useCallback(() => {
    setConditions([]);
    setRecommendations([]);
    setProcessingTimeMs(null);
    setIsProcessing(false);
  }, []);

  return {
    connected,
    conditions,
    recommendations,
    processingTimeMs,
    isProcessing,
    clearDetections,
  };
}
