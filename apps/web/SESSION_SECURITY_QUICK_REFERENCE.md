# Session Security Quick Reference

Quick reference for developers working with session security features.

---

## Session Timeouts

```typescript
// Configuration
{
  session: {
    maxAge: 15 * 60,      // 15 min idle timeout
    updateAge: 5 * 60,    // Update every 5 min
  },
  jwt: {
    maxAge: 8 * 60 * 60,  // 8 hour absolute timeout
  }
}
```

| Timeout Type | Duration | Behavior |
|--------------|----------|----------|
| Idle | 15 minutes | Extends on activity |
| Absolute | 8 hours | Never extends |
| Token Rotation | 5 minutes | Automatic |

---

## Token Revocation

### Revoke Single Token
```typescript
import { getTokenRevocationService, RevocationReason } from '@/lib/auth/token-revocation';

const service = getTokenRevocationService();
await service.revokeToken(
  token,
  userId,
  RevocationReason.LOGOUT,
  expiresAt,
  { ipAddress, userAgent }
);
```

### Revoke All User Tokens
```typescript
await service.revokeAllUserTokens(
  userId,
  RevocationReason.PASSWORD_CHANGED,
  { ipAddress }
);
```

### Check if Token Revoked
```typescript
import { checkTokenRevocation } from '@/lib/auth/token-revocation';

const { isRevoked, reason } = await checkTokenRevocation(token);
if (isRevoked) {
  // Handle revoked token
}
```

---

## Session Tracking

### Create Session
```typescript
import { getSessionTrackingService } from '@/lib/auth/session-tracking';

const service = getSessionTrackingService();
const session = await service.createSession(
  userId,
  'CLINICIAN', // or 'PATIENT'
  ipAddress,
  userAgent,
  token,
  {
    maxConcurrentSessions: 3,
    maxIdleMinutes: 15,
    maxAbsoluteHours: 8,
  }
);
```

### Validate Session
```typescript
const validation = await service.validateSession(
  sessionId,
  ipAddress,
  userAgent
);

if (!validation.valid) {
  // Handle invalid session
}
```

### Get User Sessions
```typescript
const sessions = await service.getUserSessions(userId);
console.log(`User has ${sessions.length} active sessions`);
```

### Terminate Session
```typescript
await service.terminateSession(
  sessionId,
  RevocationReason.LOGOUT,
  { reason: 'User requested termination' }
);
```

---

## Session Security

### Validate Session Security
```typescript
import { validateSessionSecurity } from '@/lib/auth/session-security';

const validation = await validateSessionSecurity(
  request,
  sessionId,
  userId
);

if (!validation.valid) {
  if (validation.shouldTerminate) {
    // Session hijacking detected
  }
  // Handle invalid session
}
```

### Get Client Info
```typescript
import { getClientIp, getUserAgent } from '@/lib/auth/session-security';

const ipAddress = getClientIp(request);
const userAgent = getUserAgent(request);
```

---

## Authentication Monitor

### Record Failed Attempt
```typescript
import { AuthenticationMonitor } from '@/lib/auth/session-security';

const result = await AuthenticationMonitor.recordFailedAttempt(
  email,
  ipAddress
);

if (result.isLocked) {
  console.log(`Account locked until ${result.lockoutEndsAt}`);
}
```

### Check if Locked
```typescript
const { isLocked, lockoutEndsAt } = await AuthenticationMonitor.isLocked(email);

if (isLocked) {
  return { error: `Account locked until ${lockoutEndsAt}` };
}
```

### Clear Failed Attempts
```typescript
// On successful login
await AuthenticationMonitor.clearFailedAttempts(email);
```

### Unlock Account (Admin)
```typescript
await AuthenticationMonitor.unlockAccount(email, adminUserId);
```

---

## Password Reset

### Request Password Reset
```typescript
import { getPasswordResetService } from '@/lib/auth/password-reset';

const service = getPasswordResetService();
const result = await service.requestPatientReset(
  email,
  ipAddress,
  userAgent
);

console.log(result.message);
// Development only: console.log(result.resetUrl);
```

### Validate Reset Token
```typescript
const validation = await service.validateResetToken(token);

if (!validation.valid) {
  console.log(validation.reason);
}
```

### Reset Password
```typescript
const result = await service.resetPatientPassword(
  token,
  newPassword,
  ipAddress
);

if (result.success) {
  // Password reset successful
}
```

---

## API Endpoints

### Password Reset

```bash
# Request reset
POST /api/auth/reset-password/request
{
  "email": "user@example.com",
  "userType": "PATIENT"
}

# Reset password
PUT /api/auth/reset-password
{
  "token": "abc123...",
  "newPassword": "NewSecure123!",
  "userType": "PATIENT"
}

# Validate token
GET /api/auth/reset-password/validate?token=abc123
```

### Session Management

```bash
# Get sessions
GET /api/auth/sessions

# Terminate specific session
DELETE /api/auth/sessions?sessionId=abc123

# Terminate all sessions
DELETE /api/auth/sessions
```

---

## Rate Limiting

### Password Reset Rate Limit
```typescript
import { PasswordResetRateLimiter } from '@/lib/auth/session-security';

const limit = await PasswordResetRateLimiter.checkRateLimit(email);

if (!limit.allowed) {
  console.log(`Rate limit exceeded. Try again at ${limit.resetAt}`);
}

// Record request
await PasswordResetRateLimiter.recordRequest(email);
```

**Limits:**
- Password reset: 3 requests/hour per email
- Login attempts: 5 before lockout

---

## Common Patterns

### Middleware Pattern
```typescript
export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.redirect('/auth/login');
  }

  // Validate session security
  const validation = await validateSessionSecurity(
    request,
    session.sessionId,
    session.user.id
  );

  if (!validation.valid) {
    await signOut();
    return NextResponse.redirect('/auth/login?error=session_invalid');
  }

  return NextResponse.next();
}
```

### Login Handler Pattern
```typescript
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // Check if account is locked
  const lockStatus = await AuthenticationMonitor.isLocked(email);
  if (lockStatus.isLocked) {
    return NextResponse.json(
      { error: `Account locked until ${lockStatus.lockoutEndsAt}` },
      { status: 403 }
    );
  }

  // Attempt authentication
  const user = await authenticateUser(email, password);

  if (!user) {
    // Record failed attempt
    await AuthenticationMonitor.recordFailedAttempt(
      email,
      getClientIp(request)
    );
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Clear failed attempts on success
  await AuthenticationMonitor.clearFailedAttempts(email);

  // Create session
  const sessionService = getSessionTrackingService();
  await sessionService.createSession(
    user.id,
    'PATIENT',
    getClientIp(request),
    getUserAgent(request),
    token
  );

  return NextResponse.json({ success: true });
}
```

### Logout Handler Pattern
```typescript
export async function POST(request: NextRequest) {
  const session = await auth();

  if (session) {
    // Revoke token
    const revocationService = getTokenRevocationService();
    await revocationService.revokeToken(
      token,
      session.user.id,
      RevocationReason.LOGOUT,
      new Date(Date.now() + 8 * 60 * 60 * 1000),
      {
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      }
    );

    // Terminate session
    const sessionService = getSessionTrackingService();
    await sessionService.terminateSession(
      session.sessionId,
      RevocationReason.LOGOUT
    );
  }

  return NextResponse.json({ success: true });
}
```

---

## Environment Variables

Required:
```bash
NEXTAUTH_SECRET=your-secret-here
REDIS_HOST=localhost
REDIS_PORT=6379
```

Optional:
```bash
REDIS_PASSWORD=your-password
REDIS_TLS=true
REDIS_DB=0
```

---

## Security Events to Log

Always log these events:
- `user_signed_in` - Successful login
- `user_signed_out` - User logout
- `token_rotated` - Token rotation
- `token_revoked` - Token revocation
- `session_created` - New session
- `session_terminated` - Session end
- `session_hijacking_detected` - Security alert
- `account_locked` - Lockout triggered
- `password_reset_requested` - Reset initiated
- `password_reset_success` - Password changed

---

## Testing

### Unit Test Example
```typescript
import { getTokenRevocationService } from '@/lib/auth/token-revocation';

describe('Token Revocation', () => {
  it('should revoke token', async () => {
    const service = getTokenRevocationService();
    await service.revokeToken(
      'test-token',
      'user-id',
      RevocationReason.LOGOUT,
      new Date(Date.now() + 3600000)
    );

    const isRevoked = await service.isTokenRevoked('test-token');
    expect(isRevoked).toBe(true);
  });
});
```

### Integration Test Example
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

## Troubleshooting

### Session expires too quickly
- Check `maxAge` setting (should be 15 * 60)
- Verify token rotation is working
- Check Redis connectivity

### Token revocation not working
- Verify Redis is running
- Check circuit breaker state
- Ensure token hash matches

### Account lockout not clearing
- Manually clear: `AuthenticationMonitor.clearFailedAttempts(email)`
- Check Redis key: `auth:failed:{email}`
- Verify TTL is set correctly

### Password reset token invalid
- Check token expiration (1 hour)
- Verify token hasn't been used
- Ensure token hash matches database

---

## Performance Tips

1. **Use Redis for session storage** - Fast lookups
2. **Set appropriate TTLs** - Automatic cleanup
3. **Use circuit breaker** - Fail gracefully
4. **Cache session data** - Reduce DB queries
5. **Batch operations** - Revoke multiple tokens together

---

## Security Best Practices

1. ✅ Always validate session on authenticated requests
2. ✅ Revoke all tokens on password change
3. ✅ Log all security events
4. ✅ Use HTTPS in production
5. ✅ Set secure cookie flags
6. ✅ Implement rate limiting
7. ✅ Monitor for suspicious activity
8. ✅ Regular security audits

---

**For full documentation, see:** `/apps/web/docs/SESSION_MANAGEMENT.md`
