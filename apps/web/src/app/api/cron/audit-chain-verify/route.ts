export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/audit-chain-verify
 *
 * Scheduled audit-chain integrity check. Runs nightly via external cron
 * (mirrors `/api/cron/escalations` pattern). Verifies the previous 24h
 * window of audit log entries against the hash chain. Logs structured
 * results so monitoring can alert on any failure.
 *
 * Authorization: shared-secret bearer token in `Authorization` header,
 * checked against `CRON_SECRET` env var. Same pattern as the existing
 * cron routes — no user session, no RBAC middleware (which expects
 * an authenticated request).
 *
 * Why nightly + 24h window:
 * - Daily cadence matches LGPD/HIPAA reasonable-monitoring expectations
 * - 24h window keeps verification cheap (full chain scan grows O(n))
 * - Pareto: tampering on a recent entry is the most operationally relevant
 *
 * Output format:
 *   200 { success: true, valid: true|false, totalEntries, verifiedEntries }
 *   401 unauthorized (bad/missing CRON_SECRET)
 *   500 unexpected
 *
 * If `valid === false`, the response includes `brokenAt` (entryId, reason)
 * — pipe to alerting (Sentry / on-call page). Per `.claude/rules/security.md`,
 * a broken chain is a P0 incident (audit log tampering = data integrity breach).
 *
 * @compliance LGPD Art. 37 (audit log retention), HIPAA §164.312(b) (audit controls)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuditChain, getAuditChainStats } from '@/lib/security/audit-chain';
import logger from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Bearer-token auth (matches existing cron-route convention)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const expected = cronSecret ? `Bearer ${cronSecret}` : null;

  if (!expected || authHeader !== expected) {
    logger.warn({
      event: 'cron_audit_chain_verify_unauthorized',
      hasSecret: !!cronSecret,
      hasHeader: !!authHeader,
    });
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 }
    );
  }

  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date();

  try {
    const verification = await verifyAuditChain(windowStart, windowEnd);
    const stats = await getAuditChainStats();

    if (!verification.valid) {
      logger.error({
        event: 'audit_chain_verification_failed',
        severity: 'P0',
        windowStart,
        windowEnd,
        brokenAt: verification.brokenAt,
        verifiedEntries: verification.verifiedEntries,
        totalEntries: verification.totalEntries,
      });
    } else {
      logger.info({
        event: 'audit_chain_verification_passed',
        windowStart,
        windowEnd,
        verifiedEntries: verification.verifiedEntries,
        totalEntries: verification.totalEntries,
        chainedEntriesAllTime: stats.chainedEntries,
      });
    }

    return NextResponse.json(
      {
        success: true,
        valid: verification.valid,
        window: { start: windowStart, end: windowEnd },
        verification,
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    logger.error({
      event: 'audit_chain_verification_error',
      message,
    });
    return NextResponse.json(
      { success: false, error: 'verification_failed' },
      { status: 500 }
    );
  }
}
