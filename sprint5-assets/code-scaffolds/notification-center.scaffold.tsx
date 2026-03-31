'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useEventStream } from '@/hooks/useEventStream';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * CYRUS INVARIANTS:
 * - Notifications scoped to organizationId only; cross-tenant leak = VETO
 * - All notification queries include org filter in WHERE clause
 * - Server validates caller's org membership before returning any notification
 */

export enum NotificationType {
  CLINICAL_ALERT = 'clinical_alert',
  MESSAGE_RECEIVED = 'message_received',
  LAB_READY = 'lab_ready',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  SYSTEM_UPDATE = 'system_update',
  BILLING_ACTION = 'billing_action',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  organizationId: string; // CYRUS: mandatory scope
  userId: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export type FilterTab = 'all' | 'clinical' | 'messages' | 'system';

interface NotificationCenterProps {
  userId: string;
  organizationId: string;
}

/**
 * Notification type registry with icons, colors, channels
 */
const notificationRegistry = {
  [NotificationType.CLINICAL_ALERT]: {
    label: 'Clinical Alert',
    icon: '⚠️',
    color: 'severity-severe',
    channels: ['in-app', 'push'],
    priority: 'high',
  },
  [NotificationType.MESSAGE_RECEIVED]: {
    label: 'Message',
    icon: '💬',
    color: 'severity-mild',
    channels: ['in-app', 'push'],
    priority: 'medium',
  },
  [NotificationType.LAB_READY]: {
    label: 'Lab Results Ready',
    icon: '🧪',
    color: 'severity-minimal',
    channels: ['in-app', 'push'],
    priority: 'high',
  },
  [NotificationType.APPOINTMENT_REMINDER]: {
    label: 'Appointment Reminder',
    icon: '📅',
    color: 'severity-mild',
    channels: ['in-app', 'push'],
    priority: 'medium',
  },
  [NotificationType.SYSTEM_UPDATE]: {
    label: 'System Update',
    icon: '🔔',
    color: 'severity-minimal',
    channels: ['in-app'],
    priority: 'low',
  },
  [NotificationType.BILLING_ACTION]: {
    label: 'Billing',
    icon: '💳',
    color: 'severity-mild',
    channels: ['in-app'],
    priority: 'medium',
  },
};

/**
 * Bell icon with unread badge (header component)
 */
export const NotificationBell: React.FC<{
  unreadCount: number;
  onClick: () => void;
}> = ({ unreadCount, onClick }) => {
  const { t } = useTranslation(['notifications']);

  return (
    <button
      onClick={onClick}
      className="relative p-spacing-sm hover:bg-surface-secondary rounded-md transition-colors"
      aria-label={t('bell.label', {
        defaultValue: unreadCount > 0 ? `{{count}} unread notifications` : 'Notifications',
        count: unreadCount,
      })}
      aria-pressed="false"
    >
      <svg
        className="w-6 h-6 text-surface-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span
          className="absolute top-0 right-0 inline-flex items-center justify-center px-spacing-xs py-spacing-xs text-caption font-bold text-white bg-severity-severe rounded-full"
          aria-label={`${unreadCount} unread`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

/**
 * Notification item row (used in dropdown and full page)
 */
const NotificationItem: React.FC<{
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onNavigate?: (url: string) => void;
  compact?: boolean;
}> = ({ notification, onMarkRead, onNavigate, compact = false }) => {
  const prefersReducedMotion = useReducedMotion();
  const typeInfo = notificationRegistry[notification.type];

  const handleClick = () => {
    if (!notification.read && onMarkRead) {
      onMarkRead(notification.id);
    }
    if (notification.actionUrl && onNavigate) {
      onNavigate(notification.actionUrl);
    }
  };

  const handleSwipe = (e: React.TouchEvent) => {
    // Swipe-to-dismiss on mobile
    if (e.deltaX > 100) {
      // Swiped right: dismiss
      // Stub: implement deletion
    }
  };

  return (
    <div
      className={`px-spacing-md py-spacing-sm border-b border-surface-tertiary ${
        !notification.read ? 'bg-surface-elevated' : 'hover:bg-surface-secondary'
      } transition-colors cursor-pointer ${prefersReducedMotion ? '' : 'hover:shadow-md'}`}
      onClick={handleClick}
      role="article"
      aria-label={`${typeInfo.label}: ${notification.title}`}
    >
      <div className="flex items-start gap-spacing-md">
        <span className="text-heading-md mt-spacing-xs flex-shrink-0">{typeInfo.icon}</span>

        <div className="flex-1 min-w-0">
          <h3 className="text-body font-semibold text-surface-primary">
            {notification.title}
          </h3>
          {!compact && (
            <p className="text-caption text-surface-tertiary mt-spacing-xs line-clamp-2">
              {notification.message}
            </p>
          )}
          <p className="text-caption text-surface-tertiary mt-spacing-xs">
            {formatTimeAgo(notification.createdAt)}
          </p>
        </div>

        {!notification.read && (
          <div
            className="w-2 h-2 rounded-full bg-severity-severe flex-shrink-0 mt-spacing-xs"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};

/**
 * Dropdown panel (max 5 recent notifications)
 */
const NotificationDropdown: React.FC<{
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
  isOpen: boolean;
}> = ({ notifications, unreadCount, onMarkRead, onMarkAllRead, onViewAll, isOpen }) => {
  const { t } = useTranslation(['notifications']);
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-spacing-sm w-96 bg-surface-elevated rounded-lg shadow-xl border border-surface-tertiary z-50 max-h-96 overflow-hidden flex flex-col"
      role="region"
      aria-label={t('dropdown.label', { defaultValue: 'Recent notifications' })}
    >
      {/* Header */}
      <div className="px-spacing-md py-spacing-sm border-b border-surface-tertiary flex justify-between items-center">
        <h2 className="text-heading-sm font-semibold">
          {t('dropdown.title', { defaultValue: 'Notifications' })}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-caption text-severity-minimal hover:underline"
            aria-label={t('dropdown.markAllRead', { defaultValue: 'Mark all as read' })}
          >
            {t('dropdown.markAllRead', { defaultValue: 'Mark All as Read' })}
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto flex-1">
        {notifications.slice(0, 5).map((notif) => (
          <NotificationItem
            key={notif.id}
            notification={notif}
            onMarkRead={onMarkRead}
            compact={true}
          />
        ))}
      </div>

      {/* Footer */}
      {notifications.length > 5 && (
        <div className="px-spacing-md py-spacing-sm border-t border-surface-tertiary">
          <button
            onClick={onViewAll}
            className="w-full text-center text-body text-severity-minimal hover:underline font-semibold"
            aria-label={t('dropdown.viewAll', { defaultValue: 'View all notifications' })}
          >
            {t('dropdown.viewAll', { defaultValue: 'View All' })}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Full page notifications view (/dashboard/notifications)
 */
export const NotificationsPage: React.FC<{
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}> = ({ notifications, onMarkRead, onLoadMore, hasMore, isLoading }) => {
  const { t } = useTranslation(['notifications']);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === 'clinical' && n.type !== NotificationType.CLINICAL_ALERT) return false;
    if (filterTab === 'messages' && n.type !== NotificationType.MESSAGE_RECEIVED) return false;
    if (filterTab === 'system' && ![NotificationType.SYSTEM_UPDATE, NotificationType.BILLING_ACTION].includes(n.type))
      return false;

    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });

  return (
    <div className="max-w-2xl mx-auto p-spacing-lg">
      {/* Page header */}
      <h1 className="text-heading-lg mb-spacing-md">
        {t('page.title', { defaultValue: 'Notifications' })}
      </h1>

      {/* Search */}
      <div className="mb-spacing-lg relative">
        <input
          type="search"
          placeholder={t('page.searchPlaceholder', { defaultValue: 'Search notifications...' })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-spacing-md py-spacing-sm bg-surface-secondary border border-surface-tertiary rounded-md text-body focus:outline-none focus:ring-2 focus:ring-severity-minimal"
          aria-label={t('page.searchLabel', { defaultValue: 'Search' })}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-spacing-sm mb-spacing-md border-b border-surface-tertiary">
        {(['all', 'clinical', 'messages', 'system'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-spacing-md py-spacing-sm border-b-2 transition-colors ${
              filterTab === tab
                ? 'border-severity-minimal text-severity-minimal font-semibold'
                : 'border-transparent text-surface-tertiary hover:text-surface-primary'
            }`}
            aria-selected={filterTab === tab}
            role="tab"
          >
            {t(`page.tab.${tab}`, {
              defaultValue: tab.charAt(0).toUpperCase() + tab.slice(1),
            })}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredNotifications.length === 0 && (
        <div className="text-center py-spacing-2xl">
          <p className="text-heading-md text-surface-tertiary">
            {t('page.empty', { defaultValue: 'No notifications' })}
          </p>
        </div>
      )}

      {/* Notification list with infinite scroll */}
      <div className="bg-surface-elevated rounded-lg border border-surface-tertiary overflow-hidden">
        {filteredNotifications.map((notif, idx) => (
          <React.Fragment key={notif.id}>
            <NotificationItem notification={notif} onMarkRead={onMarkRead} />
            {idx === filteredNotifications.length - 3 && hasMore && !isLoading && (
              <div className="text-center py-spacing-md">
                <button
                  onClick={onLoadMore}
                  className="text-severity-minimal text-body hover:underline font-semibold"
                >
                  {t('page.loadMore', { defaultValue: 'Load More' })}
                </button>
              </div>
            )}
          </React.Fragment>
        ))}

        {isLoading && (
          <div className="text-center py-spacing-md">
            <div className="inline-block w-4 h-4 border-2 border-surface-tertiary border-t-severity-minimal rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main NotificationCenter component (manages state)
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  organizationId,
}) => {
  const { t } = useTranslation(['notifications']);

  // SSE subscription via existing hook
  const { isConnected, data: eventData } = useEventStream(
    `/api/events/subscribe?userId=${userId}&organizationId=${organizationId}`
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Load initial notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/notifications?organizationId=${organizationId}&userId=${userId}&limit=20`
        );
        if (!res.ok) throw new Error('Failed to load notifications');

        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [userId, organizationId]);

  // Handle incoming SSE events
  useEffect(() => {
    if (eventData?.type === 'notification') {
      const newNotif = eventData.data as Notification;

      // CYRUS: validate org scope on client (belt-and-suspenders)
      if (newNotif.organizationId !== organizationId) {
        console.error('Cross-tenant notification rejected');
        return;
      }

      setNotifications((prev) => [newNotif, ...prev]);
      if (!newNotif.read) {
        setUnreadCount((prev) => prev + 1);
      }

      // Announce to screen readers
      announceNotification(newNotif);
    }
  }, [eventData, organizationId]);

  const markRead = useCallback(
    async (notificationId: string) => {
      try {
        const res = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'POST',
          headers: { 'X-Organization-Id': organizationId },
        });

        if (!res.ok) throw new Error('Failed to mark notification as read');

        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [organizationId]
  );

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'X-Organization-Id': organizationId },
      });

      if (!res.ok) throw new Error('Failed to mark all as read');

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, [organizationId]);

  const loadMore = useCallback(() => {
    // Stub: load next page of notifications
  }, []);

  return (
    <>
      {/* Bell icon for header */}
      <NotificationBell
        unreadCount={unreadCount}
        onClick={() => setIsDropdownOpen((prev) => !prev)}
      />

      {/* Dropdown panel */}
      <NotificationDropdown
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onViewAll={() => {
          setIsDropdownOpen(false);
          // Navigate to full page
          window.location.href = '/dashboard/notifications';
        }}
        isOpen={isDropdownOpen}
      />
    </>
  );
};

/**
 * Utility: announce notification to screen readers
 */
function announceNotification(notif: Notification) {
  const typeInfo = notificationRegistry[notif.type];
  const message = `New ${typeInfo.label}: ${notif.title}`;

  const div = document.createElement('div');
  div.setAttribute('role', 'status');
  div.setAttribute('aria-live', 'assertive');
  div.setAttribute('aria-atomic', 'true');
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

/**
 * Utility: format time ago
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default NotificationCenter;
