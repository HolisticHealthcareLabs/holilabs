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
          if (messages.length > 0 && messages[0].role === 'user') {
            messages[0].content = `${patientContext}\n\n${messages[0].content}`;
          }
        }
      }

      // Send to AI
      const response = await chat({
        messages: messages as ChatMessage[],
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
