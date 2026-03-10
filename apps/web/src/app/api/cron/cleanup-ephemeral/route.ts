import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const BATCH_SIZE = 25;
const CRON_SECRET = process.env.CRON_SECRET || '';

async function deleteStoragePrefix(workspaceId: string): Promise<number> {
  const bucket = process.env.AUDIO_STORAGE_BUCKET;
  if (!bucket) return 0;

  try {
    const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import(
      '@aws-sdk/client-s3'
    );

    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'sa-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          }
        : undefined,
    });

    let totalDeleted = 0;
    let continuationToken: string | undefined;

    do {
      const listResponse = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `${workspaceId}/`,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        })
      );

      const objects = listResponse.Contents ?? [];
      if (objects.length === 0) break;

      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key })),
            Quiet: true,
          },
        })
      );

      totalDeleted += objects.length;
      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return totalDeleted;
  } catch (err) {
    logger.warn({
      event: 'ephemeral_storage_cleanup_failed',
      workspaceId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return 0;
  }
}

async function deleteEphemeralTenant(
  workspaceId: string
): Promise<{ dbRows: number; storageObjects: number }> {
  const storageObjects = await deleteStoragePrefix(workspaceId);

  const tenantDisciplineResult = await prisma.tenantDiscipline.deleteMany({
    where: { tenantId: workspaceId },
  });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  });

  const userIds = members.map((m) => m.userId);

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  let usersDeleted = 0;
  for (const userId of userIds) {
    try {
      await prisma.user.delete({ where: { id: userId } });
      usersDeleted++;
    } catch {
      // User may have other workspace memberships
    }
  }

  const dbRows = tenantDisciplineResult.count + usersDeleted + 1;
  return { dbRows, storageObjects };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const expiredWorkspaces = await prisma.workspace.findMany({
      where: {
        isEphemeral: true,
        expiresAt: { lt: new Date() },
      },
      select: { id: true, slug: true, expiresAt: true },
      take: BATCH_SIZE,
      orderBy: { expiresAt: 'asc' },
    });

    if (expiredWorkspaces.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired ephemeral tenants found',
        processed: 0,
        elapsed_ms: Date.now() - startTime,
      });
    }

    let totalDbRows = 0;
    let totalStorageObjects = 0;
    const results: Array<{
      workspaceId: string;
      status: 'deleted' | 'failed';
      error?: string;
    }> = [];

    for (const ws of expiredWorkspaces) {
      try {
        const { dbRows, storageObjects } = await deleteEphemeralTenant(ws.id);
        totalDbRows += dbRows;
        totalStorageObjects += storageObjects;
        results.push({ workspaceId: ws.id, status: 'deleted' });

        logger.info({
          event: 'ephemeral_tenant_deleted',
          workspaceId: ws.id,
          dbRows,
          storageObjects,
        });
      } catch (err) {
        results.push({
          workspaceId: ws.id,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown',
        });

        logger.error({
          event: 'ephemeral_tenant_deletion_failed',
          workspaceId: ws.id,
          error: err instanceof Error ? err.message : 'Unknown',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiredWorkspaces.length,
      totalDbRows,
      totalStorageObjects,
      elapsed_ms: Date.now() - startTime,
      results,
    });
  } catch (error) {
    logger.error({
      event: 'ephemeral_cleanup_fatal',
      error: error instanceof Error ? error.message : 'Unknown',
    });

    return NextResponse.json(
      { success: false, error: 'Cleanup batch failed', elapsed_ms: Date.now() - startTime },
      { status: 500 }
    );
  }
}
