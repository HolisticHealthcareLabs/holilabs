"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const router_1 = require("@/lib/ai/router");
const usage_tracker_1 = require("@/lib/ai/usage-tracker");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
async function POST(req) {
    const startTime = Date.now();
    try {
        // 1. Authenticate user
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!session?.user?.id) {
            return server_1.NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // 2. Parse request body
        const body = await req.json();
        // 3. Validate required fields
        if (!body.chiefComplaint || !body.symptoms || body.symptoms.length === 0) {
            return server_1.NextResponse.json({ success: false, error: 'Chief complaint and symptoms are required' }, { status: 400 });
        }
        // 4. Check user's subscription tier and quota
        const subscriptionTier = await prisma_1.prisma.subscriptionTier.findUnique({
            where: { userId: session.user.id },
        });
        const tier = subscriptionTier?.tier || 'FREE';
        const dailyUsed = subscriptionTier?.dailyAIUsed || 0;
        const dailyLimit = subscriptionTier?.dailyAILimit || 10;
        // Enforce rate limiting
        if (dailyUsed >= dailyLimit) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Daily AI query limit reached',
                quotaInfo: {
                    dailyUsed,
                    dailyLimit,
                    remaining: 0,
                },
            }, { status: 429 });
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
        const aiResponse = await (0, router_1.routeAIRequest)({
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
        await (0, usage_tracker_1.trackUsage)({
            provider: aiResponse.provider || 'claude',
            userId: session.user.id,
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
            await prisma_1.prisma.subscriptionTier.update({
                where: { userId: session.user.id },
                data: {
                    dailyAIUsed: dailyUsed + 1,
                    monthlyAIUsed: { increment: 1 },
                },
            });
        }
        else {
            // Create default FREE tier for user if doesn't exist
            await prisma_1.prisma.subscriptionTier.create({
                data: {
                    userId: session.user.id,
                    tier: 'FREE',
                    dailyAIUsed: 1,
                    monthlyAIUsed: 1,
                    dailyAILimit: 10,
                    monthlyAILimit: 300,
                },
            });
        }
        // 11. Return diagnosis
        return server_1.NextResponse.json({
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
    }
    catch (error) {
        console.error('[Diagnosis API] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate diagnosis',
        }, { status: 500 });
    }
}
/**
 * Build structured clinical context from request
 */
function buildClinicalContext(data) {
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
    if (data.symptomDuration)
        context += `Duration: ${data.symptomDuration}\n`;
    if (data.symptomOnset)
        context += `Onset: ${data.symptomOnset}\n`;
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
        if (data.vitalSigns.bloodPressure)
            context += `- Blood Pressure: ${data.vitalSigns.bloodPressure}\n`;
        if (data.vitalSigns.heartRate)
            context += `- Heart Rate: ${data.vitalSigns.heartRate} bpm\n`;
        if (data.vitalSigns.temperature)
            context += `- Temperature: ${data.vitalSigns.temperature}°C\n`;
        if (data.vitalSigns.respiratoryRate)
            context += `- Respiratory Rate: ${data.vitalSigns.respiratoryRate} breaths/min\n`;
        if (data.vitalSigns.oxygenSaturation)
            context += `- O2 Saturation: ${data.vitalSigns.oxygenSaturation}%\n`;
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
            if (lab.unit)
                context += ` ${lab.unit}`;
            if (lab.normalRange)
                context += ` (Normal: ${lab.normalRange})`;
            context += '\n';
        });
        context += '\n';
    }
    return context;
}
/**
 * Parse AI response into structured diagnosis
 */
function parseAIResponse(response) {
    try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
        }
        // Fallback: Return error structure
        throw new Error('Could not parse AI response');
    }
    catch (error) {
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
function calculateEstimatedCost(usage) {
    if (!usage)
        return 0;
    // Claude Sonnet 3.5 pricing: $3/1M input, $15/1M output
    const inputCost = ((usage.promptTokens || 0) / 1_000_000) * 3.0;
    const outputCost = ((usage.completionTokens || 0) / 1_000_000) * 15.0;
    return inputCost + outputCost;
}
//# sourceMappingURL=route.js.map