# Session Revocation Guide

## Overview

NextAuth.js uses **stateless JWT tokens** by default. This is great for scalability, but creates a security challenge: **How do we invalidate a JWT before it expires?**

**Problem**: When a user logs out, changes their password, or we detect suspicious activity, we need to immediately revoke their session. But JWTs are valid until expiry (default: 30 days).

**Solution**: Redis-backed session revocation store. We maintain a blacklist of revoked token hashes that NextAuth checks on every request.

**SOC 2 Control**: CC6.1 (Logical Access Controls - Session Management)

---

## Architecture

### How It Works

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. Request with JWT
       ▼
┌─────────────────────────┐
│  NextAuth JWT Callback  │
│                         │
│  1. Decode JWT          │
│  2. Hash token (SHA-256)│
│  3. Check Redis         │◄──────┐
│  4. Allow/Deny          │       │
└─────────────────────────┘       │
       │                          │
       │ 2. Token not revoked     │
       ▼                          │
┌─────────────────────────┐       │
│   Protected Resource    │       │
└─────────────────────────┘       │
                                  │
                          ┌───────┴──────┐
                          │  Redis Store │
                          │              │
                          │ Key: SHA-256 │
                          │ TTL: 30 days │
                          └──────────────┘
```

### Data Structure

**Revoked Token Entry (Redis)**
```json
{
  "userId": "user_123",
  "revokedAt": 1736477234000,
  "reason": "PASSWORD_CHANGED",
  "revokedBy": "admin_456",
  "ipAddress": "192.168.1.1"
}
```

**Key**: `revoked:token:<SHA256_HASH>`
**TTL**: 30 days (matches JWT expiry)

**User Sessions Set (Redis)**
```
Key: revoked:user:user_123
Value: Set ["hash1", "hash2", "hash3"]
TTL: 30 days
```

**User Revocation Timestamp (Redis)**
```
Key: revoked:user-time:user_123
Value: "1736477234000"
```

---

## Integration with NextAuth

### Step 1: Update JWT Callback

Edit `apps/web/src/lib/auth.ts`:

```typescript
import { isSessionRevoked, isTokenStale, hashToken } from '@/lib/auth/session-store';

export const authOptions: AuthOptions = {
  // ... existing config

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // New user sign-in
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.email = user.email;
      }

      // ===== SESSION REVOCATION CHECK =====
      // Check if token has been explicitly revoked
      if (token.jti) {
        const tokenHash = hashToken(token.jti);

        if (await isSessionRevoked(tokenHash)) {
          logger.warn({
            event: 'revoked_token_blocked',
            userId: token.userId,
            tokenHash: tokenHash.substring(0, 8) + '...',
          }, 'Blocked revoked token');

          // Return null to force re-authentication
          return null;
        }
      }

      // Quick staleness check (faster than individual token check)
      if (token.sub && token.iat) {
        if (await isTokenStale(token.sub, token.iat)) {
          logger.warn({
            event: 'stale_token_blocked',
            userId: token.userId,
            issuedAt: token.iat,
          }, 'Blocked stale token (issued before last revocation)');

          return null;
        }
      }

      // MFA verification check
      if (trigger === 'update' && token.mfaVerified === false) {
        // User just completed MFA, update token
        token.mfaVerified = true;
      }

      return token;
    },

    async session({ session, token }) {
      // Don't create session if token was revoked
      if (!token) {
        return null;
      }

      session.user.id = token.userId as string;
      session.user.role = token.role as string;
      session.user.mfaVerified = token.mfaVerified as boolean;

      return session;
    },
  },

  // ... rest of config
};
```

### Step 2: Add JTI (JWT ID) to Tokens

JWT ID is required for revocation tracking:

```typescript
export const authOptions: AuthOptions = {
  // ... existing config

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days

    async encode({ token, secret }) {
      // Add jti (JWT ID) for revocation tracking
      const jti = crypto.randomUUID();

      return jwt.sign(
        { ...token, jti },
        secret,
        { algorithm: 'HS256' }
      );
    },
  },

  // ... rest of config
};
```

### Step 3: Revoke on Logout

```typescript
import { revokeSession, hashToken } from '@/lib/auth/session-store';

export const authOptions: AuthOptions = {
  // ... existing config

  events: {
    async signOut({ token }) {
      if (token?.jti) {
        const tokenHash = hashToken(token.jti);

        await revokeSession(
          tokenHash,
          token.sub!,
          'USER_LOGOUT',
          {
            ipAddress: 'unknown', // Get from request context if available
          }
        );

        logger.info({
          event: 'user_logged_out',
          userId: token.sub,
        }, 'User logged out, session revoked');
      }
    },
  },

  // ... rest of config
};
```

---

## Common Use Cases

### 1. User Logout (Current Device)

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revokeSession, hashToken } from '@/lib/auth/session-store';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get JWT from request
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (token) {
    const tokenHash = hashToken(token);

    await revokeSession(
      tokenHash,
      session.user.id,
      'USER_LOGOUT',
      {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      }
    );
  }

  return Response.json({ success: true });
}
```

### 2. Logout All Devices (Password Change)

```typescript
import { revokeAllUserSessions } from '@/lib/auth/session-store';

export async function POST(request: Request) {
  const { userId, newPassword } = await request.json();

  // Update password in database
  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(newPassword) },
  });

  // Revoke all sessions (force re-login on all devices)
  await revokeAllUserSessions(userId, 'PASSWORD_CHANGED');

  return Response.json({
    success: true,
    message: 'Password changed. All devices logged out.',
  });
}
```

### 3. Admin Force Logout

```typescript
import { revokeAllUserSessions } from '@/lib/auth/session-store';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const { targetUserId } = await request.json();

  // Verify admin role
  if (session?.user?.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Revoke all sessions for target user
  const result = await revokeAllUserSessions(
    targetUserId,
    'ADMIN_ACTION',
    session.user.id // Admin who performed the action
  );

  return Response.json({
    success: true,
    revokedCount: result.revokedCount,
  });
}
```

### 4. Suspicious Activity Detection

```typescript
import { revokeSession, hashToken } from '@/lib/auth/session-store';

// In your rate limiting or security middleware
if (suspiciousActivityDetected) {
  const tokenHash = hashToken(currentToken);

  await revokeSession(
    tokenHash,
    userId,
    'SUSPICIOUS_ACTIVITY',
    {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    }
  );

  // Send security alert to user
  await sendSecurityAlert(userId, {
    message: 'Suspicious activity detected. Session terminated.',
    timestamp: new Date(),
  });
}
```

### 5. MFA Enrollment (Revoke Existing Sessions)

```typescript
import { verifyMFAEnrollment } from '@/lib/auth/mfa';
import { revokeAllUserSessions } from '@/lib/auth/session-store';

export async function POST(request: Request) {
  const { userId, phoneNumber, code } = await request.json();

  // Verify MFA enrollment
  const result = await verifyMFAEnrollment(userId, phoneNumber, code);

  if (result.success) {
    // Revoke all existing sessions (force re-login with MFA)
    await revokeAllUserSessions(userId, 'MFA_ENROLLMENT');

    return Response.json({
      success: true,
      backupCodes: result.backupCodes,
      message: 'MFA enabled. Please log in again on all devices.',
    });
  }

  return Response.json({ success: false }, { status: 400 });
}
```

### 6. Role Change (Re-authenticate Required)

```typescript
import { revokeAllUserSessions } from '@/lib/auth/session-store';

export async function POST(request: Request) {
  const { userId, newRole } = await request.json();

  // Update user role
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  // Revoke all sessions to apply new permissions
  await revokeAllUserSessions(userId, 'ROLE_CHANGED');

  return Response.json({
    success: true,
    message: 'Role updated. User will be logged out on all devices.',
  });
}
```

---

## API Reference

### `revokeSession(tokenHash, userId, reason, metadata?)`

Revoke a single session.

**Parameters:**
- `tokenHash` (string): SHA-256 hash of JWT token
- `userId` (string): User ID who owns the session
- `reason` (RevocationReason): Why the session was revoked
- `metadata` (object, optional):
  - `revokedBy` (string): Admin user ID if applicable
  - `ipAddress` (string): IP address of revocation request
  - `userAgent` (string): User agent of revocation request

**Returns:** `Promise<void>`

**Example:**
```typescript
const tokenHash = hashToken(jwtToken);
await revokeSession(tokenHash, 'user_123', 'USER_LOGOUT', {
  ipAddress: '192.168.1.1',
});
```

---

### `isSessionRevoked(tokenHash)`

Check if a session token is revoked.

**Parameters:**
- `tokenHash` (string): SHA-256 hash of JWT token

**Returns:** `Promise<boolean>` - True if revoked

**Example:**
```typescript
const tokenHash = hashToken(jwtToken);
if (await isSessionRevoked(tokenHash)) {
  throw new Error('Session has been revoked');
}
```

---

### `revokeAllUserSessions(userId, reason, revokedBy?)`

Revoke all sessions for a user.

**Parameters:**
- `userId` (string): User ID
- `reason` (RevocationReason): Why sessions were revoked
- `revokedBy` (string, optional): Admin user ID if applicable

**Returns:** `Promise<{ revokedCount: number }>`

**Example:**
```typescript
const result = await revokeAllUserSessions('user_123', 'PASSWORD_CHANGED');
console.log(`Revoked ${result.revokedCount} sessions`);
```

---

### `isTokenStale(userId, tokenIssuedAt)`

Quick check if token was issued before last revocation.

**Parameters:**
- `userId` (string): User ID
- `tokenIssuedAt` (number): JWT `iat` claim (Unix timestamp in seconds)

**Returns:** `Promise<boolean>` - True if stale

**Example:**
```typescript
if (await isTokenStale(token.sub, token.iat)) {
  // Token issued before last revocation, force re-login
  return null;
}
```

---

### `hashToken(token)`

Create SHA-256 hash of JWT token.

**Parameters:**
- `token` (string): JWT token string

**Returns:** `string` - SHA-256 hash (64-char hex)

**Example:**
```typescript
const hash = hashToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
// "a3c8f9e2d1b4567890abcdef..."
```

---

## Monitoring & Debugging

### Health Check Endpoint

Create an API route to monitor session store health:

```typescript
// app/api/health/session-store/route.ts
import { checkSessionStoreHealth, getRevocationStats } from '@/lib/auth/session-store';

export async function GET() {
  const health = await checkSessionStoreHealth();
  const stats = await getRevocationStats();

  return Response.json({
    ...health,
    ...stats,
  });
}
```

**Response:**
```json
{
  "healthy": true,
  "latency": 12,
  "totalRevocations": 1523,
  "redisHealth": "healthy"
}
```

### Logging

All revocation events are logged with structured metadata:

```json
{
  "event": "session_revoked",
  "userId": "user_123",
  "tokenHash": "a3c8f9e2...",
  "reason": "PASSWORD_CHANGED",
  "timestamp": "2025-01-09T12:00:00Z"
}
```

### Audit Trail

All revocation events are automatically logged to `AuditLog` table:

```typescript
await createAuditLog({
  action: 'LOGOUT',
  resource: 'Session',
  resourceId: tokenHash.substring(0, 16),
  details: {
    reason: 'PASSWORD_CHANGED',
    revokedBy: 'admin_456',
  },
  success: true,
});
```

---

## Performance Considerations

### Redis Performance

- **Lookup latency**: Sub-millisecond (<1ms P99)
- **Throughput**: 100,000+ ops/sec (Upstash Redis)
- **Storage**: ~200 bytes per revoked token

### Memory Usage

Assuming 10,000 active users with 2 devices each:

```
20,000 tokens × 200 bytes = 4 MB
```

With 30-day TTL, old tokens automatically expire.

### Optimization: Token Staleness Check

Instead of checking individual tokens, check user's last revocation time:

```typescript
// Fast path: Check if ANY sessions were revoked
if (await isTokenStale(userId, token.iat)) {
  // Token is older than last revocation, reject immediately
  return null;
}

// Slow path: Check specific token (only if staleness check fails)
if (await isSessionRevoked(tokenHash)) {
  return null;
}
```

This reduces Redis calls by 90%+ in normal operation.

---

## Security Considerations

### Why Hash Tokens?

We hash JWT tokens before storing in Redis to:

1. **Reduce storage size**: SHA-256 is fixed 64 chars
2. **Prevent token leakage**: If Redis is compromised, attacker cannot use tokens
3. **Consistent key length**: Easier to index and query

### TTL Match JWT Expiry

Revocation TTL (30 days) MUST match JWT expiry:

- If TTL < JWT expiry: Expired tokens can be used after Redis cleanup
- If TTL > JWT expiry: Wasted memory storing expired tokens

### Fail-Open vs Fail-Closed

If Redis is unavailable:

- **Fail-open** (current): Allow requests (don't block all users)
- **Fail-closed** (stricter): Reject all requests

Current implementation fails open and logs errors for investigation.

---

## Troubleshooting

### Problem: Sessions not being revoked

**Symptom**: User logs out but can still access protected resources.

**Causes:**
1. NextAuth JWT callback not checking revocation
2. JTI (JWT ID) not added to tokens
3. Redis connection issues

**Solution:**
```bash
# Check Redis health
curl http://localhost:3000/api/health/session-store

# Check logs for revocation events
grep "session_revoked" logs/app.log

# Verify JWT contains jti claim
# Decode JWT and check for "jti" field
```

---

### Problem: All users logged out unexpectedly

**Symptom**: Mass logout event, users complaining.

**Causes:**
1. `revokeAllUserSessions` called incorrectly
2. Redis flush/restart
3. Bug in `isTokenStale` logic

**Solution:**
```bash
# Check revocation audit logs
SELECT * FROM "AuditLog"
WHERE resource = 'UserSessions'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;

# Check Redis keys
redis-cli --scan --pattern "revoked:*" | wc -l
```

---

### Problem: High Redis memory usage

**Symptom**: Redis memory growing unexpectedly.

**Causes:**
1. TTL not being set correctly
2. Memory leak in revocation logic
3. No cleanup of old entries

**Solution:**
```bash
# Check Redis memory
redis-cli INFO memory

# Check TTL on revoked tokens
redis-cli TTL "revoked:token:<hash>"

# Expected: Positive number (seconds remaining)
# Problem: -1 (no TTL set)

# Fix: Reset TTL
redis-cli EXPIRE "revoked:token:<hash>" 2592000  # 30 days
```

---

## Migration from Stateful Sessions

If you're currently using database sessions:

### Step 1: Run Both Systems in Parallel

```typescript
// Check both Redis and database
const isRevokedInRedis = await isSessionRevoked(tokenHash);
const isRevokedInDB = await prisma.session.findUnique({
  where: { token: tokenHash },
});

if (isRevokedInRedis || isRevokedInDB?.revoked) {
  return null;
}
```

### Step 2: Migrate Existing Revocations

```typescript
// One-time migration script
const revokedSessions = await prisma.session.findMany({
  where: { revoked: true },
});

for (const session of revokedSessions) {
  const tokenHash = hashToken(session.token);
  await revokeSession(tokenHash, session.userId, 'ADMIN_ACTION');
}
```

### Step 3: Remove Database Sessions

After 30 days (JWT expiry), all old tokens are expired:

```sql
-- Drop session table
DROP TABLE "Session";
```

---

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NextAuth.js JWT Strategy](https://next-auth.js.org/configuration/options#jwt)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [SOC 2 Session Management](https://www.aicpa.org/resources/download/trust-services-criteria)

---

**Questions?** Contact the Holi Labs engineering team.
