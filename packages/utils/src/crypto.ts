import { createHash, randomBytes } from 'crypto';

export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function generateSecret(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}
