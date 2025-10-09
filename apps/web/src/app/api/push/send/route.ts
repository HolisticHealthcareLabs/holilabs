/**
 * Push Notification Sending API
 *
 * POST /api/push/send - Send push notification to user(s)
 *
 * IMPORTANT: This endpoint requires VAPID keys in environment variables:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (mailto:admin@yourdomain.com)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@holilabs.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

// Notification payload schema
const NotificationSchema = z.object({
  userId: z.string().optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(200),
  icon: z.string().url().optional(),
  badge: z.string().url().optional(),
  data: z.record(z.any()).optional(),
  actions: z.array(z.object({
    action: z.string(),
    title: z.string(),
  })).optional(),
  requireInteraction: z.boolean().optional(),
  tag: z.string().optional(),
});

/**
 * POST /api/push/send
 * Send push notification to specific user or all subscribed users
 *
 * Request body:
 * {
 *   "userId": "optional-user-id", // If omitted, sends to all users
 *   "title": "Notification title",
 *   "body": "Notification body",
 *   "icon": "https://...",
 *   "data": { "type": "APPOINTMENT_REMINDER", "appointmentId": "123" }
 * }
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      // Verify VAPID keys are configured
      if (!vapidPublicKey || !vapidPrivateKey) {
        return NextResponse.json(
          {
            error: 'Push notifications not configured',
            message: 'VAPID keys missing. Run: npx web-push generate-vapid-keys',
          },
          { status: 503 }
        );
      }

      const body = await request.json();

      // Validate notification data
      const notification = NotificationSchema.parse(body);

      // TODO: After adding PushSubscription to schema, uncomment this:
      /*
      // Get subscriptions for target user(s)
      const subscriptions = await prisma.pushSubscription.findMany({
        where: notification.userId
          ? { userId: notification.userId }
          : {}, // Send to all if no userId specified
      });

      if (subscriptions.length === 0) {
        return NextResponse.json(
          { error: 'No push subscriptions found for user' },
          { status: 404 }
        );
      }

      // Send push notification to all subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icon-192x192.png',
            badge: notification.badge || '/icon-192x192.png',
            data: notification.data,
            actions: notification.actions,
            requireInteraction: notification.requireInteraction,
            tag: notification.tag,
          });

          try {
            await webpush.sendNotification(pushSubscription, payload);
            return { success: true, endpoint: sub.endpoint };
          } catch (error: any) {
            logger.error({
              event: 'push_notification_failed',
              endpoint: sub.endpoint,
              error: error.message,
            });

            // If subscription is invalid (410 Gone), remove it
            if (error.statusCode === 410) {
              await prisma.pushSubscription.delete({
                where: { id: sub.id },
              });
            }

            return { success: false, endpoint: sub.endpoint, error: error.message };
          }
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      logger.info({
        event: 'push_notifications_sent',
        total: results.length,
        successful,
        failed,
        userId: notification.userId || 'all',
      });

      return NextResponse.json({
        success: true,
        message: `Push notifications sent: ${successful} successful, ${failed} failed`,
        stats: { total: results.length, successful, failed },
      });
      */

      // TEMPORARY: Return mock response until PushSubscription is added to schema
      logger.info({
        event: 'push_notification_requested',
        title: notification.title,
        userId: notification.userId || 'all',
      });

      return NextResponse.json({
        success: true,
        message: 'Push notification endpoint ready (add PushSubscription to schema to enable)',
        notification,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid notification data',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }

      logger.error({
        event: 'push_notification_error',
        error: error.message,
      });

      return NextResponse.json(
        { error: 'Failed to send push notification', message: error.message },
        { status: 500 }
      );
    }
  }
);
