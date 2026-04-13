export const dynamic = "force-dynamic";
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

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitPreventionEventToUser,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority } from '@/lib/socket/events';

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

/**
 * GET - Retrieve list of users template is shared with
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params?.id;
    const userId = context.user?.id;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template ID required' }, { status: 400 });
    }

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

    if (template.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only template owner can view sharing list' },
        { status: 403 }
      );
    }

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
      userId,
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
  },
  { roles: [...ROLES] }
);

/**
 * POST - Share template with a user
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params?.id;
    const userId = context.user?.id;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { userId: targetUserId, permission = 'VIEW', message, expiresAt } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
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

    if (targetUserId === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot share template with yourself' },
        { status: 400 }
      );
    }

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

    const isOwner = template.createdBy === userId;
    const hasAdminAccess = await prisma.preventionTemplateShare.findFirst({
      where: {
        templateId,
        sharedWith: userId,
        permission: 'ADMIN',
      },
    });

    if (!isOwner && !hasAdminAccess) {
      return NextResponse.json(
        { success: false, error: 'Only owner or admin can share this template' },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const share = await prisma.preventionTemplateShare.upsert({
      where: {
        templateId_sharedWith: {
          templateId,
          sharedWith: targetUserId,
        },
      },
      create: {
        templateId,
        sharedBy: userId!,
        sharedWith: targetUserId,
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

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    await prisma.auditLog.create({
      data: {
        userId: userId!,
        action: 'CREATE',
        resource: 'prevention_template',
        resourceId: templateId,
        details: `Shared "${template.templateName}" with ${targetUser.firstName} ${targetUser.lastName} (${permission})`,
        ipAddress,
      },
    });

    logger.info({
      event: 'template_shared',
      userId,
      templateId,
      sharedWith: targetUserId,
      permission,
    });

    const sharerName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`.trim() || context.user?.email
      : context.user?.email || 'Usuario';

    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.TEMPLATE_SHARED,
      title: 'Plantilla Compartida',
      message: `${sharerName} compartió "${template.templateName}" contigo`,
      priority: NotificationPriority.MEDIUM,
      data: {
        templateId,
        shareId: share.id,
        permission,
        sharedBy: userId,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    emitPreventionEventToUser(targetUserId, SocketEvent.TEMPLATE_SHARED, notification);

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
  },
  { roles: [...ROLES] }
);

/**
 * DELETE - Remove sharing access
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params?.id;
    const userId = context.user?.id;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const unshareUserId = searchParams.get('userId');

    if (!unshareUserId) {
      return NextResponse.json(
        { success: false, error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

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

    const isOwner = template.createdBy === userId;
    const hasAdminAccess = await prisma.preventionTemplateShare.findFirst({
      where: {
        templateId,
        sharedWith: userId,
        permission: 'ADMIN',
      },
    });

    if (!isOwner && !hasAdminAccess && userId !== unshareUserId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const deletedShare = await prisma.preventionTemplateShare.deleteMany({
      where: {
        templateId,
        sharedWith: unshareUserId,
      },
    });

    if (deletedShare.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Share not found' },
        { status: 404 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    await prisma.auditLog.create({
      data: {
        userId: userId!,
        action: 'DELETE',
        resource: 'prevention_template',
        resourceId: templateId,
        details: `Removed sharing access for "${template.templateName}"`,
        ipAddress,
      },
    });

    logger.info({
      event: 'template_unshared',
      userId,
      templateId,
      unsharedWith: unshareUserId,
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: deletedShare.count,
      },
    });
  },
  { roles: [...ROLES] }
);
