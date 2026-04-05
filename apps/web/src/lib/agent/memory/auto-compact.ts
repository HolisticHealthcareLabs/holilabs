/**
 * Auto-Compact — Context Compression Pipeline
 *
 * Two-stage compression to keep agent conversations within model context windows:
 *
 * 1. MicroCompact: Trim tool results to essential fields mid-conversation.
 *    Runs inline after every tool result.
 *
 * 2. AutoCompact: When token count exceeds threshold, summarize conversation
 *    history while preserving protected categories.
 *
 * ELENA: Never compact CDSS results, clinical findings, or patient decisions.
 * CYRUS: Never compact consent decisions or audit-relevant actions.
 * ARCHIE: Configurable thresholds per model's context window.
 */

import type { ChatMessage, CompactionConfig, TokenUsage } from '@holi/shared-kernel/agent/types';
import { PROTECTED_COMPACTION_CATEGORIES } from '@holi/shared-kernel/agent/types';

// ─── Token Estimation ───────────────────────────────────────────────────────

/**
 * Estimate token count for a string.
 * Uses the ~4 chars/token heuristic (accurate within ~15% for English).
 * For production, swap with tiktoken or provider-specific tokenizer.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Estimate total tokens for a conversation. */
export function estimateConversationTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    // ~4 tokens overhead per message (role, delimiters)
    total += 4 + estimateTokens(msg.content);
  }
  return total;
}

// ─── Model Context Windows ──────────────────────────────────────────────────

export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // Anthropic
  'claude-opus-4-20250514': 200_000,
  'claude-sonnet-4-20250514': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
  // OpenAI
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'o4-mini': 200_000,
  // Google
  'gemini-2.5-pro': 1_000_000,
  'gemini-2.5-flash': 1_000_000,
  // Groq
  'llama-3.3-70b-versatile': 128_000,
  // Mistral
  'mistral-large-latest': 128_000,
  // DeepSeek
  'deepseek-chat': 128_000,
  // Local
  'ollama-default': 32_000,
};

/** Get context window for a model, defaulting conservatively. */
export function getContextWindow(model: string): number {
  return MODEL_CONTEXT_WINDOWS[model] ?? 32_000;
}

// ─── Default Config ─────────────────────────────────────────────────────────

export function defaultCompactionConfig(model: string): CompactionConfig {
  const contextWindow = getContextWindow(model);
  return {
    // Trigger compaction at 70% of context window
    tokenThreshold: Math.floor(contextWindow * 0.7),
    contextWindowSize: contextWindow,
    protectedCategories: PROTECTED_COMPACTION_CATEGORIES,
  };
}

// ─── MicroCompact: Trim Tool Results Inline ─────────────────────────────────

/**
 * Trims a tool result to essential fields, reducing token usage mid-conversation.
 * Applied immediately after each tool result before appending to history.
 *
 * Strategy:
 * - If result is JSON, keep only top-level keys + first N items of arrays
 * - If result is large text, truncate with "[...truncated]" marker
 * - Protected categories are NEVER trimmed
 */
export function microCompact(
  toolName: string,
  resultContent: string,
  config: CompactionConfig,
): string {
  // Check if this tool's output is protected from compaction
  if (isProtectedTool(toolName, config.protectedCategories)) {
    return resultContent;
  }

  const tokens = estimateTokens(resultContent);

  // Small results don't need compaction
  if (tokens < 500) {
    return resultContent;
  }

  // Try JSON compaction first
  try {
    const parsed = JSON.parse(resultContent);
    if (typeof parsed === 'object' && parsed !== null) {
      return JSON.stringify(compactObject(parsed), null, 0);
    }
  } catch {
    // Not JSON — fall through to text truncation
  }

  // Text truncation: keep first 1500 chars (~375 tokens)
  if (resultContent.length > 1500) {
    return resultContent.slice(0, 1500) + '\n[...truncated, full result available via tool re-call]';
  }

  return resultContent;
}

function compactObject(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 2) return { _compacted: true };

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      // Keep first 5 items of arrays, note total count
      if (value.length > 5) {
        result[key] = [...value.slice(0, 5), `[...${value.length - 5} more items]`];
      } else {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = compactObject(value as Record<string, unknown>, depth + 1);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ─── AutoCompact: Summarize Conversation History ────────────────────────────

/**
 * Checks if conversation needs compaction and returns compacted messages.
 * Does NOT call an LLM — uses extractive summarization (key-sentence selection).
 *
 * For LLM-based abstractive summarization, the caller should use the agent's
 * own provider with a summarization prompt. This function handles the
 * structural extraction step.
 *
 * Strategy:
 * 1. Partition messages into protected and compactable
 * 2. Summarize compactable messages into a single "context summary" message
 * 3. Prepend summary + all protected messages
 * 4. Append recent messages (last N turns) verbatim
 */
export function autoCompact(
  messages: ChatMessage[],
  config: CompactionConfig,
): { compacted: boolean; messages: ChatMessage[] } {
  const currentTokens = estimateConversationTokens(messages);

  if (currentTokens <= config.tokenThreshold) {
    return { compacted: false, messages };
  }

  // Keep the last 6 messages (3 turns) verbatim for immediate context
  const RECENT_KEEP = 6;
  const recentMessages = messages.slice(-RECENT_KEEP);
  const olderMessages = messages.slice(0, -RECENT_KEEP);

  if (olderMessages.length === 0) {
    return { compacted: false, messages };
  }

  // Partition older messages
  const protectedMessages: ChatMessage[] = [];
  const compactableMessages: ChatMessage[] = [];

  for (const msg of olderMessages) {
    if (isProtectedMessage(msg, config.protectedCategories)) {
      protectedMessages.push(msg);
    } else {
      compactableMessages.push(msg);
    }
  }

  // Build extractive summary of compactable messages
  const summary = buildExtractiveSummary(compactableMessages);

  const compactedMessages: ChatMessage[] = [];

  // Summary as a system-level context message
  if (summary) {
    compactedMessages.push({
      role: 'system',
      content: `[CONTEXT SUMMARY — Previous conversation compacted to save context space]\n\n${summary}\n\n[END CONTEXT SUMMARY]`,
    });
  }

  // Protected messages preserved verbatim
  compactedMessages.push(...protectedMessages);

  // Recent messages preserved verbatim
  compactedMessages.push(...recentMessages);

  return { compacted: true, messages: compactedMessages };
}

// ─── Extractive Summary Builder ─────────────────────────────────────────────

function buildExtractiveSummary(messages: ChatMessage[]): string {
  if (messages.length === 0) return '';

  const sections: string[] = [];

  // Extract key information from each message type
  const userQuestions: string[] = [];
  const assistantFindings: string[] = [];
  const toolResults: string[] = [];

  for (const msg of messages) {
    switch (msg.role) {
      case 'user':
        // Keep first sentence of user messages
        userQuestions.push(firstSentence(msg.content));
        break;
      case 'assistant':
        // Keep first 100 chars of assistant responses
        if (msg.content.length > 0) {
          assistantFindings.push(
            msg.content.length > 100
              ? msg.content.slice(0, 100) + '...'
              : msg.content,
          );
        }
        break;
      case 'tool':
        // Keep tool name + success/error status
        toolResults.push(summarizeToolResult(msg.content));
        break;
    }
  }

  if (userQuestions.length > 0) {
    sections.push(`**User queries:** ${userQuestions.join(' | ')}`);
  }

  if (assistantFindings.length > 0) {
    // Keep last 3 assistant findings (most recent are most relevant)
    const recent = assistantFindings.slice(-3);
    sections.push(`**Key findings:** ${recent.join(' | ')}`);
  }

  if (toolResults.length > 0) {
    sections.push(`**Tool calls (${toolResults.length} total):** ${toolResults.join(', ')}`);
  }

  return sections.join('\n');
}

// ─── Protection Checks ──────────────────────────────────────────────────────

function isProtectedTool(toolName: string, protectedCategories: Set<string>): boolean {
  // Map tool name prefixes to protected categories
  const protectedPrefixes = [
    'cdss_',           // CDSS results
    'safety_check',    // Safety check results
    'consent_',        // Consent decisions
    'audit_',          // Audit actions
    'governance_',     // Governance events
  ];

  for (const prefix of protectedPrefixes) {
    if (toolName.startsWith(prefix)) return true;
  }

  return protectedCategories.has(toolName);
}

function isProtectedMessage(msg: ChatMessage, protectedCategories: Set<string>): boolean {
  if (msg.role === 'tool') {
    // Check if tool result contains protected content
    try {
      const parsed = JSON.parse(msg.content);
      if (typeof parsed === 'object' && parsed !== null) {
        // Check for CDSS result markers
        if ('trafficLight' in parsed || 'safetyLevel' in parsed || 'cdssResult' in parsed) {
          return true;
        }
        // Check for consent markers
        if ('consentStatus' in parsed || 'consentGranted' in parsed) {
          return true;
        }
      }
    } catch {
      // Not JSON — check for string markers
    }

    // Check for protected category markers in content
    for (const cat of Array.from(protectedCategories)) {
      if (msg.content.includes(cat)) return true;
    }
  }

  return false;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return match ? match[0].trim() : text.slice(0, 80);
}

function summarizeToolResult(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      if ('error' in parsed) return `ERROR: ${String(parsed.error).slice(0, 50)}`;
      if ('blocked' in parsed) return `BLOCKED: ${String(parsed.reason ?? '').slice(0, 50)}`;
      const keys = Object.keys(parsed).slice(0, 3).join(',');
      return `OK({${keys}})`;
    }
  } catch {
    // Not JSON
  }
  return content.length > 30 ? content.slice(0, 30) + '...' : content;
}
