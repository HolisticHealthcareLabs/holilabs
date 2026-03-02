'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth/auth';

const CreateTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required').max(200),
  planType: z.enum([
    'WELLNESS', 'CHRONIC_DISEASE', 'POST_SURGICAL', 'MENTAL_HEALTH',
    'PEDIATRIC', 'GERIATRIC', 'MATERNAL', 'OCCUPATIONAL',
    'REHABILITATION', 'CUSTOM',
  ]),
  description: z.string().max(2000).optional(),
  guidelineSource: z.string().max(200).optional(),
  evidenceLevel: z.string().max(50).optional(),
  targetPopulation: z.string().max(500).optional(),
  goals: z.array(z.object({
    goal: z.string().min(1),
    category: z.string(),
    timeframe: z.string(),
    priority: z.string(),
  })).min(1, 'At least one goal is required'),
  recommendations: z.array(z.object({
    title: z.string().min(1),
    description: z.string(),
    category: z.string(),
    priority: z.string(),
  })).default([]),
});

type CreateTemplateResult =
  | { success: true; templateId: string; templateName: string }
  | { success: false; error: string };

export async function createTemplate(formData: FormData): Promise<CreateTemplateResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: 'You must be signed in to create templates.' };
    }

    const goalsRaw = formData.get('goals');
    const recommendationsRaw = formData.get('recommendations');

    let goals: unknown[];
    let recommendations: unknown[];

    try {
      goals = typeof goalsRaw === 'string' ? JSON.parse(goalsRaw) : [];
      recommendations = typeof recommendationsRaw === 'string' ? JSON.parse(recommendationsRaw) : [];
    } catch {
      return { success: false, error: 'Invalid goals or recommendations format.' };
    }

    const raw = {
      templateName: formData.get('templateName'),
      planType: formData.get('planType'),
      description: formData.get('description') || undefined,
      guidelineSource: formData.get('guidelineSource') || undefined,
      evidenceLevel: formData.get('evidenceLevel') || undefined,
      targetPopulation: formData.get('targetPopulation') || undefined,
      goals,
      recommendations,
    };

    const validation = CreateTemplateSchema.safeParse(raw);

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Invalid input.';
      return { success: false, error: firstError };
    }

    const data = validation.data;

    const template = await prisma.preventionPlanTemplate.create({
      data: {
        templateName: data.templateName,
        planType: data.planType as any,
        description: data.description || null,
        guidelineSource: data.guidelineSource || null,
        evidenceLevel: data.evidenceLevel || null,
        targetPopulation: data.targetPopulation || null,
        goals: data.goals,
        recommendations: data.recommendations,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        templateName: true,
      },
    });

    // Create initial version snapshot
    await prisma.preventionPlanTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        versionLabel: 'v1.0',
        changeLog: 'Initial version',
        templateData: {
          templateName: data.templateName,
          planType: data.planType,
          description: data.description,
          guidelineSource: data.guidelineSource,
          evidenceLevel: data.evidenceLevel,
          targetPopulation: data.targetPopulation,
          goals: data.goals,
          recommendations: data.recommendations,
        },
        createdBy: session.user.id,
      },
    });

    return { success: true, templateId: template.id, templateName: template.templateName };
  } catch (error) {
    console.error('[Templates] Create error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create template.',
    };
  }
}
