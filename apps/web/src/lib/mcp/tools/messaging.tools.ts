/**
 * Messaging MCP Tools - Conversation and message management
 *
 * These tools manage patient-related conversations between care team members.
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    CreateConversationSchema,
    GetConversationsSchema,
    CreateMessageSchema,
    GetMessagesSchema,
    type CreateConversationInput,
    type GetConversationsInput,
    type CreateMessageInput,
    type GetMessagesInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL: create_conversation
// =============================================================================

async function createConversationHandler(
    input: CreateConversationInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
    });

    if (!patient) {
        return {
            success: false,
            error: 'Patient not found or access denied',
            data: null,
        };
    }

    // Create conversation with participants
    const conversation: any = await prisma.conversation.create({
        data: {
            patientId: input.patientId,
            title: input.title,
            description: input.description,
            participants: {
                create: input.participantIds.map((userId: string) => ({
                    userId,
                    userType: 'CLINICIAN',
                })),
            },
        },
        include: {
            participants: true,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_conversation',
        conversationId: conversation.id,
        patientId: input.patientId,
        participantCount: input.participantIds.length,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            conversationId: conversation.id,
            title: conversation.title,
            participantCount: conversation.participants.length,
            message: 'Conversation created successfully',
        },
    };
}

// =============================================================================
// TOOL: get_conversations
// =============================================================================

async function getConversationsHandler(
    input: GetConversationsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Build query conditions
    const where: any = {
        participants: {
            some: {
                userId: context.clinicianId,
            },
        },
    };

    if (input.patientId) {
        // Verify patient access first
        const patient = await prisma.patient.findFirst({
            where: {
                id: input.patientId,
                assignedClinicianId: context.clinicianId,
            },
        });

        if (!patient) {
            return {
                success: false,
                error: 'Patient not found or access denied',
                data: null,
            };
        }

        where.patientId = input.patientId;
    }

    if (!input.includeArchived) {
        where.isArchived = false;
    }

    const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
            where,
            skip,
            take: limit,
            orderBy: { lastMessageAt: 'desc' },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                participants: {
                    select: {
                        userId: true,
                        userType: true,
                    },
                },
                _count: {
                    select: { messages: true },
                },
            },
        }),
        prisma.conversation.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_conversations',
        resultCount: conversations.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            conversations: conversations.map((c: any) => ({
                id: c.id,
                title: c.title,
                description: c.description,
                patient: c.patient,
                participantCount: c.participants.length,
                messageCount: c._count.messages,
                lastMessageAt: c.lastMessageAt,
                lastMessageText: c.lastMessageText,
                isArchived: c.isArchived,
                createdAt: c.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
}

// =============================================================================
// TOOL: create_message
// =============================================================================

async function createMessageHandler(
    input: CreateMessageInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify conversation access
    const conversation: any = await prisma.conversation.findFirst({
        where: {
            id: input.conversationId,
            participants: {
                some: {
                    userId: context.clinicianId,
                },
            },
        },
    });

    if (!conversation) {
        return {
            success: false,
            error: 'Conversation not found or access denied',
            data: null,
        };
    }

    if (conversation.isArchived) {
        return {
            success: false,
            error: 'Cannot send message to archived conversation',
            data: null,
        };
    }

    // Create message and update conversation
    const [message] = await prisma.$transaction([
        prisma.conversationMessage.create({
            data: {
                conversationId: input.conversationId,
                senderId: context.clinicianId,
                senderType: 'CLINICIAN',
                content: input.content,
                messageType: input.messageType || 'TEXT',
                replyToId: input.replyToId,
            },
        }),
        prisma.conversation.update({
            where: { id: input.conversationId },
            data: {
                lastMessageAt: new Date(),
                lastMessageText: input.content.substring(0, 255),
            },
        }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_message',
        messageId: message.id,
        conversationId: input.conversationId,
        messageType: input.messageType || 'TEXT',
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            messageId: message.id,
            conversationId: message.conversationId,
            content: message.content,
            messageType: message.messageType,
            createdAt: message.createdAt,
            message: 'Message sent successfully',
        },
    };
}

// =============================================================================
// TOOL: get_messages
// =============================================================================

async function getMessagesHandler(
    input: GetMessagesInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify conversation access
    const conversation: any = await prisma.conversation.findFirst({
        where: {
            id: input.conversationId,
            participants: {
                some: {
                    userId: context.clinicianId,
                },
            },
        },
    });

    if (!conversation) {
        return {
            success: false,
            error: 'Conversation not found or access denied',
            data: null,
        };
    }

    // Build query for pagination
    const where: any = {
        conversationId: input.conversationId,
    };

    if (input.before) {
        const beforeMessage = await prisma.conversationMessage.findUnique({
            where: { id: input.before },
        });
        if (beforeMessage) {
            where.createdAt = { lt: beforeMessage.createdAt };
        }
    }

    const messages = await prisma.conversationMessage.findMany({
        where,
        take: input.limit || 50,
        orderBy: { createdAt: 'desc' },
        include: {
            replyTo: {
                select: {
                    id: true,
                    content: true,
                    senderId: true,
                },
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_messages',
        conversationId: input.conversationId,
        messageCount: messages.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            conversationId: input.conversationId,
            messages: messages.reverse().map((m: any) => ({
                id: m.id,
                senderId: m.senderId,
                senderType: m.senderType,
                content: m.content,
                messageType: m.messageType,
                replyTo: m.replyTo,
                createdAt: m.createdAt,
                deliveredAt: m.deliveredAt,
            })),
            hasMore: messages.length === (input.limit || 50),
            oldestMessageId: messages.length > 0 ? messages[0].id : null,
        },
    };
}

// =============================================================================
// EXPORT: Messaging Tools
// =============================================================================

export const messagingTools: MCPTool[] = [
    {
        name: 'create_conversation',
        description: 'Create a new conversation about a patient with specified participants.',
        category: 'patient',
        inputSchema: CreateConversationSchema,
        requiredPermissions: ['patient:read', 'message:write'],
        handler: createConversationHandler,
    },
    {
        name: 'get_conversations',
        description: 'Get conversations the clinician is participating in, optionally filtered by patient.',
        category: 'patient',
        inputSchema: GetConversationsSchema,
        requiredPermissions: ['message:read'],
        handler: getConversationsHandler,
    },
    {
        name: 'create_message',
        description: 'Send a message in a conversation. Updates conversation last message preview.',
        category: 'patient',
        inputSchema: CreateMessageSchema,
        requiredPermissions: ['message:write'],
        handler: createMessageHandler,
    },
    {
        name: 'get_messages',
        description: 'Get messages from a conversation with pagination support.',
        category: 'patient',
        inputSchema: GetMessagesSchema,
        requiredPermissions: ['message:read'],
        handler: getMessagesHandler,
    },
];
