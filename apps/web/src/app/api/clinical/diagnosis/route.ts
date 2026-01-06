/**
 * AI Diagnosis Assistant API
 *
 * Clinical decision support system that provides:
 * - Differential diagnosis based on symptoms
 * - Red flag identification
 * - Recommended diagnostic workup
 * - Specialist referral recommendations
 *
 * Uses Claude for critical medical decisions (high accuracy)
 * Tracks usage for cost monitoring and freemium enforcement
 *
 * Usage: POST /api/clinical/diagnosis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { routeAIRequest } from '@/lib/ai/router';
import { trackUsage } from '@/lib/ai/usage-tracker';
import { prisma } from '@/lib/prisma';
import {
  sanitizeString,
  validateArray,
  sanitizeMedicationName,
} from '@/lib/security/validation';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface DiagnosisRequest {
  // Patient Information
  patientId?: string;
  age: number;
  sex: 'M' | 'F' | 'Other';

  // Clinical Presentation
  chiefComplaint: string;
  symptoms: string[];
  symptomDuration?: string;
  symptomOnset?: 'sudden' | 'gradual';

  // Medical History
  medicalHistory?: string[];
  medications?: string[];
  allergies?: string[];
  familyHistory?: string[];

  // Vital Signs
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };

  // Physical Exam
  physicalExam?: string;

  // Lab Results
  labResults?: {
    name: string;
    value: string;
    unit?: string;
    normalRange?: string;
  }[];
}

interface DiagnosisResponse {
  success: boolean;
  diagnosis?: {
    // Differential Diagnosis
    differentialDiagnosis: {
      condition: string;
      probability: 'high' | 'moderate' | 'low';
      reasoning: string;
      icd10Code?: string;
    }[];

    // Red Flags
    redFlags: {
      flag: string;
      severity: 'critical' | 'serious' | 'monitor';
      action: string;
    }[];

    // Recommended Workup
    diagnosticWorkup: {
      test: string;
      priority: 'urgent' | 'routine' | 'optional';
      reasoning: string;
    }[];

    // Referrals
    referrals: {
      specialty: string;
      urgency: 'immediate' | 'urgent' | 'routine';
      reason: string;
    }[];

    // Clinical Reasoning
    clinicalReasoning: string;

    // Follow-up
    followUp: {
      timeframe: string;
      instructions: string;
    };
  };

  // Usage Tracking
  usage?: {
    provider: string;
    tokens: number;
    cost: number;
    responseTime: number;
  };

  // Rate Limiting
  quotaInfo?: {
    dailyUsed: number;
    dailyLimit: number;
    remaining: number;
  };

  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<DiagnosisResponse>> {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: DiagnosisRequest = await req.json();

    // 3. Validate and sanitize inputs
    // Validate required fields
    if (!body.chiefComplaint || !body.symptoms || body.symptoms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Chief complaint and symptoms are required' },
        { status: 400 }
      );
    }

    // Validate age
    if (typeof body.age !== 'number' || body.age < 0 || body.age > 150) {
      return NextResponse.json(
        { success: false, error: 'Invalid age (must be 0-150)' },
        { status: 400 }
      );
    }

    // Validate and sanitize text fields
    try {
      body.chiefComplaint = sanitizeString(body.chiefComplaint, 1000);

      if (body.physicalExam) {
        body.physicalExam = sanitizeString(body.physicalExam, 5000);
      }

      if (body.symptomDuration) {
        body.symptomDuration = sanitizeString(body.symptomDuration, 200);
      }
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Validate arrays
    try {
      validateArray(body.symptoms, 50, (item: any) => typeof item === 'string');
      body.symptoms = body.symptoms.map(s => sanitizeString(s, 200));

      if (body.medicalHistory) {
        validateArray(body.medicalHistory, 50, (item: any) => typeof item === 'string');
        body.medicalHistory = body.medicalHistory.map(s => sanitizeString(s, 200));
      }

      if (body.medications) {
        validateArray(body.medications, 50, (item: any) => typeof item === 'string');
        body.medications = body.medications.map(m => sanitizeMedicationName(m));
      }

      if (body.allergies) {
        validateArray(body.allergies, 50, (item: any) => typeof item === 'string');
        body.allergies = body.allergies.map(a => sanitizeString(a, 200));
      }

      if (body.familyHistory) {
        validateArray(body.familyHistory, 50, (item: any) => typeof item === 'string');
        body.familyHistory = body.familyHistory.map(f => sanitizeString(f, 200));
      }

      if (body.labResults) {
        validateArray(body.labResults, 50, (item: any) => typeof item === 'object');
        body.labResults = body.labResults.map(lab => ({
          name: sanitizeString(lab.name, 100),
          value: sanitizeString(lab.value, 100),
          unit: lab.unit ? sanitizeString(lab.unit, 50) : undefined,
          normalRange: lab.normalRange ? sanitizeString(lab.normalRange, 100) : undefined,
        }));
      }
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Validate vital signs if provided
    if (body.vitalSigns) {
      if (body.vitalSigns.bloodPressure) {
        body.vitalSigns.bloodPressure = sanitizeString(body.vitalSigns.bloodPressure, 20);
      }
      if (body.vitalSigns.heartRate && (body.vitalSigns.heartRate < 0 || body.vitalSigns.heartRate > 300)) {
        return NextResponse.json(
          { success: false, error: 'Invalid heart rate' },
          { status: 400 }
        );
      }
      if (body.vitalSigns.temperature && (body.vitalSigns.temperature < 20 || body.vitalSigns.temperature > 50)) {
        return NextResponse.json(
          { success: false, error: 'Invalid temperature' },
          { status: 400 }
        );
      }
      if (body.vitalSigns.respiratoryRate && (body.vitalSigns.respiratoryRate < 0 || body.vitalSigns.respiratoryRate > 100)) {
        return NextResponse.json(
          { success: false, error: 'Invalid respiratory rate' },
          { status: 400 }
        );
      }
      if (body.vitalSigns.oxygenSaturation && (body.vitalSigns.oxygenSaturation < 0 || body.vitalSigns.oxygenSaturation > 100)) {
        return NextResponse.json(
          { success: false, error: 'Invalid oxygen saturation' },
          { status: 400 }
        );
      }
    }

    // 4. Check user's subscription tier and quota
    const subscriptionTier = await prisma.subscriptionTier.findUnique({
      where: { userId: (session.user as any).id },
    });

    const tier = subscriptionTier?.tier || 'FREE';
    const dailyUsed = subscriptionTier?.dailyAIUsed || 0;
    const dailyLimit = subscriptionTier?.dailyAILimit || 10;

    // Enforce rate limiting
    if (dailyUsed >= dailyLimit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Daily AI query limit reached',
          quotaInfo: {
            dailyUsed,
            dailyLimit,
            remaining: 0,
          },
        },
        { status: 429 }
      );
    }

    // 5. Build clinical context for AI
    const clinicalContext = buildClinicalContext(body);

    // 6. Create AI prompt for diagnosis
    const diagnosticPrompt = `You are an expert clinical decision support system. Based on the following patient information, provide a comprehensive diagnostic analysis.

${clinicalContext}

Please provide a structured response in the following JSON format:

{
  "differentialDiagnosis": [
    {
      "condition": "Name of condition",
      "probability": "high|moderate|low",
      "reasoning": "Brief clinical reasoning",
      "icd10Code": "ICD-10 code if applicable"
    }
  ],
  "redFlags": [
    {
      "flag": "Description of red flag",
      "severity": "critical|serious|monitor",
      "action": "Recommended action"
    }
  ],
  "diagnosticWorkup": [
    {
      "test": "Name of test",
      "priority": "urgent|routine|optional",
      "reasoning": "Why this test is recommended"
    }
  ],
  "referrals": [
    {
      "specialty": "Medical specialty",
      "urgency": "immediate|urgent|routine",
      "reason": "Reason for referral"
    }
  ],
  "clinicalReasoning": "Comprehensive clinical reasoning explaining the differential diagnosis and thought process",
  "followUp": {
    "timeframe": "Recommended follow-up timeframe",
    "instructions": "Specific follow-up instructions"
  }
}

IMPORTANT:
- Consider all provided information including symptoms, vital signs, and lab results
- Prioritize serious and life-threatening conditions
- Base recommendations on current clinical guidelines
- Be specific and actionable
- If information is insufficient, note what additional data is needed
- Always include a disclaimer that this is clinical decision support, not a replacement for clinical judgment`;

    // 7. Call AI with smart routing (will use Claude for critical medical decisions)
    const aiResponse = await routeAIRequest({
      messages: [
        {
          role: 'user',
          content: diagnosticPrompt,
        },
      ],
      provider: 'claude', // Force Claude for diagnostic accuracy
      temperature: 0.3, // Lower temperature for more consistent medical advice
      maxTokens: 4096,
    });

    if (!aiResponse.success || !aiResponse.message) {
      throw new Error('AI provider failed to generate diagnosis');
    }

    // 8. Parse AI response
    const diagnosis = parseAIResponse(aiResponse.message);

    // 9. Track usage in database
    const responseTime = Date.now() - startTime;
    const cost = calculateEstimatedCost(aiResponse.usage);

    await trackUsage({
      provider: aiResponse.provider || 'claude',
      userId: (session.user as any).id,
      promptTokens: aiResponse.usage?.promptTokens || 0,
      completionTokens: aiResponse.usage?.completionTokens || 0,
      totalTokens: aiResponse.usage?.totalTokens || 0,
      responseTimeMs: responseTime,
      fromCache: false,
      queryComplexity: 'complex',
      feature: 'diagnosis_assistant',
    });

    // 10. Update user's daily usage count
    if (subscriptionTier) {
      await prisma.subscriptionTier.update({
        where: { userId: (session.user as any).id },
        data: {
          dailyAIUsed: dailyUsed + 1,
          monthlyAIUsed: { increment: 1 },
        },
      });
    } else {
      // Create default FREE tier for user if doesn't exist
      await prisma.subscriptionTier.create({
        data: {
          userId: (session.user as any).id,
          tier: 'FREE',
          dailyAIUsed: 1,
          monthlyAIUsed: 1,
          dailyAILimit: 10,
          monthlyAILimit: 300,
        },
      });
    }

    // HIPAA Audit Log: AI diagnosis assistant used for patient
    await createAuditLog({
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      action: 'CREATE',
      resource: 'DiagnosisAssistant',
      resourceId: body.patientId || 'clinical-assessment',
      details: {
        patientId: body.patientId,
        patientAge: body.age,
        chiefComplaint: body.chiefComplaint,
        symptomsCount: body.symptoms.length,
        differentialDiagnosisCount: diagnosis?.differentialDiagnosis?.length || 0,
        redFlagsCount: diagnosis?.redFlags?.length || 0,
        aiProvider: aiResponse.provider || 'claude',
        tokensUsed: aiResponse.usage?.totalTokens || 0,
        responseTimeMs: responseTime,
        accessType: 'AI_DIAGNOSIS_ASSISTANT',
      },
      success: true,
      request: req,
    });

    // 11. Return diagnosis
    return NextResponse.json({
      success: true,
      diagnosis,
      usage: {
        provider: aiResponse.provider || 'claude',
        tokens: aiResponse.usage?.totalTokens || 0,
        cost,
        responseTime,
      },
      quotaInfo: {
        dailyUsed: dailyUsed + 1,
        dailyLimit,
        remaining: dailyLimit - dailyUsed - 1,
      },
    });

  } catch (error: any) {
    console.error('[Diagnosis API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate diagnosis',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      { status: 500 }
    );
  }
}

/**
 * Build structured clinical context from request
 */
function buildClinicalContext(data: DiagnosisRequest): string {
  let context = '';

  // Patient Demographics
  context += `PATIENT DEMOGRAPHICS:\n`;
  context += `- Age: ${data.age} years\n`;
  context += `- Sex: ${data.sex}\n\n`;

  // Chief Complaint
  context += `CHIEF COMPLAINT:\n${data.chiefComplaint}\n\n`;

  // Symptoms
  context += `PRESENT ILLNESS:\n`;
  context += `Symptoms: ${data.symptoms.join(', ')}\n`;
  if (data.symptomDuration) context += `Duration: ${data.symptomDuration}\n`;
  if (data.symptomOnset) context += `Onset: ${data.symptomOnset}\n`;
  context += '\n';

  // Medical History
  if (data.medicalHistory && data.medicalHistory.length > 0) {
    context += `MEDICAL HISTORY:\n${data.medicalHistory.join(', ')}\n\n`;
  }

  // Medications
  if (data.medications && data.medications.length > 0) {
    context += `CURRENT MEDICATIONS:\n${data.medications.join(', ')}\n\n`;
  }

  // Allergies
  if (data.allergies && data.allergies.length > 0) {
    context += `ALLERGIES:\n${data.allergies.join(', ')}\n\n`;
  }

  // Family History
  if (data.familyHistory && data.familyHistory.length > 0) {
    context += `FAMILY HISTORY:\n${data.familyHistory.join(', ')}\n\n`;
  }

  // Vital Signs
  if (data.vitalSigns) {
    context += `VITAL SIGNS:\n`;
    if (data.vitalSigns.bloodPressure) context += `- Blood Pressure: ${data.vitalSigns.bloodPressure}\n`;
    if (data.vitalSigns.heartRate) context += `- Heart Rate: ${data.vitalSigns.heartRate} bpm\n`;
    if (data.vitalSigns.temperature) context += `- Temperature: ${data.vitalSigns.temperature}°C\n`;
    if (data.vitalSigns.respiratoryRate) context += `- Respiratory Rate: ${data.vitalSigns.respiratoryRate} breaths/min\n`;
    if (data.vitalSigns.oxygenSaturation) context += `- O2 Saturation: ${data.vitalSigns.oxygenSaturation}%\n`;
    context += '\n';
  }

  // Physical Exam
  if (data.physicalExam) {
    context += `PHYSICAL EXAMINATION:\n${data.physicalExam}\n\n`;
  }

  // Lab Results
  if (data.labResults && data.labResults.length > 0) {
    context += `LABORATORY RESULTS:\n`;
    data.labResults.forEach(lab => {
      context += `- ${lab.name}: ${lab.value}`;
      if (lab.unit) context += ` ${lab.unit}`;
      if (lab.normalRange) context += ` (Normal: ${lab.normalRange})`;
      context += '\n';
    });
    context += '\n';
  }

  return context;
}

/**
 * Parse AI response into structured diagnosis
 */
function parseAIResponse(response: string): DiagnosisResponse['diagnosis'] {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }

    // Fallback: Return error structure
    throw new Error('Could not parse AI response');
  } catch (error) {
    console.error('[Diagnosis API] Failed to parse AI response:', error);

    // Return a structured error response
    return {
      differentialDiagnosis: [
        {
          condition: 'Unable to generate diagnosis',
          probability: 'low',
          reasoning: 'AI response could not be parsed. Please review raw output.',
        },
      ],
      redFlags: [],
      diagnosticWorkup: [],
      referrals: [],
      clinicalReasoning: response,
      followUp: {
        timeframe: 'As clinically indicated',
        instructions: 'Review with attending physician',
      },
    };
  }
}

/**
 * Calculate estimated cost based on token usage
 */
function calculateEstimatedCost(usage?: { promptTokens?: number; completionTokens?: number }): number {
  if (!usage) return 0;

  // Claude Sonnet 3.5 pricing: $3/1M input, $15/1M output
  const inputCost = ((usage.promptTokens || 0) / 1_000_000) * 3.0;
  const outputCost = ((usage.completionTokens || 0) / 1_000_000) * 15.0;

  return inputCost + outputCost;
}
