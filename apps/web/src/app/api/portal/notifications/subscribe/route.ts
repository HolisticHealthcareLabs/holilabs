/**
 * Push Notification Subscribe API
 * Saves push subscription to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import logger from '@/lib/logger';

const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

export const POST = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const body = await request.json();

    try {
      var validated = subscriptionSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid subscription data',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: {
        endpoint: validated.subscription.endpoint,
      },
    });

    if (existingSubscription) {
      const updated = await prisma.pushSubscription.update({
        where: {
          endpoint: validated.subscription.endpoint,
        },
        data: {
          userId: context.session.userId,
          userType: 'PATIENT',
          keys: validated.subscription.keys,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          subscriptionId: updated.id,
        },
        message: 'Push subscription updated',
      });
    }

    const subscription = await prisma.pushSubscription.create({
      data: {
        userId: context.session.userId,
        userType: 'PATIENT',
        endpoint: validated.subscription.endpoint,
        keys: validated.subscription.keys,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        action: 'CREATE',
        resource: 'PushSubscription',
        resourceId: subscription.id,
        details: {
          endpoint: validated.subscription.endpoint,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
      },
      message: 'Push subscription created successfully',
    });
  },
  { audit: { action: 'CREATE', resource: 'PushSubscription' } }
);
