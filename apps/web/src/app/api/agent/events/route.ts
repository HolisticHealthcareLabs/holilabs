/**
 * Agent Events SSE Endpoint
 *
 * GET /api/agent/events
 *
 * Server-Sent Events stream: clinicians subscribe once on page load.
 * Whenever an MCP tool completes, an event is pushed — frontend
 * invalidates the relevant React Query keys so data updates without
 * navigation.
 *
 * Connection lifecycle: client reconnects automatically via EventSource;
 * server cleans up the listener on close.
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { agentEventBus } from '@/lib/mcp/agent-event-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ROLES = ['CLINICIAN', 'PHYSICIAN', 'NURSE', 'ADMIN'];

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userRole = (session.user as any).role as string;
    if (!ALLOWED_ROLES.includes(userRole)) {
        return new Response('Forbidden', { status: 403 });
    }

    const clinicianId = (session.user as any).id as string;

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            // Heartbeat to prevent proxy timeouts
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch {
                    clearInterval(heartbeat);
                }
            }, 25_000);

            // Initial connection event
            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'connected', clinicianId })}\n\n`)
            );

            // Subscribe to tool events for this clinician
            const unsubscribe = agentEventBus.subscribe((event) => {
                if (event.clinicianId !== clinicianId) return;

                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                    );
                } catch {
                    // Client disconnected
                    unsubscribe();
                    clearInterval(heartbeat);
                }
            });

            // Cleanup when client disconnects
            request.signal.addEventListener('abort', () => {
                unsubscribe();
                clearInterval(heartbeat);
                try { controller.close(); } catch { /* already closed */ }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}
