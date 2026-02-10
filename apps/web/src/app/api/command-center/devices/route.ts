import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { _prisma } from '@/lib/prisma';
import { getOrCreateWorkspaceForUser } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  if (!_prisma) {
    return NextResponse.json({ success: true, data: [] }, { status: 200 });
  }

  const { workspaceId } = await getOrCreateWorkspaceForUser(userId);

  const devices = await _prisma.agentDevice.findMany({
    where: { workspaceId, isActive: true },
    orderBy: { lastHeartbeatAt: 'desc' },
    take: limit,
    select: {
      id: true,
      deviceId: true,
      deviceType: true,
      hostname: true,
      os: true,
      lastHeartbeatAt: true,
      firstSeenAt: true,
      sidecarVersion: true,
      edgeVersion: true,
      rulesetVersion: true,
    },
  });

  const onlineCutoff = new Date(Date.now() - 5 * 60 * 1000);

  return NextResponse.json(
    {
      success: true,
      data: devices.map((d) => ({
        ...d,
        status: d.lastHeartbeatAt >= onlineCutoff ? 'online' : 'offline',
      })),
    },
    { status: 200 }
  );
}

