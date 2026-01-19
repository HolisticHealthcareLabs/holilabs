/**
 * Prevention Notification Service
 *
 * Phase 4: Notifications via Novu
 * Industry-grade notification system with multi-channel support
 *
 * Features:
 * - Real-time doctor alerts (Socket.IO + Push)
 * - Patient screening reminders (Email, SMS, WhatsApp)
 * - Notification batching to prevent fatigue
 * - Delivery tracking and retry logic
 * - HIPAA-compliant audit logging
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

// Notification Templates
export const NOTIFICATION_TEMPLATES = {
  CONDITION_DETECTED: {
    id: 'condition-detected',
    name: 'Condition Detected Alert',
    channels: ['in_app', 'push', 'email'] as const,
    variables: ['patientName', 'conditionName', 'confidence', 'encounterDate'],
    priority: 'high' as const,
  },
  SCREENING_REMINDER: {
    id: 'screening-reminder',
    name: 'Screening Due Reminder',
    channels: ['in_app', 'push', 'email', 'sms'] as const,
    variables: ['patientName', 'screeningType', 'dueDate', 'facility'],
    priority: 'medium' as const,
  },
  SCREENING_OVERDUE: {
    id: 'screening-overdue',
    name: 'Screening Overdue Alert',
    channels: ['in_app', 'push', 'email', 'sms'] as const,
    variables: ['patientName', 'screeningType', 'daysOverdue', 'originalDueDate'],
    priority: 'high' as const,
  },
  SCREENING_RESULT: {
    id: 'screening-result',
    name: 'Screening Result Available',
    channels: ['in_app', 'push', 'email'] as const,
    variables: ['patientName', 'screeningType', 'resultStatus', 'nextSteps'],
    priority: 'medium' as const,
  },
  PLAN_UPDATED: {
    id: 'plan-updated',
    name: 'Prevention Plan Updated',
    channels: ['in_app', 'email'] as const,
    variables: ['patientName', 'planName', 'changesSummary', 'clinicianName'],
    priority: 'low' as const,
  },
  MULTIPLE_CONDITIONS_DETECTED: {
    id: 'multiple-conditions-detected',
    name: 'Multiple Conditions Detected',
    channels: ['in_app', 'push', 'email'] as const,
    variables: ['patientName', 'conditionCount', 'conditions', 'encounterDate'],
    priority: 'high' as const,
  },
} as const;

export type NotificationTemplate = keyof typeof NOTIFICATION_TEMPLATES;
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
export type NotificationPriority = 'high' | 'medium' | 'low';

interface NotificationPayload {
  type: NotificationTemplate;
  recipientId: string;
  recipientType: 'clinician' | 'patient';
  title: string;
  message: string;
  data: Record<string, unknown>;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  scheduledFor?: Date;
}

interface DeliveryResult {
  channel: NotificationChannel;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  deliveredAt?: Date;
  error?: string;
}

interface NotificationResult {
  id: string;
  success: boolean;
  deliveryResults: DeliveryResult[];
  error?: string;
}

interface ConditionDetectedData {
  patientId: string;
  patientName: string;
  conditionName: string;
  confidence: number;
  encounterId: string;
  encounterDate: Date;
}

interface ScreeningReminderData {
  patientId: string;
  screeningId: string;
  screeningType: string;
  scheduledDate: Date;
  dueDate?: Date;
  facility?: string;
}

// Novu client singleton
let novuClient: NovuClient | null = null;

interface NovuClient {
  trigger: (templateId: string, payload: Record<string, unknown>) => Promise<{ data: { acknowledged: boolean } }>;
  subscribers: {
    identify: (subscriberId: string, data: Record<string, unknown>) => Promise<{ data: { subscriberId: string } }>;
    setCredentials: (subscriberId: string, providerId: string, credentials: Record<string, unknown>) => Promise<{ data: unknown }>;
    getPreferences: (subscriberId: string) => Promise<{ data: { preferences: unknown[] } }>;
    updatePreference: (subscriberId: string, templateId: string, preference: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
}

/**
 * Initialize Novu client
 */
async function getNovuClient(): Promise<NovuClient | null> {
  if (novuClient) return novuClient;

  const apiKey = process.env.NOVU_API_KEY;
  if (!apiKey) {
    logger.warn({ event: 'novu_not_configured', message: 'NOVU_API_KEY not set' });
    return null;
  }

  try {
    const { Novu } = await import('@novu/node');
    novuClient = new Novu(apiKey) as unknown as NovuClient;
    return novuClient;
  } catch (error) {
    logger.error({
      event: 'novu_init_error',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get Socket.IO server for real-time notifications
 */
async function getSocketIO() {
  try {
    const { getSocketServer } = await import('@/lib/socket-server');
    return getSocketServer();
  } catch {
    return null;
  }
}

export class PreventionNotificationService {
  private batchedAlerts: Map<string, ConditionDetectedData[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 5000; // 5 second batch window
  private readonly MAX_RETRIES = 3;

  /**
   * Send a notification via all configured channels
   */
  async sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
    const start = performance.now();

    try {
      const template = NOTIFICATION_TEMPLATES[payload.type];
      const channels = payload.channels || template.channels;
      const priority = payload.priority || template.priority;

      // Get recipient preferences
      const preferences = await this.getRecipientPreferences(
        payload.recipientId,
        payload.recipientType
      );

      // Filter channels based on preferences
      const enabledChannels = this.filterChannelsByPreferences(channels, preferences);

      // Create in-app notification record
      const notification = await prisma.notification.create({
        data: {
          userId: payload.recipientId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data as any,
          priority: priority.toUpperCase(),
          channels: enabledChannels,
          scheduledFor: payload.scheduledFor,
        },
      });

      // Send via each enabled channel
      const deliveryPromises = enabledChannels.map((channel) =>
        this.deliverViaChannel(channel, payload, notification.id)
      );

      const deliveryResults = await Promise.allSettled(deliveryPromises);
      const results: DeliveryResult[] = deliveryResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        return {
          channel: enabledChannels[index],
          status: 'failed' as const,
          error: result.reason?.message || 'Unknown error',
        };
      });

      // Update notification with delivery results
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          deliveryStatus: results.every((r) => r.status === 'sent' || r.status === 'delivered')
            ? 'DELIVERED'
            : results.some((r) => r.status === 'sent' || r.status === 'delivered')
              ? 'PARTIAL'
              : 'FAILED',
          deliveredAt: new Date(),
          metadata: { deliveryResults: results },
        },
      });

      const elapsed = performance.now() - start;

      logger.info({
        event: 'notification_sent',
        notificationId: notification.id,
        type: payload.type,
        recipientId: payload.recipientId,
        channels: enabledChannels,
        deliveryResults: results.map((r) => ({ channel: r.channel, status: r.status })),
        latencyMs: elapsed.toFixed(2),
      });

      // HIPAA Audit
      await createAuditLog({
        action: 'notification_sent',
        entityType: 'Notification',
        entityId: notification.id,
        userId: payload.recipientId,
        details: {
          type: payload.type,
          channels: enabledChannels,
          deliveryStatus: results.map((r) => r.status),
        },
      });

      return {
        id: notification.id,
        success: results.some((r) => r.status === 'sent' || r.status === 'delivered'),
        deliveryResults: results,
      };
    } catch (error) {
      logger.error({
        event: 'notification_error',
        error: error instanceof Error ? error.message : String(error),
        type: payload.type,
        recipientId: payload.recipientId,
      });

      return {
        id: '',
        success: false,
        deliveryResults: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send real-time alert to clinician when condition detected
   */
  async sendConditionDetectedAlert(
    clinicianId: string,
    data: ConditionDetectedData
  ): Promise<NotificationResult> {
    // Add to batch for this clinician
    const batchKey = clinicianId;
    if (!this.batchedAlerts.has(batchKey)) {
      this.batchedAlerts.set(batchKey, []);
    }
    this.batchedAlerts.get(batchKey)!.push(data);

    // Set up batch processing
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatchedAlerts();
      }, this.BATCH_WINDOW_MS);
    }

    // Also send immediate Socket.IO event for real-time UI update
    await this.emitSocketEvent(clinicianId, 'prevention:condition_detected', {
      patientId: data.patientId,
      patientName: data.patientName,
      conditionName: data.conditionName,
      confidence: data.confidence,
      encounterId: data.encounterId,
      timestamp: new Date().toISOString(),
    });

    // Return placeholder - actual notification sent via batch
    return {
      id: 'batched',
      success: true,
      deliveryResults: [{ channel: 'in_app', status: 'pending' }],
    };
  }

  /**
   * Process batched alerts to prevent notification fatigue
   */
  private async processBatchedAlerts(): Promise<void> {
    this.batchTimeout = null;

    for (const [clinicianId, alerts] of this.batchedAlerts.entries()) {
      if (alerts.length === 0) continue;

      if (alerts.length === 1) {
        // Single alert - send normally
        const alert = alerts[0];
        await this.sendNotification({
          type: 'CONDITION_DETECTED',
          recipientId: clinicianId,
          recipientType: 'clinician',
          title: `Condition Detected: ${alert.conditionName}`,
          message: `${alert.patientName} - ${alert.conditionName} detected with ${alert.confidence}% confidence`,
          data: alert,
          priority: 'high',
        });
      } else {
        // Multiple alerts - batch into single notification
        await this.sendNotification({
          type: 'MULTIPLE_CONDITIONS_DETECTED',
          recipientId: clinicianId,
          recipientType: 'clinician',
          title: `${alerts.length} Conditions Detected`,
          message: `Multiple conditions detected requiring attention`,
          data: {
            conditionCount: alerts.length,
            conditions: alerts.map((a) => ({
              patientName: a.patientName,
              conditionName: a.conditionName,
              confidence: a.confidence,
            })),
          },
          priority: 'high',
        });
      }
    }

    this.batchedAlerts.clear();
  }

  /**
   * Send screening reminder to patient
   */
  async sendScreeningReminder(data: ScreeningReminderData): Promise<NotificationResult> {
    // Get patient info
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    if (!patient) {
      return {
        id: '',
        success: false,
        deliveryResults: [],
        error: 'Patient not found',
      };
    }

    // Get patient user for notification
    const patientUser = await prisma.patientUser.findFirst({
      where: { patientId: data.patientId },
      include: { user: true },
    });

    const recipientId = patientUser?.userId || data.patientId;
    const patientName = patient.firstName || 'Patient';

    const daysUntil = Math.ceil(
      (data.scheduledDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return this.sendNotification({
      type: 'SCREENING_REMINDER',
      recipientId,
      recipientType: 'patient',
      title: 'Upcoming Screening Reminder',
      message: `Your ${this.formatScreeningType(data.screeningType)} is scheduled in ${daysUntil} days`,
      data: {
        patientName,
        screeningType: this.formatScreeningType(data.screeningType),
        dueDate: data.scheduledDate.toISOString(),
        facility: data.facility,
        screeningId: data.screeningId,
      },
      priority: daysUntil <= 3 ? 'high' : 'medium',
    });
  }

  /**
   * Send overdue screening alert
   */
  async sendScreeningOverdueAlert(
    data: ScreeningReminderData & { daysOverdue: number }
  ): Promise<NotificationResult> {
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return { id: '', success: false, deliveryResults: [], error: 'Patient not found' };
    }

    const patientUser = await prisma.patientUser.findFirst({
      where: { patientId: data.patientId },
      include: { user: true },
    });

    const recipientId = patientUser?.userId || data.patientId;

    return this.sendNotification({
      type: 'SCREENING_OVERDUE',
      recipientId,
      recipientType: 'patient',
      title: 'Overdue Screening Alert',
      message: `Your ${this.formatScreeningType(data.screeningType)} is ${data.daysOverdue} days overdue`,
      data: {
        patientName: patient.firstName,
        screeningType: this.formatScreeningType(data.screeningType),
        daysOverdue: data.daysOverdue,
        originalDueDate: data.dueDate?.toISOString() || data.scheduledDate.toISOString(),
        screeningId: data.screeningId,
      },
      priority: 'high',
    });
  }

  /**
   * Send screening result notification
   */
  async sendScreeningResultNotification(
    patientId: string,
    screeningId: string,
    result: string,
    nextSteps?: string
  ): Promise<NotificationResult> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true },
    });

    const screening = await prisma.screeningOutcome.findUnique({
      where: { id: screeningId },
    });

    if (!patient || !screening) {
      return { id: '', success: false, deliveryResults: [], error: 'Patient or screening not found' };
    }

    const patientUser = await prisma.patientUser.findFirst({
      where: { patientId },
    });

    return this.sendNotification({
      type: 'SCREENING_RESULT',
      recipientId: patientUser?.userId || patientId,
      recipientType: 'patient',
      title: 'Screening Results Available',
      message: 'Your screening results are now available. Please review them in your patient portal.',
      data: {
        patientName: patient.firstName,
        screeningType: this.formatScreeningType(screening.screeningType),
        resultStatus: result,
        nextSteps: nextSteps || 'Please consult with your healthcare provider.',
        screeningId,
      },
      priority: result === 'abnormal' || result === 'needs_followup' ? 'high' : 'medium',
    });
  }

  /**
   * Send plan updated notification
   */
  async sendPlanUpdatedNotification(
    patientId: string,
    planId: string,
    changesSummary: string,
    clinicianName: string
  ): Promise<NotificationResult> {
    const [patient, plan, patientUser] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, firstName: true },
      }),
      prisma.preventionPlan.findUnique({
        where: { id: planId },
        select: { id: true, planName: true },
      }),
      prisma.patientUser.findFirst({
        where: { patientId },
      }),
    ]);

    if (!patient || !plan) {
      return { id: '', success: false, deliveryResults: [], error: 'Patient or plan not found' };
    }

    return this.sendNotification({
      type: 'PLAN_UPDATED',
      recipientId: patientUser?.userId || patientId,
      recipientType: 'patient',
      title: 'Prevention Plan Updated',
      message: `Your ${plan.planName} has been updated by ${clinicianName}`,
      data: {
        patientName: patient.firstName,
        planName: plan.planName,
        changesSummary,
        clinicianName,
        planId,
      },
      priority: 'low',
    });
  }

  /**
   * Deliver notification via specific channel
   */
  private async deliverViaChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    notificationId: string
  ): Promise<DeliveryResult> {
    try {
      switch (channel) {
        case 'in_app':
          // Already created in database
          return { channel, status: 'delivered', deliveredAt: new Date() };

        case 'push':
          return this.sendPushNotification(payload, notificationId);

        case 'email':
          return this.sendEmailNotification(payload, notificationId);

        case 'sms':
          return this.sendSmsNotification(payload, notificationId);

        case 'whatsapp':
          return this.sendWhatsAppNotification(payload, notificationId);

        default:
          return { channel, status: 'failed', error: `Unknown channel: ${channel}` };
      }
    } catch (error) {
      return {
        channel,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send push notification via Novu
   */
  private async sendPushNotification(
    payload: NotificationPayload,
    notificationId: string
  ): Promise<DeliveryResult> {
    const novu = await getNovuClient();
    if (!novu) {
      return { channel: 'push', status: 'failed', error: 'Novu not configured' };
    }

    try {
      const template = NOTIFICATION_TEMPLATES[payload.type];

      // HIPAA: Don't include PHI in push notification body
      const sanitizedPayload = this.sanitizeForPush(payload);

      await novu.trigger(template.id, {
        to: { subscriberId: payload.recipientId },
        payload: {
          title: sanitizedPayload.title,
          body: sanitizedPayload.message,
          notificationId,
          ...sanitizedPayload.data,
        },
      });

      return { channel: 'push', status: 'sent', deliveredAt: new Date() };
    } catch (error) {
      return {
        channel: 'push',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Push delivery failed',
      };
    }
  }

  /**
   * Send email notification via Novu
   */
  private async sendEmailNotification(
    payload: NotificationPayload,
    notificationId: string
  ): Promise<DeliveryResult> {
    const novu = await getNovuClient();
    if (!novu) {
      return { channel: 'email', status: 'failed', error: 'Novu not configured' };
    }

    try {
      const template = NOTIFICATION_TEMPLATES[payload.type];

      await novu.trigger(`${template.id}-email`, {
        to: { subscriberId: payload.recipientId },
        payload: {
          title: payload.title,
          message: payload.message,
          notificationId,
          ...payload.data,
        },
      });

      return { channel: 'email', status: 'sent', deliveredAt: new Date() };
    } catch (error) {
      return {
        channel: 'email',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Email delivery failed',
      };
    }
  }

  /**
   * Send SMS notification via Novu
   */
  private async sendSmsNotification(
    payload: NotificationPayload,
    notificationId: string
  ): Promise<DeliveryResult> {
    const novu = await getNovuClient();
    if (!novu) {
      return { channel: 'sms', status: 'failed', error: 'Novu not configured' };
    }

    try {
      const template = NOTIFICATION_TEMPLATES[payload.type];

      // HIPAA: Use minimal PHI in SMS
      const sanitizedPayload = this.sanitizeForSms(payload);

      await novu.trigger(`${template.id}-sms`, {
        to: { subscriberId: payload.recipientId },
        payload: {
          message: sanitizedPayload.message,
          notificationId,
        },
      });

      return { channel: 'sms', status: 'sent', deliveredAt: new Date() };
    } catch (error) {
      return {
        channel: 'sms',
        status: 'failed',
        error: error instanceof Error ? error.message : 'SMS delivery failed',
      };
    }
  }

  /**
   * Send WhatsApp notification via Novu
   */
  private async sendWhatsAppNotification(
    payload: NotificationPayload,
    notificationId: string
  ): Promise<DeliveryResult> {
    const novu = await getNovuClient();
    if (!novu) {
      return { channel: 'whatsapp', status: 'failed', error: 'Novu not configured' };
    }

    try {
      const template = NOTIFICATION_TEMPLATES[payload.type];

      await novu.trigger(`${template.id}-whatsapp`, {
        to: { subscriberId: payload.recipientId },
        payload: {
          message: payload.message,
          notificationId,
          ...payload.data,
        },
      });

      return { channel: 'whatsapp', status: 'sent', deliveredAt: new Date() };
    } catch (error) {
      return {
        channel: 'whatsapp',
        status: 'failed',
        error: error instanceof Error ? error.message : 'WhatsApp delivery failed',
      };
    }
  }

  /**
   * Emit Socket.IO event for real-time updates
   */
  private async emitSocketEvent(
    recipientId: string,
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const io = await getSocketIO();
    if (!io) return;

    try {
      io.to(recipientId).emit(event, data);
    } catch (error) {
      logger.warn({
        event: 'socket_emit_error',
        error: error instanceof Error ? error.message : String(error),
        recipientId,
      });
    }
  }

  /**
   * Get recipient notification preferences
   */
  private async getRecipientPreferences(
    recipientId: string,
    recipientType: 'clinician' | 'patient'
  ): Promise<Record<string, boolean>> {
    try {
      if (recipientType === 'clinician') {
        const prefs = await prisma.clinicianPreferences.findUnique({
          where: { userId: recipientId },
        });
        return (prefs?.notificationPreferences as Record<string, boolean>) || {};
      } else {
        const prefs = await prisma.patientPreferences.findUnique({
          where: { patientId: recipientId },
        });
        return (prefs?.communicationPreferences as Record<string, boolean>) || {};
      }
    } catch {
      return {};
    }
  }

  /**
   * Filter channels based on user preferences
   */
  private filterChannelsByPreferences(
    channels: readonly NotificationChannel[],
    preferences: Record<string, boolean>
  ): NotificationChannel[] {
    if (Object.keys(preferences).length === 0) {
      return [...channels];
    }

    return channels.filter((channel) => {
      const prefKey = channel === 'in_app' ? 'inApp' : channel;
      return preferences[prefKey] !== false;
    });
  }

  /**
   * Sanitize payload for push notifications (HIPAA compliance)
   */
  private sanitizeForPush(payload: NotificationPayload): NotificationPayload {
    return {
      ...payload,
      title: this.genericizeTitle(payload.type),
      message: 'You have a new notification. Open the app to view details.',
      data: { notificationType: payload.type },
    };
  }

  /**
   * Sanitize payload for SMS (HIPAA compliance)
   */
  private sanitizeForSms(payload: NotificationPayload): NotificationPayload {
    return {
      ...payload,
      message: `${this.genericizeTitle(payload.type)}. Please log in to view details.`,
      data: {},
    };
  }

  /**
   * Get generic title without PHI
   */
  private genericizeTitle(type: NotificationTemplate): string {
    const titles: Record<NotificationTemplate, string> = {
      CONDITION_DETECTED: 'Health Alert',
      SCREENING_REMINDER: 'Appointment Reminder',
      SCREENING_OVERDUE: 'Important Health Reminder',
      SCREENING_RESULT: 'Results Available',
      PLAN_UPDATED: 'Care Plan Update',
      MULTIPLE_CONDITIONS_DETECTED: 'Multiple Health Alerts',
    };
    return titles[type] || 'Notification';
  }

  /**
   * Format screening type for display
   */
  private formatScreeningType(type: string): string {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Sync subscriber with Novu
   */
  async syncSubscriber(
    userId: string,
    userData: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    }
  ): Promise<boolean> {
    const novu = await getNovuClient();
    if (!novu) return false;

    try {
      await novu.subscribers.identify(userId, {
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName,
        lastName: userData.lastName,
        data: { role: userData.role },
      });
      return true;
    } catch (error) {
      logger.error({
        event: 'novu_sync_error',
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return false;
    }
  }

  /**
   * Get user notification preferences from Novu
   */
  async getNotificationPreferences(userId: string): Promise<unknown[]> {
    const novu = await getNovuClient();
    if (!novu) return [];

    try {
      const result = await novu.subscribers.getPreferences(userId);
      return result.data.preferences;
    } catch {
      return [];
    }
  }

  /**
   * Update user notification preferences in Novu
   */
  async updateNotificationPreference(
    userId: string,
    templateId: string,
    preference: { enabled: boolean; channels?: Record<string, boolean> }
  ): Promise<boolean> {
    const novu = await getNovuClient();
    if (!novu) return false;

    try {
      await novu.subscribers.updatePreference(userId, templateId, preference);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retry failed notification
   */
  async retryNotification(notificationId: string): Promise<NotificationResult> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { id: notificationId, success: false, deliveryResults: [], error: 'Notification not found' };
    }

    const metadata = notification.metadata as { retryCount?: number; deliveryResults?: DeliveryResult[] } | null;
    const retryCount = metadata?.retryCount || 0;

    if (retryCount >= this.MAX_RETRIES) {
      return { id: notificationId, success: false, deliveryResults: [], error: 'Max retries exceeded' };
    }

    // Update retry count
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        metadata: { ...metadata, retryCount: retryCount + 1 },
      },
    });

    // Retry failed channels only
    const failedChannels = (metadata?.deliveryResults || [])
      .filter((r: DeliveryResult) => r.status === 'failed')
      .map((r: DeliveryResult) => r.channel);

    if (failedChannels.length === 0) {
      return { id: notificationId, success: true, deliveryResults: [] };
    }

    return this.sendNotification({
      type: notification.type as NotificationTemplate,
      recipientId: notification.userId,
      recipientType: 'clinician', // Default
      title: notification.title,
      message: notification.message,
      data: notification.data as Record<string, unknown>,
      channels: failedChannels,
    });
  }
}

// Singleton instance
let notificationService: PreventionNotificationService | null = null;

export function getPreventionNotificationService(): PreventionNotificationService {
  if (!notificationService) {
    notificationService = new PreventionNotificationService();
  }
  return notificationService;
}

export default PreventionNotificationService;
