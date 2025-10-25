'use client';
export const dynamic = 'force-dynamic';


/**
 * Notifications Center Page
 * View and manage all notifications
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  BellIcon,
  CalendarIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data?: {
    notifications: Notification[];
    unreadCount: number;
    total: number;
  };
  error?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter === 'unread') {
        params.append('unreadOnly', 'true');
      }

      const response = await fetch(`/api/portal/notifications?${params.toString()}`);
      const data: NotificationsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar notificaciones');
      }

      if (data.success && data.data) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/portal/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Error al marcar como leída');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_REMINDER':
      case 'APPOINTMENT_CONFIRMED':
      case 'APPOINTMENT_CANCELLED':
      case 'APPOINTMENT_RESCHEDULED':
        return <CalendarIcon className="h-6 w-6" />;
      case 'NEW_MESSAGE':
      case 'MESSAGE_REPLY':
        return <EnvelopeIcon className="h-6 w-6" />;
      case 'NEW_DOCUMENT':
      case 'DOCUMENT_SHARED':
      case 'LAB_RESULT_AVAILABLE':
        return <DocumentTextIcon className="h-6 w-6" />;
      case 'SECURITY_ALERT':
        return <ShieldCheckIcon className="h-6 w-6" />;
      default:
        return <BellIcon className="h-6 w-6" />;
    }
  };

  const getNotificationColor = (priority: string, isRead: boolean) => {
    if (isRead) {
      return 'bg-gray-50 border-gray-200';
    }

    switch (priority) {
      case 'URGENT':
        return 'bg-red-50 border-red-200';
      case 'HIGH':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getIconColor = (priority: string, isRead: boolean) => {
    if (isRead) {
      return 'bg-gray-100 text-gray-600';
    }

    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-600';
      case 'HIGH':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BellIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-4xl font-bold text-gray-900">
                  Notificaciones
                </h1>
                {unreadCount > 0 && (
                  <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-gray-600">
                {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            No leídas
            {unreadCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === 'unread' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay notificaciones
            </h3>
            <p className="text-gray-600">
              {filter === 'unread'
                ? 'No tienes notificaciones sin leer'
                : 'Todas tus notificaciones aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`rounded-xl border-2 p-5 transition-all cursor-pointer hover:shadow-md ${getNotificationColor(
                  notification.priority,
                  notification.isRead
                )}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconColor(
                      notification.priority,
                      notification.isRead
                    )}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3
                        className={`font-semibold ${
                          notification.isRead ? 'text-gray-700' : 'text-gray-900'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>

                    <p
                      className={`text-sm mb-3 ${
                        notification.isRead ? 'text-gray-500' : 'text-gray-700'
                      }`}
                    >
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {format(new Date(notification.createdAt), "d 'de' MMMM, HH:mm", {
                          locale: es,
                        })}
                      </p>

                      {notification.actionLabel && (
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                          {notification.actionLabel} →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
