import { prisma } from '@/lib/prisma';

interface AuditEntry {
  userId?: string;
  userEmail: string;
  ipAddress: string;
  action: string;
  resource: string;
  resourceId: string;
  success: boolean;
  details?: Record<string, unknown>;
}

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER_SIZE = 50;
const MAX_RETRIES = 3;

let buffer: AuditEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

async function flush(): Promise<void> {
  if (flushing || buffer.length === 0) return;

  flushing = true;
  const batch = buffer.splice(0);

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      await prisma.auditLog.createMany({
        data: batch.map((entry) => ({
          ...entry,
          action: entry.action as any,
          details: entry.details as any,
        })),
      });
      flushing = false;
      return;
    } catch (error) {
      attempt++;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      } else {
        console.error(
          '[AuditBuffer] Failed to flush after retries — entries logged below',
          { count: batch.length, error: error instanceof Error ? error.message : String(error) }
        );
        for (const entry of batch) {
          console.error('[AuditBuffer] Dropped entry', JSON.stringify(entry));
        }
      }
    }
  }
  flushing = false;
}

export const auditBuffer = {
  enqueue(entry: AuditEntry): void {
    buffer.push(entry);
    if (buffer.length >= MAX_BUFFER_SIZE) {
      flush();
    }
  },

  start(): void {
    if (!flushTimer) {
      flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    }
  },

  async shutdown(): Promise<void> {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    await flush();
  },

  /** Visible for testing */
  _getBufferLength(): number {
    return buffer.length;
  },

  async _flush(): Promise<void> {
    return flush();
  },
};

// Auto-start on import
auditBuffer.start();

// Graceful shutdown
if (typeof process !== 'undefined') {
  const shutdownHandler = () => {
    auditBuffer.shutdown().catch((err) => {
      console.error('[AuditBuffer] Shutdown flush failed', err);
    });
  };
  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
  process.on('beforeExit', shutdownHandler);
}
