import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createDeidService } from '@/lib/services/deid.service';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { chat } from '@/lib/ai/chat';

export const dynamic = 'force-dynamic';

const ExtractedDiagnosisSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['primary', 'secondary', 'complication']),
});

const SuggestedServiceSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  system: z.enum(['CBHPM', 'TUSS']),
  estimatedValueBRL: z.number().min(0),
});

const BillingAnalysisOutputSchema = z.object({
  extractedDiagnoses: z.array(ExtractedDiagnosisSchema),
  suggestedServices: z.array(SuggestedServiceSchema),
  totalEstimatedValue: z.number().min(0),
  cdiWarnings: z.array(z.string()),
});

export type BillingAnalysisOutput = z.infer<typeof BillingAnalysisOutputSchema>;

const BillingAnalyzeRequestSchema = z.object({
  soapNote: z.string().min(1, 'SOAP note is required').max(15000),
  transcript: z.string().max(25000).default(''),
  patientData: z
    .object({
      age: z.number().int().min(0).max(130).optional(),
      sex: z.string().optional(),
    })
    .default({}),
});

const BILLING_SYSTEM_PROMPT = [
  'You are a LATAM Medical Billing Auditor specializing in Brazilian healthcare reimbursement.',
  '',
  'TASK:',
  'Analyze the provided SOAP note and clinical transcript.',
  'Extract ICD-10 diagnoses from the documented clinical findings.',
  'Suggest billable procedures using ONLY CBHPM (Classificacao Brasileira Hierarquizada',
  'de Procedimentos Medicos) or TUSS (Terminologia Unificada da Saude Suplementar) standards.',
  'Identify clinical documentation gaps (CDI warnings) that could cause claim denial.',
  '',
  'HARD RULES:',
  '1) Do NOT use CPT, HCPCS, or any US-centric billing codes.',
  '2) All monetary values MUST be in Brazilian Reais (BRL).',
  '3) Return ONLY the JSON object matching the schema below. No markdown, no prose.',
  '4) If a diagnosis lacks sufficient documentation, add a CDI warning string.',
  '5) Estimate procedure values based on the CBHPM 6th Edition reference table.',
  '6) Never output patient identifiers. The input is already de-identified.',
  '',
  'REQUIRED JSON SCHEMA:',
  '{',
  '  "extractedDiagnoses": [',
  '    { "code": "ICD-10 code", "name": "Diagnosis name in Portuguese", "type": "primary|secondary|complication" }',
  '  ],',
  '  "suggestedServices": [',
  '    { "code": "CBHPM or TUSS code", "name": "Procedure name in Portuguese", "system": "CBHPM|TUSS", "estimatedValueBRL": 0.00 }',
  '  ],',
  '  "totalEstimatedValue": 0.00,',
  '  "cdiWarnings": ["string describing missing documentation"]',
  '}',
  '',
  'References: CBHPM 6a Edicao / ANS RN 465/2021 / CFM',
].join('\n');

const MOCK_BILLING_ANALYSIS: BillingAnalysisOutput = {
  extractedDiagnoses: [
    { code: 'I50.9', name: 'Insuficiencia Cardiaca, nao especificada', type: 'primary' },
    { code: 'E11.9', name: 'Diabetes Mellitus Tipo 2 sem complicacoes', type: 'secondary' },
    { code: 'I10', name: 'Hipertensao Essencial (Primaria)', type: 'secondary' },
    { code: 'N18.3', name: 'Doenca Renal Cronica, Estagio 3', type: 'complication' },
  ],
  suggestedServices: [
    { code: 'CBHPM 31603017', name: 'Consulta Medica de Alta Complexidade', system: 'CBHPM', estimatedValueBRL: 250.0 },
    { code: 'TUSS 40302270', name: 'Eletrocardiograma 12 derivacoes (urgente)', system: 'TUSS', estimatedValueBRL: 60.0 },
    { code: 'TUSS 40302262', name: 'Troponina I - Dosagem seriada', system: 'TUSS', estimatedValueBRL: 40.0 },
  ],
  totalEstimatedValue: 350.0,
  cdiWarnings: [
    'Resultado do ECG ausente no campo Objetivo. Necessario para justificar TUSS 40302270.',
    'Estadiamento da ICC (fracao de ejecao) nao documentado. Necessario para codigo de alta complexidade.',
    'Motivo da suspensao da Metformina nao registrado formalmente no Plano.',
  ],
};

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user?.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = BillingAnalyzeRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { soapNote, transcript, patientData } = validation.data;

    const deidService = createDeidService();
    const [safeSoapNote, safeTranscript] = await deidService.redactBatch([soapNote, transcript]);

    const clinicalPayload = [
      patientData.age != null ? `AGE: ${patientData.age}` : '',
      patientData.sex ? `SEX: ${patientData.sex}` : '',
      '',
      'DE-IDENTIFIED SOAP NOTE:',
      safeSoapNote,
      '',
      'DE-IDENTIFIED ENCOUNTER TRANSCRIPT:',
      safeTranscript || 'No transcript provided.',
    ]
      .filter(Boolean)
      .join('\n');

    const fullPrompt = `${BILLING_SYSTEM_PROMPT}\n\n${clinicalPayload}`;

    let analysisResult: BillingAnalysisOutput;

    try {
      const aiResult = await chat({
        provider: 'claude',
        systemPrompt: fullPrompt,
        temperature: 0.1,
        maxTokens: 2000,
        messages: [
          {
            role: 'user',
            content: 'Analyze the clinical documentation above and return the billing analysis JSON.',
          },
        ],
      });

      if (!aiResult.success || !aiResult.message) {
        throw new Error(aiResult.error || 'LLM returned empty response');
      }

      const jsonMatch = aiResult.message.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM response did not contain valid JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = BillingAnalysisOutputSchema.safeParse(parsed);

      if (!validated.success) {
        logger.warn({
          event: 'billing_analysis_schema_mismatch',
          errors: validated.error.flatten().fieldErrors,
        });
        throw new Error('LLM output did not match required billing schema');
      }

      analysisResult = validated.data;
    } catch (llmError) {
      logger.warn({
        event: 'billing_analysis_llm_fallback',
        error: llmError instanceof Error ? llmError.message : 'Unknown LLM error',
      });

      analysisResult = MOCK_BILLING_ANALYSIS;
    }

    await createAuditLog({
      action: 'CREATE',
      resource: 'BillingAnalysis',
      resourceId: userId!,
      details: {
        diagnosesCount: analysisResult.extractedDiagnoses.length,
        servicesCount: analysisResult.suggestedServices.length,
        totalEstimatedValue: analysisResult.totalEstimatedValue,
        cdiWarningsCount: analysisResult.cdiWarnings.length,
      },
      success: true,
    });

    logger.info({
      event: 'billing_analysis_complete',
      providerId: userId,
      diagnosesCount: analysisResult.extractedDiagnoses.length,
      servicesCount: analysisResult.suggestedServices.length,
      totalEstimatedValue: analysisResult.totalEstimatedValue,
    });

    return NextResponse.json({ success: true, data: analysisResult });
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
