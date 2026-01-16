/**
 * CDSS V3 - Summary Service
 *
 * Single-responsibility service for meeting summary generation.
 * Uses Claude with Zod validation for type-safe LLM output.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getSummaryGenerationQueue } from '@/lib/queue/queues';
import { JobRepository, EncounterRepository } from '@/lib/repositories';
import { DeidService } from './deid.service';
import { SummaryDraftSchema, type SummaryDraft, type SummaryGenerationInput } from '@/lib/schemas/summary-draft.schema';
import logger from '@/lib/logger';
import type { SummaryGenJobData } from '@/lib/queue/types';

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * Patient context for summary generation
 */
export interface PatientContext {
  age: number;
  sex: string;
  conditions: string[];
  medications: string[];
}

export class SummaryService {
  constructor(
    private readonly jobRepo: JobRepository,
    private readonly encounterRepo: EncounterRepository,
    private readonly deidService: DeidService
  ) {}

  /**
   * Enqueue summary generation job
   * Returns job ID - caller should poll for status
   */
  async enqueueGeneration(
    encounterId: string,
    transcript: string,
    patientContext: PatientContext,
    providerId: string,
    language: 'en' | 'es' | 'pt' = 'en'
  ): Promise<string> {
    // Get encounter to find patient ID
    const encounter = await this.encounterRepo.findById(encounterId);
    if (!encounter) {
      throw new Error(`Encounter ${encounterId} not found`);
    }

    // De-identify transcript BEFORE storing or processing
    const deidTranscript = await this.deidService.redact(transcript);

    logger.info({
      event: 'summary_generation_enqueue_start',
      encounterId,
      transcriptLength: transcript.length,
      deidTranscriptLength: deidTranscript.length,
    });

    // Create job record
    const analysisJob = await this.jobRepo.create({
      type: 'SUMMARY_GEN',
      patientId: encounter.patientId,
      encounterId,
      inputData: {
        deidTranscript,
        patientContext,
        providerId,
        language,
      },
    });

    // Prepare job data for BullMQ
    const jobData: SummaryGenJobData = {
      encounterId,
      deidTranscript,
      patientContext,
      providerId,
      language,
    };

    // Add to BullMQ queue
    const queue = getSummaryGenerationQueue();
    const bullmqJob = await queue.add('generate-summary', jobData, {
      jobId: analysisJob.id,
    });

    // Update job record with BullMQ job ID
    await this.jobRepo.update(analysisJob.id, {
      bullmqJobId: bullmqJob.id,
    });

    logger.info({
      event: 'summary_generation_enqueued',
      jobId: analysisJob.id,
      encounterId,
    });

    return analysisJob.id;
  }

  /**
   * Generate summary draft directly (synchronous)
   * Used by the worker - should not be called directly from API routes
   */
  async generateDraft(
    deidTranscript: string,
    context: PatientContext,
    language: 'en' | 'es' | 'pt' = 'en'
  ): Promise<SummaryDraft> {
    if (!anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    const prompt = this.buildPrompt(deidTranscript, context, language);

    logger.info({
      event: 'summary_llm_request_start',
      transcriptLength: deidTranscript.length,
      language,
    });

    const startTime = Date.now();

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const duration = Date.now() - startTime;

      // Extract text content
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON from response
      let parsed: unknown;
      try {
        // Extract JSON from markdown code block if present
        const jsonMatch = content.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.text.trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        logger.error({
          event: 'summary_llm_json_parse_failed',
          responseText: content.text.slice(0, 500),
        });
        throw new Error('LLM did not return valid JSON');
      }

      // Validate with Zod - throws if invalid
      const validated = SummaryDraftSchema.parse(parsed);

      logger.info({
        event: 'summary_llm_request_complete',
        durationMs: duration,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      return validated;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error({
        event: 'summary_llm_request_failed',
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Save draft to encounter
   */
  async saveDraft(encounterId: string, draft: SummaryDraft): Promise<void> {
    await this.encounterRepo.saveSummaryDraft(encounterId, draft);

    logger.info({
      event: 'summary_draft_saved',
      encounterId,
    });
  }

  /**
   * Approve a section of the draft
   */
  async approveSection(
    encounterId: string,
    section: keyof SummaryDraft
  ): Promise<SummaryDraft> {
    const encounter = await this.encounterRepo.findById(encounterId);
    if (!encounter || !encounter.summaryDraft) {
      throw new Error('Encounter or draft not found');
    }

    const draft = encounter.summaryDraft as SummaryDraft;

    // Mark section as approved
    if (draft[section] && typeof draft[section] === 'object') {
      (draft[section] as any).approved = true;
    }

    await this.encounterRepo.saveSummaryDraft(encounterId, draft);

    return draft;
  }

  /**
   * Approve all sections
   */
  async approveAll(encounterId: string): Promise<SummaryDraft> {
    const encounter = await this.encounterRepo.findById(encounterId);
    if (!encounter || !encounter.summaryDraft) {
      throw new Error('Encounter or draft not found');
    }

    const draft = encounter.summaryDraft as SummaryDraft;

    // Approve all sections
    draft.chiefComplaint.approved = true;
    draft.assessment.approved = true;
    draft.plan.approved = true;
    draft.prevention.approved = true;
    draft.followUp.approved = true;

    await this.encounterRepo.saveSummaryDraft(encounterId, draft);

    return draft;
  }

  /**
   * Build the prompt for Claude
   */
  private buildPrompt(
    transcript: string,
    context: PatientContext,
    language: 'en' | 'es' | 'pt'
  ): string {
    const languageInstructions = {
      en: 'Respond in English.',
      es: 'Responde en español.',
      pt: 'Responda em português.',
    };

    return `You are a clinical documentation assistant. Generate a structured visit summary based on the following encounter transcript.

${languageInstructions[language]}

PATIENT CONTEXT:
- Age: ${context.age}
- Sex: ${context.sex}
- Active Conditions: ${context.conditions.length > 0 ? context.conditions.join(', ') : 'None documented'}
- Current Medications: ${context.medications.length > 0 ? context.medications.join(', ') : 'None documented'}

TRANSCRIPT (de-identified):
${transcript}

INSTRUCTIONS:
1. Analyze the transcript carefully
2. Extract relevant clinical information
3. Generate a structured summary in JSON format
4. Be conservative with diagnoses - only include what is clearly discussed
5. Include ICD-10 codes where confident
6. Set confidence scores (0-1) based on clarity of information

Return ONLY valid JSON matching this exact structure:
{
  "chiefComplaint": {
    "text": "Brief description of why the patient is here",
    "confidence": 0.0-1.0,
    "approved": false
  },
  "assessment": {
    "text": "Clinical assessment and impression",
    "differentials": [
      {"diagnosis": "Primary diagnosis", "likelihood": "high|medium|low", "icdCode": "optional ICD-10"}
    ],
    "confidence": 0.0-1.0,
    "approved": false
  },
  "plan": {
    "medications": [
      {"name": "Drug name", "dosage": "Amount", "frequency": "How often", "duration": "How long"}
    ],
    "labs": ["Lab tests ordered"],
    "imaging": ["Imaging studies ordered"],
    "referrals": ["Referrals made"],
    "instructions": "Patient instructions",
    "confidence": 0.0-1.0,
    "approved": false
  },
  "prevention": {
    "screeningsAddressed": ["Screenings discussed or ordered"],
    "nextScreenings": [{"name": "Screening name", "dueDate": "When due"}],
    "approved": false
  },
  "followUp": {
    "interval": "When to return (e.g., '2 weeks', 'PRN')",
    "reason": "Why follow-up is needed",
    "approved": false
  }
}

Return ONLY the JSON object, no additional text or markdown formatting.`;
  }
}

// Export factory function for dependency injection
export function createSummaryService(
  jobRepo: JobRepository = new JobRepository(),
  encounterRepo: EncounterRepository = new EncounterRepository(),
  deidService: DeidService = new DeidService()
): SummaryService {
  return new SummaryService(jobRepo, encounterRepo, deidService);
}
