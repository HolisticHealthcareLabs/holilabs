/**
 * Enterprise Webhooks API — Blue Ocean Phase 5
 *
 * POST   /api/enterprise/webhooks — Register subscription
 * GET    /api/enterprise/webhooks — List subscriptions
 * DELETE /api/enterprise/webhooks — Delete subscription
 *
 * Auth: x-pharma-partner-key
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEnterpriseKey } from '@/lib/enterprise/auth';
import { webhookDispatcher, type WebhookEventType } from '@/lib/enterprise/webhook-dispatcher';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

const VALID_EVENTS: WebhookEventType[] = [
  'RISK_THRESHOLD_CROSSED',
  'ASSESSMENT_COMPLETED',
  'BULK_ASSESSMENT_COMPLETED',
];

async function postWebhooks(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  const keyHash = request.headers.get('x-pharma-partner-key')?.slice(0, 8) ?? 'unknown';

  try {
    const body = await request.json();

    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'url is required' },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'events[] is required and must be non-empty' },
        { status: 400 },
      );
    }

    const invalidEvents = body.events.filter((e: string) => !VALID_EVENTS.includes(e as WebhookEventType));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid events: ${invalidEvents.join(', ')}. Valid: ${VALID_EVENTS.join(', ')}` },
        { status: 400 },
      );
    }

    const subscription = webhookDispatcher.register({
      apiKeyHash: keyHash,
      url: body.url,
      events: body.events,
    });

    return NextResponse.json({
      __format: 'enterprise_webhook_subscription_v1',
      subscription: {
        id: subscription.id,
        url: subscription.url,
        events: subscription.events,
        secret: subscription.secret, // shown ONCE on creation
        isActive: subscription.isActive,
        createdAt: subscription.createdAt,
      },
      meta: { apiVersion: '1.0.0' },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to register webhook.' },
      { status: 500 },
    );
  }
}

export const POST = createPublicRoute(postWebhooks);

async function getWebhooks(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  const keyHash = request.headers.get('x-pharma-partner-key')?.slice(0, 8) ?? 'unknown';
  const subscriptions = webhookDispatcher.listSubscriptions(keyHash);

  return NextResponse.json({
    __format: 'enterprise_webhook_list_v1',
    subscriptions,
    meta: { apiVersion: '1.0.0' },
  });
}

export const GET = createPublicRoute(getWebhooks);

async function deleteWebhooks(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  const keyHash = request.headers.get('x-pharma-partner-key')?.slice(0, 8) ?? 'unknown';

  try {
    const body = await request.json();

    if (!body.subscriptionId || typeof body.subscriptionId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'subscriptionId is required' },
        { status: 400 },
      );
    }

    const deleted = webhookDispatcher.deleteSubscription(body.subscriptionId, keyHash);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Subscription not found or not owned by this API key.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, deleted: body.subscriptionId });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete webhook.' },
      { status: 500 },
    );
  }
}

export const DELETE = createPublicRoute(deleteWebhooks);
