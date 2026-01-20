/**
 * Conversations API
 *
 * GET /api/conversations - List user's conversations
 * POST /api/conversations - Create a new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface ConversationListItem {
  id: string;
  patientId: string;
  patientName: string;
  title: string | null;
  lastMessageAt: Date | null;
  lastMessageText: string | null;
  unreadCount: number;
  isArchived: boolean;
  participants: Array<{
    userId: string;
    userType: string;
    displayName: string | null;
    isOnline: boolean;
    lastSeenAt: Date | null;
  }>;
}

/**
 * GET - List conversations for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const includeArchived = searchParams.get('archived') === 'true';
    const cursor = searchParams.get('cursor');

    // Determine user identity
    const clinicianSession = await getServerSession(authOptions);
    let userId: string;
    let userType: 'CLINICIAN' | 'PATIENT';

    if (clinicianSession?.user?.id) {
      userId = clinicianSession.user.id;
      userType = 'CLINICIAN';
    } else {
      try {
        const patientSession = await requirePatientSession();
        userId = patientSession.patientId;
        userType = 'PATIENT';
      } catch {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Build query for conversations where user is a participant
    const whereClause = {
      participants: {
        some: {
          userId,
          userType,
          isActive: true,
        },
      },
      ...(includeArchived ? {} : { isArchived: false }),
      ...(cursor ? { id: { lt: cursor } } : {}),
    };

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
          where: { isActive: true },
          select: {
            userId: true,
            userType: true,
            displayName: true,
            isOnline: true,
            lastSeenAt: true,
            unreadCount: true,
            isMuted: true,
            isPinned: true,
          },
        },
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit + 1, // Fetch one extra to check for more
    });

    // Check if there are more results
    const hasMore = conversations.length > limit;
    const results = hasMore ? conversations.slice(0, limit) : conversations;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // Transform to response format
    const conversationList: ConversationListItem[] = results.map((conv) => {
      const currentParticipant = conv.participants.find(
        (p) => p.userId === userId && p.userType === userType
      );

      return {
        id: conv.id,
        patientId: conv.patientId,
        patientName: `${conv.patient.firstName} ${conv.patient.lastName}`,
        title: conv.title,
        lastMessageAt: conv.lastMessageAt,
        lastMessageText: conv.lastMessageText,
        unreadCount: currentParticipant?.unreadCount || 0,
        isArchived: conv.isArchived,
        isMuted: currentParticipant?.isMuted || false,
        isPinned: currentParticipant?.isPinned || false,
        participants: conv.participants.map((p) => ({
          userId: p.userId,
          userType: p.userType,
          displayName: p.displayName,
          isOnline: p.isOnline,
          lastSeenAt: p.lastSeenAt,
        })),
      };
    });

    // Sort: pinned first, then by last message time
    conversationList.sort((a, b) => {
      const aParticipant = results.find((c) => c.id === a.id)?.participants.find(
        (p) => p.userId === userId && p.userType === userType
      );
      const bParticipant = results.find((c) => c.id === b.id)?.participants.find(
        (p) => p.userId === userId && p.userType === userType
      );

      if (aParticipant?.isPinned && !bParticipant?.isPinned) return -1;
      if (!aParticipant?.isPinned && bParticipant?.isPinned) return 1;

      const aTime = a.lastMessageAt?.getTime() || 0;
      const bTime = b.lastMessageAt?.getTime() || 0;
      return bTime - aTime;
    });

    await createAuditLog({
      action: 'READ',
      resource: 'Conversation',
      resourceId: 'list',
      details: {
        userId,
        userType,
        conversationsCount: conversationList.length,
        accessType: 'CONVERSATION_LIST',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        conversations: conversationList,
        pagination: {
          hasMore,
          nextCursor,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'get_conversations_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { patientId, title, participantIds } = body;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Determine creator identity
    const clinicianSession = await getServerSession(authOptions);
    let creatorId: string;
    let creatorType: 'CLINICIAN' | 'PATIENT';
    let creatorName: string;

    if (clinicianSession?.user?.id) {
      creatorId = clinicianSession.user.id;
      creatorType = 'CLINICIAN';

      const clinician = await prisma.user.findUnique({
        where: { id: creatorId },
        select: { firstName: true, lastName: true },
      });
      creatorName = `Dr. ${clinician?.firstName || ''} ${clinician?.lastName || ''}`.trim();
    } else {
      try {
        const patientSession = await requirePatientSession();
        creatorId = patientSession.patientId;
        creatorType = 'PATIENT';

        const patient = await prisma.patient.findUnique({
          where: { id: creatorId },
          select: { firstName: true, lastName: true },
        });
        creatorName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { assignedClinician: true },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Check if conversation already exists for this patient
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        patientId,
        isArchived: false,
        participants: {
          some: {
            userId: creatorId,
            userType: creatorType,
            isActive: true,
          },
        },
      },
    });

    if (existingConversation) {
      return NextResponse.json({
        success: true,
        data: { conversation: existingConversation, isExisting: true },
      });
    }

    // Create new conversation with participants
    const conversation = await prisma.conversation.create({
      data: {
        patientId,
        title: title || null,
        participants: {
          create: [
            // Creator
            {
              userId: creatorId,
              userType: creatorType,
              displayName: creatorName,
            },
            // If creator is clinician and patient has a user account, add patient
            ...(creatorType === 'CLINICIAN' && patient
              ? [{
                  userId: patientId,
                  userType: 'PATIENT' as const,
                  displayName: `${patient.firstName} ${patient.lastName}`,
                }]
              : []
            ),
            // If creator is patient and has assigned clinician, add clinician
            ...(creatorType === 'PATIENT' && patient.assignedClinicianId
              ? [{
                  userId: patient.assignedClinicianId,
                  userType: 'CLINICIAN' as const,
                  displayName: patient.assignedClinician
                    ? `Dr. ${patient.assignedClinician.firstName} ${patient.assignedClinician.lastName}`
                    : 'Doctor',
                }]
              : []
            ),
          ],
        },
      },
      include: {
        participants: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info({
      event: 'conversation_created',
      conversationId: conversation.id,
      patientId,
      creatorId,
      creatorType,
      participantsCount: conversation.participants.length,
    });

    await createAuditLog({
      action: 'CREATE',
      resource: 'Conversation',
      resourceId: conversation.id,
      details: {
        conversationId: conversation.id,
        patientId,
        creatorId,
        creatorType,
        accessType: 'CONVERSATION_CREATE',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: { conversation, isExisting: false },
    });
  } catch (error) {
    logger.error({
      event: 'create_conversation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
