import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { _prisma } from '@/lib/prisma';
import { requireWorkspaceAdmin } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * GET: list active keys (no plaintext)
 * POST: create a new key (returns plaintext token once)
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!_prisma) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAdmin(userId));
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const keys = await _prisma.workspaceAPIKey.findMany({
    where: { workspaceId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
  });

  return NextResponse.json({ success: true, data: keys }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!_prisma) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAdmin(userId));
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === 'string' && body.name.trim().length > 0 ? body.name.trim().slice(0, 64) : 'Agent key';

  // Token format: hl_ws_<random>
  const token = `hl_ws_${crypto.randomBytes(24).toString('hex')}`;
  const tokenHash = sha256Hex(token);

  const created = await _prisma.workspaceAPIKey.create({
    data: {
      workspaceId,
      name,
      tokenHash,
    },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json(
    {
      success: true,
      data: created,
      token, // plaintext returned once
      note: 'Store this token securely. It cannot be retrieved again.',
    },
    { status: 201 }
  );
}

