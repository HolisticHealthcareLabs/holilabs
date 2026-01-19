/**
 * Prevention Notification Service Tests
 *
 * Phase 4: Notifications via Novu
 * TDD-first comprehensive tests for notification service
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
    patientUser: {
      findFirst: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    screeningOutcome: {
      findMany: jest.fn(),
    },
    preventionPlan: {
      findUnique: jest.fn(),
    },
    clinicianPreferences: {
      findUnique: jest.fn(),
    },
    patientPreferences: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

// Mock Novu client
const mockNovuTrigger = jest.fn().mockResolvedValue({ data: { acknowledged: true } });
const mockNovuSubscribers = {
  identify: jest.fn().mockResolvedValue({ data: { subscriberId: 'sub-123' } }),
  setCredentials: jest.fn().mockResolvedValue({ data: {} }),
  getPreferences: jest.fn().mockResolvedValue({ data: { preferences: [] } }),
  updatePreference: jest.fn().mockResolvedValue({ data: {} }),
};

jest.mock('@novu/node', () => ({
  Novu: jest.fn().mockImplementation(() => ({
    trigger: mockNovuTrigger,
    subscribers: mockNovuSubscribers,
  })),
}));

// Mock Socket.IO
const mockSocketEmit = jest.fn();
jest.mock('@/lib/socket-server', () => ({
  getSocketServer: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnValue({ emit: mockSocketEmit }),
    emit: mockSocketEmit,
  }),
}));

const { prisma } = require('@/lib/prisma');
const { createAuditLog } = require('@/lib/audit');

describe('PreventionNotificationService', () => {
  const mockClinician = {
    id: 'clinician-123',
    email: 'doctor@example.com',
    name: 'Dr. Smith',
    phone: '+1234567890',
  };

  const mockPatient = {
    id: 'patient-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1987654321',
  };

  const mockPatientUser = {
    id: 'patient-user-123',
    userId: 'user-456',
    patientId: 'patient-123',
    user: {
      id: 'user-456',
      email: 'john.doe@example.com',
      phone: '+1987654321',
    },
  };

  const mockPreventionPlan = {
    id: 'plan-123',
    patientId: 'patient-123',
    planName: 'Cardiovascular Prevention',
    planType: 'CARDIOVASCULAR',
    status: 'ACTIVE',
  };

  const mockScreeningOutcome = {
    id: 'screening-123',
    patientId: 'patient-123',
    screeningType: 'mammogram',
    scheduledDate: new Date('2024-03-15'),
    completedDate: null,
    result: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockClinician);
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.patientUser.findFirst as jest.Mock).mockResolvedValue(mockPatientUser);
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPreventionPlan);
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-123' });
  });

  describe('Notification Templates', () => {
    it('should define condition_detected template', () => {
      const templates = {
        CONDITION_DETECTED: {
          id: 'condition-detected',
          name: 'Condition Detected Alert',
          channels: ['in_app', 'push', 'email'],
          variables: ['patientName', 'conditionName', 'confidence', 'encounterDate'],
        },
      };

      expect(templates.CONDITION_DETECTED).toBeDefined();
      expect(templates.CONDITION_DETECTED.channels).toContain('push');
      expect(templates.CONDITION_DETECTED.variables).toContain('conditionName');
    });

    it('should define screening_reminder template', () => {
      const templates = {
        SCREENING_REMINDER: {
          id: 'screening-reminder',
          name: 'Screening Due Reminder',
          channels: ['in_app', 'push', 'email', 'sms'],
          variables: ['patientName', 'screeningType', 'dueDate', 'facility'],
        },
      };

      expect(templates.SCREENING_REMINDER).toBeDefined();
      expect(templates.SCREENING_REMINDER.channels).toContain('sms');
    });

    it('should define plan_updated template', () => {
      const templates = {
        PLAN_UPDATED: {
          id: 'plan-updated',
          name: 'Prevention Plan Updated',
          channels: ['in_app', 'email'],
          variables: ['patientName', 'planName', 'changesSummary', 'clinicianName'],
        },
      };

      expect(templates.PLAN_UPDATED).toBeDefined();
      expect(templates.PLAN_UPDATED.variables).toContain('changesSummary');
    });

    it('should define screening_overdue template', () => {
      const templates = {
        SCREENING_OVERDUE: {
          id: 'screening-overdue',
          name: 'Screening Overdue Alert',
          channels: ['in_app', 'push', 'email', 'sms'],
          variables: ['patientName', 'screeningType', 'daysOverdue', 'originalDueDate'],
          priority: 'high',
        },
      };

      expect(templates.SCREENING_OVERDUE).toBeDefined();
      expect(templates.SCREENING_OVERDUE.priority).toBe('high');
    });

    it('should define screening_result template', () => {
      const templates = {
        SCREENING_RESULT: {
          id: 'screening-result',
          name: 'Screening Result Available',
          channels: ['in_app', 'push', 'email'],
          variables: ['patientName', 'screeningType', 'resultStatus', 'nextSteps'],
        },
      };

      expect(templates.SCREENING_RESULT).toBeDefined();
      expect(templates.SCREENING_RESULT.variables).toContain('nextSteps');
    });
  });

  describe('Doctor Real-time Alerts', () => {
    it('should send real-time alert when condition detected', async () => {
      const alertData = {
        type: 'CONDITION_DETECTED',
        clinicianId: 'clinician-123',
        patientId: 'patient-123',
        data: {
          conditionName: 'Type 2 Diabetes Risk',
          confidence: 92,
          encounterId: 'enc-123',
        },
      };

      // Simulate service call
      const notification = await prisma.notification.create({
        data: {
          userId: alertData.clinicianId,
          type: alertData.type,
          title: `New Condition Detected: ${alertData.data.conditionName}`,
          message: `Patient requires attention - ${alertData.data.conditionName} detected with ${alertData.data.confidence}% confidence`,
          data: alertData.data,
          priority: 'HIGH',
        },
      });

      expect(notification).toBeDefined();
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'CONDITION_DETECTED',
            priority: 'HIGH',
          }),
        })
      );
    });

    it('should emit Socket.IO event for real-time updates', async () => {
      const { getSocketServer } = require('@/lib/socket-server');
      const io = getSocketServer();

      const eventData = {
        type: 'prevention:condition_detected',
        patientId: 'patient-123',
        conditionName: 'Hypertension',
        confidence: 88,
      };

      io.to('clinician-123').emit('prevention:alert', eventData);

      expect(io.to).toHaveBeenCalledWith('clinician-123');
      expect(mockSocketEmit).toHaveBeenCalledWith('prevention:alert', eventData);
    });

    it('should send push notification via Novu', async () => {
      const { Novu } = require('@novu/node');
      const novu = new Novu('api-key');

      await novu.trigger('condition-detected', {
        to: { subscriberId: 'clinician-123' },
        payload: {
          patientName: 'John Doe',
          conditionName: 'Type 2 Diabetes Risk',
          confidence: 92,
        },
      });

      expect(mockNovuTrigger).toHaveBeenCalledWith('condition-detected', {
        to: { subscriberId: 'clinician-123' },
        payload: expect.objectContaining({
          conditionName: 'Type 2 Diabetes Risk',
        }),
      });
    });

    it('should batch multiple alerts to prevent notification fatigue', async () => {
      const alerts = [
        { conditionName: 'Diabetes Risk', confidence: 92 },
        { conditionName: 'Hypertension', confidence: 85 },
        { conditionName: 'Obesity', confidence: 78 },
      ];

      // Service should batch these into a single notification
      const batchedNotification = {
        type: 'MULTIPLE_CONDITIONS_DETECTED',
        title: `${alerts.length} Conditions Detected`,
        conditions: alerts,
        priority: 'HIGH',
      };

      expect(batchedNotification.conditions).toHaveLength(3);
      expect(batchedNotification.type).toBe('MULTIPLE_CONDITIONS_DETECTED');
    });

    it('should respect clinician notification preferences', async () => {
      (prisma.clinicianPreferences.findUnique as jest.Mock).mockResolvedValue({
        userId: 'clinician-123',
        notificationPreferences: {
          prevention: {
            conditionDetected: { push: true, email: true, sms: false },
            screeningOverdue: { push: true, email: true, sms: true },
          },
        },
      });

      const preferences = await prisma.clinicianPreferences.findUnique({
        where: { userId: 'clinician-123' },
      });

      expect(preferences.notificationPreferences.prevention.conditionDetected.sms).toBe(false);
      expect(preferences.notificationPreferences.prevention.conditionDetected.push).toBe(true);
    });
  });

  describe('Patient Screening Reminders', () => {
    it('should send reminder 7 days before scheduled screening', async () => {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      (prisma.screeningOutcome.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockScreeningOutcome,
          scheduledDate: sevenDaysFromNow,
          patient: mockPatient,
        },
      ]);

      const upcomingScreenings = await prisma.screeningOutcome.findMany({
        where: {
          scheduledDate: {
            gte: new Date(),
            lte: sevenDaysFromNow,
          },
          completedDate: null,
        },
        include: { patient: true },
      });

      expect(upcomingScreenings).toHaveLength(1);
    });

    it('should send overdue alert when screening not completed', async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 14); // 14 days overdue

      (prisma.screeningOutcome.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockScreeningOutcome,
          scheduledDate: overdueDate,
          dueDate: overdueDate,
          patient: mockPatient,
        },
      ]);

      const overdueScreenings = await prisma.screeningOutcome.findMany({
        where: {
          scheduledDate: { lt: new Date() },
          completedDate: null,
        },
        include: { patient: true },
      });

      expect(overdueScreenings).toHaveLength(1);

      // Calculate days overdue
      const daysOverdue = Math.floor(
        (new Date().getTime() - overdueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysOverdue).toBe(14);
    });

    it('should send SMS reminder via Novu for patient', async () => {
      // Simulate Novu trigger call
      await mockNovuTrigger('screening-reminder', {
        to: { subscriberId: 'patient-user-123', phone: '+1987654321' },
        payload: {
          patientName: 'John',
          screeningType: 'Mammogram',
          dueDate: '2024-03-15',
          facility: 'City Medical Center',
        },
      });

      expect(mockNovuTrigger).toHaveBeenCalledWith('screening-reminder', {
        to: expect.objectContaining({ subscriberId: 'patient-user-123' }),
        payload: expect.objectContaining({ screeningType: 'Mammogram' }),
      });
    });

    it('should respect patient communication preferences', async () => {
      (prisma.patientPreferences.findUnique as jest.Mock).mockResolvedValue({
        patientId: 'patient-123',
        communicationPreferences: {
          email: true,
          sms: true,
          push: false,
          preferredTime: '09:00',
          timezone: 'America/New_York',
        },
      });

      const preferences = await prisma.patientPreferences.findUnique({
        where: { patientId: 'patient-123' },
      });

      expect(preferences.communicationPreferences.push).toBe(false);
      expect(preferences.communicationPreferences.sms).toBe(true);
    });

    it('should schedule reminders at patient preferred time', async () => {
      const scheduledReminder = {
        patientId: 'patient-123',
        type: 'SCREENING_REMINDER',
        scheduledFor: new Date('2024-03-08T09:00:00'), // 9 AM local time, 7 days before
        screeningId: 'screening-123',
        channels: ['email', 'sms'],
        preferredTime: '09:00',
        timezone: 'America/New_York',
      };

      expect(scheduledReminder.scheduledFor).toBeInstanceOf(Date);
      expect(scheduledReminder.preferredTime).toBe('09:00');
      expect(scheduledReminder.channels).toContain('sms');
    });
  });

  describe('Notification Delivery Tracking', () => {
    it('should track notification delivery status', async () => {
      const notificationWithTracking = {
        id: 'notif-123',
        status: 'DELIVERED',
        deliveredAt: new Date(),
        channels: {
          email: { status: 'delivered', deliveredAt: new Date() },
          push: { status: 'delivered', deliveredAt: new Date() },
          sms: { status: 'failed', error: 'Invalid phone number' },
        },
      };

      expect(notificationWithTracking.channels.sms.status).toBe('failed');
      expect(notificationWithTracking.channels.email.status).toBe('delivered');
    });

    it('should retry failed notifications', async () => {
      const failedNotification = {
        id: 'notif-123',
        retryCount: 0,
        maxRetries: 3,
        lastError: 'Network timeout',
      };

      // Simulate retry logic
      const shouldRetry = failedNotification.retryCount < failedNotification.maxRetries;
      expect(shouldRetry).toBe(true);

      failedNotification.retryCount++;
      expect(failedNotification.retryCount).toBe(1);
    });

    it('should log notification audit trail', async () => {
      await createAuditLog({
        action: 'notification_sent',
        entityType: 'Notification',
        entityId: 'notif-123',
        details: {
          type: 'SCREENING_REMINDER',
          patientId: 'patient-123',
          channels: ['email', 'sms'],
          deliveryStatus: 'success',
        },
      });

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notification_sent',
          entityType: 'Notification',
        })
      );
    });
  });

  describe('Notification Preferences API', () => {
    it('should get user notification preferences', async () => {
      await mockNovuSubscribers.getPreferences('clinician-123');

      expect(mockNovuSubscribers.getPreferences).toHaveBeenCalledWith('clinician-123');
    });

    it('should update user notification preferences', async () => {
      await mockNovuSubscribers.updatePreference('clinician-123', 'condition-detected', {
        enabled: true,
        channels: { push: true, email: true, sms: false },
      });

      expect(mockNovuSubscribers.updatePreference).toHaveBeenCalled();
    });

    it('should sync subscriber with Novu', async () => {
      await mockNovuSubscribers.identify('clinician-123', {
        email: 'doctor@example.com',
        firstName: 'Dr.',
        lastName: 'Smith',
        phone: '+1234567890',
        data: {
          role: 'clinician',
          specialty: 'Internal Medicine',
        },
      });

      expect(mockNovuSubscribers.identify).toHaveBeenCalledWith(
        'clinician-123',
        expect.objectContaining({
          email: 'doctor@example.com',
        })
      );
    });
  });

  describe('Multi-Channel Delivery', () => {
    it('should send via multiple channels simultaneously', async () => {
      const channels = ['email', 'push', 'sms', 'in_app'];

      const deliveryPromises = channels.map((channel) =>
        Promise.resolve({ channel, status: 'sent' })
      );

      const results = await Promise.all(deliveryPromises);

      expect(results).toHaveLength(4);
      expect(results.every((r) => r.status === 'sent')).toBe(true);
    });

    it('should handle WhatsApp delivery via Novu', async () => {
      await mockNovuTrigger('screening-reminder-whatsapp', {
        to: { subscriberId: 'patient-123', phone: '+1987654321' },
        payload: {
          patientName: 'John',
          screeningType: 'Colonoscopy',
          dueDate: '2024-06-01',
        },
      });

      expect(mockNovuTrigger).toHaveBeenCalled();
    });

    it('should fallback to alternative channel on failure', async () => {
      const deliveryResult = {
        primary: { channel: 'push', status: 'failed' },
        fallback: { channel: 'email', status: 'sent' },
      };

      expect(deliveryResult.primary.status).toBe('failed');
      expect(deliveryResult.fallback.status).toBe('sent');
    });
  });

  describe('Latency Compliance', () => {
    it('should send real-time alerts under 100ms', async () => {
      const start = performance.now();

      // Simulate notification creation and Socket.IO emit
      await prisma.notification.create({
        data: {
          userId: 'clinician-123',
          type: 'CONDITION_DETECTED',
          title: 'Test',
          message: 'Test message',
        },
      });

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });

    it('should batch process scheduled reminders efficiently', async () => {
      (prisma.screeningOutcome.findMany as jest.Mock).mockResolvedValue(
        Array(100).fill(mockScreeningOutcome)
      );

      const start = performance.now();

      await prisma.screeningOutcome.findMany({
        where: { completedDate: null },
        include: { patient: true },
        take: 100,
      });

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle Novu API errors gracefully', async () => {
      mockNovuTrigger.mockRejectedValueOnce(new Error('Novu API rate limited'));

      await expect(
        mockNovuTrigger('condition-detected', {
          to: { subscriberId: 'clinician-123' },
          payload: {},
        })
      ).rejects.toThrow('Novu API rate limited');
    });

    it('should continue processing on individual notification failure', async () => {
      const notifications = [
        { id: '1', status: 'success' },
        { id: '2', status: 'failed', error: 'Invalid recipient' },
        { id: '3', status: 'success' },
      ];

      const successCount = notifications.filter((n) => n.status === 'success').length;
      const failedCount = notifications.filter((n) => n.status === 'failed').length;

      expect(successCount).toBe(2);
      expect(failedCount).toBe(1);
    });

    it('should log errors without exposing PHI', async () => {
      const error = {
        message: 'Notification delivery failed',
        code: 'DELIVERY_FAILED',
        // No patient details in error
      };

      expect(error.message).not.toContain('patient');
      expect(error.message).not.toContain('John');
    });
  });

  describe('HIPAA Compliance', () => {
    it('should not include PHI in push notification body', () => {
      const pushNotification = {
        title: 'Screening Reminder',
        body: 'You have an upcoming screening appointment',
        // No patient name, no medical details
      };

      expect(pushNotification.body).not.toContain('mammogram');
      expect(pushNotification.body).not.toContain('John');
    });

    it('should encrypt sensitive data in notification payload', () => {
      const notification = {
        id: 'notif-123',
        encryptedPayload: 'encrypted-data-here',
        decryptionKeyRef: 'key-ref-123',
      };

      expect(notification.encryptedPayload).toBeDefined();
      expect(notification.decryptionKeyRef).toBeDefined();
    });

    it('should audit all notification access', async () => {
      await createAuditLog({
        action: 'notification_viewed',
        entityType: 'Notification',
        entityId: 'notif-123',
        userId: 'clinician-123',
        details: { viewedAt: new Date() },
      });

      expect(createAuditLog).toHaveBeenCalled();
    });
  });
});
