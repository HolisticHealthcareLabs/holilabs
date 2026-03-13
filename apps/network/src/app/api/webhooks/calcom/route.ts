/**
 * Cal.com Webhook Receiver
 *
 * POST /api/webhooks/calcom
 *
 * Handles booking lifecycle events from Cal.com:
 *   BOOKING_CANCELLED — resets referral to CONSENTED, offers patient to rebook
 *   BOOKING_RESCHEDULED — updates bookedSlotStart in DB
 *
 * Security: verified by HMAC-SHA256 using CALCOM_WEBHOOK_SECRET.
 * Returns 200 on all paths to prevent Cal.com retry storms.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/client';
import { decryptPHI } from '@/lib/encryption/phi';
import { sendProviderOptionsMessage } from '@/lib/whatsapp/sender';
import { sanitizeSnapshot, buildInitialSnapshot } from '@/lib/whatsapp/machine';
import { createLogger } from '@/lib/logger';
import { createNetworkAuditLog } from '@/lib/security/audit';

function verifyCalcomSignature(rawBody: Buffer, signature: string | null): boolean {
  if (!signature) return false;
  try {
    const secret = process.env.CALCOM_WEBHOOK_SECRET;
    if (!secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.byteLength !== expBuf.byteLength) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const log = createLogger({ service: 'webhooks/calcom' });
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-cal-signature-256');

  if (!verifyCalcomSignature(rawBody, signature)) {
    log.warn({ sig: signature?.slice(0, 10) }, 'Invalid Cal.com signature — ignoring');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  let payload: CalcomWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const { triggerEvent, payload: eventPayload } = payload;
  const calBookingUid = eventPayload?.uid;

  if (!calBookingUid) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  log.info({ triggerEvent, calBookingUid }, 'Cal.com event received');

  try {
    if (triggerEvent === 'BOOKING_CANCELLED') {
      await handleBookingCancelled(calBookingUid, eventPayload, log);
    } else if (triggerEvent === 'BOOKING_RESCHEDULED') {
      await handleBookingRescheduled(calBookingUid, eventPayload);
    }
  } catch (err) {
    log.error({ err: String(err), calBookingUid }, 'Error handling Cal.com event');
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

async function handleBookingCancelled(
  calBookingUid: string,
  _eventPayload: CalcomEventPayload,
  log: ReturnType<typeof createLogger>
): Promise<void> {
  const referral = await prisma.networkReferral.findFirst({
    where: { calBookingUid, status: 'BOOKED' },
  });

  if (!referral) return;

  // Fetch available providers for this org + specialty to re-present to the patient.
  // Consent is already granted — we go straight to SELECTING_PROVIDER, bypassing consent.
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

  // Build a fresh snapshot at selecting_provider (consent already recorded — skip consent state)
  const freshSnapshot = buildInitialSnapshot({
    referralId: referral.id,
    orgId: referral.orgId,
    targetSpecialty: String(referral.targetSpecialty),
  });

  await prisma.networkReferral.update({
    where: { id: referral.id },
    data: {
      status: 'SELECTING_PROVIDER',
      calBookingUid: null,
      bookedSlotStart: null,
      selectedProviderId: null,
      stateMachineSnapshot: sanitizeSnapshot(freshSnapshot) as never,
    },
  });

  createNetworkAuditLog({
    action: 'BOOKING_CANCELLED',
    resource: 'NetworkReferral',
    resourceId: referral.id,
    orgId: referral.orgId,
    actorType: 'SYSTEM',
    success: true,
    detail: `calBookingUid=${calBookingUid}`,
  });

  try {
    const phone = decryptPHI(referral.patientPhoneEncrypted, referral.patientPhoneVersion);
    await sendProviderOptionsMessage(phone, String(referral.targetSpecialty), providerOptions);
  } catch (err) {
    log.error({ err: String(err), referralId: referral.id }, 'Failed to send rebook provider list');
  }
}

async function handleBookingRescheduled(
  calBookingUid: string,
  eventPayload: CalcomEventPayload
): Promise<void> {
  const newStartTime = eventPayload?.startTime;
  if (!newStartTime) return;

  await prisma.networkReferral.updateMany({
    where: { calBookingUid },
    data: { bookedSlotStart: new Date(newStartTime) },
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalcomEventPayload {
  uid?: string;
  startTime?: string;
  endTime?: string;
  attendees?: Array<{ email: string; name: string }>;
}

interface CalcomWebhookPayload {
  triggerEvent: string;
  payload: CalcomEventPayload;
}
