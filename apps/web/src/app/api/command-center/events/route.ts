import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { _prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

type EventPayload = {
  deviceId?: string;
  eventType: 'HARD_BRAKE' | 'NUDGE' | 'INFO' | 'OVERRIDE';
  ruleId?: string;
  color?: string;
  latencyMs?: number;
  occurredAt?: string; // ISO
  meta?: unknown; // strictly non-PHI (rule context, subsystem, etc.)
};

export async function POST(request: NextRequest) {
  if (!_prisma) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tokenHash = sha256Hex(token);
  const apiKey = await _prisma.workspaceAPIKey.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { id: true, workspaceId: true },
  });
  if (!apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const events = Array.isArray(body?.events) ? (body.events as EventPayload[]) : null;
  if (!events || events.length === 0) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  await _prisma.workspaceAPIKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  // Optional device linkage (best-effort)
  const deviceIds = [...new Set(events.map((e) => e.deviceId).filter((x): x is string => typeof x === 'string'))].slice(0, 50);
  const deviceMap = new Map<string, string>();
  if (deviceIds.length > 0) {
    const devices = await _prisma.agentDevice.findMany({
      where: { workspaceId: apiKey.workspaceId, deviceId: { in: deviceIds } },
      select: { id: true, deviceId: true },
    });
    for (const d of devices) deviceMap.set(d.deviceId, d.id);
  }

  await _prisma.fleetEvent.createMany({
    data: events.slice(0, 500).map((e) => ({
      workspaceId: apiKey.workspaceId,
      agentDeviceId: e.deviceId ? deviceMap.get(e.deviceId) ?? null : null,
      eventType: e.eventType,
      ruleId: e.ruleId?.slice(0, 128),
      color: e.color?.slice(0, 32),
      latencyMs: typeof e.latencyMs === 'number' && Number.isFinite(e.latencyMs) ? Math.round(e.latencyMs) : null,
      occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
      meta: e.meta as any,
    })),
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

