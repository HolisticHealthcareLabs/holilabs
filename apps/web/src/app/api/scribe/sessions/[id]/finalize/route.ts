/**
 * Scribe Session Finalization API
 *
 * POST /api/scribe/sessions/:id/finalize - Transcribe and generate SOAP note
 * Uses Deepgram for transcription and Claude for SOAP generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { decryptBuffer } from '@/lib/security/encryption';
import { CreateSOAPNoteSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import { transcribeAudioWithDeepgram } from '@/lib/transcription/deepgram';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import Anthropic from '@anthropic-ai/sdk';
import { anonymizePatientData } from '@/lib/presidio';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long transcriptions

// Storage configuration (lazy-loaded)
function getStorageConfig() {
  return {
    endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
    region: process.env.R2_REGION || process.env.AWS_REGION || 'auto',
    bucket: process.env.R2_BUCKET || process.env.S3_BUCKET || 'holi-labs-audio',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  };
}

// Initialize S3 client (lazy-loaded)
function getS3Client(): S3Client {
  const config = getStorageConfig();

  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error('S3/R2 credentials not configured');
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

// Initialize Claude client (lazy-loaded)
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * POST /api/scribe/sessions/:id/finalize
 * Process audio: download, decrypt, transcribe, and generate SOAP note
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const sessionId = context.params.id;

      // Verify session belongs to this clinician
      const session = await prisma.scribeSession.findFirst({
        where: {
          id: sessionId,
          clinicianId: context.user.id,
        },
        include: {
          patient: true,
          clinician: {
            select: {
              firstName: true,
              lastName: true,
              specialty: true,
            },
          },
        },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      if (!session.audioFileUrl || !session.audioFileName) {
        return NextResponse.json(
          { error: 'No audio file uploaded for this session' },
          { status: 400 }
        );
      }

      if (session.status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'Session already finalized' },
          { status: 400 }
        );
      }

      // STEP 1: Download encrypted audio from S3/R2
      const s3Client = getS3Client();
      const config = getStorageConfig();

      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: session.audioFileName,
        })
      );

      if (!response.Body) {
        return NextResponse.json(
          { error: 'Failed to retrieve audio file from storage' },
          { status: 500 }
        );
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const encryptedBuffer = Buffer.concat(chunks);

      // Decrypt audio file
      let audioBuffer: Buffer;
      try {
        audioBuffer = decryptBuffer(encryptedBuffer);
      } catch (error: any) {
        console.error('Failed to decrypt audio:', error);
        return NextResponse.json(
          { error: 'Failed to decrypt audio file' },
          { status: 500 }
        );
      }

      // STEP 2: Transcribe audio using Deepgram
      if (!process.env.DEEPGRAM_API_KEY) {
        return NextResponse.json(
          { error: 'Deepgram API key not configured. Cannot transcribe audio.' },
          { status: 500 }
        );
      }

      let transcriptText: string;
      let segments: any[] = [];
      let transcriptionResult: any;
      const transcribeStartTime = Date.now();

      try {
        // Detect language from patient locale (Portuguese or Spanish)
        const languageCode = session.patient.country === 'BR' ? 'pt' :
                             session.patient.country === 'ES' ? 'es' :
                             session.patient.country === 'MX' ? 'es' : 'pt';

        // Transcribe with Deepgram Nova-2 model
        transcriptionResult = await transcribeAudioWithDeepgram(audioBuffer, languageCode);

        transcriptText = transcriptionResult.text;
        segments = transcriptionResult.segments;

        console.log(`✅ Deepgram transcription completed in ${transcriptionResult.processingTimeMs}ms`);
        console.log(`   Confidence: ${(transcriptionResult.confidence * 100).toFixed(1)}%, Speakers: ${transcriptionResult.speakerCount}`);
      } catch (error: any) {
        console.error('❌ Deepgram transcription error:', error);

        // Update session with error
        await prisma.scribeSession.update({
          where: { id: sessionId },
          data: {
            status: 'FAILED',
            processingError: `Transcription failed: ${error.message}`,
          },
        });

        return NextResponse.json(
          { error: 'Failed to transcribe audio', message: error.message },
          { status: 500 }
        );
      }

      // STEP 2.5: De-identify transcript with Presidio BEFORE persisting or sending to any LLM
      const anonymizeStartTime = Date.now();
      const deidentifiedTranscript = await anonymizePatientData(transcriptText);
      const anonymizeDurationMs = Date.now() - anonymizeStartTime;
      console.log(`🛡️ Presidio anonymization completed in ${anonymizeDurationMs}ms`);

      // Fail closed in production if Presidio is unavailable (avoid storing raw transcript)
      if (process.env.NODE_ENV === 'production' && deidentifiedTranscript === transcriptText) {
        throw new Error('Presidio unavailable: refusing to persist or process raw transcript');
      }

      // Remove text from diarized segments (keep timing + speaker metadata only)
      const safeSegments = (segments || []).map((s: any) => ({
        speaker: s.speaker,
        startTime: s.startTime,
        endTime: s.endTime,
        confidence: s.confidence,
        text: '',
      }));

      // Create transcription record
      const wordCount = deidentifiedTranscript.split(/\s+/).length;
      const transcriptionRecord = await prisma.transcription.create({
        data: {
          sessionId,
          rawText: deidentifiedTranscript,
          segments: safeSegments,
          speakerCount: transcriptionResult.speakerCount,
          confidence: transcriptionResult.confidence,
          wordCount,
          durationSeconds: transcriptionResult.durationSeconds,
          model: 'deepgram-nova-2',
          language: transcriptionResult.language,
          processingTime: transcriptionResult.processingTimeMs,
        },
      });

      // Track transcription event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.SCRIBE_TRANSCRIPTION_GENERATED,
        context.user.id,
        {
          wordCount,
          durationSeconds: transcriptionResult.durationSeconds,
          confidence: transcriptionResult.confidence,
          speakerCount: transcriptionResult.speakerCount,
          language: transcriptionResult.language,
          model: 'deepgram-nova-2',
          processingTimeMs: transcriptionResult.processingTimeMs,
          success: true
        }
      );

      // STEP 3: Generate SOAP note using Claude Sonnet
      const soapNote = await generateSOAPNote(
        deidentifiedTranscript,
        session.patient,
        session.clinician
      );

      // STEP 4: Validate AI-generated SOAP note with medical-grade schema
      let validatedSOAPData;
      try {
        validatedSOAPData = CreateSOAPNoteSchema.parse({
          sessionId,
          patientId: session.patientId,
          clinicianId: session.clinicianId,
          chiefComplaint: soapNote.chiefComplaint || 'N/A',
          subjective: soapNote.subjective,
          objective: soapNote.objective,
          assessment: soapNote.assessment,
          plan: soapNote.plan,
          vitalSigns: soapNote.vitalSigns || {},
          diagnoses: soapNote.diagnoses || [],
          procedures: soapNote.procedures || [],
          medications: soapNote.medications || [],
          subjectiveConfidence: soapNote.subjectiveConfidence,
          objectiveConfidence: soapNote.objectiveConfidence,
          assessmentConfidence: soapNote.assessmentConfidence,
          planConfidence: soapNote.planConfidence,
          overallConfidence: soapNote.overallConfidence,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('AI-generated SOAP note validation failed:', error.errors);

          // Use unvalidated data with warnings (don't crash on AI mistakes)
          validatedSOAPData = {
            sessionId,
            patientId: session.patientId,
            clinicianId: session.clinicianId,
            chiefComplaint: soapNote.chiefComplaint || 'N/A',
            subjective: soapNote.subjective || '',
            objective: soapNote.objective || '',
            assessment: soapNote.assessment || '',
            plan: soapNote.plan || '',
            vitalSigns: {},
            diagnoses: [],
            procedures: [],
            medications: [],
            subjectiveConfidence: soapNote.subjectiveConfidence || 0.5,
            objectiveConfidence: soapNote.objectiveConfidence || 0.5,
            assessmentConfidence: soapNote.assessmentConfidence || 0.5,
            planConfidence: soapNote.planConfidence || 0.5,
            overallConfidence: soapNote.overallConfidence || 0.5,
          };
        } else {
          throw error;
        }
      }

      // Generate hash for blockchain integrity verification
      const noteContent = JSON.stringify({
        patientId: validatedSOAPData.patientId,
        clinicianId: validatedSOAPData.clinicianId,
        subjective: validatedSOAPData.subjective,
        objective: validatedSOAPData.objective,
        assessment: validatedSOAPData.assessment,
        plan: validatedSOAPData.plan,
        createdAt: new Date().toISOString(),
      });
      const noteHash = createHash('sha256').update(noteContent).digest('hex');

      // Create SOAP note record
      const soapNoteRecord = await prisma.sOAPNote.create({
        data: {
          sessionId,
          patientId: validatedSOAPData.patientId,
          clinicianId: validatedSOAPData.clinicianId,
          noteHash,
          subjective: validatedSOAPData.subjective,
          subjectiveConfidence: validatedSOAPData.subjectiveConfidence,
          objective: validatedSOAPData.objective,
          objectiveConfidence: validatedSOAPData.objectiveConfidence,
          assessment: validatedSOAPData.assessment,
          assessmentConfidence: validatedSOAPData.assessmentConfidence,
          plan: validatedSOAPData.plan,
          planConfidence: validatedSOAPData.planConfidence,
          chiefComplaint: validatedSOAPData.chiefComplaint,
          vitalSigns: validatedSOAPData.vitalSigns,
          diagnoses: validatedSOAPData.diagnoses,
          procedures: validatedSOAPData.procedures,
          medications: validatedSOAPData.medications,
          overallConfidence: validatedSOAPData.overallConfidence,
          model: 'claude-sonnet-4.5',
          tokensUsed: soapNote.tokensUsed,
          processingTime: soapNote.processingTime,
          status: 'DRAFT',
        },
      });

      // Update session status
      await prisma.scribeSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          processingCompletedAt: new Date(),
        },
      });

      // Track SOAP generation event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.SCRIBE_SOAP_GENERATED,
        context.user.id,
        {
          overallConfidence: soapNoteRecord.overallConfidence,
          hasDiagnoses: (validatedSOAPData.diagnoses?.length || 0) > 0,
          hasProcedures: (validatedSOAPData.procedures?.length || 0) > 0,
          hasMedications: (validatedSOAPData.medications?.length || 0) > 0,
          model: 'claude-sonnet-4.5',
          tokensUsed: soapNote.tokensUsed,
          processingTimeMs: soapNote.processingTime,
          success: true
        }
      );

      // Track session completed event
      await trackEvent(
        ServerAnalyticsEvents.SCRIBE_SESSION_COMPLETED,
        context.user.id,
        { success: true }
      );

      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          transcription: {
            id: transcriptionRecord.id,
            wordCount: transcriptionRecord.wordCount,
            confidence: transcriptionRecord.confidence,
          },
          soapNote: {
            id: soapNoteRecord.id,
            status: soapNoteRecord.status,
            overallConfidence: soapNoteRecord.overallConfidence,
          },
        },
      });
    } catch (error: any) {
      console.error('Error finalizing session:', error);

      // Update session with error
      try {
        await prisma.scribeSession.update({
          where: { id: context.params.id },
          data: {
            status: 'FAILED',
            processingError: error.message,
          },
        });
      } catch (updateError) {
        console.error('Failed to update session error:', updateError);
      }

      return NextResponse.json(
        { error: 'Failed to finalize session', message: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * Generate SOAP note from transcript using Claude Sonnet 4.5
 */
async function generateSOAPNote(
  transcript: string,
  patient: any,
  clinician: any
): Promise<any> {
  const startTime = Date.now();

  // Calculate patient age band (avoid using direct identifiers in prompts)
  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  const ageBand =
    age < 18 ? '<18' :
    age < 30 ? '18-29' :
    age < 40 ? '30-39' :
    age < 50 ? '40-49' :
    age < 60 ? '50-59' :
    age < 70 ? '60-69' :
    age < 80 ? '70-79' : '80+';

  // Detect language based on patient country
  const language = patient.country === 'BR' ? 'português' : 'español';
  const languageInstruction = patient.country === 'BR'
    ? 'em português do Brasil'
    : 'en español';

  const prompt = `Você é um assistente médico especializado em documentação clínica. Analise a transcrição da consulta médica abaixo e gere uma nota SOAP (Subjetivo, Objetivo, Avaliação, Plano) completa e precisa ${languageInstruction}.

⚠️ PRIVACIDADE: A transcrição já foi desidentificada via Microsoft Presidio e pode conter tokens (ex.: [PATIENT_ALPHA], [DATE_T-minus-1]). Trate tokens como entidades estáveis e imutáveis. NÃO tente reidentificar.

**Informações do Paciente:**
- Identificador: [PATIENT_ALPHA]
- Faixa etária: ${ageBand}

**Profissional Responsável:**
- Identificador: [CLINICIAN_OMEGA]
- Especialidade: ${clinician.specialty || 'Medicina Geral'}

**Transcrição da Consulta:**
${transcript}

**Instruções:**
1. Gere uma nota SOAP completa ${languageInstruction}
2. Extraia o motivo de consulta principal (chief complaint)
3. Identifique diagnósticos com códigos ICD-10 quando possível
4. Sugira procedimentos ou exames necessários com códigos CPT quando aplicável
5. Inclua alterações em medicamentos se mencionadas
6. Atribua um score de confiança (0-1) para cada seção baseado na claridade da informação

**Formato de Resposta (JSON estrito):**
{
  "chiefComplaint": "motivo principal da consulta",
  "subjective": "informação subjetiva do paciente (sintomas, histórico)",
  "subjectiveConfidence": 0.95,
  "objective": "achados objetivos (exame físico, sinais vitais)",
  "objectiveConfidence": 0.90,
  "assessment": "avaliação e diagnóstico do médico",
  "assessmentConfidence": 0.93,
  "plan": "plano de tratamento e acompanhamento",
  "planConfidence": 0.91,
  "overallConfidence": 0.92,
  "diagnoses": [
    {
      "icd10Code": "J06.9",
      "description": "Infecção aguda das vias aéreas superiores",
      "isPrimary": true
    }
  ],
  "procedures": [
    {
      "cptCode": "99213",
      "description": "Consulta de acompanhamento nível 3"
    }
  ],
  "medications": [
    {
      "action": "prescribe",
      "name": "Amoxicilina",
      "dose": "500mg",
      "frequency": "a cada 8 horas",
      "duration": "7 dias"
    }
  ],
  "vitalSigns": {
    "bp": "120/80",
    "hr": "72",
    "temp": "36.5",
    "rr": "16",
    "spo2": "98",
    "weight": "70"
  }
}

Responda APENAS com o JSON válido, sem texto adicional antes ou depois.`;

  // Initialize Claude client
  const anthropic = getAnthropicClient();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    temperature: 0.3, // Low temperature for consistent medical documentation
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const processingTime = Date.now() - startTime;

  // Extract text from Claude response
  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
  }

  const soapNote = JSON.parse(jsonText);

  // Calculate token usage
  const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

  return {
    ...soapNote,
    tokensUsed,
    processingTime,
  };
}
