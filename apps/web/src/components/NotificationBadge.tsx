'use client';

/**
 * Notification Badge Component
 * Shows unread notification count in navigation
 */

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export function NotificationBadge() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/portal/notifications?unreadOnly=true&limit=1');
      const data = await response.json();

      if (data.success && data.data) {
        setUnreadCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => router.push('/portal/dashboard/notifications')}
      className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      title="Notificaciones"
    >
      <BellIcon className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
