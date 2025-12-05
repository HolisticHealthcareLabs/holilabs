/**
 * SOAP Note Generation API Endpoint
 *
 * POST /api/ai/generate-note
 *
 * Generates a SOAP note from clinical transcript using AI and medical NLP
 *
 * @compliance HIPAA, HL7 FHIR R4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soapGenerator } from '@/lib/clinical-notes/soap-generator';
import { confidenceScoringService } from '@/lib/ai/confidence-scoring';
import type { ClinicalSessionContext } from '@/lib/scribe/ai-scribe-service';

/**
 * Request body schema
 */
interface GenerateNoteRequest {
  transcription: string;
  patientId: string;
  appointmentId?: string;
  patientContext: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: number;
    gender: string;
    deidentifiedName: string;
    deidentifiedDOB: string;
  };
  chiefComplaint?: string;
  vitalSigns?: {
    temperature?: number;
    bloodPressure?: string;
    heartRate?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
  };
  allergies?: string[];
  medications?: string[];
  medicalHistory?: string[];
  recentLabResults?: Array<{
    testName: string;
    result: string;
    date: string;
    normalRange?: string;
  }>;
  saveToDatabase?: boolean;
}

/**
 * Response body schema
 */
interface GenerateNoteResponse {
  success: boolean;
  data?: {
    noteId: string;
    sections: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
    chiefComplaint: string;
    diagnosis: string[];
    confidence: {
      overall: number;
      breakdown: {
        completeness: number;
        entityQuality: number;
        consistency: number;
        clinicalStandards: number;
      };
      flags: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        category: string;
        message: string;
        section?: string;
      }>;
      recommendations: string[];
      requiresReview: boolean;
    };
    status: 'draft' | 'pending_review';
    metadata: {
      generatedAt: string;
      transcriptLength: number;
      processingTime: number;
      modelUsed: string;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * POST /api/ai/generate-note
 *
 * Generate SOAP note from transcription
 */
export async function POST(request: NextRequest): Promise<NextResponse<GenerateNoteResponse>> {
  const startTime = Date.now();

  try {
    // 1. Authenticate request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let body: GenerateNoteRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid JSON in request body',
          },
        },
        { status: 400 }
      );
    }

    // 3. Validate required fields
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError,
          },
        },
        { status: 400 }
      );
    }

    // 4. Build clinical session context
    const clinicalContext: ClinicalSessionContext = {
      patient: body.patientContext,
      chiefComplaint: body.chiefComplaint,
      vitalSigns: body.vitalSigns,
      allergies: body.allergies,
      medications: body.medications,
      medicalHistory: body.medicalHistory,
      recentLabResults: body.recentLabResults,
    };

    // 5. Generate SOAP note
    console.log(`📝 [API] Generating SOAP note for patient ${body.patientId}...`);
    const result = await soapGenerator.generateFromTranscription(
      body.transcription,
      clinicalContext,
      {
        patientId: body.patientId,
        authorId: session.user.id,
        appointmentId: body.appointmentId,
        saveToDatabase: body.saveToDatabase ?? false,
      }
    );

    // 6. Calculate detailed confidence score
    const confidenceScore = confidenceScoringService.scoreSOAPNote(
      result.sections,
      result.medicalEntities,
      result.chiefComplaint
    );

    // 7. Return response
    const response: GenerateNoteResponse = {
      success: true,
      data: {
        noteId: result.noteId,
        sections: result.sections,
        chiefComplaint: result.chiefComplaint,
        diagnosis: result.diagnosis,
        confidence: confidenceScore,
        status: confidenceScore.requiresReview ? 'pending_review' : 'draft',
        metadata: result.metadata,
      },
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ [API] SOAP note generated successfully in ${processingTime}ms (confidence: ${confidenceScore.overall})`);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ [API] Error generating SOAP note:', error);

    // Handle specific errors
    if (error.name === 'ComprehendMedicalError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MEDICAL_NLP_ERROR',
            message: 'Failed to extract medical entities',
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    if (error.name === 'AIGenerationError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_GENERATION_ERROR',
            message: 'Failed to generate SOAP sections',
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate SOAP note',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Validate request body
 */
function validateRequest(body: GenerateNoteRequest): string | null {
  if (!body.transcription || body.transcription.trim().length === 0) {
    return 'Transcription is required';
  }

  if (body.transcription.length < 50) {
    return 'Transcription is too short (minimum 50 characters)';
  }

  if (body.transcription.length > 50000) {
    return 'Transcription is too long (maximum 50,000 characters)';
  }

  if (!body.patientId || body.patientId.trim().length === 0) {
    return 'Patient ID is required';
  }

  if (!body.patientContext) {
    return 'Patient context is required';
  }

  if (!body.patientContext.id || !body.patientContext.mrn) {
    return 'Patient context must include id and mrn';
  }

  if (!body.patientContext.firstName || !body.patientContext.lastName) {
    return 'Patient context must include firstName and lastName';
  }

  if (!body.patientContext.dateOfBirth || !body.patientContext.age) {
    return 'Patient context must include dateOfBirth and age';
  }

  return null;
}

/**
 * GET /api/ai/generate-note
 *
 * Return API information
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: '/api/ai/generate-note',
      methods: ['POST'],
      description: 'Generate SOAP notes from clinical transcriptions using AI',
      version: '1.0.0',
      authentication: 'Required (NextAuth session)',
      rateLimit: {
        requests: 100,
        per: 'hour',
      },
      documentation: 'https://docs.holilabs.xyz/api/ai/generate-note',
    },
    { status: 200 }
  );
}
