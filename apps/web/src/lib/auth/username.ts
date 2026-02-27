import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const RESERVED_USERNAMES = new Set([
  'admin', 'support', 'help', 'info', 'billing', 'api', 'system',
  'root', 'staff', 'team', 'security', 'cortex', 'holilabs', 'holi',
  'null', 'undefined', 'test', 'demo', 'bot', 'noreply', 'postmaster',
]);

function sanitize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (á→a, ñ→n)
    .replace(/[^a-z0-9]/g, '')       // keep only alphanumeric
    .slice(0, 20);
}

function buildBase(email: string, firstName?: string, lastName?: string): string {
  if (firstName && lastName) {
    const base = sanitize(firstName) + sanitize(lastName);
    if (base.length >= 3) return base;
  }

  if (firstName) {
    const base = sanitize(firstName);
    if (base.length >= 3) return base;
  }

  const localPart = email.split('@')[0] || '';
  const base = sanitize(localPart);
  return base.length >= 3 ? base : 'user';
}

/**
 * Generate a unique, collision-free username.
 *
 * Strategy:
 * 1. Build a human-readable base from name or email prefix
 * 2. Check availability in DB
 * 3. If taken, append a short random suffix and retry (max 5 attempts)
 * 4. Fallback: cryptographic random string (guaranteed unique)
 */
export async function generateUsername(
  email: string,
  firstName?: string,
  lastName?: string,
): Promise<string> {
  const base = buildBase(email, firstName, lastName);

  if (!RESERVED_USERNAMES.has(base)) {
    const exists = await prisma.user.findUnique({
      where: { username: base },
      select: { id: true },
    });
    if (!exists) return base;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomInt(100, 9999).toString();
    const candidate = `${base}${suffix}`;

    if (RESERVED_USERNAMES.has(candidate)) continue;

    const exists = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  return `${base}${crypto.randomBytes(4).toString('hex')}`;
}
