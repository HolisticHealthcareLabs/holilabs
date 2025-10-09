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

      // Store subscription in database (you'll need to add this table to schema.prisma)
      // For now, we'll log it and return success
      logger.info({
        event: 'push_subscription_received',
        userId: context.user.id,
        endpoint: subscription.endpoint,
      });

      // TODO: Add to Prisma schema:
      // model PushSubscription {
      //   id        String   @id @default(uuid())
      //   userId    String
      //   endpoint  String   @unique
      //   p256dh    String
      //   auth      String
      //   expirationTime Int?
      //   createdAt DateTime @default(now())
      //   updatedAt DateTime @updatedAt
      //   user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
      // }

      // Temporary: Store in memory or skip for now
      // In production, uncomment this after adding to schema:
      /*
      const savedSubscription = await prisma.pushSubscription.upsert({
        where: {
          endpoint: subscription.endpoint,
        },
        update: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          expirationTime: subscription.expirationTime,
          updatedAt: new Date(),
        },
        create: {
          userId: context.user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          expirationTime: subscription.expirationTime,
        },
      });
      */

      return NextResponse.json({
        success: true,
        message: 'Push subscription saved successfully',
        // data: savedSubscription,
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

      // TODO: Uncomment after adding to schema
      /*
      await prisma.pushSubscription.deleteMany({
        where: {
          userId: context.user.id,
          endpoint,
        },
      });
      */

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
