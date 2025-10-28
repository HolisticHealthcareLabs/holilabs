'use client';

/**
 * Patient Portal Wrapper
 * Client-side wrapper with notification system
 */

import { ReactNode, useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationToast from '@/components/notifications/NotificationToast';
import NotificationBell from '@/components/notifications/NotificationBell';

interface PatientPortalWrapperProps {
  children: ReactNode;
  patientId?: string;
}

export default function PatientPortalWrapper({ children, patientId }: PatientPortalWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const {
    toasts,
    notifications,
    unreadCount,
    dismissToast,
    markAsRead,
    markAllAsRead,
    showToast,
  } = useNotifications(patientId, 'PATIENT');

  useEffect(() => {
    setMounted(true);

    // Show welcome notification after 2 seconds (demo)
    if (patientId) {
      const timer = setTimeout(() => {
        showToast({
          type: 'info',
          title: 'Welcome back!',
          message: 'Real-time notifications are now active',
          duration: 4000,
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [patientId, showToast]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Toast Notifications */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />

      {/* Notification Bell */}
      {patientId && (
        <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-6">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
          />
        </div>
      )}

      {children}
    </>
  );
}
