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

import logger from '@/lib/logger';
import { getAllRegisteredTools, getToolsForRoles } from '@/lib/mcp/registry';
import { ClinicalSystemPrompts, resolvePromptText } from './prompt-templates';
import { buildSkillPromptInjection, getFilteredToolCategories, type ResolvedSkillConfig } from './skill-config.service';

export type AIProvider = 'claude' | 'openai' | 'gemini' | 'ollama' | 'vllm' | 'together';

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

// ClinicalSystemPrompts imported from ./prompt-templates above
// (DB-backed with workspace overrides + built-in fallback)

// ============================================================================
// AVAILABLE TOOLS — SYSTEM PROMPT INJECTION
// ============================================================================

/**
 * Build a prompt section that lists registered MCP tools grouped by category.
 * When `roles` is provided, only tools the user has permission to use are included.
 * When `categoryFilter` is provided, only tools in those categories are included
 * (skills-based filtering to reduce prompt size and focus the agent).
 */
export function buildAvailableToolsSection(roles?: string[], categoryFilter?: string[] | null): string {
  let tools = roles?.length ? getToolsForRoles(roles) : getAllRegisteredTools();

  // Filter by skill-relevant categories if provided
  if (categoryFilter && categoryFilter.length > 0) {
    const filterSet = new Set(categoryFilter);
    tools = tools.filter((t) => filterSet.has(t.category));
  }

  if (tools.length === 0) {
    return '';
  }

  const byCategory = new Map<string, { name: string; description: string }[]>();
  for (const t of tools) {
    const list = byCategory.get(t.category) ?? [];
    list.push({ name: t.name, description: t.description });
    byCategory.set(t.category, list);
  }

  const lines: string[] = [
    '',
    '## Available Tools',
    `You have access to the following ${tools.length} tools for patient care operations:`,
    '',
  ];

  byCategory.forEach((categoryTools, category) => {
    lines.push(`### ${category}`);
    for (const tool of categoryTools) {
      lines.push(`- **${tool.name}**: ${tool.description}`);
    }
    lines.push('');
  });

  lines.push(
    'Only use tools listed above. Do not attempt tools outside this list — they will be denied by the permission system.'
  );

  return lines.join('\n');
}

/**
 * Assemble the full agent system prompt:
 *   base clinical prompt + user context + active skills + available tools (filtered).
 *
 * Resolution order for the base prompt:
 *   1. Explicit `basePrompt` parameter (caller override)
 *   2. DB workspace template → DB global template → built-in fallback
 *
 * When `activeSkills` is provided, skills inject prompt suffixes between
 * the context and tools sections, and tools are filtered to skill-relevant
 * categories (reducing prompt size from 263 tools to the relevant subset).
 *
 * @param basePrompt    Override for the base clinical prompt (skips DB resolution)
 * @param userContext   Optional user identity injected into the prompt header
 * @param workspaceId   Workspace ID for prompt template resolution
 * @param activeSkills  Resolved skill configs from getActiveSkillsForChat()
 */
export async function buildAgentSystemPrompt(
  basePrompt?: string,
  userContext?: { role: string; locale?: string },
  workspaceId?: string,
  activeSkills?: ResolvedSkillConfig[],
): Promise<string> {
  const base = basePrompt ?? await resolvePromptText('general', workspaceId);
  const roles = userContext?.role ? [userContext.role] : undefined;

  // Skills injection
  const skillsSection = activeSkills?.length
    ? buildSkillPromptInjection(activeSkills)
    : '';

  // Filter tools to skill-relevant categories (null = show all)
  const categoryFilter = activeSkills?.length
    ? getFilteredToolCategories(activeSkills)
    : null;
  const toolsSection = buildAvailableToolsSection(roles, categoryFilter);

  const contextLines: string[] = [];
  if (userContext) {
    contextLines.push('', '## Session Context');
    contextLines.push(`- **Role:** ${userContext.role}`);
    if (userContext.locale) {
      contextLines.push(`- **Locale:** ${userContext.locale}`);
    }
  }

  return `${base}${contextLines.join('\n')}${skillsSection}\n${toolsSection}`;
}

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
      // HIPAA: Do not log response body - may contain reflected PHI
      logger.error({
        event: 'claude_api_error',
        status: response.status,
        statusText: response.statusText,
      });
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
    // HIPAA: Only log error type, not content
    logger.error({
      event: 'claude_chat_error',
      errorType: error?.name || 'UnknownError',
    });
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
      // HIPAA: Do not log response body - may contain reflected PHI
      logger.error({
        event: 'openai_api_error',
        status: response.status,
        statusText: response.statusText,
      });
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
    // HIPAA: Only log error type, not content
    logger.error({
      event: 'openai_chat_error',
      errorType: error?.name || 'UnknownError',
    });
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
    // Support both env var names used across the repo/docs.
    // - GOOGLE_AI_API_KEY: used by the REST call below
    // - GEMINI_API_KEY: used elsewhere (SDK-based provider factory)
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'Gemini API key not configured (set GOOGLE_AI_API_KEY or GEMINI_API_KEY)',
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

    // SECURITY: API key moved from URL query parameter to header
    // This prevents key exposure in server logs, proxies, CDNs, and browser history
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: conversationParts,
          generationConfig: {
            temperature: request.temperature || 0.7,
            maxOutputTokens: request.maxTokens || 4096,
            topP: 0.95,
            topK: 40,
          },
          // NOTE: Gemini REST API rejects unknown safety categories.
          // Keep this minimal and valid; clinical content should not trip these.
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      }
    );

    if (!response.ok) {
      // HIPAA: Do not log response body - may contain reflected PHI
      // Parse error for user-facing message but don't log raw content
      const raw = await response.text().catch(() => '');
      let detail = response.statusText;
      try {
        const parsed = JSON.parse(raw);
        // Only extract safe error message, not full response
        detail = parsed?.error?.message || parsed?.message || response.statusText;
      } catch {
        // JSON parse failed, use status text only
      }
      logger.error({
        event: 'gemini_api_error',
        status: response.status,
        statusText: response.statusText,
      });
      return {
        success: false,
        error: `Gemini request failed (${response.status}): ${detail}`,
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
    // HIPAA: Only log error type, not content
    logger.error({
      event: 'gemini_chat_error',
      errorType: error?.name || 'UnknownError',
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// OLLAMA API (Local Inference)
// ============================================================================

async function chatWithOllama(request: ChatRequest): Promise<ChatResponse> {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = request.model || process.env.OLLAMA_MODEL || 'phi3';
    const systemPrompt = request.systemPrompt || ClinicalSystemPrompts.general;

    const messages = request.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Add system message at the beginning
    if (systemPrompt) {
      messages.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 4096,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      // HIPAA: Do not log response body - may contain reflected PHI
      logger.error({
        event: 'ollama_api_error',
        status: response.status,
      });
      return {
        success: false,
        error: `Ollama API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message?.content || '',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  } catch (error: any) {
    // HIPAA: Only log error type, not content
    logger.error({
      event: 'ollama_chat_error',
      errorType: error?.name || 'UnknownError',
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// VLLM API (Self-Hosted Inference)
// ============================================================================

async function chatWithVLLM(request: ChatRequest): Promise<ChatResponse> {
  try {
    const baseUrl = process.env.VLLM_BASE_URL || 'http://localhost:8000';
    const apiKey = process.env.VLLM_API_KEY;
    const model = request.model || process.env.VLLM_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
    const systemPrompt = request.systemPrompt || ClinicalSystemPrompts.general;

    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push(...request.messages.map(m => ({
      role: m.role,
      content: m.content,
    })));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4096,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      // HIPAA: Do not log response body - may contain reflected PHI
      logger.error({
        event: 'vllm_api_error',
        status: response.status,
      });
      return {
        success: false,
        error: `vLLM API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    // HIPAA: Only log error type, not content
    logger.error({
      event: 'vllm_chat_error',
      errorType: error?.name || 'UnknownError',
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// TOGETHER.AI API (Cloud Inference)
// ============================================================================

async function chatWithTogether(request: ChatRequest): Promise<ChatResponse> {
  try {
    const apiKey = process.env.TOGETHER_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'Together.ai API key not configured (set TOGETHER_API_KEY)',
      };
    }

    const model = request.model || process.env.TOGETHER_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
    const systemPrompt = request.systemPrompt || ClinicalSystemPrompts.general;

    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push(...request.messages.map(m => ({
      role: m.role,
      content: m.content,
    })));

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
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
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      // HIPAA: Do not log response body - may contain reflected PHI
      logger.error({
        event: 'together_api_error',
        status: response.status,
      });
      return {
        success: false,
        error: `Together.ai API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    // HIPAA: Only log error type, not content
    logger.error({
      event: 'together_chat_error',
      errorType: error?.name || 'UnknownError',
    });
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

    case 'ollama':
      return chatWithOllama(request);

    case 'vllm':
      return chatWithVLLM(request);

    case 'together':
      return chatWithTogether(request);

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
