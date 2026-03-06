/**
 * WebAuthn signature token helpers
 *
 * Issues short-lived JWTs (120s) to carry WebAuthn assertion results.
 * The token encodes { userId, prescriptionNonce } and is passed to
 * POST /api/prescriptions as signatureData when signatureMethod = 'webauthn'.
 */

import { SignJWT, jwtVerify } from 'jose';

const TOKEN_EXPIRY = '120s';
const ALGORITHM = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function issueWebAuthnToken(
  userId: string,
  prescriptionNonce: string
): Promise<string> {
  return new SignJWT({ userId, prescriptionNonce })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuer('holilabs:webauthn')
    .sign(getSecret());
}

export async function verifyWebAuthnToken(
  token: string
): Promise<{ userId: string; prescriptionNonce: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: 'holilabs:webauthn',
      algorithms: [ALGORITHM],
    });
    const { userId, prescriptionNonce } = payload as {
      userId?: string;
      prescriptionNonce?: string;
    };
    if (!userId || !prescriptionNonce) return null;
    return { userId, prescriptionNonce };
  } catch {
    return null;
  }
}
