/**
 * GET /api/workspace/current
 *
 * Returns the workspace context for the currently authenticated user.
 * Used by the AI Providers settings page and Clinical Command Center to
 * determine workspaceId and role before making BYOK key management calls.
 *
 * Demo-first contract:
 *   • If a real NextAuth session is found the route returns the user's actual
 *     workspaceId / role from the session token.
 *   • If no session exists (unauthenticated dev/demo access) the route returns
 *     a 200 OK with a stable mock payload so the UI is never blocked.
 */

import { NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import { getServerSession, authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Stable demo payload — always returned when no real session is available. */
const DEMO_PAYLOAD = {
  workspaceId: 'demo-workspace-1',
  role:        'CLINICIAN',
} as const;

export const GET = createPublicRoute(async () => {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const user = session.user as Record<string, unknown>;

      return NextResponse.json({
        workspaceId: (user.workspaceId as string | undefined) ?? DEMO_PAYLOAD.workspaceId,
        role:        (user.role        as string | undefined) ?? DEMO_PAYLOAD.role,
      });
    }
  } catch {
    // Session look-up failed (e.g. DB unavailable, misconfigured secret).
    // Fall through to the demo payload so the UI keeps working.
  }

  return NextResponse.json(DEMO_PAYLOAD);
});
