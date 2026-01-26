/**
 * Mock API Responses for AI Provider Tests
 *
 * All data is SYNTHETIC - NO PHI
 * These mocks simulate responses from various AI providers
 */

// =============================================================================
// Ollama Mocks
// =============================================================================

export const mockOllamaResponse = {
  model: 'phi3',
  created_at: '2024-01-01T00:00:00Z',
  response: 'This is a synthetic test response from Ollama.',
  done: true,
  total_duration: 1500000000,
  load_duration: 100000000,
  prompt_eval_count: 50,
  prompt_eval_duration: 500000000,
  eval_count: 100,
  eval_duration: 900000000,
};

export const mockOllamaChatResponse = {
  model: 'phi3',
  created_at: '2024-01-01T00:00:00Z',
  message: {
    role: 'assistant',
    content: 'This is a synthetic chat response from Ollama.',
  },
  done: true,
  total_duration: 1500000000,
};

export const mockOllamaModelsResponse = {
  models: [
    { name: 'phi3', modified_at: '2024-01-01T00:00:00Z' },
    { name: 'mistral:7b', modified_at: '2024-01-01T00:00:00Z' },
    { name: 'llama3:8b', modified_at: '2024-01-01T00:00:00Z' },
  ],
};

// =============================================================================
// vLLM Mocks
// =============================================================================

export const mockVLLMResponse = {
  id: 'cmpl-test-123',
  object: 'chat.completion',
  created: 1704067200,
  model: 'mistral-7b',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a synthetic test response from vLLM.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 100,
    total_tokens: 150,
  },
};

export const mockVLLMCompletionResponse = {
  id: 'cmpl-test-456',
  object: 'text_completion',
  created: 1704067200,
  model: 'mistral-7b',
  choices: [
    {
      index: 0,
      text: 'This is a synthetic completion response from vLLM.',
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 100,
    total_tokens: 150,
  },
};

export const mockVLLMModelsResponse = {
  object: 'list',
  data: [
    { id: 'mistral-7b', object: 'model', owned_by: 'local' },
    { id: 'llama-3-8b', object: 'model', owned_by: 'local' },
  ],
};

// =============================================================================
// Together.ai Mocks
// =============================================================================

export const mockTogetherResponse = {
  id: 'together-test-123',
  object: 'chat.completion',
  created: 1704067200,
  model: 'mistralai/Mistral-7B-Instruct-v0.3',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a synthetic test response from Together.ai.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 100,
    total_tokens: 150,
  },
};

export const mockTogetherModelsResponse = {
  object: 'list',
  data: [
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', object: 'model' },
    { id: 'meta-llama/Meta-Llama-3-8B-Instruct', object: 'model' },
    { id: 'epfl-llm/meditron-7b', object: 'model' },
  ],
};

export const mockTogetherEmbeddingsResponse = {
  object: 'list',
  data: [
    {
      object: 'embedding',
      embedding: Array(768).fill(0.1),
      index: 0,
    },
  ],
  model: 'togethercomputer/m2-bert-80M-8k-retrieval',
  usage: {
    prompt_tokens: 10,
    total_tokens: 10,
  },
};

// =============================================================================
// Anthropic/Claude Mocks
// =============================================================================

export const mockAnthropicResponse = {
  id: 'msg-test-123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'This is a synthetic test response from Claude.',
    },
  ],
  model: 'claude-3-5-sonnet-20241022',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 50,
    output_tokens: 100,
  },
};

// =============================================================================
// Gemini Mocks
// =============================================================================

export const mockGeminiResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: 'This is a synthetic test response from Gemini.',
          },
        ],
        role: 'model',
      },
      finishReason: 'STOP',
      index: 0,
    },
  ],
  usageMetadata: {
    promptTokenCount: 50,
    candidatesTokenCount: 100,
    totalTokenCount: 150,
  },
};

// =============================================================================
// Chat Response Mocks (for router tests)
// =============================================================================

export const mockChatSuccessResponse = {
  success: true,
  message: 'This is a synthetic response for testing routing.',
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  usage: {
    promptTokens: 50,
    completionTokens: 100,
    totalTokens: 150,
  },
};

export const mockChatErrorResponse = {
  success: false,
  error: 'Provider temporarily unavailable',
  provider: 'gemini',
};
