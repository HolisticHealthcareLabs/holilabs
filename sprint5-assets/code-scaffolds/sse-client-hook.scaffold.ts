/**
 * useEventStream — SSE client hook for real-time event subscription
 *
 * Reference for src/hooks/useEventStream.ts
 *
 * Features: exponential backoff reconnection, event type filtering,
 *           connection state tracking, SSR-safe.
 *
 * @see sprint5-assets/code-scaffolds/sse-server.scaffold.ts — server endpoint
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface SSEEventData {
  type: string;
  id?: string;
  data: Record<string, unknown>;
}

interface UseEventStreamOptions {
  /** Filter events by type. If empty/undefined, receive all events. */
  eventTypes?: string[];
  /** SSE endpoint URL. Defaults to /api/events */
  url?: string;
  /** Auto-connect on mount. Default true. */
  autoConnect?: boolean;
  /** Max reconnection delay in ms. Default 30000. */
  maxReconnectDelay?: number;
}

interface UseEventStreamReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Most recent event received */
  lastEvent: SSEEventData | null;
  /** All events received in this session (capped at 100) */
  events: SSEEventData[];
  /** Unread event count (resets on read) */
  unreadCount: number;
  /** Manually trigger reconnection */
  reconnect: () => void;
  /** Disconnect and stop reconnecting */
  disconnect: () => void;
  /** Mark all events as read (resets unreadCount) */
  markRead: () => void;
}

// ─── Hook Implementation ─────────────────────────────────────────────────────

const MAX_EVENTS_BUFFER = 100;

export function useEventStream(options: UseEventStreamOptions = {}): UseEventStreamReturn {
  const {
    eventTypes,
    url = '/api/events',
    autoConnect = true,
    maxReconnectDelay = 30_000,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<SSEEventData | null>(null);
  const [events, setEvents] = useState<SSEEventData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000); // Start at 1s
  const shouldReconnectRef = useRef(true);
  const mountedRef = useRef(true);

  // ── Connect ────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    // SSR safety — EventSource only exists in browser
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');

    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      setStatus('connected');
      reconnectDelayRef.current = 1000; // Reset backoff on successful connect
    };

    // Listen for typed events
    const typesToListen = eventTypes && eventTypes.length > 0
      ? eventTypes
      : ['clinical_alert', 'message_received', 'delivery_update', 'screening_complete', 'encounter_updated'];

    for (const eventType of typesToListen) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const eventData: SSEEventData = {
            type: eventType,
            id: (e as MessageEvent & { lastEventId?: string }).lastEventId || undefined,
            data: JSON.parse(e.data),
          };

          setLastEvent(eventData);
          setEvents((prev) => {
            const next = [eventData, ...prev];
            return next.slice(0, MAX_EVENTS_BUFFER);
          });
          setUnreadCount((prev) => prev + 1);
        } catch {
          // Malformed event data — ignore
        }
      });
    }

    // Connection confirmation event
    es.addEventListener('connected', () => {
      if (!mountedRef.current) return;
      setStatus('connected');
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      setStatus('error');
      es.close();

      // Exponential backoff reconnection
      if (shouldReconnectRef.current) {
        const delay = reconnectDelayRef.current;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && shouldReconnectRef.current) {
            connect();
          }
        }, delay);
        // Increase delay: 1s → 2s → 4s → 8s → 16s → 30s (max)
        reconnectDelayRef.current = Math.min(delay * 2, maxReconnectDelay);
      } else {
        setStatus('disconnected');
      }
    };
  }, [url, eventTypes, maxReconnectDelay]);

  // ── Disconnect ─────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  // ── Reconnect ──────────────────────────────────────────────────────────

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    reconnectDelayRef.current = 1000; // Reset backoff
    connect();
  }, [connect]);

  // ── Mark Read ──────────────────────────────────────────────────────────

  const markRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // ── Lifecycle ──────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    shouldReconnectRef.current = true;

    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [autoConnect, connect]);

  return {
    status,
    lastEvent,
    events,
    unreadCount,
    reconnect,
    disconnect,
    markRead,
  };
}
