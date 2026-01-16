/**
 * CDSS V3 - Chat API
 *
 * POST /api/cdss/chat - Clinical chat with smart suggestions
 *
 * This endpoint:
 * 1. Receives clinical conversation messages
 * 2. De-identifies all content (PHI safety)
 * 3. Generates AI response with clinical context
 * 4. Extracts smart suggestions based on conversation
 *
 * SECURITY: All input is de-identified BEFORE being sent to LLM.
 *
 * PRD Reference: Section 2.6 Smart Suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { createDeidService } from '@/lib/services/deid.service';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

// Request validation schema
const ChatRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  encounterId: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]).max(50, 'Conversation history too long'),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Suggestion schema for response
const SuggestionSchema = z.object({
  label: z.string(),
  type: z.enum(['calculator', 'order', 'lab', 'alert', 'reference']),
  action: z.string(),
  payload: z.record(z.string()).optional(),
});

type Suggestion = z.infer<typeof SuggestionSchema>;

/**
 * Extract clinical suggestions from conversation content
 */
function extractSuggestions(content: string): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Pattern matching for common clinical suggestions
  const patterns: Array<{ regex: RegExp; suggestion: Omit<Suggestion, 'payload'> }> = [
    { regex: /ACS risk|acute coronary|chest pain.*risk/i, suggestion: { label: 'ACS Risk Calculator', type: 'calculator', action: 'calculate_acs_risk' } },
    { regex: /ECG|EKG|electrocardiogram/i, suggestion: { label: 'Order ECG', type: 'order', action: 'order_ecg' } },
    { regex: /troponin|cardiac enzyme|cardiac marker/i, suggestion: { label: 'Check Troponin Trend', type: 'lab', action: 'view_troponin' } },
    { regex: /colonoscopy|colon cancer screen/i, suggestion: { label: 'Order Colonoscopy', type: 'order', action: 'order_colonoscopy' } },
    { regex: /A1c|hemoglobin a1c|diabetes screen|glucose control/i, suggestion: { label: 'Order HbA1c', type: 'lab', action: 'order_hba1c' } },
    { regex: /lipid|cholesterol|LDL|HDL/i, suggestion: { label: 'Order Lipid Panel', type: 'lab', action: 'order_lipid_panel' } },
    { regex: /drug interaction|medication review|polypharmacy/i, suggestion: { label: 'Check Drug Interactions', type: 'alert', action: 'check_interactions' } },
    { regex: /CHA2DS2-VASc|stroke risk|atrial fibrillation.*risk/i, suggestion: { label: 'CHA2DS2-VASc Score', type: 'calculator', action: 'calculate_chadsvasc' } },
    { regex: /wells|PE probability|pulmonary embolism/i, suggestion: { label: 'Wells Score (PE)', type: 'calculator', action: 'calculate_wells_pe' } },
    { regex: /CURB-65|pneumonia severity|CAP/i, suggestion: { label: 'CURB-65 Score', type: 'calculator', action: 'calculate_curb65' } },
    { regex: /creatinine clearance|GFR|kidney function|renal function/i, suggestion: { label: 'Calculate GFR', type: 'calculator', action: 'calculate_gfr' } },
    { regex: /mammogram|breast cancer screen/i, suggestion: { label: 'Order Mammogram', type: 'order', action: 'order_mammogram' } },
    { regex: /blood pressure|hypertension|BP management/i, suggestion: { label: 'BP Management Guidelines', type: 'reference', action: 'view_bp_guidelines' } },
    { regex: /PSA|prostate screen/i, suggestion: { label: 'Order PSA', type: 'lab', action: 'order_psa' } },
    { regex: /CT scan|computed tomography/i, suggestion: { label: 'Order CT', type: 'order', action: 'order_ct' } },
    { regex: /MRI|magnetic resonance/i, suggestion: { label: 'Order MRI', type: 'order', action: 'order_mri' } },
    { regex: /x-ray|chest x-ray|XR/i, suggestion: { label: 'Order X-Ray', type: 'order', action: 'order_xray' } },
    { regex: /CBC|complete blood count|blood count/i, suggestion: { label: 'Order CBC', type: 'lab', action: 'order_cbc' } },
    { regex: /BMP|basic metabolic|metabolic panel/i, suggestion: { label: 'Order BMP', type: 'lab', action: 'order_bmp' } },
    { regex: /TSH|thyroid function|thyroid screen/i, suggestion: { label: 'Order TSH', type: 'lab', action: 'order_tsh' } },
  ];

  patterns.forEach(({ regex, suggestion }) => {
    if (regex.test(content)) {
      // Avoid duplicates
      if (!suggestions.some(s => s.action === suggestion.action)) {
        suggestions.push(suggestion);
      }
    }
  });

  return suggestions.slice(0, 5); // Max 5 suggestions
}

/**
 * POST /api/cdss/chat
 *
 * Clinical chat with AI response and smart suggestions
 */
export async function POST(request: NextRequest) {
  let anthropic: Anthropic | null = null;

  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const providerId = session.user.id;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const validationResult = ChatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { patientId, encounterId, message, conversationHistory } = validationResult.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        dateOfBirth: true,
        sex: true,
        conditions: {
          select: { name: true },
          take: 10,
        },
        medications: {
          where: { isActive: true },
          select: { name: true },
          take: 10,
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    logger.info({
      event: 'cdss_chat_request',
      patientId,
      encounterId,
      providerId,
      messageLength: message.length,
      historyLength: conversationHistory.length,
    });

    // SECURITY: De-identify all content before LLM processing
    const deidService = createDeidService();

    // De-identify current message
    const safeMessage = await deidService.redact(message);

    // De-identify conversation history
    const safeHistory = await Promise.all(
      conversationHistory.map(async (msg) => ({
        role: msg.role,
        content: await deidService.redact(msg.content),
      }))
    );

    // Calculate patient age
    const birthDate = new Date(patient.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    // Build patient context (no PHI - just clinical context)
    const patientContext = {
      age,
      sex: patient.sex,
      conditions: patient.conditions.map(c => c.name),
      medications: patient.medications.map(m => m.name),
    };

    // Initialize Anthropic client
    anthropic = new Anthropic();

    // Build messages for Anthropic
    const systemPrompt = `You are a clinical decision support assistant for physicians. You provide helpful, evidence-based guidance during patient encounters.

PATIENT CONTEXT (de-identified):
- Age: ${patientContext.age}
- Sex: ${patientContext.sex}
- Active Conditions: ${patientContext.conditions.join(', ') || 'None documented'}
- Current Medications: ${patientContext.medications.join(', ') || 'None documented'}

GUIDELINES:
1. Be concise and clinically relevant
2. Suggest appropriate clinical tools (calculators, orders, labs) when relevant
3. Reference evidence-based guidelines (USPSTF, ACC/AHA, etc.) when applicable
4. Never make definitive diagnoses - provide differential considerations
5. Always recommend proper clinical evaluation
6. If discussing medications or tests, mention common considerations
7. Keep responses under 200 words unless more detail is specifically needed

Remember: You are assisting a qualified physician, not replacing clinical judgment.`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...safeHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: safeMessage },
    ];

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // Extract text response
    const textBlock = response.content.find(block => block.type === 'text');
    const aiResponse = textBlock && 'text' in textBlock ? textBlock.text : 'I apologize, but I was unable to generate a response.';

    // Extract suggestions from conversation
    const combinedContent = `${safeMessage} ${aiResponse}`;
    const suggestions = extractSuggestions(combinedContent);

    // HIPAA Audit Log
    await createAuditLog({
      action: 'CREATE',
      resource: 'CDSSChatMessage',
      resourceId: patientId,
      details: {
        encounterId,
        messageLength: message.length,
        responseLength: aiResponse.length,
        suggestionsCount: suggestions.length,
        // Note: We do NOT log the actual message content (PHI risk)
      },
      success: true,
    });

    logger.info({
      event: 'cdss_chat_response',
      patientId,
      encounterId,
      providerId,
      responseLength: aiResponse.length,
      suggestionsCount: suggestions.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse,
        suggestions,
      },
    });
  } catch (error) {
    logger.error({
      event: 'cdss_chat_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Check for specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Service temporarily unavailable. Please try again.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process chat message',
      },
      { status: 500 }
    );
  }
}
