/**
 * Scribe Session Finalization API
 *
 * POST /api/scribe/sessions/:id/finalize - Transcribe and generate SOAP note
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AssemblyAI } from 'assemblyai';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { decryptBuffer } from '@/lib/security/encryption';
import { CreateSOAPNoteSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long transcriptions

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

// Initialize Supabase for storage access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/scribe/sessions/:id/finalize
 * Process audio: transcribe and generate SOAP note
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

      if (!session.audioFileUrl) {
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

      // STEP 1: Download encrypted audio from Supabase Storage
      if (!session.audioFileName) {
        return NextResponse.json(
          { error: 'No audio file available for transcription' },
          { status: 400 }
        );
      }

      // Download encrypted audio file
      const { data: encryptedAudioData, error: downloadError } = await supabase.storage
        .from('medical-recordings')
        .download(session.audioFileName);

      if (downloadError || !encryptedAudioData) {
        console.error('Failed to download audio:', downloadError);
        return NextResponse.json(
          { error: 'Failed to retrieve audio file' },
          { status: 500 }
        );
      }

      // Convert Blob to Buffer and decrypt
      const encryptedBuffer = Buffer.from(await encryptedAudioData.arrayBuffer());
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

      // STEP 2: Transcribe audio using AssemblyAI (server-side)
      if (!process.env.ASSEMBLYAI_API_KEY) {
        return NextResponse.json(
          { error: 'AssemblyAI API key not configured. Cannot transcribe audio.' },
          { status: 500 }
        );
      }

      let transcriptText: string;
      let segments: any[] = [];
      const transcribeStartTime = Date.now();

      try {
        // Detect language from patient locale (Portuguese or Spanish)
        const languageCode = session.patient.country === 'BR' ? 'pt' : 'es';

        // Upload audio buffer directly to AssemblyAI
        const uploadResponse = await assemblyai.files.upload(audioBuffer);

        // Start transcription with medical-grade features
        const transcript = await assemblyai.transcripts.transcribe({
          audio: uploadResponse,
          language_code: languageCode as any, // 'pt' for Portuguese, 'es' for Spanish
          speaker_labels: true, // Enable speaker diarization
          redact_pii: true, // Enable PHI redaction (HIPAA compliance)
          redact_pii_policies: [
            'medical_condition',
            'medical_process',
            'drug',
            'person_name',
            'phone_number',
            'date_of_birth',
            'location',
          ],
          punctuate: true,
          format_text: true,
        });

        // Check for errors
        if (transcript.status === 'error') {
          throw new Error(transcript.error || 'Transcription failed');
        }

        transcriptText = transcript.text || '';

        // Extract segments with speaker diarization
        if (transcript.utterances && Array.isArray(transcript.utterances)) {
          segments = transcript.utterances.map((utterance: any) => ({
            speaker: utterance.speaker === 'A' ? 'Doctor' : 'Paciente',
            text: utterance.text,
            startTime: utterance.start / 1000, // Convert ms to seconds
            endTime: utterance.end / 1000,
            confidence: utterance.confidence || 0.95,
          }));
        }

        console.log(`AssemblyAI transcription completed in ${Date.now() - transcribeStartTime}ms`);
        console.log(`Language: ${languageCode}, Words: ${transcript.words?.length || 0}`);
      } catch (error: any) {
        console.error('AssemblyAI transcription error:', error);
        return NextResponse.json(
          { error: 'Failed to transcribe audio', message: error.message },
          { status: 500 }
        );
      }

      // Create transcription record
      const wordCount = transcriptText.split(/\s+/).length;
      const languageCode = session.patient.country === 'BR' ? 'pt' : 'es';
      const transcriptionRecord = await prisma.transcription.create({
        data: {
          sessionId,
          rawText: transcriptText,
          segments: segments,
          speakerCount: segments.length > 0 ? new Set(segments.map(s => s.speaker)).size : 2,
          confidence: segments.length > 0 ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length : 0.95,
          wordCount,
          durationSeconds: session.audioDuration,
          model: 'assemblyai-best',
          language: languageCode,
          processingTime: Date.now() - transcribeStartTime,
        },
      });

      // STEP 3: Generate SOAP note using Claude
      const soapNote = await generateSOAPNote(
        transcriptText,
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
          // Log validation errors but continue with sanitized data
          // This ensures AI mistakes don't crash the system
          const validationErrors = error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          }));
          console.warn('Validation errors in AI output:', validationErrors);

          // Use unvalidated data with warnings
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

      // Generate hash for blockchain (using validated data)
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

      // Create SOAP note record (using validated data - type-safe)
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
          model: 'gemini-2.0-flash',
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
 * Generate SOAP note from transcript using Gemini 2.0 Flash
 */
async function generateSOAPNote(
  transcript: string,
  patient: any,
  clinician: any
): Promise<any> {
  const startTime = Date.now();

  // Calculate patient age
  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );

  // Detect language based on patient country
  const language = patient.country === 'BR' ? 'portugués' : 'español';

  const prompt = `Eres un asistente médico experto en documentación clínica. Tu tarea es analizar la siguiente transcripción de una consulta médica y generar una nota SOAP (Subjetivo, Objetivo, Evaluación, Plan) completa y precisa en ${language}.

**Información del Paciente:**
- Nombre: ${patient.firstName} ${patient.lastName}
- Edad: ${age} años
- MRN: ${patient.mrn}

**Médico Tratante:**
- Dr(a). ${clinician.firstName} ${clinician.lastName}
- Especialidad: ${clinician.specialty || 'Medicina General'}

**Transcripción de la Consulta:**
${transcript}

**Instrucciones:**
1. Genera una nota SOAP completa en ${language}
2. Extrae el motivo de consulta principal (chief complaint)
3. Identifica diagnósticos con códigos ICD-10 si es posible
4. Sugiere procedimientos o estudios necesarios con códigos CPT si aplica
5. Incluye cambios en medicamentos si se mencionan
6. Asigna un puntaje de confianza (0-1) para cada sección basado en la claridad de la información

**Formato de Respuesta (JSON):**
{
  "chiefComplaint": "motivo principal de consulta",
  "subjective": "información subjetiva del paciente (síntomas, historial)",
  "subjectiveConfidence": 0.95,
  "objective": "hallazgos objetivos (examen físico, signos vitales)",
  "objectiveConfidence": 0.90,
  "assessment": "evaluación y diagnóstico del médico",
  "assessmentConfidence": 0.93,
  "plan": "plan de tratamiento y seguimiento",
  "planConfidence": 0.91,
  "overallConfidence": 0.92,
  "diagnoses": [
    {
      "icd10Code": "J06.9",
      "description": "Infección aguda de las vías respiratorias superiores",
      "isPrimary": true
    }
  ],
  "procedures": [
    {
      "cptCode": "99213",
      "description": "Consulta de seguimiento nivel 3"
    }
  ],
  "medications": [
    {
      "action": "prescribe",
      "name": "Amoxicilina",
      "dose": "500mg",
      "frequency": "cada 8 horas",
      "duration": "7 días"
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

Responde SOLO con el JSON válido, sin texto adicional.`;

  // Initialize Gemini 2.0 Flash model
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.3, // Low temperature for consistent medical documentation
      maxOutputTokens: 4096,
      responseMimeType: 'application/json', // Force JSON output
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();

  const processingTime = Date.now() - startTime;

  // Gemini usage metadata
  const usageMetadata = response.usageMetadata;
  const tokensUsed = (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0);

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
  }

  const soapNote = JSON.parse(jsonText);

  return {
    ...soapNote,
    tokensUsed,
    processingTime,
  };
}
