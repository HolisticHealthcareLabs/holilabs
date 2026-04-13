export const dynamic = "force-dynamic";
/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe — receives Stripe subscription & invoice events
 * CVI-001: Signature verification required before processing any payload.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import logger from '@/lib/logger';

/**
 * Verify Stripe webhook signature using the official algorithm.
 * Avoids requiring the full Stripe SDK for a single verification call.
 * See: https://stripe.com/docs/webhooks/signatures#verify-manually
 */
function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  tolerance = 300
): { verified: boolean; event?: unknown; error?: string } {
  const elements = sigHeader.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
  const signatures = elements
    .filter(e => e.startsWith('v1='))
    .map(e => e.split('=')[1]);

  if (!timestamp || signatures.length === 0) {
    return { verified: false, error: 'Invalid signature format' };
  }

  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > tolerance) {
    return { verified: false, error: 'Timestamp outside tolerance' };
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const isValid = signatures.some(sig =>
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
  );

  if (!isValid) {
    return { verified: false, error: 'Signature mismatch' };
  }

  return { verified: true, event: JSON.parse(payload) };
}

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
    // Verify webhook signature before processing (CVI-001)
    const result = verifyStripeSignature(body, sig, webhookSecret);
    if (!result.verified) {
      logger.warn({ event: 'stripe_webhook_signature_invalid', error: result.error });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    const event = result.event as { type: string; id: string; data?: { object?: { id?: string } } };

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
