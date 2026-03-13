/**
 * PHI Encryption Utilities — Network Module
 *
 * CYRUS INVARIANT: patientPhone (PII) must be encrypted before any DB write.
 * Uses AES-256-GCM with a versioned key envelope.
 *
 * Key rotation: increment PHI_ENCRYPTION_KEY_VERSION and provide
 * PHI_ENCRYPTION_KEY_V{n} env var. Old versions remain readable for migration.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(version: number): Buffer {
  const raw = process.env[`PHI_ENCRYPTION_KEY_V${version}`];
  if (!raw) {
    throw new Error(`PHI_ENCRYPTION_KEY_V${version} is not set`);
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`PHI_ENCRYPTION_KEY_V${version} must be ${KEY_LENGTH * 2} hex chars`);
  }
  return key;
}

export function getCurrentKeyVersion(): number {
  return parseInt(process.env.PHI_ENCRYPTION_KEY_VERSION ?? '1', 10);
}

export function encryptPHI(plaintext: string): { ciphertext: string; version: number } {
  const version = getCurrentKeyVersion();
  const key = getKey(version);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(hex):tag(hex):ciphertext(hex)
  const ciphertext = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  return { ciphertext, version };
}

export function decryptPHI(ciphertext: string, version: number): string {
  const key = getKey(version);
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(':');
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid ciphertext format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
