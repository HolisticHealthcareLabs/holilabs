import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { _prisma } from '@/lib/prisma';
import { getOrCreateWorkspaceForUser } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If DB isn't configured (local build / demo), return a safe empty response.
  if (!_prisma) {
    return NextResponse.json(
      {
        fleet: {
          totalDevices: 0,
          onlineDevices: 0,
          offlineDevices: 0,
          last24hNewDevices: 0,
        },
        policy: {
          rulesetVersion: 'OFFLINE',
          lastUpdatedAt: null as string | null,
        },
        outcomes: {
          interventions24h: 0,
          hardBrakes24h: 0,
          nudges24h: 0,
          p95LatencyMs: null as number | null,
        },
      },
      { status: 200 }
    );
  }

  const { workspaceId } = await getOrCreateWorkspaceForUser(userId);

  const now = Date.now();
  const onlineCutoff = new Date(now - 5 * 60 * 1000); // 5 min
  const last24h = new Date(now - 24 * 60 * 60 * 1000);

  // Fleet (org/workspace boundary)
  const [totalDevices, onlineDevices, last24hNewDevices] = await Promise.all([
    _prisma.agentDevice.count({
      where: { workspaceId, isActive: true },
    }),
    _prisma.agentDevice.count({
      where: { workspaceId, isActive: true, lastHeartbeatAt: { gte: onlineCutoff } },
    }),
    _prisma.agentDevice.count({
      where: { workspaceId, isActive: true, firstSeenAt: { gte: last24h } },
    }),
  ]);

  const offlineDevices = Math.max(0, totalDevices - onlineDevices);

  // Policy/ruleset: no dedicated model yet → expose a placeholder that we can wire later.
  const rulesetVersion = process.env.ACTIVE_RULESET_VERSION || 'v0 (local)';

  // Lightweight compliance snapshot (best-effort; non-PHI)
  const sampleDevices = await _prisma.agentDevice.findMany({
    where: { workspaceId, isActive: true },
    take: 1000,
    orderBy: { lastHeartbeatAt: 'desc' },
    select: { permissions: true, rulesetVersion: true },
  });

  const rulesetCompliantDevices = sampleDevices.filter((d) => (d.rulesetVersion || '') === rulesetVersion).length;
  const permissionReadyDevices = sampleDevices.filter((d) => {
    const p = d.permissions as any;
    const sr = p?.screenRecording ?? p?.screen ?? p?.screen_recording;
    const ax = p?.accessibility ?? p?.a11y;
    return sr === 'granted' && ax === 'granted';
  }).length;

  // Outcomes: compute from assurance events (non-PHI)
  const events24h = await _prisma.fleetEvent.findMany({
    where: { workspaceId, occurredAt: { gte: last24h } },
    select: { eventType: true, latencyMs: true },
  });

  const hardBrakes24h = events24h.filter((e) => e.eventType === 'HARD_BRAKE').length;
  const nudges24h = events24h.filter((e) => e.eventType === 'NUDGE').length;
  const interventions24h = events24h.filter((e) => e.eventType === 'HARD_BRAKE' || e.eventType === 'NUDGE').length;

  const latencies = events24h
    .map((e) => (typeof e.latencyMs === 'number' ? e.latencyMs : null))
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const p95LatencyMs =
    latencies.length > 0 ? latencies[Math.min(latencies.length - 1, Math.max(0, Math.ceil(latencies.length * 0.95) - 1))] : null;

  return NextResponse.json(
    {
      fleet: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        last24hNewDevices,
        rulesetCompliantDevices,
        permissionReadyDevices,
      },
      policy: {
        rulesetVersion,
        lastUpdatedAt: null,
      },
      outcomes: {
        interventions24h,
        hardBrakes24h,
        nudges24h,
        p95LatencyMs,
      },
    },
    { status: 200 }
  );
}

