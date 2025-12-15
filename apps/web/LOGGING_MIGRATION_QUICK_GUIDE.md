# Quick Reference: Console to Structured Logging Migration

## One-Line Summary
Replace all `console.log/error/warn` with `logger.info/error/warn` using structured JSON objects.

## Step-by-Step Process

### 1. Add Logger Import
```typescript
import { logger } from '@/lib/logger';
```
Place this after other imports, before the main code.

### 2. Replace Console Statements

#### Pattern: console.error
```typescript
// BEFORE
console.error('Failed to connect:', error);

// AFTER
logger.error({
  event: 'connection_failed',
  error: error instanceof Error ? error.message : String(error)
});
```

#### Pattern: console.log (informational)
```typescript
// BEFORE
console.log('✅ User logged in:', userId);

// AFTER
logger.info({
  event: 'user_logged_in',
  userId
});
```

#### Pattern: console.warn
```typescript
// BEFORE
console.warn('Rate limit approaching:', currentRate);

// AFTER
logger.warn({
  event: 'rate_limit_approaching',
  currentRate,
  limit: 100
});
```

#### Pattern: console.log (debug/development only)
```typescript
// BEFORE
if (debug) {
  console.log('[Component] State updated:', newState);
}

// AFTER
if (debug) {
  logger.debug({
    event: 'component_state_updated',
    component: 'ComponentName',
    newState
  });
}
```

### 3. Event Naming

**Format**: `{domain}_{action}_{status}`

**Examples**:
- `user_login_success` ✅
- `database_connection_failed` ✅
- `cache_hit` ✅
- `payment_processed` ✅
- `userLoginSuccess` ❌ (use snake_case)
- `DB-CONN-FAIL` ❌ (use underscores)

### 4. Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `logger.error()` | Failures, exceptions, errors | Database connection failed |
| `logger.warn()` | Potential issues, deprecations | Rate limit approaching |
| `logger.info()` | Normal operations, success | User logged in, cache hit |
| `logger.debug()` | Development/debugging only | State changes, API calls |

### 5. Context Object Structure

```typescript
logger.info({
  event: 'required_event_name',        // Required: snake_case
  userId: 'user-123',                   // IDs when applicable
  patientId: 'patient-456',            // Entity identifiers
  duration: 1250,                       // Performance metrics
  count: 42,                           // Counts/quantities
  status: 'active',                    // Status indicators
  error: err.message,                  // Error details (for errors)
  metadata: { key: 'value' }           // Additional context
});
```

### 6. Common Patterns

#### Socket/WebSocket Events
```typescript
// Connection
logger.info({ event: 'socket_connected', socketId, userId });
logger.error({ event: 'socket_connect_failed', error: err.message });

// Messages
logger.info({ event: 'socket_message_received', messageType, userId });
logger.error({ event: 'socket_message_parse_failed', error: err.message });
```

#### API Calls
```typescript
// Success
logger.info({ event: 'api_call_success', endpoint, method, duration });

// Failure
logger.error({ event: 'api_call_failed', endpoint, statusCode, error: err.message });
```

#### Cache Operations
```typescript
logger.info({ event: 'cache_hit', cacheKey });
logger.info({ event: 'cache_miss', cacheKey });
logger.error({ event: 'cache_operation_failed', operation: 'get', error: err.message });
```

#### Authentication
```typescript
logger.info({ event: 'user_login_success', userId, method: 'password' });
logger.error({ event: 'user_login_failed', email, reason: 'invalid_credentials' });
logger.warn({ event: 'session_expired', userId, sessionId });
```

### 7. Don't Log These

❌ **Sensitive Data**
- Passwords
- API keys/tokens
- PHI (patient health information) - HIPAA
- Credit card numbers
- Social security numbers

❌ **Large Objects**
- Full request/response bodies (log IDs instead)
- Entire database records (log key fields only)
- Binary data

❌ **High-Frequency Logs**
- Inside tight loops
- Every keystroke
- Every render (React)

### 8. Error Handling Pattern

```typescript
try {
  // Operation
  const result = await someOperation();
  logger.info({ event: 'operation_success', operationId: result.id });
} catch (error) {
  logger.error({
    event: 'operation_failed',
    operation: 'someOperation',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
}
```

### 9. Test Files Exception

**Test files can keep console statements** - they're used for test output:
- `*.test.ts`
- `*.test.tsx`
- `*.spec.ts`
- Files in `__tests__/` directories

### 10. Quick Find & Replace

Use these VS Code/grep commands:

```bash
# Find all console statements
grep -rn "console\\.log\|console\\.error\|console\\.warn" src/ --include="*.ts" --include="*.tsx"

# Exclude tests
grep -rn "console\\.log\|console\\.error\|console\\.warn" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v ".test.ts"

# Check if logger is imported
grep -l "from '@/lib/logger'" src/**/*.ts src/**/*.tsx
```

## Checklist Per File

- [ ] Read the file first
- [ ] Add `import { logger } from '@/lib/logger';`
- [ ] Replace all `console.error()` → `logger.error({ event: '...', ... })`
- [ ] Replace all `console.warn()` → `logger.warn({ event: '...', ... })`
- [ ] Replace all `console.log()` → `logger.info({ event: '...', ... })` or `logger.debug({ event: '...', ... })`
- [ ] Remove emoji prefixes (✅, ❌, ⚠️, 📬, etc.)
- [ ] Add structured context (IDs, errors, metrics)
- [ ] Use snake_case for event names
- [ ] Test the changes (if possible)

## Common Mistakes to Avoid

1. ❌ Using camelCase for events: `userLoginSuccess`
   ✅ Use snake_case: `user_login_success`

2. ❌ Logging strings: `logger.error('Failed to connect')`
   ✅ Use objects: `logger.error({ event: 'connection_failed' })`

3. ❌ Missing event field: `logger.info({ userId: '123' })`
   ✅ Always include event: `logger.info({ event: 'user_action', userId: '123' })`

4. ❌ Logging raw error objects: `error: error`
   ✅ Extract message: `error: error instanceof Error ? error.message : String(error)`

5. ❌ Emoji in structured logs: `event: '✅ user_login'`
   ✅ Clean event names: `event: 'user_login_success'`

## Need Help?

- **Logger API**: See `/apps/web/src/lib/logger.ts`
- **Examples**: See completed files in hooks/, components/, contexts/
- **Full Report**: See `BATCH_2_LOGGING_MIGRATION_REPORT.md`

---

**Quick Start**: Read file → Add import → Replace console.* → Add context → Done!
