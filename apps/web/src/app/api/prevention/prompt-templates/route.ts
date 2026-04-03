import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { listTemplates } from '@/lib/prevention/template-engine';

export const dynamic = 'force-dynamic';

const VALID_TEMPLATE_TYPES = [
  'DISCIPLINE_CONTEXT',
  'SCREENING_SELECTION',
  'RISK_ASSESSMENT',
  'INTERVENTION_RANKING',
  'MONITORING_SCHEDULE',
] as const;

const VALID_DISCIPLINES = [
  'CARDIOLOGY', 'ENDOCRINOLOGY', 'ONCOLOGY', 'MENTAL_HEALTH',
  'PEDIATRICS', 'GERIATRICS', 'NEPHROLOGY', 'PULMONOLOGY',
  'OB_GYN', 'PRIMARY_CARE',
] as const;

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(VALID_TEMPLATE_TYPES),
  discipline: z.enum(VALID_DISCIPLINES).optional(),
  templateLogic: z.record(z.unknown()),
  templateSchema: z.record(z.unknown()),
  defaultParams: z.record(z.unknown()).optional(),
  jurisdiction: z.string().max(10).optional(),
  changeLog: z.string().max(2000).optional(),
});

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type') as typeof VALID_TEMPLATE_TYPES[number] | null;
      const discipline = searchParams.get('discipline') ?? undefined;

      if (type && !VALID_TEMPLATE_TYPES.includes(type)) {
        return NextResponse.json(
          { error: 'Invalid template type', valid: VALID_TEMPLATE_TYPES },
          { status: 400 },
        );
      }

      const templates = await listTemplates(prisma, {
        type: type ?? undefined,
        discipline,
      });

      return NextResponse.json({ data: templates });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list prompt templates' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN'] as any,
    audit: { action: 'READ', resource: 'PromptTemplate' },
  },
);

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = CreateTemplateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const data = parsed.data;

      const existing = await prisma.promptTemplate.findFirst({
        where: { name: data.name, isActive: true },
        orderBy: { version: 'desc' },
        select: { id: true, version: true },
      });

      const nextVersion = existing ? existing.version + 1 : 1;

      const template = await prisma.promptTemplate.create({
        data: {
          name: data.name,
          type: data.type,
          discipline: data.discipline ?? null,
          version: nextVersion,
          templateLogic: data.templateLogic as any,
          templateSchema: data.templateSchema as any,
          defaultParams: (data.defaultParams ?? null) as any,
          jurisdiction: data.jurisdiction ?? null,
          previousVersionId: existing?.id ?? null,
          changeLog: data.changeLog ?? null,
          createdBy: context.user?.id ?? 'system',
        },
      });

      return NextResponse.json({ data: template }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create prompt template' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'PromptTemplate' },
  },
);
