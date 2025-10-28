'use client';

/**
 * Notification Provider
 * Wraps app with notification system
 * Provides toast notifications and notification bell
 */

import { ReactNode } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationToast from './NotificationToast';
import NotificationBell from './NotificationBell';

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
  userType?: 'CLINICIAN' | 'PATIENT';
  showBell?: boolean;
}

export default function NotificationProvider({
  children,
  userId,
  userType,
  showBell = true,
}: NotificationProviderProps) {
  const {
    toasts,
    notifications,
    unreadCount,
    dismissToast,
    markAsRead,
    markAllAsRead,
  } = useNotifications(userId, userType);

  return (
    <>
      {/* Toast Notifications */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />

      {/* Main Content */}
      <div className="relative">
        {/* Notification Bell (positioned in header) */}
        {showBell && (
          <div className="fixed top-4 right-4 z-40">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
            />
          </div>
        )}

        {children}
      </div>
    </>
  );
}
