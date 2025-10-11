/**
 * Push Notification Subscription API
 *
 * POST /api/push/subscribe - Save push subscription to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Subscription schema validation
const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  expirationTime: z.number().nullable().optional(),
});

/**
 * POST /api/push/subscribe
 * Store push notification subscription for the authenticated user
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();

      // Validate subscription data
      const subscription = SubscriptionSchema.parse(body);

      // Get device info
      const userAgent = request.headers.get('user-agent') || undefined;
      const deviceName = getDeviceName(userAgent);
      const platform = getPlatform(userAgent);

      // Store subscription in database
      const savedSubscription = await prisma.pushSubscription.upsert({
        where: {
          endpoint: subscription.endpoint,
        },
        update: {
          userId: context.user.id,
          userType: 'CLINICIAN',
          keys: subscription.keys,
          userAgent,
          platform,
          deviceName,
          isActive: true,
          failedDeliveries: 0,
          lastUsedAt: new Date(),
        },
        create: {
          userId: context.user.id,
          userType: 'CLINICIAN',
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent,
          platform,
          deviceName,
          isActive: true,
          enabledTypes: [],
        },
      });

      logger.info({
        event: 'push_subscription_saved',
        userId: context.user.id,
        endpoint: subscription.endpoint,
        subscriptionId: savedSubscription.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Push subscription saved successfully',
        data: { id: savedSubscription.id },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid subscription data',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }

      logger.error({
        event: 'push_subscription_error',
        error: error.message,
      });

      return NextResponse.json(
        { error: 'Failed to save push subscription', message: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/push/subscribe
 * Remove push notification subscription
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { endpoint } = await request.json();

      if (!endpoint) {
        return NextResponse.json(
          { error: 'Endpoint is required' },
          { status: 400 }
        );
      }

      // Delete subscription from database
      await prisma.pushSubscription.updateMany({
        where: {
          userId: context.user.id,
          endpoint,
        },
        data: {
          isActive: false,
        },
      });

      logger.info({
        event: 'push_subscription_deleted',
        userId: context.user.id,
        endpoint,
      });

      return NextResponse.json({
        success: true,
        message: 'Push subscription removed successfully',
      });
    } catch (error: any) {
      logger.error({
        event: 'push_subscription_delete_error',
        error: error.message,
      });

      return NextResponse.json(
        { error: 'Failed to remove push subscription', message: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * Get device name from user agent
 */
function getDeviceName(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;

  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Browser detection
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // OS detection
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

/**
 * Get platform from user agent
 */
function getPlatform(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;

  if (userAgent.includes('Mobile')) return 'mobile';
  if (userAgent.includes('Tablet')) return 'tablet';
  return 'web';
}
