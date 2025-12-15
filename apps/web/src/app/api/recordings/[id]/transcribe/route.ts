/**
 * Transcribe Recording API
 *
 * POST /api/recordings/[id]/transcribe
 * Transcribe audio using OpenAI Whisper and generate SOAP notes with GPT-4
 *
 * DATA STRUCTURES:
 *
 * Patient.allergies - Relation to Allergy model:
 * [
 *   {
 *     allergen: string,          // e.g., "Penicillin", "Peanuts"
 *     severity: AllergySeverity, // MILD, MODERATE, SEVERE, LIFE_THREATENING
 *     reactions: string[],       // e.g., ["Hives", "Anaphylaxis", "Rash"]
 *     allergyType: AllergyType   // MEDICATION, FOOD, ENVIRONMENTAL, etc.
 *   }
 * ]
 *
 * Patient.diagnoses - Relation to Diagnosis model (filtered by status: CHRONIC):
 * [
 *   {
 *     icd10Code: string,    // e.g., "E11.9"
 *     description: string,  // e.g., "Type 2 diabetes mellitus"
 *     diagnosedAt: DateTime // When diagnosis was made
 *   }
 * ]
 *
 * Transcription model structure:
 * {
 *   sessionId: string,        // Foreign key to ScribeSession
 *   rawText: string,          // Full transcript text
 *   segments: Json,           // Array of { speaker, text, startTime, endTime, confidence }
 *   speakerCount: number,     // Number of speakers (default 2: clinician + patient)
 *   confidence: number,       // 0-1 confidence score
 *   wordCount: number,        // Total words in transcript
 *   durationSeconds: number,  // Audio duration
 *   model: string,            // AI model used (e.g., "whisper-1")
 *   language: string          // Language code (e.g., "es")
 * }
 *
 * SOAPNote model structure:
 * {
 *   sessionId: string,           // Foreign key to ScribeSession
 *   patientId: string,           // Foreign key to Patient
 *   clinicianId: string,         // Foreign key to User (clinician)
 *   noteHash: string,            // SHA-256 hash for tamper detection
 *   subjective: string,          // Subjective section (patient's narrative)
 *   subjectiveConfidence: number, // AI confidence 0-1
 *   objective: string,           // Objective section (physical findings)
 *   objectiveConfidence: number,
 *   assessment: string,          // Assessment section (diagnosis)
 *   assessmentConfidence: number,
 *   plan: string,                // Plan section (treatment plan)
 *   planConfidence: number,
 *   chiefComplaint: string,      // Primary complaint/diagnosis
 *   diagnoses: Json,             // Array of { icd10Code, description, isPrimary }
 *   overallConfidence: number,   // Overall AI confidence 0-1
 *   status: SOAPStatus           // DRAFT, REVIEWED, FINALIZED
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import { z } from 'zod';

const TranscribeRequestSchema = z.object({
  audioUrl: z.string().url(),
  generateSOAP: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const recordingId = params.id;

    // Parse request body
    const body = await request.json();
    const validation = TranscribeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { audioUrl, generateSOAP } = validation.data;

    // Get recording session
    const recording = await prisma.scribeSession.findUnique({
      where: { id: recordingId },
      include: {
        appointment: {
          include: {
            clinician: true, // TODO: Fixed - clinician is already a User, no nested 'user' relation exists
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            allergies: {
              where: { isActive: true },
              select: {
                allergen: true,
                severity: true,
                reactions: true,
                allergyType: true,
              },
            },
            diagnoses: {
              where: { status: 'CHRONIC' },
              select: {
                icd10Code: true,
                description: true,
                diagnosedAt: true,
              },
            },
          },
        },
      },
    });

    if (!recording) {
      return NextResponse.json(
        { success: false, error: 'Grabación no encontrada' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (recording.appointment?.clinician?.id !== (session.user as any).id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para transcribir esta grabación' },
        { status: 403 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API no configurado. Contacta al administrador.',
        },
        { status: 503 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Update status to processing (transcribing)
    await prisma.scribeSession.update({
      where: { id: recordingId },
      data: { status: 'PROCESSING' }, // TODO: Changed from TRANSCRIBING to PROCESSING (valid enum value)
    });

    // Download audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio file');
    }

    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

    // Transcribe with Whisper
    logger.info({
      event: 'transcription_started',
      recordingId,
      audioDuration: recording.audioDuration,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const transcript = transcription.text;

    // Generate SOAP notes with GPT-4 if requested
    let soapNotes = null;
    let diagnosis = null;
    let icd10Codes: string[] = [];

    if (generateSOAP && transcript) {
      logger.info({
        event: 'soap_generation_started',
        recordingId,
      });

      // Build patient info with allergies and chronic conditions
      const allergiesText = recording.patient.allergies?.length
        ? `\nAlergias: ${recording.patient.allergies.map(a => `${a.allergen} (${a.severity}, ${a.reactions.join(', ')})`).join('; ')}`
        : '';

      const chronicConditionsText = recording.patient.diagnoses?.length
        ? `\nCondiciones Crónicas: ${recording.patient.diagnoses.map(d => `${d.description} (ICD-10: ${d.icd10Code})`).join('; ')}`
        : '';

      const patientInfo = `
Paciente: ${recording.patient.firstName} ${recording.patient.lastName}
Edad: ${new Date().getFullYear() - new Date(recording.patient.dateOfBirth).getFullYear()} años
Género: ${recording.patient.gender === 'M' ? 'Masculino' : recording.patient.gender === 'F' ? 'Femenino' : 'Otro'}${allergiesText}${chronicConditionsText}
`.trim();

      const soapPrompt = `Eres un médico experto. A partir de la siguiente transcripción de una consulta médica, genera notas clínicas estructuradas en formato SOAP (Subjetivo, Objetivo, Análisis, Plan).

${patientInfo}

TRANSCRIPCIÓN DE LA CONSULTA:
${transcript}

Por favor, genera:
1. SOAP notes estructuradas con las 4 secciones
2. Diagnóstico principal
3. Códigos ICD-10 sugeridos

Responde en formato JSON con esta estructura:
{
  "subjective": "Descripción de los síntomas reportados por el paciente",
  "objective": "Hallazgos de la exploración física y signos vitales",
  "assessment": "Evaluación médica y diagnóstico",
  "plan": "Plan de tratamiento y seguimiento",
  "diagnosis": "Diagnóstico principal",
  "icd10Codes": ["A00.0", "B01.2"]
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Eres un médico experto en documentación clínica. Generas notas SOAP precisas y profesionales.',
          },
          {
            role: 'user',
            content: soapPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const soapResponse = JSON.parse(completion.choices[0].message.content || '{}');

      soapNotes = {
        subjective: soapResponse.subjective || '',
        objective: soapResponse.objective || '',
        assessment: soapResponse.assessment || '',
        plan: soapResponse.plan || '',
      };

      diagnosis = soapResponse.diagnosis || null;
      icd10Codes = soapResponse.icd10Codes || [];
    }

    // Store transcript in Transcription model
    const transcriptionRecord = await prisma.transcription.upsert({
      where: { sessionId: recordingId },
      create: {
        sessionId: recordingId,
        rawText: transcript,
        segments: (transcription as any).segments || [],
        speakerCount: 2, // Default to 2 (clinician + patient)
        confidence: 0.95, // Whisper default confidence
        wordCount: transcript.split(/\s+/).length,
        durationSeconds: recording.audioDuration,
        model: 'whisper-1',
        language: 'es',
      },
      update: {
        rawText: transcript,
        segments: (transcription as any).segments || [],
        wordCount: transcript.split(/\s+/).length,
        confidence: 0.95,
      },
    });

    // Update recording status and audio URL
    const updatedRecording = await prisma.scribeSession.update({
      where: { id: recordingId },
      data: {
        status: 'COMPLETED',
        audioFileUrl: audioUrl,
        processingCompletedAt: new Date(),
      },
    });

    // Store SOAP notes if generated
    let soapNoteRecord: { id: string } | null = null;
    if (soapNotes && diagnosis) {
      const crypto = require('crypto');
      const noteHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ soapNotes, diagnosis, recordingId, timestamp: new Date().toISOString() }))
        .digest('hex');

      // Format diagnoses for storage
      const diagnosesJson = icd10Codes.map((code, idx) => ({
        icd10Code: code,
        description: idx === 0 ? diagnosis : '', // Primary diagnosis gets the description
        isPrimary: idx === 0,
      }));

      soapNoteRecord = await prisma.sOAPNote.upsert({
        where: { sessionId: recordingId },
        create: {
          sessionId: recordingId,
          patientId: recording.patientId,
          clinicianId: recording.clinicianId,
          noteHash,
          subjective: soapNotes.subjective,
          subjectiveConfidence: 0.85,
          objective: soapNotes.objective,
          objectiveConfidence: 0.85,
          assessment: soapNotes.assessment,
          assessmentConfidence: 0.85,
          plan: soapNotes.plan,
          planConfidence: 0.85,
          chiefComplaint: diagnosis.substring(0, 500),
          diagnoses: diagnosesJson,
          overallConfidence: 0.85,
          status: 'DRAFT', // Start as draft for clinician review
        },
        update: {
          subjective: soapNotes.subjective,
          objective: soapNotes.objective,
          assessment: soapNotes.assessment,
          plan: soapNotes.plan,
          chiefComplaint: diagnosis.substring(0, 500),
          diagnoses: diagnosesJson,
          wasEdited: true,
          editCount: { increment: 1 },
        },
      });

      logger.info({
        event: 'soap_note_created',
        recordingId,
        soapNoteId: soapNoteRecord.id,
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        userEmail: session.user.email || '',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'UPDATE',
        resource: 'RecordingSession',
        resourceId: recordingId,
        success: true,
        details: {
          transcriptionLength: transcript.length,
          transcriptionId: transcriptionRecord.id,
          soapGenerated: !!soapNotes,
          soapNoteId: soapNoteRecord?.id,
        },
      },
    });

    logger.info({
      event: 'transcription_completed',
      recordingId,
      transcriptLength: transcript.length,
      soapGenerated: !!soapNotes,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Transcripción completada',
        data: {
          recording: updatedRecording,
          transcription: transcriptionRecord,
          transcript, // Keep for backward compatibility
          soapNotes,
          soapNote: soapNoteRecord,
          diagnosis,
          icd10Codes,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'transcription_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update recording status to failed
    try {
      await prisma.scribeSession.update({
        where: { id: params.id },
        data: { status: 'FAILED' },
      });
    } catch (updateError) {
      // Ignore update errors
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al transcribir audio',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
