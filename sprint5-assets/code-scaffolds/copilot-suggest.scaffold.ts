/**
 * Co-Pilot Suggest — SOAP section AI suggestion endpoint
 *
 * Reference for src/app/api/copilot/suggest/route.ts
 *
 * Generates AI suggestions per SOAP section with structured prompts.
 * RUTH: SaMD disclaimer on EVERY response, non-removable
 * ELENA: humanReviewRequired: true on EVERY suggestion
 * CYRUS: createProtectedRoute(CLINICIAN), PHI flag, audit trail
 *
 * @see sprint5-assets/api-contracts.json — copilot.POST /api/copilot/suggest
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: holilabsv2 — import from your actual paths
// import { getServerSession } from 'next-auth/next';
// import { prisma } from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

type SOAPSection = 'S' | 'O' | 'A' | 'P';

interface SuggestRequest {
  encounterId: string;
  section: SOAPSection;
  patientContext?: {
    age?: number;
    sex?: string;
    chiefComplaint?: string;
    activeMedications?: string[];
    allergies?: string[];
    activeConditions?: string[];
    recentVitals?: Record<string, number>;
    recentLabs?: Array<{ name: string; value: string; loinc?: string }>;
  };
  partialText?: string; // Existing text in this section for continuation
  transcript?: string;  // Current encounter transcript
}

interface Suggestion {
  text: string;
  confidence: number;
  section: SOAPSection;
  sources?: Array<{ authority: string; url: string }>;
}

interface SuggestResponse {
  suggestions: Suggestion[];
  disclaimer: string; // RUTH invariant: always present, SaMD-safe
  humanReviewRequired: true; // ELENA invariant: always true
  model: string;
  generatedAt: string;
}

// ─── RUTH: SaMD Disclaimer (mandatory, non-removable) ────────────────────────

const SAMD_DISCLAIMER: Record<string, string> = {
  en: 'AI-generated suggestion for clinical consideration. Not a diagnosis. The clinician is responsible for all clinical decisions.',
  'pt-BR': 'Sugestão gerada por IA para consideração clínica. Não é um diagnóstico. O médico é responsável por todas as decisões clínicas.',
  es: 'Sugerencia generada por IA para consideración clínica. No es un diagnóstico. El médico es responsable de todas las decisiones clínicas.',
};

// ─── Structured Prompts per SOAP Section ─────────────────────────────────────

function buildPrompt(section: SOAPSection, context: SuggestRequest): string {
  const { patientContext, partialText, transcript } = context;

  const patientSummary = patientContext
    ? `Patient: ${patientContext.age || '?'}y ${patientContext.sex || '?'}.` +
      (patientContext.chiefComplaint ? ` Chief complaint: ${patientContext.chiefComplaint}.` : '') +
      (patientContext.activeMedications?.length ? ` Medications: ${patientContext.activeMedications.join(', ')}.` : '') +
      (patientContext.allergies?.length ? ` Allergies: ${patientContext.allergies.join(', ')}.` : '') +
      (patientContext.activeConditions?.length ? ` Active conditions: ${patientContext.activeConditions.join(', ')}.` : '')
    : '';

  const vitalsSummary = patientContext?.recentVitals
    ? `Vitals: ${Object.entries(patientContext.recentVitals).map(([k, v]) => `${k}: ${v}`).join(', ')}.`
    : '';

  const labsSummary = patientContext?.recentLabs?.length
    ? `Recent labs: ${patientContext.recentLabs.map((l) => `${l.name}: ${l.value}`).join(', ')}.`
    : '';

  const transcriptContext = transcript ? `\nEncounter transcript:\n${transcript.slice(0, 2000)}` : '';

  const existingText = partialText ? `\nExisting text in this section:\n${partialText}` : '';

  switch (section) {
    case 'S':
      return [
        'You are a clinical documentation assistant generating the Subjective section of a SOAP note.',
        'Based on the patient history, chief complaint, and encounter transcript, document what the patient reports.',
        'Include: history of present illness, review of systems, pertinent positives and negatives.',
        'Write in third person clinical language.',
        patientSummary, transcriptContext, existingText,
        '\nGenerate the Subjective section:',
      ].filter(Boolean).join('\n');

    case 'O':
      return [
        'You are a clinical documentation assistant generating the Objective section of a SOAP note.',
        'Based on the vitals, physical exam findings, and lab results, document objective findings.',
        'Include: vital signs, physical examination by system, laboratory/imaging results.',
        patientSummary, vitalsSummary, labsSummary, transcriptContext, existingText,
        '\nGenerate the Objective section:',
      ].filter(Boolean).join('\n');

    case 'A':
      return [
        'You are a clinical documentation assistant generating the Assessment section of a SOAP note.',
        'Based on the subjective and objective data, suggest differential diagnoses and clinical assessment.',
        'List diagnoses with ICD-10 codes when applicable. Prioritize by likelihood.',
        'IMPORTANT: Use language like "consistent with" or "suggestive of" — never "diagnosed with".',
        patientSummary, vitalsSummary, labsSummary, transcriptContext, existingText,
        '\nGenerate the Assessment section:',
      ].filter(Boolean).join('\n');

    case 'P':
      return [
        'You are a clinical documentation assistant generating the Plan section of a SOAP note.',
        'Based on the assessment, suggest a treatment plan including:',
        '1. Medications (with dosage and frequency)',
        '2. Orders (labs, imaging, referrals)',
        '3. Patient education and lifestyle modifications',
        '4. Follow-up timing',
        'Flag any drug interactions or contraindications based on current medications and allergies.',
        patientSummary, vitalsSummary, labsSummary, transcriptContext, existingText,
        '\nGenerate the Plan section:',
      ].filter(Boolean).join('\n');

    default:
      return `Generate clinical documentation for section ${section}.`;
  }
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ── CYRUS: Auth + PHI ──────────────────────────────────────────────────
  // TODO: holilabsv2 — createProtectedRoute(CLINICIAN)
  // const session = await getServerSession(authOptions);
  // if (!session?.user || session.user.role !== 'CLINICIAN') {
  //   return NextResponse.json({ error: 'E-3002' }, { status: 403 });
  // }
  // const phiReason = request.headers.get('x-access-reason');
  // if (!phiReason) return NextResponse.json({ error: 'E-3004' }, { status: 403 });

  const body: SuggestRequest = await request.json();
  const { encounterId, section, patientContext, partialText, transcript } = body;

  if (!encounterId || !section) {
    return NextResponse.json({ error: 'E-4002', message: 'encounterId and section required' }, { status: 400 });
  }

  if (!['S', 'O', 'A', 'P'].includes(section)) {
    return NextResponse.json({ error: 'E-4002', message: 'section must be S, O, A, or P' }, { status: 400 });
  }

  // ── Build structured prompt ────────────────────────────────────────────
  const prompt = buildPrompt(section, body);

  // ── Call AI provider ───────────────────────────────────────────────────
  // TODO: holilabsv2 — use your existing AI abstraction layer
  // const model = session.user.preferredAiModel || 'claude-sonnet-4-20250514';
  // const response = await callAI({ model, systemPrompt: prompt, maxTokens: 1024 });
  const model = 'claude-sonnet-4-20250514';

  // Scaffold placeholder — replace with real AI call
  const aiText = `[AI suggestion for ${section} section would appear here based on patient context]`;
  const confidence = 0.85;

  // ── CYRUS: Audit trail (hash request + response) ───────────────────────
  // TODO: holilabsv2 — const requestHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  // const responseHash = crypto.createHash('sha256').update(aiText).digest('hex').slice(0, 16);
  // await prisma.auditLog.create({
  //   data: { actionType: 'COPILOT_SUGGEST', userId: session.user.id,
  //     entityType: 'CopilotSuggestion', entityId: encounterId,
  //     accessReason: phiReason, details: JSON.stringify({ section, model, requestHash, responseHash }) }
  // });

  // ── Response (RUTH + ELENA invariants enforced) ────────────────────────
  const response: SuggestResponse = {
    suggestions: [{
      text: aiText,
      confidence,
      section,
      sources: section === 'A' || section === 'P' ? [
        // TODO: holilabsv2 — extract sources from AI response or clinical-decision-rules.json
      ] : undefined,
    }],
    disclaimer: SAMD_DISCLAIMER['pt-BR'], // TODO: holilabsv2 — use session locale
    humanReviewRequired: true, // ELENA: ALWAYS true, non-negotiable
    model,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
