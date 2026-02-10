import crypto from 'node:crypto';
import { _prisma } from '@/lib/prisma';

export type WorkspaceContext = {
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export async function getOrCreateWorkspaceForUser(userId: string): Promise<WorkspaceContext> {
  if (!_prisma) throw new Error('DB unavailable');

  const membership = await _prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { workspaceId: true, role: true },
  });

  if (membership) {
    return { workspaceId: membership.workspaceId, role: membership.role as WorkspaceContext['role'] };
  }

  // Self-serve default workspace (first user becomes OWNER).
  const rand = crypto.randomBytes(4).toString('hex');
  const slug = `workspace-${slugify(userId.slice(-8))}-${rand}`;

  const ws = await _prisma.workspace.create({
    data: {
      name: 'Workspace',
      slug,
      createdByUserId: userId,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
    select: { id: true },
  });

  return { workspaceId: ws.id, role: 'OWNER' };
}

export async function requireWorkspaceAdmin(userId: string): Promise<WorkspaceContext> {
  const ctx = await getOrCreateWorkspaceForUser(userId);
  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    throw new Error('Forbidden');
  }
  return ctx;
}

