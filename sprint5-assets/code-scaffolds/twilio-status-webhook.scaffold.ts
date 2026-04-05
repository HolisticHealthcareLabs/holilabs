/**
 * Twilio Status Webhook — Delivery status callback handler
 *
 * Reference for src/app/api/comms/webhook/twilio/status/route.ts
 *
 * Updates Message status: queued → sent → delivered → read → failed
 * Emits SSE delivery_update event for real-time UI updates.
 *
 * CYRUS: signature validation, audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: holilabsv2 — import twilio, prisma, emitDeliveryUpdate

// ─── Status Mapping ──────────────────────────────────────────────────────────

const TWILIO_STATUS_MAP: Record<string, string> = {
  queued: 'QUEUED',
  sending: 'QUEUED',
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
  undelivered: 'FAILED',
};

// ─── POST Handler ────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // ── CYRUS: Validate signature ──────────────────────────────────────────
  const signature = request.headers.get('x-twilio-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 403 });
  }

  // TODO: holilabsv2 — const isValid = twilio.validateRequest(authToken, signature, url, params);
  const isValid = true; // Scaffold placeholder

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // ── Parse status update ────────────────────────────────────────────────
  const messageSid = params.MessageSid;
  const twilioStatus = params.MessageStatus;
  const errorCode = params.ErrorCode || null;
  const errorMessage = params.ErrorMessage || null;

  if (!messageSid || !twilioStatus) {
    return NextResponse.json({ error: 'Missing MessageSid or MessageStatus' }, { status: 400 });
  }

  const holiStatus = TWILIO_STATUS_MAP[twilioStatus] || 'QUEUED';

  // ── Update message in database ─────────────────────────────────────────
  // TODO: holilabsv2 — find and update message by twilioSid
  // const message = await prisma.message.findFirst({ where: { twilioSid: messageSid } });
  // if (!message) { return NextResponse.json({ status: 'unknown_message' }); }
  //
  // const updateData: Record<string, unknown> = { status: holiStatus };
  // if (holiStatus === 'DELIVERED') updateData.deliveredAt = new Date();
  // if (holiStatus === 'READ') updateData.readAt = new Date();
  // if (holiStatus === 'FAILED') { updateData.errorCode = errorCode; updateData.errorMessage = errorMessage; }
  //
  // await prisma.message.update({ where: { id: message.id }, data: updateData });

  // ── Emit SSE event ─────────────────────────────────────────────────────
  // TODO: holilabsv2 — emitDeliveryUpdate(message.conversation.organizationId, {
  //   messageId: message.id,
  //   conversationId: message.conversationId,
  //   status: holiStatus,
  //   errorCode: errorCode || undefined,
  // });

  // ── Return 200 (Twilio expects acknowledgment) ─────────────────────────
  return NextResponse.json({ status: 'processed', messageSid, newStatus: holiStatus });
}
