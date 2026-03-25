/**
 * POST /api/ai/stream
 *
 * Server-Sent Events endpoint for streaming AI chat responses.
 * Routes through AIProviderV2.stream() via the gateway pipeline.
 *
 * @compliance De-identification enforced via gateway before any data
 * reaches the provider. RUTH invariant: no raw PHI leaves the server.
 */

import { NextRequest } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { streamV2, type ChatV2Request } from '@/lib/ai/chat';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();

    const {
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      workspaceId,
    } = body as ChatV2Request;

    if (!messages?.length) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const userId = (context as any).session?.user?.id ?? 'system';

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const gen = streamV2({
            messages,
            provider,
            model,
            temperature,
            maxTokens,
            systemPrompt,
            workspaceId,
            userId,
          });

          for await (const chunk of gen) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));

            if (chunk.type === 'done') {
              break;
            }
          }
        } catch (error: any) {
          logger.error({
            event: 'ai_stream_error',
            provider,
            errorType: error?.name || 'UnknownError',
          });
          const errPayload = `data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`;
          controller.enqueue(encoder.encode(errPayload));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'] },
);
