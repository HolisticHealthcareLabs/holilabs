'use client';

import { useState } from 'react';
import type { SSEEvent } from '@/lib/events/emit';

interface UseEventStreamOptions {
  url?: string;
  enabled?: boolean;
}

export function useEventStream(_options?: UseEventStreamOptions) {
  const [events] = useState<SSEEvent[]>([]);
  const [isConnected] = useState(false);

  return { events, isConnected };
}
