'use client';

/**
 * Notifications Hook
 * Manages real-time notifications via Socket.io
 * FREE - No external notification service needed
 *
 * Features:
 * - Real-time toast notifications
 * - Notification history
 * - Unread count
 * - Mark as read
 * - Auto-connect Socket.io
 */

import { useState, useEffect, useCallback } from 'react';
import { Toast } from '@/components/notifications/NotificationToast';
import { getSocket, connectSocket } from '@/lib/chat/socket-client';

export interface Notification {
  id: string;
  type: 'appointment' | 'medication' | 'lab' | 'message' | 'system';
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: Date;
}

export function useNotifications(userId?: string, userType?: 'CLINICIAN' | 'PATIENT') {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Add toast notification
  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  // Dismiss toast
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Add notification to history
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      read: false,
      createdAt: new Date(),
    };

    setNotifications((prev) => [newNotification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Also show as toast
    showToast({
      type: 'info',
      title: notification.title,
      message: notification.message,
      action: notification.href ? { label: 'View', href: notification.href } : undefined,
    });
  }, [showToast]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.read) {
          setUnreadCount((count) => Math.max(0, count - 1));
          return { ...n, read: true };
        }
        return n;
      })
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Socket.io real-time notifications
  useEffect(() => {
    if (!userId || !userType) return;

    const socket = getSocket();

    // If socket not connected, connect it
    if (!socket?.connected) {
      connectSocket(userId, userType).catch((err) => {
        console.error('Failed to connect socket for notifications:', err);
      });
    }

    const currentSocket = getSocket();
    if (!currentSocket) return;

    // Listen for various notification events
    const handleNewAppointment = (data: any) => {
      addNotification({
        type: 'appointment',
        title: 'New Appointment',
        message: `Appointment scheduled for ${data.date}`,
        href: '/portal/appointments',
      });
    };

    const handleMedicationReminder = (data: any) => {
      addNotification({
        type: 'medication',
        title: 'Medication Reminder',
        message: data.message || 'Time to take your medication',
        href: '/portal/medications',
      });
    };

    const handleLabResult = (data: any) => {
      addNotification({
        type: 'lab',
        title: 'Lab Results Available',
        message: data.message || 'Your lab results are ready',
        href: '/portal/dashboard/documents',
      });
    };

    const handleNewMessage = (data: any) => {
      addNotification({
        type: 'message',
        title: 'New Message',
        message: data.preview || 'You have a new message',
        href: '/portal/dashboard/messages',
      });
    };

    // Register event listeners
    currentSocket.on('notification:appointment', handleNewAppointment);
    currentSocket.on('notification:medication', handleMedicationReminder);
    currentSocket.on('notification:lab', handleLabResult);
    currentSocket.on('new_message', handleNewMessage);

    // Cleanup
    return () => {
      currentSocket.off('notification:appointment', handleNewAppointment);
      currentSocket.off('notification:medication', handleMedicationReminder);
      currentSocket.off('notification:lab', handleLabResult);
      currentSocket.off('new_message', handleNewMessage);
    };
  }, [userId, userType, addNotification]);

  return {
    toasts,
    notifications,
    unreadCount,
    showToast,
    dismissToast,
    addNotification,
    markAsRead,
    markAllAsRead,
  };
}
