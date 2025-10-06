/**
 * AI Chat API
 * Clinical Decision Support System
 *
 * POST /api/ai/chat - Send message to AI assistant
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { chat, buildPatientContext, ChatMessage } from '@/lib/ai/chat';
import { prisma } from '@/lib/prisma';
import { sanitizeAIInput } from '@/lib/security/input-sanitization';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';


export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();

      const {
        messages,
        patientId,
        provider = 'claude',
        temperature = 0.7,
      } = body;

      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json(
          { error: 'Messages array is required' },
          { status: 400 }
        );
      }

      // Sanitize all user messages to prevent prompt injection
      const sanitizedMessages = messages.map((msg) => {
        if (msg.role === 'user') {
          return {
            ...msg,
            content: sanitizeAIInput(msg.content, {
              maxLength: 10000,
              allowHtml: false,
              removeUrls: false, // Allow URLs in medical context
            }),
          };
        }
        return msg;
      });

      // Build patient context if patientId provided
      let patientContext = '';
      if (patientId) {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          include: {
            medications: {
              where: { isActive: true },
              select: { name: true, dose: true },
            },
          },
        });

        if (patient) {
          patientContext = buildPatientContext({
            ageBand: patient.ageBand || undefined,
            gender: patient.gender || undefined,
            medications: patient.medications,
          });

          // Prepend patient context to first user message
          if (sanitizedMessages.length > 0 && sanitizedMessages[0].role === 'user') {
            sanitizedMessages[0].content = `${patientContext}\n\n${sanitizedMessages[0].content}`;
          }
        }
      }

      // Send to AI with sanitized messages
      const response = await chat({
        messages: sanitizedMessages as ChatMessage[],
        provider,
        temperature,
      });

      if (!response.success) {
        return NextResponse.json(
          { error: response.error || 'AI request failed' },
          { status: 500 }
        );
      }

      // Log AI usage for billing/analytics
      await prisma.auditLog.create({
        data: {
          userId: context.user?.id,
          userEmail: context.user?.email || 'system',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'READ',
          resource: 'AI_Chat',
          resourceId: patientId || 'N/A',
          success: true,
          details: {
            provider,
            tokens: response.usage?.totalTokens || 0,
            messageCount: messages.length,
          },
        },
      }).catch(err => console.error('Audit log failed:', err));

      return NextResponse.json({
        success: true,
        data: {
          message: response.message,
          usage: response.usage,
          provider,
        },
      });
    } catch (error: any) {
      console.error('AI chat error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'], // Only licensed clinicians can use AI
    rateLimit: { windowMs: 60000, maxRequests: 20 }, // 20 requests per minute
  }
);
