# Session Management & Token Security

Comprehensive guide to session security, token management, and authentication controls in the Holi Labs platform.

## Table of Contents

1. [Overview](#overview)
2. [Session Configuration](#session-configuration)
3. [Token Lifecycle](#token-lifecycle)
4. [Token Revocation](#token-revocation)
5. [Session Tracking](#session-tracking)
6. [Session Hijacking Protection](#session-hijacking-protection)
7. [Password Reset Flow](#password-reset-flow)
8. [Account Lockout](#account-lockout)
9. [API Reference](#api-reference)
10. [Security Considerations](#security-considerations)
11. [Compliance](#compliance)

---

## Overview

The Holi Labs platform implements enterprise-grade session security with:

- **15-minute idle timeout** (sliding window)
- **8-hour absolute session timeout**
- **Token rotation** every 5 minutes
- **Concurrent session limits** (max 3 sessions per user)
- **Session hijacking detection**
- **Automatic token revocation** on security events
- **Account lockout** after 5 failed login attempts
- **Secure password reset** with 1-hour token expiration

### Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ JWT Token
       ▼
┌─────────────┐      ┌─────────────┐
│  NextAuth   │◄────►│   Redis     │
│   (JWT)     │      │  (Sessions) │
└──────┬──────┘      └─────────────┘
       │
       ▼
┌─────────────┐      ┌─────────────┐
│  Prisma DB  │◄────►│   Audit     │
│  (Users)    │      │    Logs     │
└─────────────┘      └─────────────┘
```

---

## Session Configuration

### NextAuth Configuration

Both clinician and patient authentication systems use the following session settings:

```typescript
{
  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // 15 minutes idle timeout (sliding window)
    updateAge: 5 * 60, // Update session every 5 minutes of activity
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours absolute timeout
  }
}
```

### Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `maxAge` | 15 minutes | Idle timeout - session expires after 15 minutes of inactivity |
| `updateAge` | 5 minutes | Sliding window - session extends on activity every 5 minutes |
| `jwt.maxAge` | 8 hours | Absolute timeout - session expires after 8 hours regardless of activity |

### Sliding Window Behavior

1. User signs in at 9:00 AM
2. Session expires at 9:15 AM (idle timeout)
3. User makes request at 9:10 AM
4. Session now expires at 9:25 AM (extended by 15 minutes)
5. Maximum expiration: 5:00 PM (8 hours from initial sign-in)

---

## Token Lifecycle

### JWT Token Structure

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "CLINICIAN",
  "sessionId": "unique-session-id",
  "iat": 1234567890,
  "exp": 1234596690,
  "rotatedAt": 1234578490
}
```

### Token Rotation

Tokens are automatically rotated every 5 minutes of activity:

1. Client makes authenticated request
2. Server checks token age (`now - iat`)
3. If token is >5 minutes old, server issues new token
4. Old token is added to revocation list
5. Client receives new token in response

**Benefits:**
- Reduces impact of token theft
- Limits exposure window to 5 minutes
- Automatic and transparent to user

---

## Token Revocation

### Revocation Service

Location: `/apps/web/src/lib/auth/token-revocation.ts`

The token revocation service maintains a blocklist in Redis for revoked tokens.

### Revocation Reasons

```typescript
enum RevocationReason {
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SECURITY_BREACH = 'SECURITY_BREACH',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ADMIN_REVOKED = 'ADMIN_REVOKED',
  CONCURRENT_LIMIT = 'CONCURRENT_LIMIT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}
```

### Usage

#### Revoke Single Token

```typescript
import { getTokenRevocationService, RevocationReason } from '@/lib/auth/token-revocation';

const revocationService = getTokenRevocationService();

await revocationService.revokeToken(
  token,
  userId,
  RevocationReason.LOGOUT,
  expiresAt,
  { ipAddress, userAgent }
);
```

#### Revoke All User Tokens

```typescript
await revocationService.revokeAllUserTokens(
  userId,
  RevocationReason.PASSWORD_CHANGED,
  { ipAddress, userAgent }
);
```

#### Check if Token is Revoked

```typescript
import { checkTokenRevocation } from '@/lib/auth/token-revocation';

const { isRevoked, reason } = await checkTokenRevocation(token);

if (isRevoked) {
  // Handle revoked token
}
```

### Automatic Revocation Events

Tokens are automatically revoked when:

1. **User logs out** - Single token revoked
2. **Password changed** - All tokens revoked
3. **Account locked** - All tokens revoked
4. **Session hijacking detected** - Affected session revoked
5. **Concurrent session limit exceeded** - Oldest session revoked
6. **Admin action** - Specific or all tokens revoked

---

## Session Tracking

### Session Tracking Service

Location: `/apps/web/src/lib/auth/session-tracking.ts`

Tracks active sessions with device information for security monitoring.

### Session Metadata

```typescript
interface SessionMetadata {
  sessionId: string;
  userId: string;
  userType: 'CLINICIAN' | 'PATIENT';
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}
```

### Concurrent Session Limits

**Default Limits:**
- Maximum concurrent sessions: 3
- When 4th session starts, oldest session is terminated
- User is notified via audit log

**Configuration:**

```typescript
const limits: SessionLimits = {
  maxConcurrentSessions: 3,
  maxIdleMinutes: 15,
  maxAbsoluteHours: 8,
};
```

### Creating a Session

```typescript
import { getSessionTrackingService } from '@/lib/auth/session-tracking';

const sessionService = getSessionTrackingService();

const session = await sessionService.createSession(
  userId,
  'CLINICIAN',
  ipAddress,
  userAgent,
  token,
  limits
);
```

### Viewing Active Sessions

Users can view their active sessions via the API:

```bash
GET /api/auth/sessions
```

Response:
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "abc123",
      "deviceInfo": {
        "userAgent": "Chrome 120.0",
        "ipAddress": "192.168.1.1"
      },
      "activity": {
        "createdAt": "2025-12-15T10:00:00Z",
        "lastActivityAt": "2025-12-15T10:30:00Z",
        "expiresAt": "2025-12-15T18:00:00Z"
      }
    }
  ],
  "count": 1
}
```

---

## Session Hijacking Protection

### Device Fingerprinting

Each session is tied to a unique device fingerprint generated from:
- IP address
- User agent string

```typescript
const fingerprint = generateDeviceFingerprint(ipAddress, userAgent);
// SHA-256 hash: a7f3e9b2c1d4...
```

### Validation on Each Request

```typescript
import { validateSessionSecurity } from '@/lib/auth/session-security';

const validation = await validateSessionSecurity(
  request,
  sessionId,
  userId
);

if (!validation.valid) {
  // Handle invalid session
  if (validation.shouldTerminate) {
    // Session hijacking detected - terminate session
  }
}
```

### Detection Scenarios

1. **IP Address Change**
   - If device fingerprint changes, session is flagged
   - Session is terminated and user must re-authenticate

2. **User Agent Change**
   - Browser or device change detected
   - Session is terminated for security

3. **Geographic Anomalies** (Future)
   - Rapid geographic location changes
   - Alert user and require re-authentication

### Response to Hijacking

When hijacking is detected:
1. Session is immediately terminated
2. Token is revoked
3. Security event is logged
4. User is notified via email (future enhancement)
5. Admin alert is triggered (future enhancement)

---

## Password Reset Flow

### Password Reset Service

Location: `/apps/web/src/lib/auth/password-reset.ts`

Secure password reset with single-use tokens and rate limiting.

### Request Password Reset

**API Endpoint:** `POST /api/auth/reset-password/request`

```bash
curl -X POST http://localhost:3000/api/auth/reset-password/request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "userType": "PATIENT"
  }'
```

Response:
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### Token Properties

- **Format:** 64-character hexadecimal string
- **Storage:** SHA-256 hash in database
- **Expiration:** 1 hour
- **Single-use:** Marked as used after successful reset
- **Rate limiting:** 3 requests per hour per email

### Reset Password

**API Endpoint:** `PUT /api/auth/reset-password`

```bash
curl -X PUT http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123...",
    "newPassword": "NewSecurePassword123!",
    "userType": "PATIENT"
  }'
```

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

### Security Features

1. **Email Enumeration Prevention**
   - Always returns success message
   - Same response for valid and invalid emails

2. **Rate Limiting**
   - Maximum 3 requests per hour per email
   - Enforced via Redis

3. **Single-Use Tokens**
   - Token marked as used after successful reset
   - Cannot be reused

4. **Automatic Session Revocation**
   - All existing sessions terminated on password change
   - User must re-authenticate

---

## Account Lockout

### Authentication Monitor

Location: `/apps/web/src/lib/auth/session-security.ts` (AuthenticationMonitor class)

### Lockout Configuration

| Setting | Value |
|---------|-------|
| Max failed attempts | 5 |
| Lockout duration | 15 minutes |
| Counter reset | After successful login |

### Failed Attempt Tracking

```typescript
import { AuthenticationMonitor } from '@/lib/auth/session-security';

const result = await AuthenticationMonitor.recordFailedAttempt(
  email,
  ipAddress
);

if (result.isLocked) {
  // Account is locked
  console.log(`Locked until: ${result.lockoutEndsAt}`);
}
```

### Checking Lockout Status

```typescript
const { isLocked, lockoutEndsAt } = await AuthenticationMonitor.isLocked(email);

if (isLocked) {
  return {
    error: 'Account locked',
    message: `Too many failed login attempts. Please try again after ${lockoutEndsAt}`,
  };
}
```

### Clearing Failed Attempts

```typescript
// On successful authentication
await AuthenticationMonitor.clearFailedAttempts(email);
```

### Manual Unlock (Admin)

```typescript
await AuthenticationMonitor.unlockAccount(email, adminUserId);
```

### Lockout Behavior

1. User enters wrong password (attempt 1/5)
2. Failed attempt counter increments
3. After 5 failed attempts, account is locked
4. Lockout expires after 15 minutes
5. User can attempt login again
6. Successful login resets counter to 0

---

## API Reference

### Password Reset Endpoints

#### Request Password Reset
```
POST /api/auth/reset-password/request
Body: { email: string, userType: 'CLINICIAN' | 'PATIENT' }
Response: { success: boolean, message: string }
```

#### Reset Password
```
PUT /api/auth/reset-password
Body: { token: string, newPassword: string, userType: string }
Response: { success: boolean, message: string }
```

#### Validate Reset Token
```
GET /api/auth/reset-password/validate?token=abc123
Response: { valid: boolean, message?: string }
```

### Session Management Endpoints

#### Get Active Sessions
```
GET /api/auth/sessions
Response: { success: boolean, sessions: SessionMetadata[], count: number }
```

#### Terminate Specific Session
```
DELETE /api/auth/sessions?sessionId=abc123
Response: { success: boolean, message: string }
```

#### Terminate All Sessions
```
DELETE /api/auth/sessions
Response: { success: boolean, message: string, count: number }
```

---

## Security Considerations

### Token Storage

**Frontend (Client):**
- Tokens stored in HTTP-only cookies
- Secure flag enabled in production
- SameSite=Lax for CSRF protection
- Never stored in localStorage or sessionStorage

**Backend (Server):**
- Revoked tokens stored in Redis with TTL
- Token hashes (SHA-256) stored in database
- Session metadata in Redis with automatic expiration

### Token Transmission

- Always use HTTPS in production
- Token included in Authorization header or cookie
- Never pass tokens in URL query parameters
- Validate token signature on every request

### Session Security Best Practices

1. **Always validate device fingerprint**
   - Check on every authenticated request
   - Terminate session on mismatch

2. **Monitor for suspicious activity**
   - Geographic anomalies
   - Unusual access patterns
   - Multiple failed attempts

3. **Log security events**
   - All authentication attempts
   - Session creation/termination
   - Token revocation
   - Password changes

4. **Rate limit authentication endpoints**
   - Password reset requests
   - Login attempts
   - Token validation

5. **Implement proper token rotation**
   - Rotate tokens every 5 minutes
   - Revoke old tokens immediately
   - Track rotation in audit logs

---

## Compliance

### HIPAA Compliance

This implementation satisfies the following HIPAA requirements:

#### §164.312(a)(2)(i) - Unique User Identification
- Each session has unique session ID
- Device fingerprinting for user verification
- Audit logs track all authentication events

#### §164.312(a)(2)(ii) - Emergency Access Procedure
- Admin can manually unlock accounts
- Override mechanisms for legitimate emergencies

#### §164.312(a)(2)(iii) - Automatic Logoff
- 15-minute idle timeout
- 8-hour absolute timeout
- Automatic session termination

#### §164.312(a)(2)(iv) - Encryption and Decryption
- Tokens signed with HS256 algorithm
- Secure cookies with httpOnly flag
- TLS encryption in transit

### SOC 2 Compliance

#### CC6.1 - Logical and Physical Access Controls
- Multi-factor authentication support
- Session tracking and monitoring
- Automatic session termination
- Account lockout after failed attempts

#### CC6.6 - Logical Access to Data
- Role-based access control (RBAC)
- Session-based permissions
- Token-based authorization

#### CC6.7 - Restriction of Access
- Concurrent session limits
- Device fingerprinting
- IP-based access controls

---

## Maintenance Tasks

### Daily Tasks

```typescript
// Clean up expired revocation records
const revocationService = getTokenRevocationService();
await revocationService.cleanupExpiredRevocations();
```

### Weekly Tasks

```typescript
// Clean up expired password reset tokens
const passwordResetService = getPasswordResetService();
await passwordResetService.cleanupExpiredTokens();

// Clean up expired sessions
const sessionService = getSessionTrackingService();
await sessionService.cleanupExpiredSessions();
```

### Monthly Tasks

1. Review audit logs for suspicious activity
2. Analyze session metrics (duration, device types)
3. Review and update security policies
4. Test account lockout and password reset flows

---

## Troubleshooting

### Issue: User can't log in after password reset

**Cause:** Sessions not properly revoked after password change

**Solution:**
```typescript
// Manually revoke all sessions
const revocationService = getTokenRevocationService();
await revocationService.revokeAllUserTokens(userId, RevocationReason.PASSWORD_CHANGED);
```

### Issue: Session expired too quickly

**Cause:** Idle timeout too aggressive or sliding window not working

**Solution:**
- Check `maxAge` and `updateAge` settings
- Verify token rotation is happening
- Check Redis connectivity

### Issue: Account locked but user claims correct password

**Cause:** Failed attempt counter not reset after successful login

**Solution:**
```typescript
// Clear failed attempts manually
await AuthenticationMonitor.clearFailedAttempts(email);
```

### Issue: Token revocation not working

**Cause:** Redis not available or circuit breaker open

**Solution:**
- Check Redis connectivity: `await getCacheClient().ping()`
- Check circuit breaker state: `getCacheClient().getMetrics()`
- Restart Redis if needed

---

## Migration Guide

### Applying Database Migrations

```bash
cd apps/web
npx prisma migrate deploy
```

### Updating Existing Users

```sql
-- Add security columns to User table
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);

-- Add security columns to patient_users table
ALTER TABLE "patient_users"
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);
```

---

## Testing

### Unit Tests

```bash
npm test -- token-revocation.test.ts
npm test -- session-tracking.test.ts
npm test -- password-reset.test.ts
```

### Integration Tests

```bash
# Test password reset flow
curl -X POST http://localhost:3000/api/auth/reset-password/request \
  -d '{"email":"test@example.com","userType":"PATIENT"}'

# Test session management
curl -X GET http://localhost:3000/api/auth/sessions \
  -H "Cookie: next-auth.session-token=..."

# Test account lockout
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

---

## Support

For questions or issues:
- GitHub Issues: [holilabsv2/issues](https://github.com/holilabs/holilabsv2/issues)
- Security concerns: security@holilabs.com
- Documentation: [docs.holilabs.com](https://docs.holilabs.com)

---

**Last Updated:** December 15, 2025
**Version:** 1.0.0
**Author:** Agent 23 - Session Management & Token Security
