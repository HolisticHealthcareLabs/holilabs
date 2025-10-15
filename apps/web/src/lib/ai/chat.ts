/**
 * AI Clinical Assistant
 * Powered by Claude 3.5 Sonnet (Anthropic) or GPT-4 (OpenAI)
 *
 * Features:
 * - Clinical decision support
 * - Differential diagnosis
 * - Treatment recommendations
 * - Drug interaction checks
 * - Patient data analysis
 */

export type AIProvider = 'claude' | 'openai' | 'gemini';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

// ============================================================================
// CLINICAL SYSTEM PROMPTS
// ============================================================================

export const ClinicalSystemPrompts = {
  general: `You are a Clinical Decision Support AI assistant for healthcare professionals using Holi Labs.

Your role:
- Provide evidence-based clinical guidance
- Help with differential diagnosis
- Suggest treatment protocols
- Check drug interactions
- Analyze patient data
- NEVER provide definitive diagnosis (only differential diagnosis)
- ALWAYS recommend consultation with specialists when needed
- Follow latest medical guidelines (UpToDate, ACP, etc.)

Important disclaimers:
- This is Clinical Decision Support (CDS), NOT a diagnostic device
- All recommendations must be reviewed by a licensed physician
- You do not replace clinical judgment

Language: Respond in Spanish (LATAM medical terminology)`,

  differential: `You are an expert in differential diagnosis.

Given patient symptoms, history, and exam findings, provide:
1. Most likely diagnoses (ranked by probability)
2. Red flags to rule out immediately
3. Recommended diagnostic workup
4. When to refer to specialist

Format your response clearly with probabilities and reasoning.`,

  drugInteractions: `You are a pharmacology expert specializing in drug interactions.

Analyze the patient's medication list and:
1. Identify potential drug-drug interactions
2. Assess severity (minor, moderate, major, contraindicated)
3. Suggest safer alternatives if needed
4. Recommend monitoring parameters

Use evidence from Micromedex, Lexi-Comp, and FDA databases.`,

  treatment: `You are a treatment protocol specialist.

Given a confirmed diagnosis, provide:
1. First-line treatment options
2. Alternative therapies
3. Dosing guidelines
4. Duration of treatment
5. Follow-up recommendations
6. Patient education points

Follow evidence-based guidelines (ACP, IDSA, ESC, etc.).`,
};

// ============================================================================
// CLAUDE API (Anthropic) - Recommended for Healthcare
// ============================================================================

async function chatWithClaude(request: ChatRequest): Promise<ChatResponse> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'Claude API key not configured',
      };
    }

    const model = request.model || 'claude-3-5-sonnet-20241022';

    // Convert messages to Claude format
    const messages = request.messages.filter(m => m.role !== 'system');
    const systemPrompt = request.systemPrompt || ClinicalSystemPrompts.general;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return {
        success: false,
        error: 'Failed to get Claude response',
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  } catch (error: any) {
    console.error('Claude chat error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// OPENAI API (GPT-4)
// ============================================================================

async function chatWithOpenAI(request: ChatRequest): Promise<ChatResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    const model = request.model || 'gpt-4-turbo-preview';

    // Add system message
    const messages = [
      {
        role: 'system' as const,
        content: request.systemPrompt || ClinicalSystemPrompts.general,
      },
      ...request.messages,
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return {
        success: false,
        error: 'Failed to get OpenAI response',
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  } catch (error: any) {
    console.error('OpenAI chat error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// GOOGLE GEMINI API (Gemini 1.5 Flash) - Cost-Effective Alternative
// ============================================================================

async function chatWithGemini(request: ChatRequest): Promise<ChatResponse> {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'Google AI API key not configured',
      };
    }

    // Use Gemini 1.5 Flash for cost optimization (20x cheaper than Claude)
    const model = request.model || 'gemini-1.5-flash';

    // Build conversation history
    const systemPrompt = request.systemPrompt || ClinicalSystemPrompts.general;

    // Gemini requires combining system prompt with first user message
    const conversationParts = request.messages.map((msg, index) => {
      if (index === 0 && msg.role === 'user') {
        // Prepend system prompt to first user message
        return {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${msg.content}` }],
        };
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      };
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: conversationParts,
          generationConfig: {
            temperature: request.temperature || 0.7,
            maxOutputTokens: request.maxTokens || 4096,
            topP: 0.95,
            topK: 40,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_MEDICAL',
              threshold: 'BLOCK_NONE', // Allow medical content for clinical use
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_ONLY_HIGH',
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return {
        success: false,
        error: 'Failed to get Gemini response',
      };
    }

    const data = await response.json();

    // Check if response was blocked
    if (data.promptFeedback?.blockReason) {
      return {
        success: false,
        error: `Content blocked: ${data.promptFeedback.blockReason}`,
      };
    }

    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      return {
        success: false,
        error: 'No response generated',
      };
    }

    // Calculate token usage (Gemini provides this in usageMetadata)
    const usage = data.usageMetadata || {};

    return {
      success: true,
      message: candidate.content.parts[0].text,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      },
    };
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// MAIN CHAT FUNCTION
// ============================================================================

/**
 * Send chat request to AI provider
 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const provider = request.provider || 'claude'; // Default to Claude for healthcare

  switch (provider) {
    case 'claude':
      return chatWithClaude(request);

    case 'openai':
      return chatWithOpenAI(request);

    case 'gemini':
      return chatWithGemini(request);

    default:
      return {
        success: false,
        error: 'Invalid AI provider',
      };
  }
}

// ============================================================================
// CONTEXT-AWARE HELPERS
// ============================================================================

/**
 * Generate patient context summary for AI
 */
export function buildPatientContext(patient: {
  ageBand?: string;
  gender?: string;
  medications?: Array<{ name: string; dose: string }>;
  diagnoses?: string[];
  allergies?: string[];
  vitalSigns?: Record<string, string>;
}): string {
  let context = `Contexto del Paciente:\n`;

  if (patient.ageBand) context += `- Edad: ${patient.ageBand}\n`;
  if (patient.gender) context += `- Sexo: ${patient.gender}\n`;

  if (patient.medications && patient.medications.length > 0) {
    context += `- Medicamentos actuales:\n`;
    patient.medications.forEach(med => {
      context += `  * ${med.name} ${med.dose}\n`;
    });
  }

  if (patient.diagnoses && patient.diagnoses.length > 0) {
    context += `- Diagnósticos previos: ${patient.diagnoses.join(', ')}\n`;
  }

  if (patient.allergies && patient.allergies.length > 0) {
    context += `- Alergias: ${patient.allergies.join(', ')}\n`;
  }

  if (patient.vitalSigns) {
    context += `- Signos vitales:\n`;
    Object.entries(patient.vitalSigns).forEach(([key, value]) => {
      if (value) context += `  * ${key}: ${value}\n`;
    });
  }

  return context;
}

/**
 * Check drug interactions using AI
 */
export async function checkDrugInteractions(
  medications: Array<{ name: string; dose: string }>
): Promise<ChatResponse> {
  const medicationList = medications
    .map(m => `${m.name} ${m.dose}`)
    .join('\n');

  return chat({
    messages: [
      {
        role: 'user',
        content: `Analiza las siguientes medicaciones para interacciones:\n\n${medicationList}`,
      },
    ],
    systemPrompt: ClinicalSystemPrompts.drugInteractions,
    provider: 'claude',
  });
}

/**
 * Get differential diagnosis suggestions
 */
export async function getDifferentialDiagnosis(
  symptoms: string,
  patientContext?: string
): Promise<ChatResponse> {
  let prompt = `Síntomas presentados:\n${symptoms}`;

  if (patientContext) {
    prompt += `\n\n${patientContext}`;
  }

  return chat({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    systemPrompt: ClinicalSystemPrompts.differential,
    provider: 'claude',
  });
}

/**
 * Get treatment recommendations
 */
export async function getTreatmentRecommendations(
  diagnosis: string,
  patientContext?: string
): Promise<ChatResponse> {
  let prompt = `Diagnóstico: ${diagnosis}`;

  if (patientContext) {
    prompt += `\n\n${patientContext}`;
  }

  return chat({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    systemPrompt: ClinicalSystemPrompts.treatment,
    provider: 'claude',
  });
}
