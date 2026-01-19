/**
 * Notification Preferences API
 *
 * GET /api/prevention/notifications/preferences - Get user preferences
 * PATCH /api/prevention/notifications/preferences - Update preferences
 *
 * Phase 4: Notifications via Novu
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditView, auditUpdate } from '@/lib/audit';
import { getPreventionNotificationService } from '@/lib/services/prevention-notification.service';

export const dynamic = 'force-dynamic';

// Default preferences structure
const DEFAULT_PREVENTION_PREFERENCES = {
  conditionDetected: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: false },
  },
  screeningReminder: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: true },
    reminderDays: [7, 3, 1], // Days before screening to send reminders
  },
  screeningOverdue: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: true },
  },
  screeningResult: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: false },
  },
  planUpdated: {
    enabled: true,
    channels: { in_app: true, push: false, email: true, sms: false },
  },
};

// Preference schema
const PreferencesSchema = z.object({
  conditionDetected: z
    .object({
      enabled: z.boolean().optional(),
      channels: z
        .object({
          in_app: z.boolean().optional(),
          push: z.boolean().optional(),
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  screeningReminder: z
    .object({
      enabled: z.boolean().optional(),
      channels: z
        .object({
          in_app: z.boolean().optional(),
          push: z.boolean().optional(),
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
        })
        .optional(),
      reminderDays: z.array(z.number().min(1).max(30)).optional(),
    })
    .optional(),
  screeningOverdue: z
    .object({
      enabled: z.boolean().optional(),
      channels: z
        .object({
          in_app: z.boolean().optional(),
          push: z.boolean().optional(),
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  screeningResult: z
    .object({
      enabled: z.boolean().optional(),
      channels: z
        .object({
          in_app: z.boolean().optional(),
          push: z.boolean().optional(),
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  planUpdated: z
    .object({
      enabled: z.boolean().optional(),
      channels: z
        .object({
          in_app: z.boolean().optional(),
          push: z.boolean().optional(),
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  quietHours: z
    .object({
      enabled: z.boolean().optional(),
      start: z.string().optional(), // "22:00"
      end: z.string().optional(), // "07:00"
      timezone: z.string().optional(),
    })
    .optional(),
});

/**
 * GET /api/prevention/notifications/preferences
 * Get current user's notification preferences
 */
export async function GET(request: NextRequest) {
  const start = performance.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Try to get clinician preferences first, then patient preferences
    let preferences: Record<string, unknown> = {};
    let preferencesSource: 'clinician' | 'patient' | 'default' = 'default';

    // Check clinician preferences
    const clinicianPrefs = await prisma.clinicianPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (clinicianPrefs?.notificationPreferences) {
      const notifPrefs = clinicianPrefs.notificationPreferences as Record<string, unknown>;
      preferences = (notifPrefs.prevention as Record<string, unknown>) || {};
      preferencesSource = 'clinician';
    } else {
      // Check if user has a patient profile
      const patientUser = await prisma.patientUser.findFirst({
        where: { userId: session.user.id },
      });

      if (patientUser) {
        const patientPrefs = await prisma.patientPreferences.findUnique({
          where: { patientId: patientUser.patientId },
        });

        if (patientPrefs?.communicationPreferences) {
          preferences = patientPrefs.communicationPreferences as Record<string, unknown>;
          preferencesSource = 'patient';
        }
      }
    }

    // Merge with defaults
    const mergedPreferences = deepMerge(DEFAULT_PREVENTION_PREFERENCES, preferences);

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notification_preferences_fetched',
      userId: session.user.id,
      source: preferencesSource,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit
    await auditView('NotificationPreferences', session.user.id, request, {
      source: preferencesSource,
      action: 'preferences_viewed',
    });

    return NextResponse.json({
      success: true,
      data: {
        preferences: mergedPreferences,
        source: preferencesSource,
      },
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    logger.error({
      event: 'preferences_fetch_error',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/prevention/notifications/preferences
 * Update notification preferences
 */
export async function PATCH(request: NextRequest) {
  const start = performance.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = PreferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid preferences data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const newPreferences = validation.data;

    // Check if user is a clinician or patient
    const clinicianPrefs = await prisma.clinicianPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (clinicianPrefs) {
      // Update clinician preferences
      const existingNotifPrefs = (clinicianPrefs.notificationPreferences as Record<string, unknown>) || {};
      const existingPreventionPrefs = (existingNotifPrefs.prevention as Record<string, unknown>) || {};

      const updatedPreventionPrefs = deepMerge(existingPreventionPrefs, newPreferences);

      await prisma.clinicianPreferences.update({
        where: { userId: session.user.id },
        data: {
          notificationPreferences: {
            ...existingNotifPrefs,
            prevention: updatedPreventionPrefs,
          },
        },
      });
    } else {
      // Check for patient user
      const patientUser = await prisma.patientUser.findFirst({
        where: { userId: session.user.id },
      });

      if (patientUser) {
        const existingPrefs = await prisma.patientPreferences.findUnique({
          where: { patientId: patientUser.patientId },
        });

        const existingCommPrefs = (existingPrefs?.communicationPreferences as Record<string, unknown>) || {};
        const updatedPrefs = deepMerge(existingCommPrefs, newPreferences);

        if (existingPrefs) {
          await prisma.patientPreferences.update({
            where: { patientId: patientUser.patientId },
            data: {
              communicationPreferences: updatedPrefs,
            },
          });
        } else {
          await prisma.patientPreferences.create({
            data: {
              patientId: patientUser.patientId,
              communicationPreferences: updatedPrefs,
            },
          });
        }
      } else {
        // Create clinician preferences for this user
        await prisma.clinicianPreferences.create({
          data: {
            userId: session.user.id,
            notificationPreferences: {
              prevention: newPreferences,
            },
          },
        });
      }
    }

    // Sync with Novu if configured
    const notificationService = getPreventionNotificationService();
    await syncPreferencesWithNovu(notificationService, session.user.id, newPreferences);

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notification_preferences_updated',
      userId: session.user.id,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit
    await auditUpdate('NotificationPreferences', session.user.id, request, {
      changes: Object.keys(newPreferences),
      action: 'preferences_updated',
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    logger.error({
      event: 'preferences_update_error',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

/**
 * Deep merge two objects
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        (target[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>
      );
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Sync preferences with Novu
 */
async function syncPreferencesWithNovu(
  service: ReturnType<typeof getPreventionNotificationService>,
  userId: string,
  preferences: Record<string, unknown>
): Promise<void> {
  try {
    const templateMappings: Record<string, string> = {
      conditionDetected: 'condition-detected',
      screeningReminder: 'screening-reminder',
      screeningOverdue: 'screening-overdue',
      screeningResult: 'screening-result',
      planUpdated: 'plan-updated',
    };

    for (const [prefKey, templateId] of Object.entries(templateMappings)) {
      const pref = preferences[prefKey] as { enabled?: boolean; channels?: Record<string, boolean> } | undefined;
      if (pref) {
        await service.updateNotificationPreference(userId, templateId, {
          enabled: pref.enabled ?? true,
          channels: pref.channels,
        });
      }
    }
  } catch (error) {
    // Log but don't fail - Novu sync is not critical
    logger.warn({
      event: 'novu_sync_warning',
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
  }
}
