/**
 * Twilio Inbound Webhook — WhatsApp/SMS message receiver
 *
 * Reference for src/app/api/comms/webhook/twilio/route.ts
 *
 * CYRUS: X-Twilio-Signature validated BEFORE any processing
 * CYRUS: MessageSid replay protection via cache
 * CYRUS: message content encrypted with encryptPHIWithVersion
 * RUTH: message preview in SSE event must NOT contain PHI
 *
 * @see sprint5-assets/comms-architecture.json — security.cyrusInvariants
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: holilabsv2 — import from your actual paths
// import twilio from 'twilio';
// import { prisma } from '@/lib/prisma';
// import { encryptPHIWithVersion } from '@/lib/encryption';
// import { emitMessageReceived } from '@/lib/events/emit';

// ─── Replay Protection Cache ─────────────────────────────────────────────────

// In-memory Set with 1-hour TTL (for single-process; use Redis for multi-process)
const processedMessageSids = new Set<string>();
const MESSAGE_SID_TTL_MS = 60 * 60 * 1000; // 1 hour

function markProcessed(sid: string): boolean {
  if (processedMessageSids.has(sid)) return false; // Already processed
  processedMessageSids.add(sid);
  // Auto-cleanup after TTL
  setTimeout(() => processedMessageSids.delete(sid), MESSAGE_SID_TTL_MS);
  return true;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ── Step 1: Parse raw body (Twilio signature requires raw body) ─────────
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // ── Step 2: CYRUS — Validate X-Twilio-Signature FIRST ──────────────────
  // This MUST happen before ANY database operation or data processing.
  const signature = request.headers.get('x-twilio-signature');
  if (!signature) {
    // CYRUS: Missing signature → immediate rejection
    return NextResponse.json(
      { error: 'E-3006', message: 'Missing X-Twilio-Signature header' },
      { status: 403 }
    );
  }

  const webhookUrl = process.env.TWILIO_WEBHOOK_URL || `${request.nextUrl.origin}/api/comms/webhook/twilio`;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.error('[Webhook] TWILIO_AUTH_TOKEN not configured');
    return NextResponse.json(
      { error: 'E-5001', message: 'Webhook not configured' },
      { status: 500 }
    );
  }

  // TODO: holilabsv2 — use actual twilio.validateRequest
  // const isValid = twilio.validateRequest(authToken, signature, webhookUrl, params);
  const isValid = true; // SCAFFOLD PLACEHOLDER — replace with real validation

  if (!isValid) {
    // CYRUS VETO: invalid signature → 403, log attempt
    // TODO: holilabsv2 — prisma.auditLog.create({
    //   data: { actionType: 'WEBHOOK_INVALID_SIGNATURE', userId: 'system', entityType: 'TwilioWebhook', accessReason: 'SECURITY' }
    // });
    return NextResponse.json(
      { error: 'E-3006', message: 'Invalid Twilio webhook signature' },
      { status: 403 }
    );
  }

  // ── Step 3: Replay protection (CYRUS) ──────────────────────────────────
  const messageSid = params.MessageSid;
  if (!messageSid) {
    return NextResponse.json(
      { error: 'E-4001', message: 'Missing MessageSid' },
      { status: 400 }
    );
  }

  if (!markProcessed(messageSid)) {
    // Duplicate — return 200 (idempotent) but don't process
    return NextResponse.json({ status: 'duplicate', messageSid }, { status: 200 });
  }

  // ── Step 4: Parse message fields ───────────────────────────────────────
  const from = params.From || '';          // e.g., "whatsapp:+5511987654321"
  const to = params.To || '';
  const body = params.Body || '';
  const numMedia = parseInt(params.NumMedia || '0', 10);
  const mediaUrl = params.MediaUrl0 || null;
  const accountSid = params.AccountSid || '';

  // Determine channel from "From" prefix
  const channel = from.startsWith('whatsapp:') ? 'WHATSAPP' : 'SMS';
  const phoneNumber = from.replace('whatsapp:', '');

  // ── Step 5: Find patient by phone number ───────────────────────────────
  // TODO: holilabsv2 — query patient by phone
  // const patient = await prisma.patient.findFirst({
  //   where: { phone: phoneNumber },
  //   select: { id: true, firstName: true, lastName: true, organizationId: true },
  // });
  //
  // if (!patient) {
  //   // Unknown sender — store for manual review
  //   console.warn(`[Webhook] Unknown sender: ${phoneNumber}`);
  //   return new NextResponse('<Response/>', { headers: { 'Content-Type': 'text/xml' } });
  // }

  // Placeholder for scaffold
  const patient = { id: 'pat_01', firstName: 'João', lastName: 'Silva', organizationId: 'org_holilabs_demo' };
  const organizationId = patient.organizationId;

  // ── Step 6: Find or create Conversation ────────────────────────────────
  // TODO: holilabsv2 — upsert conversation
  // const conversation = await prisma.conversation.upsert({
  //   where: { externalId: `${channel}:${phoneNumber}` },
  //   update: { lastMessageAt: new Date(), lastInboundAt: new Date(), unreadCount: { increment: 1 } },
  //   create: {
  //     patientId: patient.id, organizationId, channelType: channel,
  //     status: 'ACTIVE', lastMessageAt: new Date(), lastInboundAt: new Date(),
  //     unreadCount: 1, externalId: `${channel}:${phoneNumber}`,
  //   },
  // });

  const conversation = { id: 'conv_new' }; // Scaffold placeholder

  // ── Step 7: Create Message (CYRUS: encrypt content) ────────────────────
  // TODO: holilabsv2 — create encrypted message
  // const encryptedContent = encryptPHIWithVersion(body);
  // const message = await prisma.message.create({
  //   data: {
  //     conversationId: conversation.id, direction: 'INBOUND', channelType: channel,
  //     content: encryptedContent, contentType: numMedia > 0 ? 'IMAGE' : 'TEXT',
  //     mediaUrl, status: 'DELIVERED', twilioSid: messageSid, deliveredAt: new Date(),
  //   },
  // });

  const message = { id: 'msg_new' }; // Scaffold placeholder

  // ── Step 8: Emit SSE event (RUTH: preview must not contain PHI) ────────
  const safePreview = body.slice(0, 100).replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF]'); // Strip CPFs
  // TODO: holilabsv2 — emitMessageReceived(organizationId, { ... });

  // ── Step 9: Audit log ──────────────────────────────────────────────────
  // TODO: holilabsv2 — prisma.auditLog.create({
  //   data: { actionType: 'MESSAGE_RECEIVED', userId: 'system', entityType: 'Message',
  //     entityId: message.id, accessReason: 'TREATMENT' }
  // });

  // ── Step 10: Return TwiML (Twilio requires valid XML response) ─────────
  return new NextResponse('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
