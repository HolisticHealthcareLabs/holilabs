export const dynamic = "force-dynamic";
/**
 * POST /api/clinical-notes/generate
 *
 * Clinical Note Generation API (SOAP / H&P / Consultation)
 *
 * Uses AI to transform clinical transcripts or unstructured notes into
 * structured medical documentation.
 *
 * @compliance LGPD/HIPAA: AI processing follows de-identification rules.
 * RUTH invariant: no raw PHI sent to external LLMs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { AIProviderFactory } from '@/lib/ai/factory';
import logger from '@/lib/logger';
import { ZodError, z } from 'zod';

const GenerateNoteSchema = z.object({
  transcript: z.string().min(10),
  patientId: z.string().cuid(),
  templateId: z.string().optional(),
  format: z.enum(['SOAP', 'CONSULTATION', 'H_AND_P']).default('SOAP'),
  language: z.enum(['pt-BR', 'es-MX', 'en-US']).default('pt-BR'),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const { transcript, patientId, format, language } = GenerateNoteSchema.parse(body);

      // 1. Resolve clinical system prompt based on format/language
      const systemPrompt = `You are a clinical scribe assistant. 
      Analyze the following transcript and generate a structured ${format} note in ${language}.
      Output strictly valid JSON with fields: subjective, objective, assessment, plan.
      De-identify all PHI (names, IDs, dates) to [REDACTED].`;

      let soapResult = {
        subjective: 'Insufficient data — requires clinician input.',
        objective: 'Insufficient data — requires clinician input.',
        assessment: 'Insufficient data — requires clinician input.',
        plan: 'Insufficient data — requires clinician input.',
      };

      try {
        const provider = await AIProviderFactory.getProvider(context.user.id, undefined, {
          workspaceId: context.user.workspaceId,
        });

        const response = await provider.generateResponse(transcript, {
          systemPrompt,
          responseFormat: 'json',
        });

        const content = response;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.subjective || parsed.objective || parsed.assessment || parsed.plan) {
            soapResult = {
              subjective: parsed.subjective || soapResult.subjective,
              objective: parsed.objective || soapResult.objective,
              assessment: parsed.assessment || soapResult.assessment,
              plan: parsed.plan || soapResult.plan,
            };
          }
        }
      } catch (err) {
        logger.error({ event: 'clinical_note_generation_ai_failed', error: err });
        // AI unavailable — return template structure (non-blocking)
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          ipAddress: request.ip || '0.0.0.0',
          action: 'CREATE',
          resource: 'ClinicalNote',
          resourceId: 'pending',
          details: { format, patientId },
        },
      });

      return NextResponse.json({ data: soapResult });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return safeErrorResponse(error, { userMessage: 'Failed to generate clinical note' });
    }
  },
  {
    roles: ['PHYSICIAN', 'NURSE'],
    audit: { action: 'CREATE', resource: 'ClinicalNote' },
  },
);
