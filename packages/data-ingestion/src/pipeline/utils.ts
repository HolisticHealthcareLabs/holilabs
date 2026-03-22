import { createHash } from 'crypto';

let jobCounter = 0;
let ingestCounter = 0;

export function createJobId(): string {
  return `job_${Date.now()}_${++jobCounter}`;
}

export function createIngestId(): string {
  return `ing_${Date.now()}_${++ingestCounter}`;
}

export function hashRawData(raw: unknown): string {
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}
