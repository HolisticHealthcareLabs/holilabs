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

type HeartbeatPayload = {
  deviceId: string;
  deviceType?: 'DESKTOP_MAC' | 'DESKTOP_WINDOWS' | 'EDGE_NODE' | 'UNKNOWN';
  os?: string;
  hostname?: string;
  labels?: string[];
  sidecarVersion?: string;
  edgeVersion?: string;
  rulesetVersion?: string;
  permissions?: unknown; // non-PHI (e.g., macOS screen/accessibility statuses)
  health?: unknown; // non-PHI (cpu/mem/queues ok)
  latencyMs?: number;
};

/**
 * POST /api/command-center/heartbeat
 * Auth: Authorization: Bearer <workspace_api_key_token>
 *
 * Body is intentionally non-PHI.
 */
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

  const payload = (await request.json().catch(() => null)) as HeartbeatPayload | null;
  if (!payload || typeof payload.deviceId !== 'string' || payload.deviceId.trim().length < 3) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

  // Mark key used
  await _prisma.workspaceAPIKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  const deviceId = payload.deviceId.trim().slice(0, 128);
  const deviceType = payload.deviceType || 'UNKNOWN';

  const device = await _prisma.agentDevice.upsert({
    where: {
      workspaceId_deviceId: {
        workspaceId: apiKey.workspaceId,
        deviceId,
      },
    },
    create: {
      workspaceId: apiKey.workspaceId,
      deviceId,
      deviceType,
      os: payload.os?.slice(0, 128),
      hostname: payload.hostname?.slice(0, 128),
      labels: Array.isArray(payload.labels) ? payload.labels.map((s) => String(s).slice(0, 48)).slice(0, 20) : [],
      lastSeenIp: ip,
      lastHeartbeatAt: new Date(),
      sidecarVersion: payload.sidecarVersion?.slice(0, 64),
      edgeVersion: payload.edgeVersion?.slice(0, 64),
      rulesetVersion: payload.rulesetVersion?.slice(0, 64),
      permissions: payload.permissions as any,
      health: payload.health as any,
    },
    update: {
      deviceType,
      os: payload.os?.slice(0, 128),
      hostname: payload.hostname?.slice(0, 128),
      labels: Array.isArray(payload.labels) ? payload.labels.map((s) => String(s).slice(0, 48)).slice(0, 20) : undefined,
      lastSeenIp: ip,
      lastHeartbeatAt: new Date(),
      sidecarVersion: payload.sidecarVersion?.slice(0, 64),
      edgeVersion: payload.edgeVersion?.slice(0, 64),
      rulesetVersion: payload.rulesetVersion?.slice(0, 64),
      permissions: payload.permissions as any,
      health: payload.health as any,
    },
    select: { id: true },
  });

  await _prisma.agentHeartbeat.create({
    data: {
      workspaceId: apiKey.workspaceId,
      agentDeviceId: device.id,
      sidecarVersion: payload.sidecarVersion?.slice(0, 64),
      edgeVersion: payload.edgeVersion?.slice(0, 64),
      rulesetVersion: payload.rulesetVersion?.slice(0, 64),
      latencyMs: typeof payload.latencyMs === 'number' && Number.isFinite(payload.latencyMs) ? Math.round(payload.latencyMs) : null,
      permissions: payload.permissions as any,
      health: payload.health as any,
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

