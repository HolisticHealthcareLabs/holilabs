/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe — receives Stripe subscription & invoice events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import logger from '@/lib/logger';

export const POST = createPublicRoute(async (request: NextRequest) => {
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const body = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error({ event: 'stripe_webhook_not_configured' });
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  try {
    // TODO: verify signature with stripe.webhooks.constructEvent(body, sig, webhookSecret)
    const event = JSON.parse(body);

    logger.info({
      event: 'stripe_webhook_received',
      type: event.type,
      id: event.id,
    });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        logger.info({ event: 'stripe_subscription_event', type: event.type, data: event.data?.object?.id });
        break;
      default:
        logger.info({ event: 'stripe_webhook_unhandled', type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({
      event: 'stripe_webhook_error',
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
});
