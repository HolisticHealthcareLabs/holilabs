/**
 * Scribe Session Finalization API
 *
 * POST /api/scribe/sessions/:id/finalize - Transcribe and generate SOAP note
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long transcriptions

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

      // STEP 1: Transcribe audio using OpenAI Whisper
      // NOTE: In production, you'd fetch the audio from storage and send to Whisper API
      // For now, we'll simulate transcription or expect it to be provided
      const body = await request.json();
      const { transcriptText, segments } = body;

      if (!transcriptText) {
        return NextResponse.json(
          { error: 'Transcript text is required (for MVP)' },
          { status: 400 }
        );
      }

      // Create transcription record
      const wordCount = transcriptText.split(/\s+/).length;
      const transcription = await prisma.transcription.create({
        data: {
          sessionId,
          rawText: transcriptText,
          segments: segments || [],
          speakerCount: 2,
          confidence: 0.92, // Default for MVP
          wordCount,
          durationSeconds: session.audioDuration,
          model: 'whisper-1',
          language: 'es',
        },
      });

      // STEP 2: Generate SOAP note using Claude
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
            id: transcription.id,
            wordCount: transcription.wordCount,
            confidence: transcription.confidence,
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
