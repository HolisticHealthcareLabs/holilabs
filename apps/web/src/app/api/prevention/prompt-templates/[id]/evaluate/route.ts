import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { evaluateTemplate } from '@/lib/prevention/template-engine';

export const dynamic = 'force-dynamic';

const EvaluateSchema = z.object({
  data: z.record(z.unknown()),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const templateId = context.params?.id as string;

      if (!templateId) {
        return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = EvaluateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const template = await prisma.promptTemplate.findUnique({
        where: { id: templateId },
        select: { id: true, type: true, discipline: true },
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const result = await evaluateTemplate(prisma, {
        templateId,
        templateType: template.type,
        discipline: template.discipline ?? undefined,
        data: parsed.data.data as Record<string, unknown>,
      });

      return NextResponse.json({ data: result });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to evaluate template' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN'] as any,
    audit: { action: 'EXECUTE', resource: 'PromptTemplateEvaluation' },
  },
);
