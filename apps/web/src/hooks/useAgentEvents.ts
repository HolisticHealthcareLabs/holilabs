'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { AgentToolEvent } from '@/lib/mcp/agent-event-bus';

/**
 * Connects to /api/agent/events SSE stream.
 * Calls onEvent with each tool_completed or tool_failed event so callers
 * can invalidate React Query keys or update local state.
 *
 * @param onEvent Callback fired when a tool completes or fails
 */
export function useAgentEvents(onEvent: (event: AgentToolEvent) => void) {
    const { data: session } = useSession();

    useEffect(() => {
        if (!session?.user) return;

        const eventSource = new EventSource('/api/agent/events');

        eventSource.onmessage = (e) => {
            try {
                const event: AgentToolEvent = JSON.parse(e.data);
                if (event.type === 'tool_completed' || event.type === 'tool_failed') {
                    onEvent(event);
                }
            } catch {
                // Ignore malformed messages
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => eventSource.close();
    }, [session?.user, onEvent]);
}
