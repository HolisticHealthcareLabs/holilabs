/**
 * Push Notification Subscribe API
 * Saves push subscription to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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

export async function POST(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse request body
    const body = await request.json();
    const validated = subscriptionSchema.parse(body);

    // Check if subscription already exists
    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: {
        endpoint: validated.subscription.endpoint,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      const updated = await prisma.pushSubscription.update({
        where: {
          endpoint: validated.subscription.endpoint,
        },
        data: {
          userId: session.userId,
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

    // Create new subscription
    const subscription = await prisma.pushSubscription.create({
      data: {
        userId: session.userId,
        userType: 'PATIENT',
        endpoint: validated.subscription.endpoint,
        keys: validated.subscription.keys,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
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
  } catch (error) {
    console.error('Push subscription error:', error);

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

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create push subscription',
      },
      { status: 500 }
    );
  }
}
