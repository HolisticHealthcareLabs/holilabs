/**
 * Discipline Prevention MCP Tools — Agent-callable discipline-specific prevention
 *
 * Tools: generate_discipline_context, get_discipline_screenings, evaluate_referral_triggers
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

const VALID_DISCIPLINES = [
  'CARDIOLOGY', 'ENDOCRINOLOGY', 'ONCOLOGY', 'MENTAL_HEALTH',
  'PEDIATRICS', 'GERIATRICS', 'NEPHROLOGY', 'PULMONOLOGY',
  'OB_GYN', 'PRIMARY_CARE',
] as const;

const GenerateContextSchema = z.object({
  discipline: z.enum(VALID_DISCIPLINES).describe('Medical discipline'),
  patientId: z.string().describe('Patient ID to generate context for'),
  jurisdiction: z.string().default('BR').describe('Jurisdiction (BR, CO, BO)'),
});

const GetScreeningsSchema = z.object({
  discipline: z.enum(VALID_DISCIPLINES).describe('Medical discipline'),
  jurisdiction: z.string().default('BR').describe('Jurisdiction'),
});

const EvaluateTriggersSchema = z.object({
  discipline: z.enum(VALID_DISCIPLINES).describe('Medical discipline'),
  patientAge: z.number().min(0).max(150).describe('Patient age in years'),
  patientSex: z.enum(['M', 'F']).describe('Patient biological sex'),
  diagnoses: z.array(z.string()).default([]).describe('ICD-10 codes'),
  labResults: z.record(z.number()).default({}).describe('Lab code → value map'),
});

async function generateContextHandler(input: z.infer<typeof GenerateContextSchema>, context: MCPContext): Promise<MCPResult> {
  try {
    const { generateDisciplineContext } = require('@/lib/prevention/disciplines/context-generator');
    const { getDisciplineConfig } = require('@/lib/prevention/disciplines/registry');

    const config = getDisciplineConfig(input.discipline);
    if (!config) {
      return {
        success: false,
        data: null,
        error: `No discipline config found for ${input.discipline}`,
      };
    }

    const patient = await prisma.patient.findUnique({
      where: { id: input.patientId },
      select: { dateOfBirth: true, gender: true },
    });

    if (!patient) {
      return {
        success: false,
        data: null,
        error: `Patient ${input.patientId} not found`,
      };
    }

    const age = patient.dateOfBirth
      ? Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 0;

    const result = generateDisciplineContext({
      discipline: input.discipline,
      patientAge: age,
      patientSex: (patient.gender as 'M' | 'F') || 'M',
      diagnoses: [],
      medications: [],
      labResults: {},
      jurisdiction: input.jurisdiction,
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `Failed to generate context: ${(err as Error).message}`,
    };
  }
}

async function getScreeningsHandler(input: z.infer<typeof GetScreeningsSchema>, context: MCPContext): Promise<MCPResult> {
  try {
    const { getDisciplineConfig } = require('@/lib/prevention/disciplines/registry');
    const config = getDisciplineConfig(input.discipline);

    if (!config) {
      return {
        success: false,
        data: null,
        error: `No discipline config found for ${input.discipline}`,
      };
    }

    return {
      success: true,
      data: {
        discipline: input.discipline,
        screeningRuleNames: config.screeningRuleNames,
        monitoringSchedule: config.monitoringSchedule,
      },
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: (err as Error).message,
    };
  }
}

async function evaluateTriggersHandler(input: z.infer<typeof EvaluateTriggersSchema>, context: MCPContext): Promise<MCPResult> {
  try {
    const { getDisciplineConfig } = require('@/lib/prevention/disciplines/registry');
    const config = getDisciplineConfig(input.discipline);

    if (!config) {
      return {
        success: false,
        data: null,
        error: `No discipline config found for ${input.discipline}`,
      };
    }

    const jsonLogic = require('json-logic-js');
    const facts = {
      patientAge: input.patientAge,
      patientSex: input.patientSex,
      diagnoses: input.diagnoses,
      labResults: input.labResults,
    };

    const triggeredReferrals = config.referralTriggers
      .filter((trigger: any) => {
        try {
          return jsonLogic.apply(trigger.condition, facts);
        } catch {
          return false;
        }
      })
      .map((trigger: any) => ({
        targetDiscipline: trigger.targetDiscipline,
        reason: trigger.reason,
        urgency: trigger.urgency,
      }));

    return {
      success: true,
      data: { triggeredReferrals, evaluatedCount: config.referralTriggers.length },
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: (err as Error).message,
    };
  }
}

export const disciplinePreventionTools: MCPTool[] = [
  {
    name: 'generate_discipline_context',
    description: 'Generate discipline-specific clinical context for a patient including screenings, risk assessments, and intervention priorities',
    category: 'prevention',
    inputSchema: GenerateContextSchema,
    requiredPermissions: ['prevention:read'],
    handler: generateContextHandler,
  },
  {
    name: 'get_discipline_screenings',
    description: 'Get screening rules and monitoring schedule for a medical discipline',
    category: 'prevention',
    inputSchema: GetScreeningsSchema,
    requiredPermissions: ['prevention:read'],
    handler: getScreeningsHandler,
  },
  {
    name: 'evaluate_referral_triggers',
    description: 'Evaluate referral triggers for a patient against a discipline config using JSON-Logic',
    category: 'prevention',
    inputSchema: EvaluateTriggersSchema,
    requiredPermissions: ['prevention:read'],
    handler: evaluateTriggersHandler,
  },
];
