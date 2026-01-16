/**
 * SOAP Note Generator
 *
 * Generates structured SOAP (Subjective, Objective, Assessment, Plan) clinical notes
 * from medical transcriptions using AI and medical NLP.
 *
 * Architecture adapted from:
 * - AWS Medical Transcription Analysis sample
 * - Standard SOAP note structure (StatPearls NCBI)
 * - Integration with existing AI Scribe Service
 *
 * @compliance HIPAA, HL7 FHIR R4
 */

import { ComprehendMedicalClient, DetectEntitiesV2Command } from '@aws-sdk/client-comprehendmedical';
import { createHash } from 'crypto';
import { aiScribeService, type ClinicalSessionContext } from '../scribe/ai-scribe-service';
import { AIProviderFactory } from '../ai/factory';
import { PromptBuilder } from '../ai/prompt-builder';

/**
 * Medical entity extracted from AWS Comprehend Medical
 */
export interface MedicalEntity {
  id: number;
  text: string;
  category: 'MEDICATION' | 'MEDICAL_CONDITION' | 'PROTECTED_HEALTH_INFORMATION' |
  'TEST_TREATMENT_PROCEDURE' | 'ANATOMY' | 'TIME_EXPRESSION';
  type: string;
  score: number;
  beginOffset: number;
  endOffset: number;
  attributes?: Array<{
    type: string;
    score: number;
    relationshipScore?: number;
    text: string;
  }>;
  traits?: Array<{
    name: string;
    score: number;
  }>;
}

/**
 * Structured SOAP sections
 */
export interface SOAPSections {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/**
 * SOAP generation result
 */
export interface SOAPGenerationResult {
  noteId: string;
  sections: SOAPSections;
  chiefComplaint: string;
  diagnosis: string[];
  medicalEntities: MedicalEntity[];
  confidence: number;
  status: 'draft' | 'pending_review';
  metadata: {
    generatedAt: string;
    transcriptLength: number;
    processingTime: number;
    modelUsed: string;
  };
}

/**
 * SOAP Generator Class
 */
export class SOAPGenerator {
  private static instance: SOAPGenerator;
  private comprehendMedical: ComprehendMedicalClient;

  private constructor() {
    // Initialize AWS Comprehend Medical client
    this.comprehendMedical = new ComprehendMedicalClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  public static getInstance(): SOAPGenerator {
    if (!SOAPGenerator.instance) {
      SOAPGenerator.instance = new SOAPGenerator();
    }
    return SOAPGenerator.instance;
  }

  /**
   * Generate SOAP note from clinical transcript
   */
  public async generateFromTranscription(
    transcription: string,
    context: ClinicalSessionContext,
    options: {
      patientId: string;
      authorId: string;
      appointmentId?: string;
      saveToDatabase?: boolean;
    }
  ): Promise<SOAPGenerationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Extract medical entities using AWS Comprehend Medical
      console.log('🔍 [SOAP Generator] Extracting medical entities...');
      const medicalEntities = await this.extractMedicalEntities(transcription);

      // Step 2: Auto-fill patient context using existing AI Scribe Service
      console.log('📋 [SOAP Generator] Auto-filling patient context...');
      const autoFillResult = await aiScribeService.autoFillPatientInfo(context, {
        includeVitals: true,
        includeHistory: true,
        includeLabResults: true,
      });

      // Step 3: Generate SOAP sections using AI Provider (BYOK aware)
      console.log('🤖 [SOAP Generator] Generating SOAP sections with AI...');
      const soapSections = await this.generateSOAPSections(
        transcription,
        context,
        medicalEntities,
        autoFillResult.filledFields,
        options.authorId
      );

      // Step 4: Extract chief complaint and diagnoses
      const chiefComplaint = this.extractChiefComplaint(transcription, medicalEntities);
      const diagnosis = this.extractDiagnoses(medicalEntities);

      // Step 5: Calculate confidence score
      const confidence = this.calculateConfidenceScore(soapSections, medicalEntities);

      // Step 6: Save to database if requested
      let noteId = '';
      if (options.saveToDatabase) {
        noteId = await this.saveToDatabaseAsDraft(
          soapSections,
          chiefComplaint,
          diagnosis,
          options.patientId,
          options.authorId
        );
      } else {
        noteId = `draft-${Date.now()}`;
      }

      const processingTime = Date.now() - startTime;

      console.log(`✅ [SOAP Generator] SOAP note generated successfully in ${processingTime}ms`);

      return {
        noteId,
        sections: soapSections,
        chiefComplaint,
        diagnosis,
        medicalEntities,
        confidence,
        status: confidence >= 0.7 ? 'pending_review' : 'draft',
        metadata: {
          generatedAt: new Date().toISOString(),
          transcriptLength: transcription.length,
          processingTime,
          modelUsed: 'ai-provider-factory', // Dynamic based on provider
        },
      };
    } catch (error) {
      console.error('❌ [SOAP Generator] Error generating SOAP note:', error);
      throw new Error(`Failed to generate SOAP note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract medical entities using AWS Comprehend Medical
   * Adapted from: aws-samples/medical-transcription-analysis
   */
  private async extractMedicalEntities(text: string): Promise<MedicalEntity[]> {
    try {
      // AWS Comprehend Medical has a 20,000 character limit per request
      // Split text into chunks if necessary
      const maxChunkSize = 20000;
      const chunks = this.splitTextIntoChunks(text, maxChunkSize);
      const allEntities: MedicalEntity[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const command = new DetectEntitiesV2Command({
          Text: chunks[i],
        });

        const response = await this.comprehendMedical.send(command);

        if (response.Entities) {
          const entitiesWithOffset = response.Entities.map((entity, idx) => ({
            id: allEntities.length + idx,
            text: entity.Text || '',
            category: entity.Category as MedicalEntity['category'],
            type: entity.Type || '',
            score: entity.Score || 0,
            beginOffset: (entity.BeginOffset || 0) + (i * maxChunkSize),
            endOffset: (entity.EndOffset || 0) + (i * maxChunkSize),
            attributes: entity.Attributes?.map(attr => ({
              type: attr.Type || '',
              score: attr.Score || 0,
              relationshipScore: attr.RelationshipScore,
              text: attr.Text || '',
            })),
            traits: entity.Traits?.map(trait => ({
              name: trait.Name || '',
              score: trait.Score || 0,
            })),
          }));

          allEntities.push(...entitiesWithOffset);
        }
      }

      console.log(`📊 [SOAP Generator] Extracted ${allEntities.length} medical entities`);
      return allEntities;
    } catch (error) {
      console.error('Error extracting medical entities:', error);
      // Return empty array on error - don't block SOAP generation
      return [];
    }
  }

  /**
   * Generate structured SOAP sections using AI Provider
   * Uses PromptBuilder for de-identification and AIProviderFactory for BYOK
   */
  private async generateSOAPSections(
    transcription: string,
    context: ClinicalSessionContext,
    medicalEntities: MedicalEntity[],
    autoFilledFields: any,
    userId: string
  ): Promise<SOAPSections> {
    // Build entity context for the AI
    const entitySummary = this.buildEntitySummary(medicalEntities);

    // Prepare context string for PromptBuilder
    const additionalContext = `
PATIENT CONTEXT:
${autoFilledFields.demographics}

CHIEF COMPLAINT:
${context.chiefComplaint || 'Not specified'}

${autoFilledFields.vitalSigns ? `VITAL SIGNS:\n${autoFilledFields.vitalSigns}\n` : ''}
${autoFilledFields.allergies ? `ALLERGIES:\n${autoFilledFields.allergies}\n` : ''}
${autoFilledFields.medications ? `CURRENT MEDICATIONS:\n${autoFilledFields.medications}\n` : ''}
${autoFilledFields.medicalHistory ? `MEDICAL HISTORY:\n${autoFilledFields.medicalHistory}\n` : ''}

EXTRACTED MEDICAL ENTITIES:
${entitySummary}
`;

    const instruction = `
Generate a complete, professional SOAP note with these four sections:

**SUBJECTIVE:**
Document patient's subjective experiences, symptoms, chief complaint, history of present illness (HPI), review of systems (ROS), and patient's own descriptions of their condition.

**OBJECTIVE:**
Document observable, measurable data including vital signs, physical examination findings, lab results, imaging results, and other clinical observations.

**ASSESSMENT:**
Provide clinical analysis, differential diagnoses, working diagnoses with ICD-10 codes if possible, assessment of patient's progress, and clinical reasoning.

**PLAN:**
Outline treatment plan including medications (with dosage), procedures, referrals, follow-up instructions, patient education, and preventive care.

IMPORTANT FORMATTING REQUIREMENTS:
- Use clear section headers: **SUBJECTIVE:**, **OBJECTIVE:**, **ASSESSMENT:**, **PLAN:**
- Be concise but comprehensive
- Use medical terminology appropriately
- Include specific details (dosages, measurements, timelines)
- Follow standard medical documentation practices
`;

    try {
      // 1. Build de-identified prompt
      const prompt = await PromptBuilder.buildClinicalPrompt(
        instruction,
        transcription,
        additionalContext
      );

      // 2. Get AI Provider (BYOK supported)
      const provider = await AIProviderFactory.getProvider(userId);

      // 3. Generate response
      const responseText = await provider.generateResponse(prompt);

      // 4. Parse the response into structured sections
      const sections = this.parseSOAPSections(responseText);
      return sections;
    } catch (error) {
      console.error('Error generating SOAP sections with AI:', error);
      throw new Error('Failed to generate SOAP sections');
    }
  }

  /**
   * Parse AI-generated text into structured SOAP sections
   */
  private parseSOAPSections(text: string): SOAPSections {
    // Extract each section using regex patterns
    const subjectiveMatch = text.match(/\*\*SUBJECTIVE:\*\*\s*([\s\S]*?)(?=\*\*OBJECTIVE:|$)/i);
    const objectiveMatch = text.match(/\*\*OBJECTIVE:\*\*\s*([\s\S]*?)(?=\*\*ASSESSMENT:|$)/i);
    const assessmentMatch = text.match(/\*\*ASSESSMENT:\*\*\s*([\s\S]*?)(?=\*\*PLAN:|$)/i);
    const planMatch = text.match(/\*\*PLAN:\*\*\s*([\s\S]*?)$/i);

    return {
      subjective: subjectiveMatch?.[1]?.trim() || '',
      objective: objectiveMatch?.[1]?.trim() || '',
      assessment: assessmentMatch?.[1]?.trim() || '',
      plan: planMatch?.[1]?.trim() || '',
    };
  }

  /**
   * Build summary of extracted medical entities for AI context
   */
  private buildEntitySummary(entities: MedicalEntity[]): string {
    const byCategory = entities.reduce((acc, entity) => {
      if (!acc[entity.category]) {
        acc[entity.category] = [];
      }
      acc[entity.category].push(entity.text);
      return acc;
    }, {} as Record<string, string[]>);

    const lines: string[] = [];

    if (byCategory.MEDICAL_CONDITION) {
      lines.push(`Conditions: ${[...new Set(byCategory.MEDICAL_CONDITION)].join(', ')}`);
    }
    if (byCategory.MEDICATION) {
      lines.push(`Medications: ${[...new Set(byCategory.MEDICATION)].join(', ')}`);
    }
    if (byCategory.TEST_TREATMENT_PROCEDURE) {
      lines.push(`Tests/Procedures: ${[...new Set(byCategory.TEST_TREATMENT_PROCEDURE)].join(', ')}`);
    }
    if (byCategory.ANATOMY) {
      lines.push(`Anatomical References: ${[...new Set(byCategory.ANATOMY)].join(', ')}`);
    }

    return lines.join('\n') || 'No medical entities detected';
  }

  /**
   * Extract chief complaint from transcript and entities
   */
  private extractChiefComplaint(transcription: string, entities: MedicalEntity[]): string {
    // Look for common patterns
    const patterns = [
      /chief complaint[:\s]+([^.]+)/i,
      /patient (?:complains of|presents with|reports)[:\s]+([^.]+)/i,
      /(?:c\/c|CC)[:\s]+([^.]+)/i,
    ];

    for (const pattern of patterns) {
      const match = transcription.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    // Fallback: Use first MEDICAL_CONDITION entity
    const firstCondition = entities.find(e => e.category === 'MEDICAL_CONDITION');
    return firstCondition?.text || 'Not specified';
  }

  /**
   * Extract diagnoses from medical entities
   */
  private extractDiagnoses(entities: MedicalEntity[]): string[] {
    const diagnoses = entities
      .filter(e => e.category === 'MEDICAL_CONDITION' && e.score >= 0.7)
      .filter(e => {
        // Filter out symptoms, focus on conditions/diagnoses
        const symptomTraits = e.traits?.some(t => t.name === 'SYMPTOM');
        return !symptomTraits;
      })
      .map(e => e.text);

    return [...new Set(diagnoses)]; // Remove duplicates
  }

  /**
   * Calculate confidence score for the generated SOAP note
   * Based on completeness and entity extraction quality
   */
  private calculateConfidenceScore(sections: SOAPSections, entities: MedicalEntity[]): number {
    let score = 0;
    let maxScore = 0;

    // Section completeness (40% weight)
    maxScore += 4;
    if (sections.subjective && sections.subjective.length > 50) score += 1;
    if (sections.objective && sections.objective.length > 50) score += 1;
    if (sections.assessment && sections.assessment.length > 50) score += 1;
    if (sections.plan && sections.plan.length > 50) score += 1;

    // Medical entities quality (30% weight)
    maxScore += 3;
    const avgEntityScore = entities.length > 0
      ? entities.reduce((sum, e) => sum + e.score, 0) / entities.length
      : 0;
    score += avgEntityScore * 3;

    // Entity diversity (15% weight)
    maxScore += 1.5;
    const categories = new Set(entities.map(e => e.category));
    score += (categories.size / 6) * 1.5; // 6 possible categories

    // Content length (15% weight)
    maxScore += 1.5;
    const totalLength = sections.subjective.length + sections.objective.length +
      sections.assessment.length + sections.plan.length;
    score += Math.min(totalLength / 1000, 1) * 1.5;

    return Math.round((score / maxScore) * 100) / 100;
  }

  /**
   * Save SOAP note to database as draft
   */
  private async saveToDatabaseAsDraft(
    sections: SOAPSections,
    chiefComplaint: string,
    diagnosis: string[],
    patientId: string,
    authorId: string
  ): Promise<string> {
    // Import Prisma client dynamically to avoid circular dependencies
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Generate note hash for blockchain tracking
      const noteContent = JSON.stringify({ ...sections, chiefComplaint, diagnosis });
      const noteHash = createHash('sha256').update(noteContent).digest('hex');

      // Create clinical note
      const note = await prisma.clinicalNote.create({
        data: {
          patientId,
          authorId,
          type: 'PROGRESS',
          subjective: sections.subjective,
          objective: sections.objective,
          assessment: sections.assessment,
          plan: sections.plan,
          chiefComplaint,
          diagnosis,
          noteHash,
          // Initial version
          versions: {
            create: {
              versionNumber: 1,
              changedBy: authorId,
              type: 'PROGRESS',
              subjective: sections.subjective,
              objective: sections.objective,
              assessment: sections.assessment,
              plan: sections.plan,
              chiefComplaint,
              diagnosis,
              noteHash,
              changedFields: ['initial_creation'],
              changesSummary: 'AI-generated SOAP note (draft)',
            },
          },
        },
      });

      console.log(`💾 [SOAP Generator] Saved draft note: ${note.id}`);
      return note.id;
    } catch (error) {
      console.error('Error saving note to database:', error);
      throw new Error('Failed to save note to database');
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Split text into chunks for AWS Comprehend Medical
   */
  private splitTextIntoChunks(text: string, maxSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences to avoid breaking mid-sentence
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxSize) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}

// Export singleton instance
export const soapGenerator = SOAPGenerator.getInstance();
