/**
 * Template Comments API
 *
 * GET /api/prevention/templates/[id]/comments
 * Returns all comments for a template
 *
 * POST /api/prevention/templates/[id]/comments
 * Adds a new comment to the template
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitPreventionEventToAll,
  emitPreventionEventToUser,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority } from '@/lib/socket/events';

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

/**
 * GET - Retrieve all comments for a template
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

    const hasAccess =
      template.createdBy === userId ||
      (await prisma.preventionTemplateShare.findFirst({
        where: {
          templateId,
          sharedWith: userId,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const comments = await prisma.preventionTemplateComment.findMany({
      where: { templateId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info({
      event: 'template_comments_retrieved',
      userId,
      templateId,
      commentCount: comments.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        templateName: template.templateName,
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          mentions: c.mentions,
          user: c.user,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      },
    });
  },
  { roles: [...ROLES] }
);

/**
 * POST - Add a new comment to the template
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
    const { content, mentions = [] } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Comment is too long (max 10000 characters)' },
        { status: 400 }
      );
    }

    if (!Array.isArray(mentions)) {
      return NextResponse.json(
        { success: false, error: 'Mentions must be an array' },
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

    const hasAccess =
      template.createdBy === userId ||
      (await prisma.preventionTemplateShare.findFirst({
        where: {
          templateId,
          sharedWith: userId,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const comment = await prisma.preventionTemplateComment.create({
      data: {
        templateId,
        userId: userId!,
        content: content.trim(),
        mentions,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true,
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
        details: `Added comment to "${template.templateName}"`,
        ipAddress,
      },
    });

    logger.info({
      event: 'template_comment_created',
      userId,
      templateId,
      commentId: comment.id,
      hasMentions: mentions.length > 0,
    });

    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.COMMENT_ADDED,
      title: 'Nuevo Comentario',
      message: `${comment.user.firstName} ${comment.user.lastName} comentó en "${template.templateName}"`,
      priority: NotificationPriority.MEDIUM,
      data: {
        templateId,
        commentId: comment.id,
        userId,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    if (template.createdBy !== userId) {
      emitPreventionEventToUser(template.createdBy, SocketEvent.COMMENT_ADDED, notification);
    }

    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== userId) {
        const mentionNotification = {
          ...notification,
          title: 'Te Mencionaron',
          message: `${comment.user.firstName} ${comment.user.lastName} te mencionó en un comentario`,
          priority: NotificationPriority.HIGH,
        };
        emitPreventionEventToUser(mentionedUserId, SocketEvent.COMMENT_ADDED, mentionNotification);
      }
    }

    emitPreventionEventToAll(SocketEvent.COMMENT_ADDED, notification);

    return NextResponse.json({
      success: true,
      data: {
        comment: {
          id: comment.id,
          content: comment.content,
          mentions: comment.mentions,
          user: comment.user,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        },
      },
    });
  },
  { roles: [...ROLES] }
);
