'use client';

/**
 * NotificationCenter — Step 5 (orchestrator)
 *
 * Self-contained component that the dashboard layout lazy-imports.
 * Manages state, fetches from API, renders bell + panel.
 * Respects two-mode system via useNotificationMode.
 *
 * CYRUS: all API calls scoped by authenticated session.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationBell } from './NotificationBell';
import { NotificationPanel, type AppNotification } from './NotificationPanel';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const hasFetched = useRef(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (disabled) return;
    try {
      const res = await fetch('/api/notifications?limit=20', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setDisabled(true);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
        setUnreadCount(data.data.filter((n: AppNotification) => !n.read).length);
      }
    } catch {
      setDisabled(true);
    }
  }, [disabled]);

  // Initial fetch
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchNotifications();
  }, [fetchNotifications]);

  // SSE for real-time updates
  useEffect(() => {
    if (disabled) return;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/notifications/events');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification' && data.notification) {
            const newNotif = data.notification as AppNotification;
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
            if (!newNotif.read) setUnreadCount((c) => c + 1);
          }
        } catch { /* ignore parse errors */ }
      };
      eventSource.onerror = () => {
        eventSource?.close();
        setDisabled(true);
      };
    } catch {
      setDisabled(true);
    }
    return () => { eventSource?.close(); };
  }, [disabled]);

  // Mark single as read
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
    } catch { /* non-blocking */ }
  }, []);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch { /* non-blocking */ }
  }, []);

  return (
    <>
      <NotificationBell
        unreadCount={unreadCount}
        isOpen={isOpen}
        onClick={() => setIsOpen((o) => !o)}
      />
      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </>
  );
}
