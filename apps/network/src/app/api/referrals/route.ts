/**
 * POST /api/referrals  — Clinician-initiated referral creation
 * GET  /api/referrals  — List referrals for authenticated org
 *
 * Security invariants:
 *   CYRUS-1: Bearer token verified + orgId tenant-scoped (verifyBearerToken)
 *   CYRUS-2: patientPhone AES-256-GCM encrypted before DB write
 *   CYRUS-3: patientPhoneLookup HMAC stored for O(1) webhook lookup
 *   CYRUS-4: Audit log emitted on every PHI create/read
 *   RUTH-1:  Initial snapshot bootstrapped to awaiting_lgpd_consent (valid XState v5)
 *   RUTH-2:  Idempotency-Key prevents double consent messages on network retries
 *   ARCHIE:  Rate limited to 20 referrals per orgId per 60s
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { encryptPHI } from '@/lib/encryption/phi';
import { computePhoneLookup } from '@/lib/security/phone-lookup';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { verifyBearerToken } from '@/lib/auth/verify-token';
import { sendConsentMessage } from '@/lib/whatsapp/sender';
import { buildInitialSnapshot } from '@/lib/whatsapp/machine';
import { createLogger } from '@/lib/logger';
import { createNetworkAuditLog } from '@/lib/security/audit';

const REFERRAL_TTL_HOURS = 72;

const CreateReferralSchema = z.object({
  patientPhone: z
    .string()
    .regex(/^\+\d{10,15}$/, 'Must be E.164 format e.g. +5511999998888'),
  targetSpecialty: z.enum([
    'CARDIOLOGY', 'DERMATOLOGY', 'ORTHOPEDICS', 'NEUROLOGY', 'GASTROENTEROLOGY',
    'OPHTHALMOLOGY', 'ENDOCRINOLOGY', 'GYNECOLOGY', 'UROLOGY', 'GENERAL_SURGERY',
  ] as const),
  referringClinicianId: z.string().min(1),
  estimatedRevenueRetainedBrl: z.number().positive().optional(),
});

// ---------------------------------------------------------------------------
// POST — Create Referral
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const log = createLogger({ service: 'api/referrals', method: 'POST' });

  // Auth — verify Bearer token and extract session (includes orgId)
  const session = await verifyBearerToken(request.headers.get('authorization'));
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit — 20 referral creations per orgId per 60s
  const rl = checkRateLimit(`referrals:${session.orgId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please wait before creating more referrals.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Idempotency key — prevents duplicate referrals on network retries
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) {
    const existing = await prisma.networkReferral.findFirst({
      where: { idempotencyKey },
      select: { id: true, status: true, expiresAt: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, ...existing }, { status: 200 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateReferralSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { patientPhone, targetSpecialty, referringClinicianId, estimatedRevenueRetainedBrl } =
    parsed.data;

  // CYRUS: Clinicians may only create referrals attributed to themselves.
  // ADMIN and SYSTEM callers may specify any referringClinicianId.
  if (
    session.role !== 'ADMIN' &&
    session.role !== 'SYSTEM' &&
    referringClinicianId !== session.userId
  ) {
    return NextResponse.json(
      { success: false, error: 'referringClinicianId must match your own user ID' },
      { status: 403 }
    );
  }

  // CYRUS: Encrypt phone before any DB write
  const { ciphertext, version } = encryptPHI(patientPhone);

  // CYRUS: Compute HMAC lookup index (separate key from encryption key)
  let phoneLookup: string | undefined;
  try {
    phoneLookup = computePhoneLookup(patientPhone);
  } catch {
    // PHONE_LOOKUP_SECRET not set — fall back to null (O(n) scan in webhook)
    log.warn({}, 'PHONE_LOOKUP_SECRET not configured — phone lookup index disabled');
  }

  // Build a valid XState v5 snapshot at awaiting_lgpd_consent
  const initialSnapshot = buildInitialSnapshot({
    referralId: 'PLACEHOLDER',
    orgId: session.orgId,
    targetSpecialty,
  });

  const expiresAt = new Date(Date.now() + REFERRAL_TTL_HOURS * 60 * 60 * 1000);

  const referral = await prisma.networkReferral.create({
    data: {
      orgId: session.orgId,
      referringClinicianId,
      targetSpecialty,
      patientPhoneEncrypted: ciphertext,
      patientPhoneVersion: version,
      patientPhoneLookup: phoneLookup ?? null,
      idempotencyKey: idempotencyKey ?? null,
      status: 'PENDING',
      estimatedRevenueRetainedBrl: estimatedRevenueRetainedBrl ?? null,
      expiresAt,
      stateMachineSnapshot: initialSnapshot as never,
    },
  });

  createNetworkAuditLog({
    action: 'CREATE',
    resource: 'NetworkReferral',
    resourceId: referral.id,
    orgId: session.orgId,
    actorId: session.userId,
    actorType: 'CLINICIAN',
    success: true,
  });

  // Trigger WhatsApp consent message (RUTH gate — first pre-consent message)
  try {
    await sendConsentMessage(patientPhone);
  } catch (err) {
    log.error({ err: String(err), referralId: referral.id }, 'Failed to send consent message — queued for retry');
    // Mark for cron retry
    await prisma.networkReferral.update({
      where: { id: referral.id },
      data: { consentRetryAt: new Date() },
    }).catch(() => null);
  }

  log.info({ referralId: referral.id, orgId: session.orgId }, 'Referral created');

  return NextResponse.json(
    { success: true, id: referral.id, status: referral.status, expiresAt: referral.expiresAt },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// GET — List Referrals (tenant-scoped)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await verifyBearerToken(request.headers.get('authorization'));
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Optionally allow admins to query other orgs; default to session orgId
  const requestedOrgId = request.nextUrl.searchParams.get('orgId') ?? session.orgId;
  if (requestedOrgId !== session.orgId && session.role !== 'ADMIN' && session.role !== 'SYSTEM') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const referrals = await prisma.networkReferral.findMany({
    where: { orgId: requestedOrgId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      orgId: true,
      targetSpecialty: true,
      status: true,
      consentedAt: true,
      bookedSlotStart: true,
      calBookingUid: true,
      estimatedRevenueRetainedBrl: true,
      createdAt: true,
      expiresAt: true,
      selectedProvider: {
        select: { id: true, name: true, specialty: true, addressCity: true },
      },
    },
  });

  createNetworkAuditLog({
    action: 'READ',
    resource: 'NetworkReferral',
    resourceId: `org:${requestedOrgId}`,
    orgId: requestedOrgId,
    actorId: session.userId,
    actorType: 'CLINICIAN',
    success: true,
    detail: `count=${referrals.length}`,
  });

  return NextResponse.json({ success: true, referrals });
}
