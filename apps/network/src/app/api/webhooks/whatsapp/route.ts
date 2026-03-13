/**
 * Meta WhatsApp Cloud API — Webhook Receiver
 *
 * GET  — Meta verification handshake
 * POST — Incoming patient messages
 *
 * Security invariants:
 *   CYRUS-1: HMAC-SHA256 signature verified on every POST (try/catch — never throws 500)
 *   CYRUS-2: patientPhone stripped from snapshot before every DB write
 *   CYRUS-3: Provider lookup scoped to referral.orgId (cross-tenant guard)
 *   CYRUS-4: Audit log emitted on every PHI state transition
 *   RUTH-1:  No PHI released to Cal.com until consentedAt is recorded
 *
 * Resilience:
 *   - Always returns HTTP 200 to Meta (prevents retry storms)
 *   - Idempotency: message SID checked before processing
 *   - Fast phone lookup via HMAC index (O(1) instead of O(n) decrypt)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createActor } from 'xstate';
import type { SnapshotFrom } from 'xstate';
import { prisma } from '@/lib/db/client';
import {
  referralMachine,
  sanitizeSnapshot,
  deserializeSnapshot,
} from '@/lib/whatsapp/machine';
import type { ReferralMachineContext } from '@/lib/whatsapp/machine';
import {
  sendConsentMessage,
  sendProviderOptionsMessage,
  sendSlotOptionsMessage,
  sendConfirmationMessage,
  sendDeclinedAck,
  sendExpiredMessage,
  sendErrorMessage,
} from '@/lib/whatsapp/sender';
import { decryptPHI } from '@/lib/encryption/phi';
import { computePhoneLookup } from '@/lib/security/phone-lookup';
import { getAvailableSlots, createBooking } from '@/lib/calcom/client';
import { createLogger } from '@/lib/logger';
import { createNetworkAuditLog } from '@/lib/security/audit';

// ---------------------------------------------------------------------------
// Webhook Verification (GET)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ---------------------------------------------------------------------------
// Signature Verification — never throws, always returns boolean
// ---------------------------------------------------------------------------

function verifyMetaSignature(rawBody: Buffer, signature: string | null): boolean {
  if (!signature) return false;
  try {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) return false;
    const expected = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;
    // timingSafeEqual requires equal-length buffers — check before comparing
    const expBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(signature);
    if (expBuf.byteLength !== sigBuf.byteLength) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Incoming Message Handler (POST)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifyMetaSignature(rawBody, signature)) {
    createLogger({ service: 'whatsapp-webhook' }).warn(
      { sig: signature?.slice(0, 10) },
      'Invalid HMAC signature — ignoring'
    );
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const messageObj = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!messageObj) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const from = messageObj.from;
  const messageSid = messageObj.id;
  const log = createLogger({ service: 'whatsapp-webhook', messageSid });

  try {
    await processIncomingMessage(from, messageSid, messageObj, log);
  } catch (err) {
    log.error({ err: String(err) }, 'Unhandled error processing WhatsApp message');
    await sendErrorMessage(from).catch(() => null);
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

// ---------------------------------------------------------------------------
// Core Processing Logic
// ---------------------------------------------------------------------------

async function processIncomingMessage(
  from: string,
  messageSid: string,
  messageObj: MetaMessageObject,
  log: ReturnType<typeof createLogger>
): Promise<void> {
  // Full idempotency — skip if this exact message SID was already processed on any referral
  const dupe = await prisma.networkReferral.findFirst({
    where: {
      OR: [
        { consentMessageSid: messageSid },
        { lastProcessedMessageSid: messageSid },
      ],
    },
  });
  if (dupe) return;

  type ReferralWithProvider = Awaited<ReturnType<typeof prisma.networkReferral.findFirst<{
    include: { selectedProvider: true };
  }>>>;

  // Fast O(1) phone lookup via HMAC index
  // Falls back to O(n) decrypt scan when PHONE_LOOKUP_SECRET is not yet configured
  let referral: ReferralWithProvider;

  try {
    const phoneLookup = computePhoneLookup(from);
    referral = await prisma.networkReferral.findFirst({
      where: {
        patientPhoneLookup: phoneLookup,
        status: { notIn: ['BOOKED', 'EXPIRED', 'DECLINED'] as const },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: { selectedProvider: true },
    });
  } catch {
    // PHONE_LOOKUP_SECRET not set — fall back to full-table scan
    const all = await prisma.networkReferral.findMany({
      where: {
        status: { notIn: ['BOOKED', 'EXPIRED', 'DECLINED'] as const },
        expiresAt: { gt: new Date() },
      },
      include: { selectedProvider: true },
      orderBy: { createdAt: 'desc' },
    });
    referral = all.find((r) => {
      try { return decryptPHI(r.patientPhoneEncrypted, r.patientPhoneVersion) === from; }
      catch { return false; }
    }) ?? null;
  }

  if (!referral) return;

  log.info({ referralId: referral.id, orgId: referral.orgId }, 'Processing patient reply');

  // Hydrate XState from persisted snapshot, re-inject patientPhone in memory
  const persistedSnap = referral.stateMachineSnapshot
    ? (deserializeSnapshot(JSON.stringify(referral.stateMachineSnapshot)) as SnapshotFrom<typeof referralMachine>)
    : undefined;

  const actor = createActor(referralMachine, {
    input: {
      referralId: referral.id,
      orgId: referral.orgId,
      targetSpecialty: referral.targetSpecialty,
      patientPhone: from, // Injected in memory only — never in snapshot
    } as Partial<ReferralMachineContext>,
    ...(persistedSnap ? { snapshot: persistedSnap } : {}),
  });
  actor.start();

  const replyId = extractReplyId(messageObj);
  const bodyText = extractBodyText(messageObj)?.toUpperCase().trim() ?? '';
  const currentState = actor.getSnapshot().value as string;

  log.debug({ currentState, replyId, bodyText }, 'State machine hydrated');

  // ── State: awaiting_lgpd_consent ──────────────────────────────────────────
  if (currentState === 'awaiting_lgpd_consent') {
    if (replyId === 'CONSENT_YES' || bodyText === 'SIM' || bodyText === 'S') {
      actor.send({ type: 'CONSENT_GIVEN' });
      await prisma.networkReferral.update({
        where: { id: referral.id },
        data: { consentedAt: new Date(), consentMessageSid: messageSid, status: 'CONSENTED' },
      });
      createNetworkAuditLog({
        action: 'CONSENT_GRANTED',
        resource: 'NetworkReferral',
        resourceId: referral.id,
        orgId: referral.orgId,
        actorType: 'PATIENT',
        success: true,
      });

      // RUTH gate cleared — safe to share specialty and provider options
      const providers = await prisma.networkProvider.findMany({
        where: { orgId: referral.orgId, specialty: referral.targetSpecialty, isActive: true },
        take: 3,
      });

      const providerOptions = providers.map((p) => ({
        id: p.id,
        name: p.name,
        specialty: String(p.specialty),
        addressCity: p.addressCity ?? '',
        calcomUsername: p.calcomUsername ?? '',
        calcomEventSlug: p.calcomEventSlug ?? '',
      }));

      actor.send({ type: 'PROVIDERS_LOADED', providers: providerOptions });
      await sendProviderOptionsMessage(from, String(referral.targetSpecialty), providerOptions);
      await prisma.networkReferral.update({
        where: { id: referral.id },
        data: { status: 'SELECTING_PROVIDER', lastProcessedMessageSid: messageSid, stateMachineSnapshot: sanitizeSnapshot(actor.getSnapshot()) as never },
      });

    } else if (replyId === 'CONSENT_NO' || bodyText === 'NÃO' || bodyText === 'NAO' || bodyText === 'N') {
      actor.send({ type: 'CONSENT_DENIED' });
      await sendDeclinedAck(from);
      await prisma.networkReferral.update({
        where: { id: referral.id },
        data: { status: 'DECLINED', lastProcessedMessageSid: messageSid, stateMachineSnapshot: sanitizeSnapshot(actor.getSnapshot()) as never },
      });
      createNetworkAuditLog({
        action: 'CONSENT_DENIED',
        resource: 'NetworkReferral',
        resourceId: referral.id,
        orgId: referral.orgId,
        actorType: 'PATIENT',
        success: true,
      });

    } else {
      // Invalid reply — machine may auto-expire after MAX_INVALID_ATTEMPTS
      actor.send({ type: 'INVALID_REPLY' });
      const nextState = actor.getSnapshot().value as string;
      if (nextState === 'expired') {
        await sendExpiredMessage(from);
        await prisma.networkReferral.update({
          where: { id: referral.id },
          data: { status: 'EXPIRED', lastProcessedMessageSid: messageSid, stateMachineSnapshot: sanitizeSnapshot(actor.getSnapshot()) as never },
        });
      } else {
        await prisma.networkReferral.update({
          where: { id: referral.id },
          data: { lastProcessedMessageSid: messageSid, stateMachineSnapshot: sanitizeSnapshot(actor.getSnapshot()) as never },
        });
      }
    }
    actor.stop();
    return;
  }

  // ── State: selecting_provider ─────────────────────────────────────────────
  if (currentState === 'selecting_provider' && replyId?.startsWith('PROVIDER_')) {
    const providerId = replyId.replace('PROVIDER_', '');

    // CYRUS: cross-tenant guard — orgId must match referral's org
    const provider = await prisma.networkProvider.findFirst({
      where: { id: providerId, orgId: referral.orgId },
    });
    if (!provider) {
      log.warn({ providerId, orgId: referral.orgId }, 'Cross-tenant provider access attempt blocked');
      actor.stop();
      return;
    }

    const providerOption = {
      id: provider.id,
      name: provider.name,
      specialty: String(provider.specialty),
      addressCity: provider.addressCity ?? '',
      calcomUsername: provider.calcomUsername ?? '',
      calcomEventSlug: provider.calcomEventSlug ?? '',
    };

    actor.send({ type: 'PROVIDER_SELECTED', provider: providerOption });

    const slots = await getAvailableSlots(provider.calcomUsername ?? '', provider.calcomEventSlug ?? '');
    actor.send({ type: 'SLOTS_LOADED', slots });
    await sendSlotOptionsMessage(from, provider.name, slots);

    await prisma.networkReferral.update({
      where: { id: referral.id },
      data: {
        selectedProviderId: providerId,
        status: 'SELECTING_SLOT',
        lastProcessedMessageSid: messageSid,
        stateMachineSnapshot: sanitizeSnapshot(actor.getSnapshot()) as never,
      },
    });
    actor.stop();
    return;
  }

  // ── State: selecting_slot ─────────────────────────────────────────────────
  if (currentState === 'selecting_slot' && replyId?.startsWith('SLOT_')) {
    const slotId = replyId.replace('SLOT_', '');
    const slotOptions = actor.getSnapshot().context.slotOptions;
    const selectedSlot = slotOptions.find((s) => s.id === slotId);
    if (!selectedSlot) { actor.stop(); return; }

    actor.send({ type: 'SLOT_SELECTED', slot: selectedSlot });

    const provider = referral.selectedProvider;
    if (!provider) { actor.stop(); return; }

    try {
      const booking = await createBooking({
        calcomUsername: provider.calcomUsername ?? '',
        eventSlug: provider.calcomEventSlug ?? '',
        slotStart: selectedSlot.startIso,
        patientPhone: from,
      });

      actor.send({ type: 'BOOKING_SUCCESS', calBookingUid: booking.uid });
      await sendConfirmationMessage(from, provider.name, selectedSlot.displayLabel, booking.uid);
      await prisma.networkReferral.update({
        where: { id: referral.id },
        data: {
          status: 'BOOKED',
          calBookingUid: booking.uid,
          bookedSlotStart: new Date(selectedSlot.startIso),
          lastProcessedMessageSid: messageSid,
          stateMachineSnapshot: sanitizeSnapshot(actor.getSnapshot()) as never,
        },
      });
      createNetworkAuditLog({
        action: 'BOOKING_CREATED',
        resource: 'NetworkReferral',
        resourceId: referral.id,
        orgId: referral.orgId,
        actorType: 'PATIENT',
        success: true,
        detail: `calBookingUid=${booking.uid}`,
      });
    } catch (err) {
      actor.send({ type: 'BOOKING_FAILURE', errorMessage: String(err) });
      await sendErrorMessage(from);
      log.error({ err: String(err), referralId: referral.id }, 'Booking creation failed');
    }
  }

  actor.stop();
}

// ---------------------------------------------------------------------------
// Meta Payload Types
// ---------------------------------------------------------------------------

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{ value?: { messages?: MetaMessageObject[] } }>;
  }>;
}

interface MetaMessageObject {
  id: string;
  from: string;
  type: 'text' | 'interactive' | 'button';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  button?: { payload: string; text: string };
}

function extractReplyId(msg: MetaMessageObject): string | null {
  if (msg.type === 'interactive') {
    return msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id ?? null;
  }
  if (msg.type === 'button') return msg.button?.payload ?? null;
  return null;
}

function extractBodyText(msg: MetaMessageObject): string | null {
  if (msg.type === 'text') return msg.text?.body ?? null;
  if (msg.type === 'interactive') {
    return msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? null;
  }
  return null;
}
