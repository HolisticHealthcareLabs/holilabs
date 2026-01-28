/**
 * Real-Time Governance Updates Hook
 *
 * React hook for subscribing to real-time governance events
 * Replaces 5-second polling with instant Socket.IO push
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  initSocketClient,
  subscribeToEvent,
  getSocketStatus,
  joinRoom,
  leaveRoom,
} from '@/lib/socket/client';
import { SocketEvent, SocketRoom } from '@/lib/socket/events';
import type { GovernanceLogEvent, GovernanceOverrideEvent } from '@/lib/socket/events';

export interface GovernanceLog {
  id: string;
  createdAt: string;
  provider: string;
  safetyScore: number;
  latencyMs: number;
  session?: {
    user?: { email: string };
    patient?: { firstName: string; lastName: string };
  };
  events: Array<{
    id: string;
    ruleName: string;
    severity: string;
    actionTaken: string;
    description: string;
  }>;
}

export interface UseGovernanceRealtimeConfig {
  clinicId?: string;
  autoConnect?: boolean;
  onNewLog?: (log: GovernanceLogEvent) => void;
  onOverride?: (event: GovernanceOverrideEvent) => void;
  onBlocked?: (event: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface UseGovernanceRealtimeReturn {
  connected: boolean;
  recentEvents: GovernanceLogEvent[];
  overrideEvents: GovernanceOverrideEvent[];
  clearEvents: () => void;
  joinMonitoring: () => void;
  leaveMonitoring: () => void;
}

/**
 * Hook for real-time governance monitoring
 * Safety-critical: Provides instant updates instead of 5s polling
 */
export function useGovernanceRealtime(
  config: UseGovernanceRealtimeConfig = {}
): UseGovernanceRealtimeReturn {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [recentEvents, setRecentEvents] = useState<GovernanceLogEvent[]>([]);
  const [overrideEvents, setOverrideEvents] = useState<GovernanceOverrideEvent[]>([]);

  const unsubscribersRef = useRef<(() => void)[]>([]);
  const userId = session?.user?.id;

  // Handle incoming governance log event
  const handleLogEvent = useCallback(
    (event: GovernanceLogEvent) => {
      console.log('[Governance] Real-time log received:', event);

      setRecentEvents((prev) => {
        // Keep last 50 events, prepend new one
        const newEvents = [event, ...prev].slice(0, 50);
        return newEvents;
      });

      config.onNewLog?.(event);
    },
    [config]
  );

  // Handle override event
  const handleOverrideEvent = useCallback(
    (event: GovernanceOverrideEvent) => {
      console.log('[Governance] Override received:', event);

      setOverrideEvents((prev) => {
        const newEvents = [event, ...prev].slice(0, 50);
        return newEvents;
      });

      config.onOverride?.(event);
    },
    [config]
  );

  // Handle blocked event
  const handleBlockedEvent = useCallback(
    (event: any) => {
      console.log('[Governance] Blocked event received:', event);
      config.onBlocked?.(event);
    },
    [config]
  );

  // Join governance monitoring room
  const joinMonitoring = useCallback(() => {
    // Join the global governance monitoring room
    joinRoom('governance:monitor' as any, '');

    // Also join clinic room if available
    if (config.clinicId) {
      joinRoom(SocketRoom.CLINIC, config.clinicId);
    }
  }, [config.clinicId]);

  // Leave governance monitoring room
  const leaveMonitoring = useCallback(() => {
    leaveRoom('governance:monitor' as any, '');

    if (config.clinicId) {
      leaveRoom(SocketRoom.CLINIC, config.clinicId);
    }
  }, [config.clinicId]);

  // Clear all events
  const clearEvents = useCallback(() => {
    setRecentEvents([]);
    setOverrideEvents([]);
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

        // Auto-join monitoring room on connect
        joinMonitoring();
      });

      socket.on('disconnect', () => {
        setConnected(false);
        config.onDisconnect?.();
      });

      // Subscribe to governance events
      const unsubLog = subscribeToEvent(
        SocketEvent.GOVERNANCE_LOG_CREATED,
        handleLogEvent as any
      );

      const unsubOverride = subscribeToEvent(
        SocketEvent.GOVERNANCE_OVERRIDE,
        handleOverrideEvent as any
      );

      const unsubBlocked = subscribeToEvent(
        SocketEvent.GOVERNANCE_BLOCKED,
        handleBlockedEvent as any
      );

      unsubscribersRef.current = [unsubLog, unsubOverride, unsubBlocked];

      console.log('[Governance] Real-time subscriptions initialized');
    } catch (error) {
      console.error('[Governance] Socket initialization error:', error);
    }

    return () => {
      // Cleanup subscriptions
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
      leaveMonitoring();
    };
  }, [
    userId,
    config.autoConnect,
    handleLogEvent,
    handleOverrideEvent,
    handleBlockedEvent,
    joinMonitoring,
    leaveMonitoring,
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
    recentEvents,
    overrideEvents,
    clearEvents,
    joinMonitoring,
    leaveMonitoring,
  };
}

/**
 * Hook for subscribing to a specific governance event
 */
export function useGovernanceEvent(
  event: SocketEvent,
  callback: (data: any) => void
) {
  useEffect(() => {
    const unsubscribe = subscribeToEvent(event, callback);
    return unsubscribe;
  }, [event, callback]);
}
