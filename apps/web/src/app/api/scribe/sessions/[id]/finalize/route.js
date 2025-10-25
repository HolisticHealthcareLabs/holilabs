"use strict";
/**
 * Scribe Session Finalization API
 *
 * POST /api/scribe/sessions/:id/finalize - Transcribe and generate SOAP note
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.maxDuration = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
const generative_ai_1 = require("@google/generative-ai");
const crypto_1 = require("crypto");
const supabase_js_1 = require("@supabase/supabase-js");
const encryption_1 = require("@/lib/security/encryption");
const schemas_1 = require("@/lib/validation/schemas");
const zod_1 = require("zod");
const deepgram_1 = require("@/lib/transcription/deepgram");
exports.dynamic = 'force-dynamic';
exports.maxDuration = 300; // 5 minutes for long transcriptions
// Initialize AI clients (lazy-loaded to avoid build-time errors)
function getGenAI() {
    if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error('GOOGLE_AI_API_KEY is not configured');
    }
    return new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}
// Initialize Supabase for storage access (lazy-loaded)
function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    return (0, supabase_js_1.createClient)(url, key);
}
/**
 * POST /api/scribe/sessions/:id/finalize
 * Process audio: transcribe and generate SOAP note
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const sessionId = context.params.id;
        // Verify session belongs to this clinician
        const session = await prisma_1.prisma.scribeSession.findFirst({
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
            return server_1.NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
        }
        if (!session.audioFileUrl) {
            return server_1.NextResponse.json({ error: 'No audio file uploaded for this session' }, { status: 400 });
        }
        if (session.status === 'COMPLETED') {
            return server_1.NextResponse.json({ error: 'Session already finalized' }, { status: 400 });
        }
        // STEP 1: Download encrypted audio from Supabase Storage
        if (!session.audioFileName) {
            return server_1.NextResponse.json({ error: 'No audio file available for transcription' }, { status: 400 });
        }
        // Download encrypted audio file
        const supabase = getSupabaseClient();
        const { data: encryptedAudioData, error: downloadError } = await supabase.storage
            .from('medical-recordings')
            .download(session.audioFileName);
        if (downloadError || !encryptedAudioData) {
            console.error('Failed to download audio:', downloadError);
            return server_1.NextResponse.json({ error: 'Failed to retrieve audio file' }, { status: 500 });
        }
        // Convert Blob to Buffer and decrypt
        const encryptedBuffer = Buffer.from(await encryptedAudioData.arrayBuffer());
        let audioBuffer;
        try {
            audioBuffer = (0, encryption_1.decryptBuffer)(encryptedBuffer);
        }
        catch (error) {
            console.error('Failed to decrypt audio:', error);
            return server_1.NextResponse.json({ error: 'Failed to decrypt audio file' }, { status: 500 });
        }
        // STEP 2: Transcribe audio using Deepgram (74% cheaper than AssemblyAI)
        if (!process.env.DEEPGRAM_API_KEY) {
            return server_1.NextResponse.json({ error: 'Deepgram API key not configured. Cannot transcribe audio.' }, { status: 500 });
        }
        let transcriptText;
        let segments = [];
        let transcriptionResult;
        const transcribeStartTime = Date.now();
        try {
            // Detect language from patient locale (Portuguese or Spanish)
            const languageCode = session.patient.country === 'BR' ? 'pt' : 'es';
            // Transcribe with Deepgram
            transcriptionResult = await (0, deepgram_1.transcribeAudioWithDeepgram)(audioBuffer, languageCode);
            transcriptText = transcriptionResult.text;
            segments = transcriptionResult.segments;
            console.log(`✅ Deepgram transcription completed in ${transcriptionResult.processingTimeMs}ms`);
            console.log(`   Confidence: ${(transcriptionResult.confidence * 100).toFixed(1)}%, Speakers: ${transcriptionResult.speakerCount}`);
        }
        catch (error) {
            console.error('❌ Deepgram transcription error:', error);
            return server_1.NextResponse.json({ error: 'Failed to transcribe audio', message: error.message }, { status: 500 });
        }
        // Create transcription record
        const wordCount = transcriptText.split(/\s+/).length;
        const transcriptionRecord = await prisma_1.prisma.transcription.create({
            data: {
                sessionId,
                rawText: transcriptText,
                segments: segments,
                speakerCount: transcriptionResult.speakerCount,
                confidence: transcriptionResult.confidence,
                wordCount,
                durationSeconds: transcriptionResult.durationSeconds,
                model: 'deepgram-nova-2',
                language: transcriptionResult.language,
                processingTime: transcriptionResult.processingTimeMs,
            },
        });
        // STEP 3: Generate SOAP note using Claude
        const soapNote = await generateSOAPNote(transcriptText, session.patient, session.clinician);
        // STEP 4: Validate AI-generated SOAP note with medical-grade schema
        let validatedSOAPData;
        try {
            validatedSOAPData = schemas_1.CreateSOAPNoteSchema.parse({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
            }
            else {
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
        const noteHash = (0, crypto_1.createHash)('sha256').update(noteContent).digest('hex');
        // Create SOAP note record (using validated data - type-safe)
        const soapNoteRecord = await prisma_1.prisma.sOAPNote.create({
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
        await prisma_1.prisma.scribeSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                processingCompletedAt: new Date(),
            },
        });
        return server_1.NextResponse.json({
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
    }
    catch (error) {
        console.error('Error finalizing session:', error);
        // Update session with error
        try {
            await prisma_1.prisma.scribeSession.update({
                where: { id: context.params.id },
                data: {
                    status: 'FAILED',
                    processingError: error.message,
                },
            });
        }
        catch (updateError) {
            console.error('Failed to update session error:', updateError);
        }
        return server_1.NextResponse.json({ error: 'Failed to finalize session', message: error.message }, { status: 500 });
    }
});
/**
 * Generate SOAP note from transcript using Gemini 2.0 Flash
 */
async function generateSOAPNote(transcript, patient, clinician) {
    const startTime = Date.now();
    // Calculate patient age
    const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
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
    const genAI = getGenAI();
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
    }
    else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    const soapNote = JSON.parse(jsonText);
    return {
        ...soapNote,
        tokensUsed,
        processingTime,
    };
}
//# sourceMappingURL=route.js.map