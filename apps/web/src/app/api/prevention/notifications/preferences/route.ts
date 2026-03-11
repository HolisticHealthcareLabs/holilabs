/**
 * Notification Preferences API
 *
 * GET /api/prevention/notifications/preferences - Get user preferences
 * PATCH /api/prevention/notifications/preferences - Update preferences
 *
 * Phase 4: Notifications via Novu
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditView, auditUpdate } from '@/lib/audit';
import { getPreventionNotificationService } from '@/lib/services/prevention-notification.service';

export const dynamic = 'force-dynamic';

const DEFAULT_PREVENTION_PREFERENCES = {
  conditionDetected: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: false },
  },
  screeningReminder: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: true },
    reminderDays: [7, 3, 1],
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
      start: z.string().optional(),
      end: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

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
    logger.warn({
      event: 'novu_sync_warning',
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
  }
}

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

/**
 * GET /api/prevention/notifications/preferences
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const start = performance.now();
    const userId = context.user?.id;

    let preferences: Record<string, unknown> = {};
    let preferencesSource: 'clinician' | 'patient' | 'default' = 'default';

    const clinicianPrefs = await prisma.clinicianPreferences.findUnique({
      where: { clinicianId: userId },
    });

    if (clinicianPrefs) {
      preferences = {
        email: clinicianPrefs.emailEnabled,
        sms: clinicianPrefs.smsEnabled,
        push: clinicianPrefs.pushEnabled,
        whatsapp: clinicianPrefs.whatsappEnabled,
      };
      preferencesSource = 'clinician';
    }

    const mergedPreferences = deepMerge(DEFAULT_PREVENTION_PREFERENCES, preferences);

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notification_preferences_fetched',
      userId,
      source: preferencesSource,
      latencyMs: elapsed.toFixed(2),
    });

    await auditView('NotificationPreferences', userId!, request, {
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
  },
  { roles: [...ROLES] }
);

/**
 * PATCH /api/prevention/notifications/preferences
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const start = performance.now();
    const userId = context.user?.id;

    const body = await request.json();
    const validation = PreferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid preferences data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const newPreferences = validation.data;
    const updateData: Record<string, boolean | string | null> = {};

    if (newPreferences.conditionDetected?.channels) {
      if (newPreferences.conditionDetected.channels.email !== undefined) {
        updateData.emailEnabled = newPreferences.conditionDetected.channels.email;
      }
      if (newPreferences.conditionDetected.channels.sms !== undefined) {
        updateData.smsEnabled = newPreferences.conditionDetected.channels.sms;
      }
      if (newPreferences.conditionDetected.channels.push !== undefined) {
        updateData.pushEnabled = newPreferences.conditionDetected.channels.push;
      }
    }

    if (newPreferences.screeningReminder?.channels) {
      if (newPreferences.screeningReminder.channels.email !== undefined) {
        updateData.emailEnabled = newPreferences.screeningReminder.channels.email;
      }
      if (newPreferences.screeningReminder.channels.sms !== undefined) {
        updateData.smsEnabled = newPreferences.screeningReminder.channels.sms;
      }
      if (newPreferences.screeningReminder.channels.push !== undefined) {
        updateData.pushEnabled = newPreferences.screeningReminder.channels.push;
      }
    }

    if (newPreferences.quietHours) {
      if (newPreferences.quietHours.enabled !== undefined) {
        updateData.quietHoursEnabled = newPreferences.quietHours.enabled;
      }
      if (newPreferences.quietHours.start !== undefined) {
        updateData.quietHoursStart = newPreferences.quietHours.start;
      }
      if (newPreferences.quietHours.end !== undefined) {
        updateData.quietHoursEnd = newPreferences.quietHours.end;
      }
      if (newPreferences.quietHours.timezone !== undefined) {
        updateData.timezone = newPreferences.quietHours.timezone;
      }
    }

    const clinicianPrefs = await prisma.clinicianPreferences.findUnique({
      where: { clinicianId: userId },
    });

    if (clinicianPrefs) {
      await prisma.clinicianPreferences.update({
        where: { clinicianId: userId },
        data: updateData,
      });
    } else {
      await prisma.clinicianPreferences.create({
        data: {
          clinicianId: userId!,
          ...updateData,
        },
      });
    }

    const notificationService = getPreventionNotificationService();
    await syncPreferencesWithNovu(notificationService, userId!, newPreferences);

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notification_preferences_updated',
      userId,
      latencyMs: elapsed.toFixed(2),
    });

    await auditUpdate('NotificationPreferences', userId!, request, {
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
  },
  { roles: [...ROLES] }
);
