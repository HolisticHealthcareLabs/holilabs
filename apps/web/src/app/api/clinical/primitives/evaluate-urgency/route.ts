/**
 * Clinical Primitive: Evaluate Urgency
 *
 * Atomic primitive that evaluates clinical urgency based on symptoms and vital signs.
 * Part of the decomposed clinical-decision tool for agent-native architecture.
 *
 * POST /api/clinical/primitives/evaluate-urgency
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { verifyInternalAgentToken } from '@/lib/hash';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const vitalSignsSchema = z.object({
  systolicBp: z.number().min(50).max(300).optional(),
  diastolicBp: z.number().min(20).max(200).optional(),
  heartRate: z.number().min(20).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(),
  respiratoryRate: z.number().min(4).max(60).optional(),
  oxygenSaturation: z.number().min(50).max(100).optional(),
});

const requestSchema = z.object({
  chiefComplaint: z.string().min(1).max(1000),
  symptoms: z.array(z.string().max(200)).max(50).optional().default([]),
  vitalSigns: vitalSignsSchema.optional(),
  age: z.number().min(0).max(150).optional(),
  redFlags: z.array(z.string()).optional().default([]),
});

// Emergency keywords that indicate emergent urgency
const EMERGENT_KEYWORDS = [
  'chest pain', 'crushing', 'radiating', 'shortness of breath', 'dyspnea',
  'sudden onset', 'worst headache', 'thunderclap', 'syncope', 'loss of consciousness',
  'seizure', 'stroke', 'weakness one side', 'facial droop', 'slurred speech',
  'anaphylaxis', 'difficulty breathing', 'swelling throat', 'severe bleeding',
  'uncontrolled bleeding', 'trauma', 'altered mental status', 'confusion',
  'suicidal', 'homicidal', 'overdose', 'poisoning',
];

// Urgent keywords
const URGENT_KEYWORDS = [
  'fever', 'high fever', 'persistent', 'worsening', 'severe pain',
  'unable to', 'dehydration', 'vomiting blood', 'blood in stool',
  'chest tightness', 'palpitations', 'dizziness', 'weakness',
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authenticate
    let userId: string | undefined;
    const internalToken = req.headers.get('X-Agent-Internal-Token');

    if (internalToken && verifyInternalAgentToken(internalToken)) {
      const userEmail = req.headers.get('X-Agent-User-Email');
      const headerUserId = req.headers.get('X-Agent-User-Id');
      if (userEmail) {
        const dbUser = await prisma.user.findFirst({
          where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
          select: { id: true },
        });
        userId = dbUser?.id;
      }
    }

    if (!userId) {
      const session = await auth();
      userId = (session?.user as { id?: string })?.id;
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { chiefComplaint, symptoms, vitalSigns, age, redFlags } = validation.data;

    logger.info({
      event: 'primitive_evaluate_urgency_start',
      chiefComplaint,
      hasVitals: !!vitalSigns,
    });

    // Evaluate urgency using deterministic rules
    const urgencyResult = evaluateUrgency({
      chiefComplaint,
      symptoms,
      vitalSigns,
      age,
      redFlags,
    });

    const latencyMs = Date.now() - startTime;

    // Audit log
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'ClinicalPrimitive',
        resourceId: 'evaluate-urgency',
        details: {
          urgency: urgencyResult.urgency,
          score: urgencyResult.score,
          factors: urgencyResult.factors.length,
          latencyMs,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'primitive_evaluate_urgency_complete',
      urgency: urgencyResult.urgency,
      score: urgencyResult.score,
      latencyMs,
    });

    return NextResponse.json({
      success: true,
      data: urgencyResult,
      metadata: {
        method: 'deterministic',
        confidence: 'high',
        latencyMs,
      },
    });
  } catch (error) {
    logger.error({
      event: 'primitive_evaluate_urgency_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to evaluate urgency' },
      { status: 500 }
    );
  }
}

interface UrgencyInput {
  chiefComplaint: string;
  symptoms: string[];
  vitalSigns?: z.infer<typeof vitalSignsSchema>;
  age?: number;
  redFlags: string[];
}

interface UrgencyResult {
  urgency: 'emergent' | 'urgent' | 'routine';
  score: number; // 0-100
  factors: UrgencyFactor[];
  recommendation: string;
}

interface UrgencyFactor {
  factor: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  points: number;
}

function evaluateUrgency(input: UrgencyInput): UrgencyResult {
  const factors: UrgencyFactor[] = [];
  let score = 0;

  const allText = [input.chiefComplaint, ...input.symptoms].join(' ').toLowerCase();

  // Check emergent keywords
  for (const keyword of EMERGENT_KEYWORDS) {
    if (allText.includes(keyword.toLowerCase())) {
      factors.push({
        factor: `Emergent symptom: ${keyword}`,
        severity: 'critical',
        points: 40,
      });
      score += 40;
      break; // Only count one emergent match
    }
  }

  // Check urgent keywords
  for (const keyword of URGENT_KEYWORDS) {
    if (allText.includes(keyword.toLowerCase())) {
      factors.push({
        factor: `Urgent symptom: ${keyword}`,
        severity: 'high',
        points: 20,
      });
      score += 20;
      break; // Only count one urgent match
    }
  }

  // Check red flags
  if (input.redFlags.length > 0) {
    const points = Math.min(input.redFlags.length * 15, 45);
    factors.push({
      factor: `Red flags: ${input.redFlags.join(', ')}`,
      severity: input.redFlags.length >= 2 ? 'critical' : 'high',
      points,
    });
    score += points;
  }

  // Check vital signs
  if (input.vitalSigns) {
    const { systolicBp, diastolicBp, heartRate, temperature, respiratoryRate, oxygenSaturation } = input.vitalSigns;

    // Hypotension
    if (systolicBp && systolicBp < 90) {
      factors.push({ factor: 'Hypotension (SBP < 90)', severity: 'critical', points: 30 });
      score += 30;
    }

    // Hypertensive crisis
    if (systolicBp && systolicBp > 180) {
      factors.push({ factor: 'Hypertensive crisis (SBP > 180)', severity: 'critical', points: 30 });
      score += 30;
    }

    // Tachycardia
    if (heartRate && heartRate > 120) {
      factors.push({ factor: 'Tachycardia (HR > 120)', severity: 'high', points: 20 });
      score += 20;
    }

    // Bradycardia
    if (heartRate && heartRate < 50) {
      factors.push({ factor: 'Bradycardia (HR < 50)', severity: 'high', points: 20 });
      score += 20;
    }

    // Fever
    if (temperature && temperature > 39) {
      factors.push({ factor: 'High fever (> 39°C)', severity: 'moderate', points: 15 });
      score += 15;
    }

    // Tachypnea
    if (respiratoryRate && respiratoryRate > 24) {
      factors.push({ factor: 'Tachypnea (RR > 24)', severity: 'high', points: 20 });
      score += 20;
    }

    // Hypoxia
    if (oxygenSaturation && oxygenSaturation < 92) {
      factors.push({ factor: 'Hypoxia (SpO2 < 92%)', severity: 'critical', points: 35 });
      score += 35;
    }
  }

  // Age considerations
  if (input.age !== undefined) {
    if (input.age < 2 || input.age > 80) {
      factors.push({
        factor: `Age-related risk: ${input.age < 2 ? 'infant/toddler' : 'elderly'}`,
        severity: 'moderate',
        points: 10,
      });
      score += 10;
    }
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine urgency level
  let urgency: 'emergent' | 'urgent' | 'routine';
  let recommendation: string;

  if (score >= 60) {
    urgency = 'emergent';
    recommendation = 'Immediate medical evaluation required. Consider emergency department.';
  } else if (score >= 30) {
    urgency = 'urgent';
    recommendation = 'Prompt medical evaluation recommended within 24-48 hours.';
  } else {
    urgency = 'routine';
    recommendation = 'Schedule routine appointment. Follow up if symptoms worsen.';
  }

  return {
    urgency,
    score,
    factors,
    recommendation,
  };
}
