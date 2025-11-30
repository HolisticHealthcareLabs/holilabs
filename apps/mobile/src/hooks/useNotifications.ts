/**
 * Notifications Hook
 * React hook for managing push notifications
 */

import { useState, useEffect } from 'react';
import { NotificationService, NotificationCategory } from '../services/notificationService';
import * as Notifications from 'expo-notifications';

interface UseNotificationsReturn {
  pushToken: string | null;
  isEnabled: boolean;
  scheduledCount: number;
  requestPermission: () => Promise<boolean>;
  scheduleAppointmentReminder: (
    appointmentId: string,
    patientName: string,
    appointmentTime: Date,
    minutesBefore?: number
  ) => Promise<string>;
  notifyLabResult: (patientId: string, patientName: string) => Promise<string>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAll: () => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
  clearBadge: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    initializeNotifications();
    loadScheduledCount();

    // Refresh scheduled count periodically
    const interval = setInterval(loadScheduledCount, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const initializeNotifications = async () => {
    const token = await NotificationService.initialize();
    setPushToken(token);

    if (token) {
      setIsEnabled(true);
    }

    // Check current permission status
    const { status } = await Notifications.getPermissionsAsync();
    setIsEnabled(status === 'granted');
  };

  const loadScheduledCount = async () => {
    const scheduled = await NotificationService.getScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setIsEnabled(granted);

    if (granted) {
      const token = await NotificationService.initialize();
      setPushToken(token);
    }

    return granted;
  };

  const scheduleAppointmentReminder = async (
    appointmentId: string,
    patientName: string,
    appointmentTime: Date,
    minutesBefore: number = 30
  ): Promise<string> => {
    const id = await NotificationService.scheduleAppointmentReminder(
      appointmentId,
      patientName,
      appointmentTime,
      minutesBefore
    );
    await loadScheduledCount();
    return id;
  };

  const notifyLabResult = async (
    patientId: string,
    patientName: string
  ): Promise<string> => {
    const id = await NotificationService.notifyLabResult(patientId, patientName);
    await loadScheduledCount();
    return id;
  };

  const cancelNotification = async (id: string): Promise<void> => {
    await NotificationService.cancelNotification(id);
    await loadScheduledCount();
  };

  const cancelAll = async (): Promise<void> => {
    await NotificationService.cancelAllNotifications();
    await loadScheduledCount();
  };

  const setBadgeCount = async (count: number): Promise<void> => {
    await NotificationService.setBadgeCount(count);
  };

  const clearBadge = async (): Promise<void> => {
    await NotificationService.clearBadge();
  };

  return {
    pushToken,
    isEnabled,
    scheduledCount,
    requestPermission,
    scheduleAppointmentReminder,
    notifyLabResult,
    cancelNotification,
    cancelAll,
    setBadgeCount,
    clearBadge,
  };
};
