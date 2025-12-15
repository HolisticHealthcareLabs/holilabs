/**
 * Device Sync Hook
 * Real-time synchronization between paired devices
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { permissionManager } from '@/lib/qr/permission-manager';
import { logger } from '@/lib/logger';

export interface SyncMessage {
  type: 'STATE_UPDATE' | 'RECORDING_STATUS' | 'PATIENT_CHANGE' | 'PERMISSION_CHANGE' | 'PING';
  payload: any;
  timestamp: number;
  deviceId: string;
}

export interface DeviceSyncOptions {
  sessionId?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
}

export function useDeviceSync(options: DeviceSyncOptions = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const [lastMessage, setLastMessage] = useState<SyncMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sessionId = 'default',
    autoConnect = true,
    reconnectInterval = 5000,
  } = options;

  /**
   * Connect to sync server
   */
  const connect = useCallback(() => {
    if (!session?.user?.id) {
      logger.warn({
        event: 'device_sync_connect_failed',
        reason: 'no_user_session'
      });
      return;
    }

    // In production, this would be your WebSocket server URL
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const url = `${wsUrl}/sync?userId=${session.user.id}&sessionId=${sessionId}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.info({
          event: 'device_sync_connected',
          sessionId,
          userId: session.user.id
        });
        setIsConnected(true);

        // Send initial state
        sendMessage({
          type: 'PING',
          payload: {
            deviceId: getDeviceId(),
            timestamp: Date.now(),
          },
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Update connected devices list
          if (message.type === 'PING' && message.deviceId) {
            setConnectedDevices((prev) =>
              prev.includes(message.deviceId) ? prev : [...prev, message.deviceId]
            );
          }
        } catch (error) {
          logger.error({
            event: 'device_sync_message_parse_failed',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      };

      ws.onerror = (error) => {
        logger.error({
          event: 'device_sync_error',
          error: String(error)
        });
        setIsConnected(false);
      };

      ws.onclose = () => {
        logger.info({
          event: 'device_sync_disconnected',
          sessionId
        });
        setIsConnected(false);

        // Auto-reconnect
        if (autoConnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            logger.info({
              event: 'device_sync_reconnect_attempt',
              sessionId
            });
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      logger.error({
        event: 'device_sync_connect_failed',
        error: error instanceof Error ? error.message : String(error),
        sessionId
      });
      setIsConnected(false);
    }
  }, [session, sessionId, autoConnect, reconnectInterval]);

  /**
   * Disconnect from sync server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectedDevices([]);
  }, []);

  /**
   * Send message to all connected devices
   */
  const sendMessage = useCallback((message: Omit<SyncMessage, 'deviceId' | 'timestamp'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      logger.warn({
        event: 'device_sync_send_failed',
        reason: 'not_connected',
        messageType: message.type
      });
      return false;
    }

    const fullMessage: SyncMessage = {
      ...message,
      deviceId: getDeviceId(),
      timestamp: Date.now(),
    };

    try {
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      logger.error({
        event: 'device_sync_send_failed',
        error: error instanceof Error ? error.message : String(error),
        messageType: message.type
      });
      return false;
    }
  }, []);

  /**
   * Broadcast state update
   */
  const broadcastState = useCallback((state: any) => {
    return sendMessage({
      type: 'STATE_UPDATE',
      payload: state,
    });
  }, [sendMessage]);

  /**
   * Broadcast recording status
   */
  const broadcastRecordingStatus = useCallback((isRecording: boolean, patientId?: string) => {
    return sendMessage({
      type: 'RECORDING_STATUS',
      payload: { isRecording, patientId },
    });
  }, [sendMessage]);

  /**
   * Broadcast patient change
   */
  const broadcastPatientChange = useCallback((patientId: string | null) => {
    return sendMessage({
      type: 'PATIENT_CHANGE',
      payload: { patientId },
    });
  }, [sendMessage]);

  /**
   * Check if device has permission
   */
  const hasPermission = useCallback((deviceId: string, permission: string) => {
    return permissionManager.hasPermission(deviceId, permission as any);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && session?.user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, session, connect, disconnect]);

  // Periodic ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({
        type: 'PING',
        payload: { timestamp: Date.now() },
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  return {
    // Connection state
    isConnected,
    connectedDevices,
    lastMessage,

    // Actions
    connect,
    disconnect,
    sendMessage,
    broadcastState,
    broadcastRecordingStatus,
    broadcastPatientChange,
    hasPermission,
  };
}

/**
 * Get or create device ID
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('device_id', deviceId);
  }

  return deviceId;
}
