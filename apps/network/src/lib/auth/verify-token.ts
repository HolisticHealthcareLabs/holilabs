/**
 * Token verification for @holi/network routes.
 *
 * Accepts Bearer tokens in two forms:
 *   1. NETWORK_API_KEY — static machine-to-machine key (legacy / cron)
 *   2. NextAuth JWT — base64url(header).base64url(payload).base64url(sig)
 *      verified against NEXTAUTH_SECRET using HS256
 *
 * Uses Node.js crypto directly (no jose dependency) for Edge/Node compat.
 */

import crypto from 'crypto';

export interface NetworkSession {
  userId: string;
  orgId: string;
  role: string;
  email: string;
}

export async function verifyBearerToken(
  authHeader: string | null
): Promise<NetworkSession | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  // Machine-to-machine API key
  const apiKey = process.env.NETWORK_API_KEY;
  if (apiKey && token === apiKey) {
    return {
      userId: 'system',
      orgId: process.env.DEMO_ORG_ID ?? 'demo-org',
      role: 'SYSTEM',
      email: 'system@holi.health',
    };
  }

  // NextAuth HS256 JWT
  return verifyNextAuthJwt(token);
}

function base64urlDecode(str: string): Buffer {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

function verifyNextAuthJwt(token: string): NetworkSession | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;

  try {
    const sigInput = `${headerB64}.${payloadB64}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(sigInput)
      .digest('base64url');

    const expBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sigB64);
    if (expBuf.byteLength !== sigBuf.byteLength) return null;
    if (!crypto.timingSafeEqual(expBuf, sigBuf)) return null;

    const payload = JSON.parse(base64urlDecode(payloadB64).toString('utf-8')) as Record<string, unknown>;

    // Check expiry
    const exp = payload.exp as number | undefined;
    if (exp && Date.now() / 1000 > exp) return null;

    const user = payload.user as Record<string, unknown> | undefined;
    const userId = ((user?.id ?? payload.sub) as string | undefined) ?? null;
    if (!userId) return null;

    return {
      userId,
      orgId: ((user?.organizationId ?? user?.orgId) as string | undefined) ?? (process.env.DEMO_ORG_ID ?? 'demo-org'),
      role: (user?.role as string | undefined) ?? 'CLINICIAN',
      email: (user?.email as string | undefined) ?? '',
    };
  } catch {
    return null;
  }
}
