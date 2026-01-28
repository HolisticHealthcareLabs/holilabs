/**
 * Clinical Primitive: Merge Context
 *
 * Atomic primitive that merges clinical context from multiple sources into
 * a unified patient context object. Useful for agents that need to combine
 * data from EHR, AI scribe, and other sources.
 *
 * POST /api/clinical/primitives/merge-context
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { verifyInternalAgentToken } from '@/lib/hash';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import type { PatientContext } from '@holilabs/shared-types';

export const dynamic = 'force-dynamic';

const diagnosisSchema = z.object({
  id: z.string().optional(),
  icd10Code: z.string(),
  name: z.string(),
  clinicalStatus: z.enum(['ACTIVE', 'RESOLVED', 'INACTIVE']).optional().default('ACTIVE'),
});

const medicationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  rxNormCode: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  status: z.enum(['ACTIVE', 'DISCONTINUED', 'ON_HOLD']).optional().default('ACTIVE'),
});

const allergySchema = z.object({
  id: z.string().optional(),
  allergen: z.string(),
  type: z.enum(['MEDICATION', 'FOOD', 'ENVIRONMENTAL', 'OTHER']).optional().default('OTHER'),
  severity: z.enum(['mild', 'moderate', 'severe']).optional().default('moderate'),
  reactions: z.array(z.string()).optional().default([]),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

const labResultSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  value: z.string(),
  unit: z.string().optional().default(''),
  resultDate: z.string().optional(),
  normalRange: z.string().optional(),
});

const vitalSignsSchema = z.object({
  systolicBp: z.number().optional(),
  diastolicBp: z.number().optional(),
  heartRate: z.number().optional(),
  temperature: z.number().optional(),
  respiratoryRate: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  recordedAt: z.string().optional(),
});

const contextSourceSchema = z.object({
  source: z.enum(['ehr', 'ai_scribe', 'patient_input', 'lab_system', 'pharmacy', 'manual']),
  priority: z.number().min(1).max(10).optional().default(5), // Higher = more trusted
  timestamp: z.string().optional(),
  diagnoses: z.array(diagnosisSchema).optional().default([]),
  medications: z.array(medicationSchema).optional().default([]),
  allergies: z.array(allergySchema).optional().default([]),
  labResults: z.array(labResultSchema).optional().default([]),
  vitalSigns: vitalSignsSchema.optional(),
  chiefComplaint: z.string().optional(),
  symptoms: z.array(z.string()).optional().default([]),
});

const requestSchema = z.object({
  patientId: z.string().min(1),
  age: z.number().min(0).max(150).optional(),
  sex: z.enum(['M', 'F', 'O']).optional(),
  sources: z.array(contextSourceSchema).min(1).max(10),
  conflictResolution: z.enum(['highest_priority', 'most_recent', 'merge_all']).optional().default('highest_priority'),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authenticate
    let userId: string | undefined;
    const internalToken = req.headers.get('X-Agent-Internal-Token');

    if (internalToken && verifyInternalAgentToken(internalToken)) {
      const userEmail = req.headers.get('X-Agent-User-Email');
      const headerUserId = req.headers.get('X-Agent-User-Id');
      if (userEmail) {
        const dbUser = await prisma.user.findFirst({
          where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
          select: { id: true },
        });
        userId = dbUser?.id;
      }
    }

    if (!userId) {
      const session = await auth();
      userId = (session?.user as { id?: string })?.id;
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { patientId, age, sex, sources, conflictResolution } = validation.data;

    logger.info({
      event: 'primitive_merge_context_start',
      patientId,
      sourceCount: sources.length,
      conflictResolution,
    });

    // Merge contexts
    const mergeResult = mergeContexts({
      patientId,
      age,
      sex,
      sources,
      conflictResolution,
    });

    const latencyMs = Date.now() - startTime;

    // Audit log
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'ClinicalPrimitive',
        resourceId: 'merge-context',
        details: {
          patientId,
          sourceCount: sources.length,
          conflictCount: mergeResult.conflicts.length,
          diagnosisCount: mergeResult.context.diagnoses?.length || 0,
          medicationCount: mergeResult.context.medications?.length || 0,
          latencyMs,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'primitive_merge_context_complete',
      conflictCount: mergeResult.conflicts.length,
      latencyMs,
    });

    return NextResponse.json({
      success: true,
      data: mergeResult,
      metadata: {
        method: 'deterministic',
        confidence: 'high',
        latencyMs,
      },
    });
  } catch (error) {
    logger.error({
      event: 'primitive_merge_context_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to merge context' },
      { status: 500 }
    );
  }
}

interface MergeInput {
  patientId: string;
  age?: number;
  sex?: 'M' | 'F' | 'O';
  sources: z.infer<typeof contextSourceSchema>[];
  conflictResolution: 'highest_priority' | 'most_recent' | 'merge_all';
}

interface MergeResult {
  context: PatientContext;
  conflicts: ConflictRecord[];
  sourcesSummary: SourceSummary[];
}

interface ConflictRecord {
  field: string;
  values: { source: string; value: unknown }[];
  resolvedTo: unknown;
  resolution: string;
}

interface SourceSummary {
  source: string;
  itemsContributed: number;
  priority: number;
}

function mergeContexts(input: MergeInput): MergeResult {
  const conflicts: ConflictRecord[] = [];
  const sourcesSummary: SourceSummary[] = [];

  // Sort sources by priority (highest first)
  const sortedSources = [...input.sources].sort((a, b) => (b.priority || 5) - (a.priority || 5));

  // Initialize merged context
  const context: PatientContext = {
    patientId: input.patientId,
    age: input.age || 0,
    sex: input.sex || 'O',
    diagnoses: [],
    medications: [],
    allergies: [],
    recentLabs: [],
  };

  // Track unique items by key
  const diagnosisMap = new Map<string, { item: any; source: string; priority: number }>();
  const medicationMap = new Map<string, { item: any; source: string; priority: number }>();
  const allergyMap = new Map<string, { item: any; source: string; priority: number }>();
  const labMap = new Map<string, { item: any; source: string; priority: number }>();
  const symptomSet = new Set<string>();
  let chiefComplaint: { value: string; source: string; priority: number } | undefined;
  let vitalSigns: { value: any; source: string; priority: number } | undefined;

  // Process each source
  for (const source of sortedSources) {
    let itemsContributed = 0;

    // Diagnoses
    for (const dx of source.diagnoses) {
      const key = dx.icd10Code.toLowerCase();
      const existing = diagnosisMap.get(key);

      if (!existing || (input.conflictResolution === 'merge_all')) {
        diagnosisMap.set(key, { item: dx, source: source.source, priority: source.priority || 5 });
        itemsContributed++;
      } else if (input.conflictResolution === 'highest_priority' && (source.priority || 5) > existing.priority) {
        diagnosisMap.set(key, { item: dx, source: source.source, priority: source.priority || 5 });
        conflicts.push({
          field: `diagnosis.${key}`,
          values: [
            { source: existing.source, value: existing.item },
            { source: source.source, value: dx },
          ],
          resolvedTo: dx,
          resolution: 'Higher priority source selected',
        });
      }
    }

    // Medications
    for (const med of source.medications) {
      const key = med.name.toLowerCase();
      const existing = medicationMap.get(key);

      if (!existing || (input.conflictResolution === 'merge_all')) {
        medicationMap.set(key, { item: med, source: source.source, priority: source.priority || 5 });
        itemsContributed++;
      } else if (input.conflictResolution === 'highest_priority' && (source.priority || 5) > existing.priority) {
        medicationMap.set(key, { item: med, source: source.source, priority: source.priority || 5 });
        conflicts.push({
          field: `medication.${key}`,
          values: [
            { source: existing.source, value: existing.item },
            { source: source.source, value: med },
          ],
          resolvedTo: med,
          resolution: 'Higher priority source selected',
        });
      }
    }

    // Allergies
    for (const allergy of source.allergies) {
      const key = allergy.allergen.toLowerCase();
      const existing = allergyMap.get(key);

      if (!existing || (input.conflictResolution === 'merge_all')) {
        allergyMap.set(key, { item: allergy, source: source.source, priority: source.priority || 5 });
        itemsContributed++;
      } else if (input.conflictResolution === 'highest_priority' && (source.priority || 5) > existing.priority) {
        allergyMap.set(key, { item: allergy, source: source.source, priority: source.priority || 5 });
      }
    }

    // Labs
    for (const lab of source.labResults) {
      const key = `${lab.name.toLowerCase()}-${lab.resultDate || 'latest'}`;
      const existing = labMap.get(key);

      if (!existing || (input.conflictResolution === 'merge_all')) {
        labMap.set(key, { item: lab, source: source.source, priority: source.priority || 5 });
        itemsContributed++;
      }
    }

    // Symptoms (always merge all)
    for (const symptom of source.symptoms) {
      symptomSet.add(symptom.toLowerCase());
      itemsContributed++;
    }

    // Chief complaint (highest priority wins)
    if (source.chiefComplaint) {
      if (!chiefComplaint || (source.priority || 5) > chiefComplaint.priority) {
        chiefComplaint = { value: source.chiefComplaint, source: source.source, priority: source.priority || 5 };
        itemsContributed++;
      }
    }

    // Vital signs (highest priority wins)
    if (source.vitalSigns) {
      if (!vitalSigns || (source.priority || 5) > vitalSigns.priority) {
        vitalSigns = { value: source.vitalSigns, source: source.source, priority: source.priority || 5 };
        itemsContributed++;
      }
    }

    sourcesSummary.push({
      source: source.source,
      itemsContributed,
      priority: source.priority || 5,
    });
  }

  // Build final context
  context.diagnoses = Array.from(diagnosisMap.values()).map((v, i) => ({
    id: v.item.id || `dx_${i}`,
    icd10Code: v.item.icd10Code,
    name: v.item.name,
    clinicalStatus: v.item.clinicalStatus || 'ACTIVE',
  }));

  context.medications = Array.from(medicationMap.values()).map((v, i) => ({
    id: v.item.id || `med_${i}`,
    name: v.item.name,
    rxNormCode: v.item.rxNormCode,
    dose: v.item.dose,
    status: v.item.status || 'ACTIVE',
  }));

  context.allergies = Array.from(allergyMap.values()).map((v, i) => ({
    id: v.item.id || `allergy_${i}`,
    allergen: v.item.allergen,
    type: v.item.type || 'OTHER',
    severity: v.item.severity || 'moderate',
    status: v.item.status || 'ACTIVE',
  }));

  context.recentLabs = Array.from(labMap.values()).map((v, i) => ({
    id: v.item.id || `lab_${i}`,
    name: v.item.name,
    value: v.item.value,
    unit: v.item.unit || '',
    resultDate: v.item.resultDate || new Date().toISOString(),
  }));

  return {
    context,
    conflicts,
    sourcesSummary,
  };
}
