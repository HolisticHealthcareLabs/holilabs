/**
 * [ACTIVATING: ARCHIE — SOAP Note Generation Endpoint]
 *
 * POST /api/clinical-notes/generate
 * Generates structured SOAP note via AI from patient clinical context.
 *
 * ELENA veto compliance: All AI output includes provenance metadata
 *   (sourceAuthority: 'AI-assisted', requiresHumanReview: true)
 * RUTH veto compliance: Labeled as documentation aid — NOT a clinical recommendation.
 *   No SaMD claims. No diagnosis/treatment language.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { AIProviderFactory } from '@/lib/ai/factory';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/clinical-notes/generate
 * Body: { patientId: string, noteId?: string }
 * Returns: { subjective, objective, assessment, plan, provenance, disclaimer }
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const { patientId, noteId } = body;

      if (!patientId) {
        return NextResponse.json(
          { error: 'Missing required field: patientId' },
          { status: 400 }
        );
      }

      // ===================================================================
      // SECURITY: TENANT ISOLATION
      // ===================================================================
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          assignedClinicianId: true,
          dateOfBirth: true,
          gender: true,
        },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      if (patient.assignedClinicianId !== context.user.id && context.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden: You cannot generate notes for this patient' },
          { status: 403 }
        );
      }

      // Load existing note if refining
      let existingNote: { chiefComplaint: string | null; subjective: string | null; objective: string | null; assessment: string | null; plan: string | null } | null = null;
      if (noteId) {
        existingNote = await prisma.clinicalNote.findUnique({
          where: { id: noteId },
          select: { chiefComplaint: true, subjective: true, objective: true, assessment: true, plan: true },
        });
      }

      // Gather de-identified clinical context
      const [recentNotes, activeMedications] = await Promise.all([
        prisma.clinicalNote.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { chiefComplaint: true, subjective: true, assessment: true, createdAt: true },
        }),
        prisma.medication.findMany({
          where: { patientId, isActive: true },
          select: { name: true, dose: true, frequency: true },
          take: 10,
        }),
      ]);

      const patientAge = patient.dateOfBirth
        ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      const contextLines: string[] = [];
      if (patientAge) contextLines.push(`Patient age: ${patientAge}`);
      if (patient.gender) contextLines.push(`Gender: ${patient.gender}`);
      if (activeMedications.length > 0) {
        contextLines.push(
          `Active medications: ${activeMedications.map((m) => `${m.name} ${m.dose} ${m.frequency}`).join('; ')}`
        );
      }
      if (existingNote?.chiefComplaint) {
        contextLines.push(`Chief complaint: ${existingNote.chiefComplaint}`);
      }
      if (recentNotes.length > 0) {
        const assessments = recentNotes.map((n) => n.assessment).filter(Boolean);
        if (assessments.length > 0) {
          contextLines.push(`Recent assessments: ${assessments.join('; ')}`);
        }
      }

      // RUTH: No SaMD language — strictly documentation aid
      const systemPrompt = [
        'You are a clinical documentation assistant.',
        'Generate a structured SOAP note based on the provided clinical context.',
        'IMPORTANT: This is a DOCUMENTATION AID ONLY. NOT a clinical recommendation, diagnosis, or treatment suggestion.',
        'Output ONLY valid JSON with keys: subjective, objective, assessment, plan.',
        'Each value should be a concise clinical paragraph using professional medical language.',
        'If information is insufficient for a section, write "Insufficient data — requires clinician input."',
        'Do NOT use words: diagnose, detect, prevent, treat, cure, predict.',
      ].join('\n');

      const userPrompt = existingNote
        ? `Refine this existing SOAP note:\nS: ${existingNote.subjective || 'N/A'}\nO: ${existingNote.objective || 'N/A'}\nA: ${existingNote.assessment || 'N/A'}\nP: ${existingNote.plan || 'N/A'}\n\nContext:\n${contextLines.join('\n')}`
        : `Generate a SOAP note template given this context:\n${contextLines.join('\n') || 'No additional context. Generate placeholder guidance for each section.'}`;

      // Call AI provider with graceful fallback
      let soapResult = {
        subjective: 'Insufficient data — requires clinician input.',
        objective: 'Insufficient data — requires clinician input.',
        assessment: 'Insufficient data — requires clinician input.',
        plan: 'Insufficient data — requires clinician input.',
      };

      try {
        const provider = await AIProviderFactory.getProviderV2(context.user.id, undefined, {
          workspaceId: context.user.workspaceId,
        });
        const response = await provider.chat({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          responseFormat: 'json',
        });

        const content = response.content;
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
      } catch {
        // AI unavailable — return template structure (non-blocking)
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'CREATE',
          resource: 'ClinicalNote',
          resourceId: noteId || 'soap-generation',
          details: {
            action: 'soap_generation',
            patientId,
            hasExistingNote: !!noteId,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          ...soapResult,
          // ELENA veto: provenance metadata — required for all AI-generated clinical content
          provenance: {
            sourceAuthority: 'AI-assisted',
            requiresHumanReview: true,
            generatedAt: new Date().toISOString(),
            generatedBy: 'cortex-documentation-aid',
          },
          // RUTH veto: regulatory disclaimer — no SaMD claims
          disclaimer:
            'This is a documentation aid only. Not a clinical recommendation, diagnosis, or treatment suggestion. Clinician review and modification required before use.',
        },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to generate SOAP note' });
    }
  },
  {
    roles: ['PHYSICIAN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'CREATE', resource: 'ClinicalNote' },
  }
);
