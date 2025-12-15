/**
 * Template Sharing API
 *
 * GET /api/prevention/templates/[id]/share
 * Returns list of users this template is shared with
 *
 * POST /api/prevention/templates/[id]/share
 * Shares the template with a user
 *
 * DELETE /api/prevention/templates/[id]/share
 * Removes sharing access for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitPreventionEventToUser,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority } from '@/lib/socket/events';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET - Retrieve list of users template is shared with
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: templateId } = context.params;

    // Verify template exists and user is the owner
    const template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, templateName: true, createdBy: true },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    if (template.createdBy !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Only template owner can view sharing list' },
        { status: 403 }
      );
    }

    // Fetch shares
    const shares = await prisma.preventionTemplateShare.findMany({
      where: { templateId },
      include: {
        sharedWithUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true,
          },
        },
        sharedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info({
      event: 'template_shares_retrieved',
      userId: session.user.id,
      templateId,
      shareCount: shares.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        templateName: template.templateName,
        shares: shares.map((s) => ({
          id: s.id,
          sharedWith: s.sharedWithUser,
          sharedBy: s.sharedByUser,
          permission: s.permission,
          message: s.message,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        })),
      },
    });
  } catch (error) {
    logger.error({
      event: 'get_template_shares_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve shares',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Share template with a user
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: templateId } = context.params;
    const body = await request.json();
    const { userId, permission = 'VIEW', message, expiresAt } = body;

    // Validation
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!['VIEW', 'EDIT', 'ADMIN'].includes(permission)) {
      return NextResponse.json(
        { success: false, error: 'Invalid permission. Must be VIEW, EDIT, or ADMIN' },
        { status: 400 }
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot share template with yourself' },
        { status: 400 }
      );
    }

    // Verify template exists and user is the owner or has ADMIN permission
    const template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, templateName: true, createdBy: true },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const isOwner = template.createdBy === session.user.id;
    const hasAdminAccess = await prisma.preventionTemplateShare.findFirst({
      where: {
        templateId,
        sharedWith: session.user.id,
        permission: 'ADMIN',
      },
    });

    if (!isOwner && !hasAdminAccess) {
      return NextResponse.json(
        { success: false, error: 'Only owner or admin can share this template' },
        { status: 403 }
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Create or update share
    const share = await prisma.preventionTemplateShare.upsert({
      where: {
        templateId_sharedWith: {
          templateId,
          sharedWith: userId,
        },
      },
      create: {
        templateId,
        sharedBy: session.user.id,
        sharedWith: userId,
        permission,
        message,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      update: {
        permission,
        message,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        sharedWithUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resource: 'prevention_template',
        resourceId: templateId,
        details: `Shared "${template.templateName}" with ${targetUser.firstName} ${targetUser.lastName} (${permission})`,
        ipAddress,
      },
    });

    logger.info({
      event: 'template_shared',
      userId: session.user.id,
      templateId,
      sharedWith: userId,
      permission,
    });

    // Emit real-time notification to the user receiving the share
    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.TEMPLATE_SHARED,
      title: 'Plantilla Compartida',
      message: `${session.user.firstName} ${session.user.lastName} compartió "${template.templateName}" contigo`,
      priority: NotificationPriority.MEDIUM,
      data: {
        templateId,
        shareId: share.id,
        permission,
        sharedBy: session.user.id,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    emitPreventionEventToUser(userId, SocketEvent.TEMPLATE_SHARED, notification);

    return NextResponse.json({
      success: true,
      data: {
        share: {
          id: share.id,
          sharedWith: share.sharedWithUser,
          permission: share.permission,
          message: share.message,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'share_template_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share template',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove sharing access
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: templateId } = context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify template exists and user has permission
    const template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, templateName: true, createdBy: true },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const isOwner = template.createdBy === session.user.id;
    const hasAdminAccess = await prisma.preventionTemplateShare.findFirst({
      where: {
        templateId,
        sharedWith: session.user.id,
        permission: 'ADMIN',
      },
    });

    if (!isOwner && !hasAdminAccess && session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Delete share
    const deletedShare = await prisma.preventionTemplateShare.deleteMany({
      where: {
        templateId,
        sharedWith: userId,
      },
    });

    if (deletedShare.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Share not found' },
        { status: 404 }
      );
    }

    // Create audit log
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resource: 'prevention_template',
        resourceId: templateId,
        details: `Removed sharing access for "${template.templateName}"`,
        ipAddress,
      },
    });

    logger.info({
      event: 'template_unshared',
      userId: session.user.id,
      templateId,
      unsharedWith: userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: deletedShare.count,
      },
    });
  } catch (error) {
    logger.error({
      event: 'unshare_template_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove sharing access',
      },
      { status: 500 }
    );
  }
}
