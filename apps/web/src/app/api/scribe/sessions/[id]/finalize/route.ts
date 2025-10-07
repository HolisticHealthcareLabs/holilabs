/**
 * Scribe Session Finalization API
 *
 * POST /api/scribe/sessions/:id/finalize - Transcribe and generate SOAP note
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { decryptBuffer } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long transcriptions

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

      // STEP 2: Transcribe audio using OpenAI Whisper (server-side)
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured. Cannot transcribe audio.' },
          { status: 500 }
        );
      }

      let transcriptText: string;
      let segments: any[] = [];
      const transcribeStartTime = Date.now();

      try {
        // Create a File object from buffer (convert Buffer to Uint8Array for web compatibility)
        const audioArray = new Uint8Array(audioBuffer);
        const audioFile = new File(
          [audioArray],
          `audio.${session.audioFormat || 'webm'}`,
          { type: `audio/${session.audioFormat || 'webm'}` }
        );

        // Transcribe with Whisper
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: 'es', // Spanish
          response_format: 'verbose_json', // Get detailed output
          timestamp_granularities: ['segment'],
        });

        transcriptText = transcription.text;

        // Extract segments for speaker diarization (basic)
        if (transcription.segments && Array.isArray(transcription.segments)) {
          segments = transcription.segments.map((seg: any, idx: number) => ({
            speaker: idx % 2 === 0 ? 'Doctor' : 'Paciente', // Simple alternating
            text: seg.text,
            startTime: seg.start,
            endTime: seg.end,
            confidence: 0.9, // Whisper doesn't provide per-segment confidence
          }));
        }

        console.log(`Transcription completed in ${Date.now() - transcribeStartTime}ms`);
      } catch (error: any) {
        console.error('Whisper transcription error:', error);
        return NextResponse.json(
          { error: 'Failed to transcribe audio', message: error.message },
          { status: 500 }
        );
      }

      // Create transcription record
      const wordCount = transcriptText.split(/\s+/).length;
      const transcriptionRecord = await prisma.transcription.create({
        data: {
          sessionId,
          rawText: transcriptText,
          segments: segments,
          speakerCount: 2,
          confidence: 0.92,
          wordCount,
          durationSeconds: session.audioDuration,
          model: 'whisper-1',
          language: 'es',
          processingTime: Date.now() - transcribeStartTime,
        },
      });

      // STEP 3: Generate SOAP note using Claude
      const soapNote = await generateSOAPNote(
        transcriptText,
        session.patient,
        session.clinician
      );

      // Generate hash for blockchain
      const noteContent = JSON.stringify({
        patientId: session.patientId,
        clinicianId: session.clinicianId,
        subjective: soapNote.subjective,
        objective: soapNote.objective,
        assessment: soapNote.assessment,
        plan: soapNote.plan,
        createdAt: new Date().toISOString(),
      });
      const noteHash = createHash('sha256').update(noteContent).digest('hex');

      // Create SOAP note record
      const soapNoteRecord = await prisma.sOAPNote.create({
        data: {
          sessionId,
          patientId: session.patientId,
          clinicianId: session.clinicianId,
          noteHash,
          subjective: soapNote.subjective,
          subjectiveConfidence: soapNote.subjectiveConfidence,
          objective: soapNote.objective,
          objectiveConfidence: soapNote.objectiveConfidence,
          assessment: soapNote.assessment,
          assessmentConfidence: soapNote.assessmentConfidence,
          plan: soapNote.plan,
          planConfidence: soapNote.planConfidence,
          chiefComplaint: soapNote.chiefComplaint,
          vitalSigns: soapNote.vitalSigns || {},
          diagnoses: soapNote.diagnoses || [],
          procedures: soapNote.procedures || [],
          medications: soapNote.medications || [],
          overallConfidence: soapNote.overallConfidence,
          model: 'claude-3-5-sonnet-20250219',
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
 * Generate SOAP note from transcript using Claude
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

  const prompt = `Eres un asistente médico experto en documentación clínica. Tu tarea es analizar la siguiente transcripción de una consulta médica y generar una nota SOAP (Subjetivo, Objetivo, Evaluación, Plan) completa y precisa.

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
1. Genera una nota SOAP completa en español
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

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
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
  const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

  // Parse JSON response
  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

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
