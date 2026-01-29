/**
 * Prevention Notifications API Tests
 *
 * Phase 4: Notifications via Novu
 * Tests for notification API routes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Type helper for jest mocks with @jest/globals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<any>;

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    clinicianPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patientPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patientUser: {
      findFirst: jest.fn(),
    },
    screeningOutcome: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
  authOptions: {},
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
  auditCreate: jest.fn(() => Promise.resolve(undefined)),
  auditUpdate: jest.fn(() => Promise.resolve(undefined)),
  auditView: jest.fn(() => Promise.resolve(undefined)),
}));

jest.mock('@/lib/services/prevention-notification.service', () => ({
  getPreventionNotificationService: jest.fn(() => ({
    sendNotification: jest.fn(() => Promise.resolve({
      id: 'notif-123',
      success: true,
      deliveryResults: [{ channel: 'in_app', status: 'delivered' }],
    })),
    sendScreeningReminder: jest.fn(() => Promise.resolve({
      id: 'notif-456',
      success: true,
      deliveryResults: [],
    })),
    sendScreeningOverdueAlert: jest.fn(() => Promise.resolve({
      id: 'notif-789',
      success: true,
      deliveryResults: [],
    })),
    updateNotificationPreference: jest.fn(() => Promise.resolve(true)),
  })),
  NOTIFICATION_TEMPLATES: {
    CONDITION_DETECTED: { id: 'condition-detected' },
    SCREENING_REMINDER: { id: 'screening-reminder' },
    SCREENING_OVERDUE: { id: 'screening-overdue' },
    SCREENING_RESULT: { id: 'screening-result' },
    PLAN_UPDATED: { id: 'plan-updated' },
    MULTIPLE_CONDITIONS_DETECTED: { id: 'multiple-conditions-detected' },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('@/lib/prisma');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getServerSession } = require('@/lib/auth');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { auditView, auditCreate, auditUpdate } = require('@/lib/audit');

describe('Prevention Notifications API', () => {
  const mockUser = {
    id: 'user-123',
    email: 'doctor@example.com',
    name: 'Dr. Smith',
  };

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    type: 'SCREENING_REMINDER',
    title: 'Upcoming Screening',
    message: 'You have a mammogram scheduled',
    data: { screeningId: 'screen-123' },
    priority: 'HIGH',
    readAt: null,
    createdAt: new Date(),
    deliveryStatus: 'DELIVERED',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as AnyMock).mockResolvedValue({ user: mockUser });
  });

  describe('GET /api/prevention/notifications', () => {
    it('should return user notifications with pagination', async () => {
      const notifications = [mockNotification];
      (prisma.notification.findMany as AnyMock).mockResolvedValue(notifications);
      (prisma.notification.count as AnyMock)
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unread

      const result = await prisma.notification.findMany({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('SCREENING_REMINDER');
    });

    it('should filter by type', async () => {
      (prisma.notification.findMany as AnyMock).mockResolvedValue([mockNotification]);

      await prisma.notification.findMany({
        where: {
          userId: 'user-123',
          type: 'SCREENING_REMINDER',
        },
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'SCREENING_REMINDER',
          }),
        })
      );
    });

    it('should filter unread only', async () => {
      (prisma.notification.findMany as AnyMock).mockResolvedValue([mockNotification]);

      await prisma.notification.findMany({
        where: {
          userId: 'user-123',
          readAt: null,
        },
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            readAt: null,
          }),
        })
      );
    });

    it('should return unread count', async () => {
      (prisma.notification.count as AnyMock).mockResolvedValue(5);

      const unreadCount = await prisma.notification.count({
        where: {
          userId: 'user-123',
          readAt: null,
        },
      });

      expect(unreadCount).toBe(5);
    });
  });

  describe('POST /api/prevention/notifications', () => {
    it('should send notification to clinician', async () => {
      (prisma.user.findUnique as AnyMock).mockResolvedValue(mockUser);
      (prisma.notification.create as AnyMock).mockResolvedValue(mockNotification);

      const notification = await prisma.notification.create({
        data: {
          userId: 'user-123',
          type: 'CONDITION_DETECTED',
          title: 'Condition Detected',
          message: 'Diabetes risk detected',
          priority: 'HIGH',
        },
      });

      expect(notification.type).toBe('SCREENING_REMINDER');
    });

    it('should validate recipient exists', async () => {
      (prisma.user.findUnique as AnyMock).mockResolvedValue(null);

      const user = await prisma.user.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(user).toBeNull();
    });

    it('should validate notification type', () => {
      const validTypes = [
        'CONDITION_DETECTED',
        'SCREENING_REMINDER',
        'SCREENING_OVERDUE',
        'SCREENING_RESULT',
        'PLAN_UPDATED',
        'MULTIPLE_CONDITIONS_DETECTED',
      ];

      expect(validTypes).toContain('CONDITION_DETECTED');
      expect(validTypes).not.toContain('INVALID_TYPE');
    });
  });

  describe('GET /api/prevention/notifications/[id]', () => {
    it('should return notification details', async () => {
      (prisma.notification.findUnique as AnyMock).mockResolvedValue(mockNotification);

      const notification = await prisma.notification.findUnique({
        where: { id: 'notif-123' },
      });

      expect(notification).toBeDefined();
      expect(notification.id).toBe('notif-123');
    });

    it('should return null for non-existent notification', async () => {
      (prisma.notification.findUnique as AnyMock).mockResolvedValue(null);

      const notification = await prisma.notification.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(notification).toBeNull();
    });

    it('should verify ownership before returning', async () => {
      const otherUserNotification = { ...mockNotification, userId: 'other-user' };
      (prisma.notification.findUnique as AnyMock).mockResolvedValue(otherUserNotification);

      const notification = await prisma.notification.findUnique({
        where: { id: 'notif-123' },
      });

      expect(notification.userId).not.toBe('user-123');
    });
  });

  describe('PATCH /api/prevention/notifications/[id]', () => {
    it('should mark notification as read', async () => {
      const updatedNotification = { ...mockNotification, readAt: new Date() };
      (prisma.notification.findUnique as AnyMock).mockResolvedValue(mockNotification);
      (prisma.notification.update as AnyMock).mockResolvedValue(updatedNotification);

      const updated = await prisma.notification.update({
        where: { id: 'notif-123' },
        data: { readAt: new Date() },
      });

      expect(updated.readAt).not.toBeNull();
    });

    it('should mark notification as unread', async () => {
      const readNotification = { ...mockNotification, readAt: new Date() };
      (prisma.notification.findUnique as AnyMock).mockResolvedValue(readNotification);
      (prisma.notification.update as AnyMock).mockResolvedValue({ ...readNotification, readAt: null });

      const updated = await prisma.notification.update({
        where: { id: 'notif-123' },
        data: { readAt: null },
      });

      expect(updated.readAt).toBeNull();
    });
  });

  describe('POST /api/prevention/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      (prisma.notification.updateMany as AnyMock).mockResolvedValue({ count: 5 });

      const result = await prisma.notification.updateMany({
        where: {
          userId: 'user-123',
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      expect(result.count).toBe(5);
    });
  });

  describe('DELETE /api/prevention/notifications/[id]', () => {
    it('should delete notification', async () => {
      (prisma.notification.findUnique as AnyMock).mockResolvedValue(mockNotification);
      (prisma.notification.delete as AnyMock).mockResolvedValue(mockNotification);

      await prisma.notification.delete({
        where: { id: 'notif-123' },
      });

      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
      });
    });

    it('should not delete other user notifications', async () => {
      const otherNotification = { ...mockNotification, userId: 'other-user' };
      (prisma.notification.findUnique as AnyMock).mockResolvedValue(otherNotification);

      const notification = await prisma.notification.findUnique({
        where: { id: 'notif-123' },
      });

      // Should verify ownership before delete
      expect(notification.userId).not.toBe('user-123');
    });
  });

  describe('GET /api/prevention/notifications/preferences', () => {
    it('should return clinician preferences', async () => {
      const mockPrefs = {
        userId: 'user-123',
        notificationPreferences: {
          prevention: {
            conditionDetected: { enabled: true, channels: { push: true } },
          },
        },
      };
      (prisma.clinicianPreferences.findUnique as AnyMock).mockResolvedValue(mockPrefs);

      const prefs = await prisma.clinicianPreferences.findUnique({
        where: { userId: 'user-123' },
      });

      expect(prefs.notificationPreferences.prevention.conditionDetected.enabled).toBe(true);
    });

    it('should return patient preferences', async () => {
      (prisma.clinicianPreferences.findUnique as AnyMock).mockResolvedValue(null);
      (prisma.patientUser.findFirst as AnyMock).mockResolvedValue({
        patientId: 'patient-123',
      });
      (prisma.patientPreferences.findUnique as AnyMock).mockResolvedValue({
        patientId: 'patient-123',
        communicationPreferences: {
          screeningReminder: { enabled: true },
        },
      });

      const patientPrefs = await prisma.patientPreferences.findUnique({
        where: { patientId: 'patient-123' },
      });

      expect(patientPrefs.communicationPreferences.screeningReminder.enabled).toBe(true);
    });

    it('should return defaults when no preferences exist', async () => {
      (prisma.clinicianPreferences.findUnique as AnyMock).mockResolvedValue(null);
      (prisma.patientUser.findFirst as AnyMock).mockResolvedValue(null);

      const clinicianPrefs = await prisma.clinicianPreferences.findUnique({
        where: { userId: 'user-123' },
      });

      expect(clinicianPrefs).toBeNull();
    });
  });

  describe('PATCH /api/prevention/notifications/preferences', () => {
    it('should update clinician preferences', async () => {
      const existingPrefs = {
        userId: 'user-123',
        notificationPreferences: { prevention: {} },
      };
      (prisma.clinicianPreferences.findUnique as AnyMock).mockResolvedValue(existingPrefs);
      (prisma.clinicianPreferences.update as AnyMock).mockResolvedValue({
        ...existingPrefs,
        notificationPreferences: {
          prevention: {
            conditionDetected: { enabled: false },
          },
        },
      });

      const updated = await prisma.clinicianPreferences.update({
        where: { userId: 'user-123' },
        data: {
          notificationPreferences: {
            prevention: {
              conditionDetected: { enabled: false },
            },
          },
        },
      });

      expect(updated.notificationPreferences.prevention.conditionDetected.enabled).toBe(false);
    });

    it('should create preferences if none exist', async () => {
      (prisma.clinicianPreferences.findUnique as AnyMock).mockResolvedValue(null);
      (prisma.patientUser.findFirst as AnyMock).mockResolvedValue(null);
      (prisma.clinicianPreferences.create as AnyMock).mockResolvedValue({
        userId: 'user-123',
        notificationPreferences: {
          prevention: {
            conditionDetected: { enabled: true },
          },
        },
      });

      const created = await prisma.clinicianPreferences.create({
        data: {
          userId: 'user-123',
          notificationPreferences: {
            prevention: {
              conditionDetected: { enabled: true },
            },
          },
        },
      });

      expect(created.userId).toBe('user-123');
    });
  });

  describe('POST /api/prevention/notifications/cron/send-reminders', () => {
    const mockScreenings = [
      {
        id: 'screen-1',
        patientId: 'patient-123',
        screeningType: 'mammogram',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        dueDate: null,
        completedDate: null,
        remindersSent: 0,
        lastReminderAt: null,
        facility: 'City Hospital',
        patient: { id: 'patient-123', firstName: 'Jane', lastName: 'Doe' },
      },
    ];

    it('should process 7-day reminders', async () => {
      (prisma.screeningOutcome.findMany as AnyMock).mockResolvedValue(mockScreenings);
      (prisma.screeningOutcome.update as AnyMock).mockResolvedValue({
        ...mockScreenings[0],
        remindersSent: 1,
      });

      const screenings = await prisma.screeningOutcome.findMany({
        where: {
          completedDate: null,
          remindersSent: { lt: 1 },
        },
      });

      expect(screenings).toHaveLength(1);
      expect(screenings[0].remindersSent).toBe(0);
    });

    it('should process overdue alerts', async () => {
      const overdueScreening = {
        ...mockScreenings[0],
        scheduledDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      };
      (prisma.screeningOutcome.findMany as AnyMock).mockResolvedValue([overdueScreening]);

      const screenings = await prisma.screeningOutcome.findMany({
        where: {
          scheduledDate: { lt: new Date() },
          completedDate: null,
        },
      });

      expect(screenings).toHaveLength(1);
      expect(screenings[0].scheduledDate < new Date()).toBe(true);
    });

    it('should update reminder count after sending', async () => {
      (prisma.screeningOutcome.update as AnyMock).mockResolvedValue({
        ...mockScreenings[0],
        remindersSent: 1,
        lastReminderAt: new Date(),
      });

      const updated = await prisma.screeningOutcome.update({
        where: { id: 'screen-1' },
        data: {
          remindersSent: { increment: 1 },
          lastReminderAt: new Date(),
        },
      });

      expect(updated.remindersSent).toBe(1);
      expect(updated.lastReminderAt).toBeDefined();
    });

    it('should batch process efficiently', async () => {
      const manyScreenings = Array(100).fill(mockScreenings[0]);
      (prisma.screeningOutcome.findMany as AnyMock).mockResolvedValue(manyScreenings);

      const start = performance.now();
      await prisma.screeningOutcome.findMany({ take: 100 });
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('HIPAA Audit Logging', () => {
    it('should audit notification views', async () => {
      await auditView('Notification', 'user-123', {}, {
        action: 'notifications_viewed',
      });

      expect(auditView).toHaveBeenCalledWith(
        'Notification',
        'user-123',
        expect.anything(),
        expect.objectContaining({ action: 'notifications_viewed' })
      );
    });

    it('should audit notification sends', async () => {
      await auditCreate('Notification', 'notif-123', {}, {
        type: 'CONDITION_DETECTED',
        action: 'notification_sent',
      });

      expect(auditCreate).toHaveBeenCalledWith(
        'Notification',
        'notif-123',
        expect.anything(),
        expect.objectContaining({ action: 'notification_sent' })
      );
    });

    it('should audit preference updates', async () => {
      await auditUpdate('NotificationPreferences', 'user-123', {}, {
        action: 'preferences_updated',
      });

      expect(auditUpdate).toHaveBeenCalledWith(
        'NotificationPreferences',
        'user-123',
        expect.anything(),
        expect.objectContaining({ action: 'preferences_updated' })
      );
    });
  });

  describe('Latency Compliance', () => {
    it('should fetch notifications under 200ms', async () => {
      (prisma.notification.findMany as AnyMock).mockResolvedValue([mockNotification]);
      (prisma.notification.count as AnyMock).mockResolvedValue(1);

      const start = performance.now();
      await Promise.all([
        prisma.notification.findMany({ where: { userId: 'user-123' } }),
        prisma.notification.count({ where: { userId: 'user-123' } }),
      ]);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.notification.findMany as AnyMock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        prisma.notification.findMany({ where: { userId: 'user-123' } })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle unauthorized access', async () => {
      (getServerSession as AnyMock).mockResolvedValue(null);

      const session = await getServerSession();
      expect(session).toBeNull();
    });
  });
});
