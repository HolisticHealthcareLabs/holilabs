/**
 * GET /api/me — Returns the current session's identity.
 * Used by the dashboard to resolve orgId without relying on DEMO_ORG_ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken } from '@/lib/auth/verify-token';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await verifyBearerToken(request.headers.get('authorization'));
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    success: true,
    userId: session.userId,
    orgId: session.orgId,
    role: session.role,
    email: session.email,
  });
}
