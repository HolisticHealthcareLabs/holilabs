/**
 * Vertex AI Provider for Google Cloud
 *
 * Replaces the direct @google/generative-ai (API key) Gemini integration
 * with Vertex AI for production deployments on GCP.
 *
 * Advantages over direct API key:
 *   - VPC-level isolation (no PII over public internet)
 *   - Data residency guarantees (southamerica-east1)
 *   - No data retention for model training
 *   - Cloud Audit Logs integration
 *   - IAM-based auth (no API key to manage)
 *
 * Activated by setting AI_GEMINI_BACKEND=vertex in environment.
 * Falls back to the direct @google/generative-ai SDK otherwise.
 */

import { AIProvider } from './provider-interface';
import logger from '@/lib/logger';

const GCP_PROJECT = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
const GCP_LOCATION = process.env.VERTEX_AI_LOCATION || 'southamerica-east1';
const DEFAULT_MODEL = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash';

export class VertexAIProvider implements AIProvider {
  private project: string;
  private location: string;
  private modelId: string;
  private client: any = null;

  constructor(options?: {
    project?: string;
    location?: string;
    model?: string;
  }) {
    this.project = options?.project || GCP_PROJECT || '';
    this.location = options?.location || GCP_LOCATION;
    this.modelId = options?.model || DEFAULT_MODEL;

    if (!this.project) {
      throw new Error(
        'VertexAIProvider requires GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT env var'
      );
    }
  }

  private async getClient() {
    if (this.client) return this.client;

    try {
      const { VertexAI } = await import('@google-cloud/vertexai');
      const vertexAI = new VertexAI({
        project: this.project,
        location: this.location,
      });
      this.client = vertexAI.getGenerativeModel({ model: this.modelId });
      return this.client;
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Vertex AI client');
      throw new Error(
        '@google-cloud/vertexai is not installed or GCP auth is missing. ' +
        'Run: pnpm add @google-cloud/vertexai'
      );
    }
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    const model = await this.getClient();

    try {
      const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(context?.systemInstruction && {
          systemInstruction: { parts: [{ text: context.systemInstruction }] },
        }),
      };

      const result = await model.generateContent(request);
      const response = result.response;

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Vertex AI returned empty response');
      }

      logger.info({
        event: 'vertex_ai_response',
        model: this.modelId,
        location: this.location,
        tokenCount: response.usageMetadata?.totalTokenCount,
      });

      return text;
    } catch (error) {
      logger.error({ error, model: this.modelId }, 'Vertex AI generation error');
      throw error;
    }
  }
}

/**
 * Create the appropriate Gemini provider based on configuration.
 *
 * - AI_GEMINI_BACKEND=vertex  -> VertexAIProvider (GCP, IAM auth, VPC isolation)
 * - AI_GEMINI_BACKEND=direct  -> GeminiProvider (API key, public endpoint)
 * - default                   -> GeminiProvider if GEMINI_API_KEY set, else error
 */
export function createGeminiProvider(apiKey?: string): AIProvider {
  const backend = process.env.AI_GEMINI_BACKEND || 'direct';

  if (backend === 'vertex') {
    logger.info({ location: GCP_LOCATION, model: DEFAULT_MODEL }, 'Using Vertex AI backend');
    return new VertexAIProvider();
  }

  const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY required for direct Gemini backend');
  }

  const { GeminiProvider } = require('./gemini-provider');
  return new GeminiProvider(key);
}
