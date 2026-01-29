/**
 * Notification Preferences API
 *
 * GET /api/prevention/notifications/preferences - Get user preferences
 * PATCH /api/prevention/notifications/preferences - Update preferences
 *
 * Phase 4: Notifications via Novu
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
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
    const session = await auth();

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
      where: { clinicianId: session.user.id },
    });

    if (clinicianPrefs) {
      // Map individual boolean fields to preferences object
      preferences = {
        email: clinicianPrefs.emailEnabled,
        sms: clinicianPrefs.smsEnabled,
        push: clinicianPrefs.pushEnabled,
        whatsapp: clinicianPrefs.whatsappEnabled,
      };
      preferencesSource = 'clinician';
    }
    // If no clinician preferences, defaults will be used (preferencesSource = 'default')

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
    const session = await auth();

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

    // Map incoming preferences to individual boolean fields
    const updateData: Record<string, boolean | string | null> = {};

    // Map channel preferences to individual fields
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

    // Apply screeningReminder channel preferences (more granular)
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

    // Quiet hours settings
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

    // Check if clinician preferences exist
    const clinicianPrefs = await prisma.clinicianPreferences.findUnique({
      where: { clinicianId: session.user.id },
    });

    if (clinicianPrefs) {
      // Update existing clinician preferences
      await prisma.clinicianPreferences.update({
        where: { clinicianId: session.user.id },
        data: updateData,
      });
    } else {
      // Create new clinician preferences
      await prisma.clinicianPreferences.create({
        data: {
          clinicianId: session.user.id,
          ...updateData,
        },
      });
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
