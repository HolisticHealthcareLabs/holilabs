export interface SSEEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export function emitEvent(_event: Omit<SSEEvent, 'id' | 'timestamp'>): void {
  // SSE event emission — stub for development
}
