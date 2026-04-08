'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAgentEvents } from '@/hooks/useAgentEvents';
import { toast } from '@/hooks/use-toast';
import type { AgentToolEvent } from '@/lib/mcp/agent-event-bus';
import { mutate } from 'swr';

/**
 * Invisible component that bridges agent MCP tool events to the UI.
 *
 * Mounted once in the dashboard layout, it:
 *  1. Subscribes to the /api/agent/events SSE stream via useAgentEvents
 *  2. Calls router.refresh() so server-rendered data re-fetches
 *  3. Invalidates any matching SWR cache keys
 *  4. Dispatches a DOM CustomEvent so client components can opt-in to refetch
 *  5. Shows a toast so the clinician knows an agent action completed
 */
export function AgentEventSync() {
    const router = useRouter();

    const handleEvent = useCallback(
        (event: AgentToolEvent) => {
            const entities = event.affectedEntities ?? [];
            if (entities.length === 0) return;

            // 1. Re-render server components / revalidate Next.js cache
            router.refresh();

            // 2. Invalidate SWR keys that contain any affected entity
            for (const entity of entities) {
                mutate(
                    (key: string) =>
                        typeof key === 'string' && key.includes(entity),
                    undefined,
                    { revalidate: true },
                );
            }

            // 3. Broadcast DOM event for client components
            window.dispatchEvent(
                new CustomEvent('agent-data-changed', {
                    detail: { entities, tool: event.tool },
                }),
            );

            // 4. Toast notification
            if (event.type === 'tool_completed') {
                toast({
                    title: 'Agent action completed',
                    description: humanize(event.tool),
                });
            } else if (event.type === 'tool_failed') {
                toast({
                    title: 'Agent action failed',
                    description: humanize(event.tool),
                    variant: 'destructive',
                });
            }
        },
        [router],
    );

    useAgentEvents(handleEvent);

    return null;
}

/** Turn snake_case tool name into readable text: create_patient → "Created patient" */
function humanize(tool: string): string {
    const words = tool.split('_');
    const verb = words[0];
    const rest = words.slice(1).join(' ');

    const pastTense: Record<string, string> = {
        create: 'Created',
        update: 'Updated',
        delete: 'Deleted',
        send: 'Sent',
        complete: 'Completed',
        cancel: 'Cancelled',
        reschedule: 'Rescheduled',
        refill: 'Refilled',
        revoke: 'Revoked',
        start: 'Started',
        share: 'Shared',
        mark: 'Marked',
        add: 'Added',
    };

    return `${pastTense[verb] ?? verb} ${rest}`;
}
