import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { createDeidService } from '@/lib/services/deid.service';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { chat } from '@/lib/ai/chat';
import {
  buildCdssSystemPrompt,
  buildDeidentifiedClinicalContext,
  type CdssActionType,
  type DeidentifiedClinicalInput,
} from '../../../../../../../packages/shared-kernel/src/clinical/prompt-engine';

export const dynamic = 'force-dynamic';

const CdssActionTypeSchema = z.enum([
  'LIFESTYLE_PREVENTION',
  'RX_TIMELINE_SAFETY',
  'DIFFERENTIAL_DX',
  'DRAFT_HANDOUT',
]);

const ClinicalConditionSchema = z.object({
  label: z.string().optional(),
  icd10Code: z.string().optional(),
  status: z.string().optional(),
});

const ClinicalMedicationSchema = z.object({
  name: z.string().optional(),
  atcCode: z.string().optional(),
  dose: z.string().optional(),
  schedule: z.string().optional(),
  status: z.string().optional(),
});

const ClinicalVitalSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  collectedAt: z.string().optional(),
});

const SoapDraftSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

const PatientContextSchema = z.object({
  age: z.number().int().min(0).max(130).optional(),
  sex: z.string().optional(),
  conditions: z.array(ClinicalConditionSchema).default([]),
  medications: z.array(ClinicalMedicationSchema).default([]),
  vitals: z.array(ClinicalVitalSchema).default([]),
  soapDraft: SoapDraftSchema.optional(),
});

const ChatRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  encounterId: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(50, 'Conversation history too long')
    .default([]),
  model: z.enum(['anthropic', 'openai', 'gemini']).default('anthropic'),
  cdssActionType: CdssActionTypeSchema.optional(),
  encounterTranscript: z.string().max(25000).optional(),
  patientContext: PatientContextSchema.optional(),
  soapDraft: SoapDraftSchema.optional(),
});

type Suggestion = {
  label: string;
  type: 'calculator' | 'order' | 'lab' | 'alert' | 'reference';
  action: string;
  payload?: Record<string, string>;
};

function extractSuggestions(content: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const patterns: Array<{ regex: RegExp; suggestion: Omit<Suggestion, 'payload'> }> = [
    { regex: /ACS risk|acute coronary|chest pain.*risk/i, suggestion: { label: 'ACS Risk Calculator', type: 'calculator', action: 'calculate_acs_risk' } },
    { regex: /ECG|EKG|electrocardiogram/i, suggestion: { label: 'Order ECG', type: 'order', action: 'order_ecg' } },
    { regex: /troponin|cardiac enzyme|cardiac marker/i, suggestion: { label: 'Check Troponin Trend', type: 'lab', action: 'view_troponin' } },
    { regex: /colonoscopy|colon cancer screen/i, suggestion: { label: 'Order Colonoscopy', type: 'order', action: 'order_colonoscopy' } },
    { regex: /A1c|hemoglobin a1c|diabetes screen|glucose control/i, suggestion: { label: 'Order HbA1c', type: 'lab', action: 'order_hba1c' } },
    { regex: /lipid|cholesterol|LDL|HDL/i, suggestion: { label: 'Order Lipid Panel', type: 'lab', action: 'order_lipid_panel' } },
    { regex: /drug interaction|medication review|polypharmacy/i, suggestion: { label: 'Check Drug Interactions', type: 'alert', action: 'check_interactions' } },
    { regex: /CHA2DS2-VASc|stroke risk|atrial fibrillation.*risk/i, suggestion: { label: 'CHA2DS2-VASc Score', type: 'calculator', action: 'calculate_chadsvasc' } },
    { regex: /wells|PE probability|pulmonary embolism/i, suggestion: { label: 'Wells Score (PE)', type: 'calculator', action: 'calculate_wells_pe' } },
    { regex: /CURB-65|pneumonia severity|CAP/i, suggestion: { label: 'CURB-65 Score', type: 'calculator', action: 'calculate_curb65' } },
    { regex: /creatinine clearance|GFR|kidney function|renal function/i, suggestion: { label: 'Calculate GFR', type: 'calculator', action: 'calculate_gfr' } },
    { regex: /mammogram|breast cancer screen/i, suggestion: { label: 'Order Mammogram', type: 'order', action: 'order_mammogram' } },
    { regex: /blood pressure|hypertension|BP management/i, suggestion: { label: 'BP Management Guidelines', type: 'reference', action: 'view_bp_guidelines' } },
  ];

  patterns.forEach(({ regex, suggestion }) => {
    if (regex.test(content) && !suggestions.some((current) => current.action === suggestion.action)) {
      suggestions.push(suggestion);
    }
  });

  return suggestions.slice(0, 5);
}

function calculateAge(dateValue: Date | string | null | undefined): number | undefined {
  if (!dateValue) return undefined;
  const dob = new Date(dateValue);
  if (Number.isNaN(dob.getTime())) return undefined;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());

  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : undefined;
}

function mergeClinicalInput(
  dbInput: DeidentifiedClinicalInput,
  requestInput: DeidentifiedClinicalInput,
  soapDraft?: z.infer<typeof SoapDraftSchema>
): DeidentifiedClinicalInput {
  return {
    age: requestInput.age ?? dbInput.age,
    sex: requestInput.sex ?? dbInput.sex,
    conditions: [...(dbInput.conditions ?? []), ...(requestInput.conditions ?? [])],
    medications: [...(dbInput.medications ?? []), ...(requestInput.medications ?? [])],
    vitals: requestInput.vitals?.length ? requestInput.vitals : dbInput.vitals,
    soapDraft: requestInput.soapDraft ?? soapDraft ?? dbInput.soapDraft,
  };
}

function buildDefaultSystemPrompt(clinicalContext: string): string {
  return [
    'You are a physician-facing clinical reasoning assistant.',
    'Use concise, evidence-based responses with guideline references when applicable.',
    'Return differential considerations, medication safety checks, and next-step data requests when relevant.',
    'If key data is missing, return INSUFFICIENT_DATA and list required inputs.',
    'Do not output direct identifiers.',
    '',
    'De-identified Clinical Context:',
    clinicalContext,
    '',
    'Safety note: This output supports clinician reasoning. Final decisions remain with the treating clinician.',
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const validationResult = ChatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      patientId,
      encounterId,
      message,
      conversationHistory,
      model,
      cdssActionType,
      encounterTranscript,
      patientContext,
      soapDraft,
    } = validationResult.data;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        dateOfBirth: true,
        gender: true,
        diagnoses: {
          where: { status: 'ACTIVE' },
          select: { description: true },
          take: 12,
        },
        medications: {
          where: { isActive: true },
          select: { name: true },
          take: 12,
        },
      },
    });

    if (!patient && !patientContext) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const dbClinicalInput: DeidentifiedClinicalInput = {
      age: calculateAge(patient?.dateOfBirth),
      sex: patient?.gender ?? undefined,
      conditions: (patient?.diagnoses ?? []).map((diagnosis) => ({
        label: diagnosis.description,
      })),
      medications: (patient?.medications ?? []).map((medication) => ({
        name: medication.name,
      })),
    };

    const mergedClinicalInput = mergeClinicalInput(
      dbClinicalInput,
      patientContext ?? {},
      soapDraft
    );

    const deidentifiedClinicalContext = buildDeidentifiedClinicalContext(
      mergedClinicalInput,
      encounterTranscript ?? ''
    );

    const systemPrompt = cdssActionType
      ? buildCdssSystemPrompt(cdssActionType as CdssActionType, deidentifiedClinicalContext)
      : buildDefaultSystemPrompt(deidentifiedClinicalContext);

    const deidService = createDeidService();
    const safeMessage = await deidService.redact(message);
    const safeHistory = await Promise.all(
      conversationHistory.map(async (historyMessage) => ({
        role: historyMessage.role,
        content: await deidService.redact(historyMessage.content),
      }))
    );

    const provider =
      model === 'anthropic'
        ? 'claude'
        : model === 'openai'
          ? 'openai'
          : 'gemini';

    const aiResult = await chat({
      provider,
      systemPrompt,
      temperature: 0.2,
      maxTokens: 1200,
      messages: [
        ...safeHistory.map((historyMessage) => ({
          role: historyMessage.role,
          content: historyMessage.content,
        })),
        { role: 'user', content: safeMessage },
      ],
    });

    if (!aiResult.success || !aiResult.message) {
      return NextResponse.json(
        { success: false, error: aiResult.error || 'Failed to generate clinical response' },
        { status: 503 }
      );
    }

    const aiResponse = aiResult.message;
    const suggestions = extractSuggestions(`${safeMessage} ${aiResponse}`);

    await createAuditLog({
      action: 'CREATE',
      resource: 'CDSSChatMessage',
      resourceId: patientId,
      details: {
        encounterId,
        messageLength: message.length,
        responseLength: aiResponse.length,
        suggestionsCount: suggestions.length,
        cdssActionType: cdssActionType ?? null,
        provider,
      },
      success: true,
    });

    logger.info({
      event: 'cdss_chat_response',
      patientId,
      encounterId,
      providerId: session.user.id,
      provider,
      responseLength: aiResponse.length,
      suggestionsCount: suggestions.length,
      cdssActionType: cdssActionType ?? null,
    });

    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse,
        suggestions,
        disclaimer: 'Clinical reasoning support only. Final decisions remain with the treating clinician.',
      },
    });
  } catch (error) {
    logger.error({
      event: 'cdss_chat_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
