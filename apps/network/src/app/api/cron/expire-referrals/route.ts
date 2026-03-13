/**
 * GET /api/cron/expire-referrals
 *
 * TTL enforcement + consent message retry queue.
 *
 * Intended to run every 15 minutes via Vercel Cron or any HTTP scheduler.
 * Secured by CRON_SECRET to prevent unauthorized triggering.
 *
 * Responsibilities:
 *   1. Find all non-terminal referrals past `expiresAt` → mark EXPIRED + send WhatsApp
 *   2. Find PENDING referrals with `consentRetryAt` set (initial send failed) → retry consent message
 *
 * vercel.json (add to apps/network):
 *   { "crons": [{ "path": "/api/cron/expire-referrals", "schedule": "every 15 minutes" }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { decryptPHI } from '@/lib/encryption/phi';
import { sendExpiredMessage, sendConsentMessage } from '@/lib/whatsapp/sender';
import { createLogger } from '@/lib/logger';
import { createNetworkAuditLog } from '@/lib/security/audit';

const BATCH_SIZE = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const log = createLogger({ service: 'cron/expire-referrals' });

  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const xCronSecret = request.headers.get('x-cron-secret');

  // Fail-closed: if CRON_SECRET is not set, deny all callers (never allow unauthenticated runs)
  if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && xCronSecret !== cronSecret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  let expiredCount = 0;
  let retryCount = 0;
  const errors: string[] = [];

  // ── 1. Expire overdue referrals ────────────────────────────────────────────
  const overdue = await prisma.networkReferral.findMany({
    where: {
      status: { in: ['PENDING', 'CONSENTED', 'SELECTING_PROVIDER', 'SELECTING_SLOT'] as const },
      expiresAt: { lt: now },
    },
    select: {
      id: true,
      orgId: true,
      patientPhoneEncrypted: true,
      patientPhoneVersion: true,
    },
    take: BATCH_SIZE,
  });

  for (const r of overdue) {
    try {
      const phone = decryptPHI(r.patientPhoneEncrypted, r.patientPhoneVersion);
      await sendExpiredMessage(phone).catch(() => null);
      await prisma.networkReferral.update({
        where: { id: r.id },
        data: { status: 'EXPIRED' },
      });
      createNetworkAuditLog({
        action: 'REFERRAL_EXPIRED',
        resource: 'NetworkReferral',
        resourceId: r.id,
        orgId: r.orgId,
        actorType: 'SYSTEM',
        success: true,
      });
      expiredCount++;
    } catch (err) {
      errors.push(`expire:${r.id}:${String(err)}`);
      log.error({ err: String(err), referralId: r.id }, 'Failed to expire referral');
    }
  }

  // ── 2. Retry failed consent message sends ──────────────────────────────────
  const retryQueue = await prisma.networkReferral.findMany({
    where: {
      status: 'PENDING',
      consentRetryAt: { not: null, lte: now },
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      orgId: true,
      patientPhoneEncrypted: true,
      patientPhoneVersion: true,
    },
    take: BATCH_SIZE,
  });

  for (const r of retryQueue) {
    try {
      const phone = decryptPHI(r.patientPhoneEncrypted, r.patientPhoneVersion);
      await sendConsentMessage(phone);
      await prisma.networkReferral.update({
        where: { id: r.id },
        data: { consentRetryAt: null }, // clear retry flag on success
      });
      retryCount++;
    } catch (err) {
      errors.push(`retry:${r.id}:${String(err)}`);
      log.error({ err: String(err), referralId: r.id }, 'Consent retry failed');
      // Back-off: set next retry to 30 minutes from now
      await prisma.networkReferral.update({
        where: { id: r.id },
        data: { consentRetryAt: new Date(Date.now() + 30 * 60_000) },
      }).catch(() => null);
    }
  }

  log.info({ expiredCount, retryCount, errors: errors.length }, 'Cron job complete');

  return NextResponse.json({
    success: true,
    expiredCount,
    retryCount,
    errors,
  });
}
