/**
 * GET /api/fog-node/status
 *
 * Proxies to the local Cortex sidecar (http://localhost:3002/sidecar/status).
 * Returns { connected: false } gracefully when the sidecar is absent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

const SIDECAR_URL = process.env.SIDECAR_URL ?? 'http://localhost:3002';
const TIMEOUT_MS = 2_000;

export const GET = createProtectedRoute(
  async (_request: NextRequest) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`${SIDECAR_URL}/sidecar/status`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timer);

      if (!res.ok) {
        return NextResponse.json({ connected: false, error: `Sidecar returned ${res.status}` });
      }

      const data = await res.json();
      return NextResponse.json({ connected: true, ...data });
    } catch {
      return NextResponse.json({ connected: false });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'],
    skipCsrf: true,
  }
);
