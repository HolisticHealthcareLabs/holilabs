import jsonLogic from 'json-logic-js';
import crypto from 'crypto';
import type { PrismaClient, PromptTemplateType } from '@prisma/client';

export interface PromptTemplateInput {
  templateId?: string;
  templateType: PromptTemplateType;
  discipline?: string;
  version?: number;
  data: Record<string, unknown>;
}

export interface PromptTemplateOutput {
  templateId: string;
  templateType: PromptTemplateType;
  version: number;
  evaluatedContent: Record<string, unknown>;
  metadata: {
    evaluatedAt: Date;
    inputHash: string;
  };
}

interface DefaultTemplate {
  version: number;
  logic: object;
  outputSchema: object;
}

const DEFAULT_TEMPLATES: Record<string, DefaultTemplate> = {
  'screening-reminder': {
    version: 1,
    logic: {
      if: [
        { var: 'overdue' },
        { message: 'Screening overdue', priority: 'HIGH' },
        { message: 'Screening on schedule', priority: 'LOW' },
      ],
    },
    outputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        priority: { type: 'string' },
      },
    },
  },
  'risk-assessment-summary': {
    version: 1,
    logic: {
      if: [
        { '>=': [{ var: 'totalRiskScore' }, 0.7] },
        { level: 'HIGH', action: 'Refer to specialist' },
        { level: 'MODERATE', action: 'Schedule follow-up' },
      ],
    },
    outputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string' },
        action: { type: 'string' },
      },
    },
  },
};

function hashInput(data: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export async function evaluateTemplate(
  prisma: PrismaClient,
  input: PromptTemplateInput,
): Promise<PromptTemplateOutput> {
  let templateId: string;
  let templateType: PromptTemplateType = input.templateType;
  let version: number;
  let logic: object;

  if (input.templateId) {
    const dbTemplate = await (prisma as any).promptTemplate.findFirst({
      where: {
        id: input.templateId,
        isActive: true,
      },
    });

    if (dbTemplate) {
      templateId = dbTemplate.id;
      templateType = dbTemplate.type;
      version = dbTemplate.version;
      logic = dbTemplate.templateLogic as object;

      await (prisma as any).promptTemplate.update({
        where: { id: dbTemplate.id },
        data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    } else {
      throw new Error(`Template with id '${input.templateId}' not found or inactive`);
    }
  } else {
    const dbTemplate = await (prisma as any).promptTemplate.findFirst({
      where: {
        type: input.templateType,
        ...(input.discipline ? { discipline: input.discipline } : {}),
        ...(input.version ? { version: input.version } : {}),
        isActive: true,
      },
      orderBy: { version: 'desc' as const },
    });

    if (dbTemplate) {
      templateId = dbTemplate.id;
      templateType = dbTemplate.type;
      version = dbTemplate.version;
      logic = dbTemplate.templateLogic as object;

      await (prisma as any).promptTemplate.update({
        where: { id: dbTemplate.id },
        data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    } else {
      const defaultKey = Object.keys(DEFAULT_TEMPLATES).find((key) => {
        const normalizedType = input.templateType.toLowerCase().replace(/_/g, '-');
        return key === normalizedType || key.includes(normalizedType);
      });

      if (!defaultKey) {
        throw new Error(
          `No template found for type '${input.templateType}'` +
          (input.discipline ? ` and discipline '${input.discipline}'` : ''),
        );
      }

      const defaultTemplate = DEFAULT_TEMPLATES[defaultKey];
      templateId = `default:${defaultKey}`;
      version = defaultTemplate.version;
      logic = defaultTemplate.logic;
    }
  }

  const mergedData = { ...input.data };
  const evaluatedContent = jsonLogic.apply(logic, mergedData) as Record<string, unknown>;

  return {
    templateId,
    templateType,
    version,
    evaluatedContent: typeof evaluatedContent === 'object' && evaluatedContent !== null
      ? evaluatedContent
      : { result: evaluatedContent },
    metadata: {
      evaluatedAt: new Date(),
      inputHash: hashInput(input.data),
    },
  };
}

export async function listTemplates(
  prisma: PrismaClient,
  filters?: { type?: PromptTemplateType; discipline?: string },
): Promise<Array<{ id: string; name: string; type: PromptTemplateType; version: number; discipline: string | null }>> {
  const where: Record<string, unknown> = { isActive: true };
  if (filters?.type) where.type = filters.type;
  if (filters?.discipline) where.discipline = filters.discipline;

  const templates = await (prisma as any).promptTemplate.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      version: true,
      discipline: true,
    },
    orderBy: [{ type: 'asc' as const }, { version: 'desc' as const }],
  });

  return templates;
}
