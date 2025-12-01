/**
 * Push Notification Service
 * HIPAA-compliant notifications for appointments, lab results, and clinical updates
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Notification Categories
 * Different types of clinical notifications
 */
export enum NotificationCategory {
  APPOINTMENT = 'appointment',
  LAB_RESULT = 'lab_result',
  MEDICATION = 'medication',
  CONSULTATION = 'consultation',
  URGENT = 'urgent',
  GENERAL = 'general',
}

/**
 * Notification Priority Levels
 */
export enum NotificationPriority {
  LOW = 'low',
  DEFAULT = 'default',
  HIGH = 'high',
  MAX = 'max',
}

interface NotificationConfig {
  title: string;
  body: string;
  data?: Record<string, any>;
  category: NotificationCategory;
  priority?: NotificationPriority;
  sound?: boolean;
  badge?: number;
}

/**
 * Configure notification handler behavior
 * Controls how notifications appear when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { category } = notification.request.content.data;

    // Urgent notifications always show
    if (category === NotificationCategory.URGENT) {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }

    // Other notifications show based on app state
    return {
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

export class NotificationService {
  private static expoPushToken: string | null = null;
  private static notificationListener: Notifications.Subscription | null = null;
  private static responseListener: Notifications.Subscription | null = null;

  /**
   * Initialize notification service
   * Request permissions and register for push notifications
   */
  static async initialize(): Promise<string | null> {
    // Physical device required for push notifications
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = token.data;

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await this.configureAndroidChannels();
      }

      // Set up notification listeners
      this.setupListeners();

      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
    }
  }

  /**
   * Configure Android notification channels
   * Required for Android 8.0+
   */
  private static async configureAndroidChannels() {
    // Urgent/Critical channel
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Urgent Clinical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Appointments channel
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Appointments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Lab results channel
    await Notifications.setNotificationChannelAsync('lab_results', {
      name: 'Lab Results',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      showBadge: true,
    });

    // Medications channel
    await Notifications.setNotificationChannelAsync('medications', {
      name: 'Medications',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: true,
    });

    // General channel
    await Notifications.setNotificationChannelAsync('general', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: false,
    });
  }

  /**
   * Set up notification listeners
   * Handle received and tapped notifications
   */
  private static setupListeners() {
    // Listen for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // You can update UI here based on notification
      }
    );

    // Listen for user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        const { category, patientId, appointmentId, consultationId } =
          response.notification.request.content.data;

        // Navigate based on notification type
        this.handleNotificationTap(category, {
          patientId,
          appointmentId,
          consultationId,
        });
      }
    );
  }

  /**
   * Handle notification tap navigation
   */
  private static handleNotificationTap(
    category: NotificationCategory,
    data: Record<string, any>
  ) {
    // TODO: Implement navigation based on category
    // This will be connected to your navigation system
    console.log('Navigate to:', category, data);
  }

  /**
   * Schedule local notification
   */
  static async scheduleNotification(config: NotificationConfig): Promise<string> {
    const {
      title,
      body,
      data = {},
      category,
      priority = NotificationPriority.DEFAULT,
      sound = true,
      badge,
    } = config;

    // Determine Android channel
    const androidChannelId = this.getAndroidChannel(category);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          category,
        },
        sound: sound ? 'default' : undefined,
        badge,
        priority: this.mapPriority(priority),
      },
      trigger: null, // null = immediate
    });

    return notificationId;
  }

  /**
   * Schedule appointment reminder
   */
  static async scheduleAppointmentReminder(
    appointmentId: string,
    patientName: string,
    appointmentTime: Date,
    reminderMinutesBefore: number = 30
  ): Promise<string> {
    const triggerDate = new Date(appointmentTime.getTime() - reminderMinutesBefore * 60 * 1000);

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming Appointment',
        body: `Appointment with ${patientName} in ${reminderMinutesBefore} minutes`,
        data: {
          category: NotificationCategory.APPOINTMENT,
          appointmentId,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: triggerDate,
    });
  }

  /**
   * Send lab result notification
   * HIPAA Note: Body should NOT contain PHI, only generic message
   */
  static async notifyLabResult(patientId: string, patientName: string): Promise<string> {
    return await this.scheduleNotification({
      title: 'Lab Results Available',
      body: `New lab results ready for ${patientName}`,
      data: { patientId },
      category: NotificationCategory.LAB_RESULT,
      priority: NotificationPriority.HIGH,
      sound: true,
    });
  }

  /**
   * Send urgent clinical alert
   */
  static async notifyUrgent(title: string, body: string, data?: Record<string, any>): Promise<string> {
    return await this.scheduleNotification({
      title,
      body,
      data,
      category: NotificationCategory.URGENT,
      priority: NotificationPriority.MAX,
      sound: true,
    });
  }

  /**
   * Cancel scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get scheduled notifications
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Update badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  static async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Get push token for backend registration
   */
  static getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Cleanup listeners
   */
  static cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Map category to Android channel
   */
  private static getAndroidChannel(category: NotificationCategory): string {
    const channelMap = {
      [NotificationCategory.URGENT]: 'urgent',
      [NotificationCategory.APPOINTMENT]: 'appointments',
      [NotificationCategory.LAB_RESULT]: 'lab_results',
      [NotificationCategory.MEDICATION]: 'medications',
      [NotificationCategory.CONSULTATION]: 'general',
      [NotificationCategory.GENERAL]: 'general',
    };

    return channelMap[category] || 'general';
  }

  /**
   * Map priority to Expo notification priority
   */
  private static mapPriority(
    priority: NotificationPriority
  ): Notifications.AndroidNotificationPriority {
    const priorityMap = {
      [NotificationPriority.LOW]: Notifications.AndroidNotificationPriority.LOW,
      [NotificationPriority.DEFAULT]: Notifications.AndroidNotificationPriority.DEFAULT,
      [NotificationPriority.HIGH]: Notifications.AndroidNotificationPriority.HIGH,
      [NotificationPriority.MAX]: Notifications.AndroidNotificationPriority.MAX,
    };

    return priorityMap[priority];
  }
}

// Default export for easier imports
export default NotificationService;
