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
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEMO_PAYLOAD = {
  workspaceId: 'demo-workspace-1',
  role:        'CLINICIAN',
} as const;

export const GET = createPublicRoute(async () => {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const user = session.user as Record<string, unknown>;
      const workspaceId = (user.workspaceId as string | undefined) ?? DEMO_PAYLOAD.workspaceId;
      const role = (user.role as string | undefined) ?? DEMO_PAYLOAD.role;

      // For ephemeral workspaces, expose persona metadata so the
      // dashboard can render specialty-specific demo data.
      try {
        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { isEphemeral: true, metadata: true, name: true, expiresAt: true },
        });

        if (workspace?.isEphemeral) {
          return NextResponse.json({
            workspaceId,
            role,
            isEphemeral: true,
            name: workspace.name,
            metadata: workspace.metadata,
            expiresAt: workspace.expiresAt,
          });
        }
      } catch {
        // Workspace lookup failed; fall through to basic payload
      }

      return NextResponse.json({ workspaceId, role });
    }
  } catch {
    // Session look-up failed — fall through to demo payload
  }

  return NextResponse.json(DEMO_PAYLOAD);
});
