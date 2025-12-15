/**
 * Template Comments API
 *
 * GET /api/prevention/templates/[id]/comments
 * Returns all comments for a template
 *
 * POST /api/prevention/templates/[id]/comments
 * Adds a new comment to the template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitPreventionEventToAll,
  emitPreventionEventToUser,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority } from '@/lib/socket/events';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET - Retrieve all comments for a template
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

    // Verify template exists and user has access
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

    // Check if user has access (owner or shared with them)
    const hasAccess =
      template.createdBy === session.user.id ||
      (await prisma.preventionTemplateShare.findFirst({
        where: {
          templateId,
          sharedWith: session.user.id,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch comments
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
      userId: session.user.id,
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
  } catch (error) {
    logger.error({
      event: 'get_template_comments_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve comments',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a new comment to the template
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
    const { content, mentions = [] } = body;

    // Validation
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

    // Verify template exists and user has access
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

    // Check if user has access (owner or shared with them)
    const hasAccess =
      template.createdBy === session.user.id ||
      (await prisma.preventionTemplateShare.findFirst({
        where: {
          templateId,
          sharedWith: session.user.id,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create comment
    const comment = await prisma.preventionTemplateComment.create({
      data: {
        templateId,
        userId: session.user.id,
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
        details: `Added comment to "${template.templateName}"`,
        ipAddress,
      },
    });

    logger.info({
      event: 'template_comment_created',
      userId: session.user.id,
      templateId,
      commentId: comment.id,
      hasMentions: mentions.length > 0,
    });

    // Emit real-time notification
    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.COMMENT_ADDED,
      title: 'Nuevo Comentario',
      message: `${comment.user.firstName} ${comment.user.lastName} comentó en "${template.templateName}"`,
      priority: NotificationPriority.MEDIUM,
      data: {
        templateId,
        commentId: comment.id,
        userId: session.user.id,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    // Notify template owner if not the commenter
    if (template.createdBy !== session.user.id) {
      emitPreventionEventToUser(template.createdBy, SocketEvent.COMMENT_ADDED, notification);
    }

    // Notify mentioned users
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== session.user.id) {
        const mentionNotification = {
          ...notification,
          title: 'Te Mencionaron',
          message: `${comment.user.firstName} ${comment.user.lastName} te mencionó en un comentario`,
          priority: NotificationPriority.HIGH,
        };
        emitPreventionEventToUser(mentionedUserId, SocketEvent.COMMENT_ADDED, mentionNotification);
      }
    }

    // Notify all collaborators
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
  } catch (error) {
    logger.error({
      event: 'create_template_comment_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create comment',
      },
      { status: 500 }
    );
  }
}
