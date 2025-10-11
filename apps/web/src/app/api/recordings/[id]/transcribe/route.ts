/**
 * Transcribe Recording API
 *
 * POST /api/recordings/[id]/transcribe
 * Transcribe audio using OpenAI Whisper and generate SOAP notes with GPT-4
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
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
    const recording = await prisma.recordingSession.findUnique({
      where: { id: recordingId },
      include: {
        appointment: {
          include: {
            clinician: {
              include: { user: true },
            },
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            allergies: true,
            chronicConditions: true,
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
    if (recording.appointment.clinician.user.id !== session.user.id) {
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

    // Update status to transcribing
    await prisma.recordingSession.update({
      where: { id: recordingId },
      data: { status: 'TRANSCRIBING' },
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

      const patientInfo = `
Paciente: ${recording.patient.firstName} ${recording.patient.lastName}
Edad: ${new Date().getFullYear() - new Date(recording.patient.dateOfBirth).getFullYear()} años
Género: ${recording.patient.gender === 'M' ? 'Masculino' : recording.patient.gender === 'F' ? 'Femenino' : 'Otro'}
Alergias: ${recording.patient.allergies?.join(', ') || 'Ninguna'}
Condiciones crónicas: ${recording.patient.chronicConditions?.join(', ') || 'Ninguna'}
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

    // Update recording with transcript and AI-generated data
    const updatedRecording = await prisma.recordingSession.update({
      where: { id: recordingId },
      data: {
        status: 'COMPLETED',
        audioUrl,
        transcript,
        aiGeneratedNotes: soapNotes ? JSON.stringify(soapNotes) : null,
      },
    });

    // Auto-create clinical note if SOAP was generated
    let clinicalNote = null;
    if (soapNotes && diagnosis) {
      clinicalNote = await prisma.clinicalNote.create({
        data: {
          patientId: recording.patientId,
          clinicianId: recording.appointment.clinicianId,
          appointmentId: recording.appointmentId,
          noteType: 'FOLLOW_UP',
          chiefComplaint: diagnosis.substring(0, 200),
          subjective: soapNotes.subjective,
          objective: soapNotes.objective,
          assessment: soapNotes.assessment,
          plan: soapNotes.plan,
          diagnoses: icd10Codes,
          status: 'DRAFT',
          source: 'AI_GENERATED',
        },
      });

      logger.info({
        event: 'clinical_note_auto_created',
        recordingId,
        clinicalNoteId: clinicalNote.id,
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || '',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'UPDATE',
        resource: 'RecordingSession',
        resourceId: recordingId,
        success: true,
        metadata: {
          transcriptionLength: transcript.length,
          soapGenerated: !!soapNotes,
          clinicalNoteCreated: !!clinicalNote,
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
          transcript,
          soapNotes,
          diagnosis,
          icd10Codes,
          clinicalNote: clinicalNote ? { id: clinicalNote.id } : null,
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
      await prisma.recordingSession.update({
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
