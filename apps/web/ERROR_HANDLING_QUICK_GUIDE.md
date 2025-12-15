# Error Handling Quick Guide

**TL;DR:** Use `createProtectedRoute` middleware for automatic error handling. If you must use standalone routes, always wrap in try-catch with structured logging.

## Quick Decision Tree

```
Are you creating a new API route?
│
├─ YES → Use createProtectedRoute (recommended)
│         ✅ Automatic error handling
│         ✅ Auth, RBAC, rate limiting included
│         ✅ Structured logging built-in
│
└─ NO (standalone route) → Add try-catch with structured logger
          ⚠️ Manual error handling required
          ⚠️ Remember to log errors properly
```

## Pattern 1: Protected Route (Recommended)

Use this for **most API routes** (patient data, appointments, etc.):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    // ✅ NO TRY-CATCH NEEDED - middleware handles it!
    const body = await request.json();

    // Validation
    if (!body.requiredField) {
      return NextResponse.json(
        { error: 'Missing required field' },
        { status: 400 }
      );
    }

    // Database operation
    const result = await prisma.patient.create({ data: body });

    return NextResponse.json({ data: result }, { status: 201 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'Patient' },
  }
);
```

**What you get for free:**
- ✅ Authentication
- ✅ Role-based access control
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Error handling with structured logging
- ✅ CSRF protection (for POST/PUT/DELETE)
- ✅ Security headers
- ✅ Request ID tracking

## Pattern 2: Public Route

Use this for **unauthenticated endpoints** (waitlist, beta signup, health checks):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const POST = createPublicRoute(
  async (request: NextRequest, context: any) => {
    // ✅ NO TRY-CATCH NEEDED
    const body = await request.json();

    const result = await prisma.betaSignup.create({ data: body });

    return NextResponse.json({ data: result });
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
```

## Pattern 3: Standalone Route (When You Can't Use Middleware)

Use this **only when middleware is not compatible** (NextAuth routes, special cases):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.requiredField) {
      return NextResponse.json(
        { error: 'Missing required field' },
        { status: 400 }
      );
    }

    // Database operation
    const result = await prisma.patient.create({ data: body });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    logger.error({
      event: 'route_execution_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      // Add relevant context
      requestBody: body,
    });

    // Handle specific errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Record already exists' },
        { status: 409 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Logging Best Practices

### ✅ DO: Use structured logger

```typescript
logger.error({
  event: 'payment_processing_failed',
  error: error.message,
  stack: error.stack,
  patientId: body.patientId,
  amount: body.amount,
});
```

### ❌ DON'T: Use console.*

```typescript
console.error('Payment failed:', error);  // ❌ No structure, no context
console.log(error);                       // ❌ Not captured in production logs
```

## Error Event Naming Convention

Use descriptive event names following this pattern:
```
<resource>_<operation>_<outcome>
```

Examples:
- `payment_processing_failed`
- `patient_create_error`
- `lab_result_critical_alert`
- `auth_session_missing`
- `rate_limit_exceeded`
- `cache_invalidation_error`

## Common Prisma Errors

```typescript
// Unique constraint violation
if (error.code === 'P2002') {
  return NextResponse.json(
    { error: 'Record with this value already exists' },
    { status: 409 }
  );
}

// Record not found
if (error.code === 'P2025') {
  return NextResponse.json(
    { error: 'Record not found' },
    { status: 404 }
  );
}

// Foreign key constraint
if (error.code === 'P2003') {
  return NextResponse.json(
    { error: 'Referenced record does not exist' },
    { status: 400 }
  );
}
```

## Error Response Format

### ✅ Good Error Response

```typescript
return NextResponse.json(
  {
    error: 'User-friendly message',
    // Optional: Additional context
    details: validationErrors,
    code: 'INVALID_INPUT',
  },
  { status: 400 }
);
```

### ❌ Bad Error Response

```typescript
return NextResponse.json(
  {
    error: error.message,  // ❌ May expose sensitive info
    stack: error.stack,     // ❌ Never expose stack traces
  },
  { status: 500 }
);
```

## Environment-Aware Error Messages

```typescript
return NextResponse.json(
  {
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'  // Generic in production
      : error.message,            // Detailed in development
  },
  { status: 500 }
);
```

## Testing Error Handling

Add tests for error scenarios:

```typescript
describe('POST /api/patients', () => {
  it('should return 400 for missing required fields', async () => {
    const response = await POST({ json: () => ({}) });
    expect(response.status).toBe(400);
  });

  it('should return 409 for duplicate MRN', async () => {
    await createPatient({ mrn: 'TEST123' });
    const response = await POST({ json: () => ({ mrn: 'TEST123' }) });
    expect(response.status).toBe(409);
  });

  it('should return 500 for database errors', async () => {
    // Mock database failure
    jest.spyOn(prisma.patient, 'create').mockRejectedValue(new Error('DB Error'));
    const response = await POST({ json: () => validData });
    expect(response.status).toBe(500);
  });
});
```

## Checklist for New Routes

Before committing a new API route:

- [ ] Uses `createProtectedRoute` or `createPublicRoute` (preferred)
- [ ] OR has try-catch with structured logger (if standalone)
- [ ] Validates input before database operations
- [ ] Returns appropriate HTTP status codes (400, 401, 403, 404, 409, 500)
- [ ] Doesn't expose sensitive error details to client
- [ ] Logs errors with context (event name, stack trace, relevant IDs)
- [ ] Handles common Prisma errors (P2002, P2025, etc.)
- [ ] Has tests for error scenarios

## Migration Checklist (For Existing Routes)

To fix an existing route:

- [ ] Check if route already uses middleware (no changes needed)
- [ ] If standalone, add try-catch block
- [ ] Import structured logger: `import { logger } from '@/lib/logger';`
- [ ] Replace `console.error` with `logger.error`
- [ ] Replace `console.log` with `logger.info`
- [ ] Replace `console.warn` with `logger.warn`
- [ ] Add structured event names and context
- [ ] Remove sensitive data from error responses
- [ ] Test error scenarios

## Quick Find & Replace

To find routes that need fixing:

```bash
# Find routes without error handling
grep -L "createProtectedRoute\|createPublicRoute\|try" src/app/api/**/route.ts

# Find routes using console.*
grep -r "console\.(error|log|warn)" src/app/api --include="*.ts"

# Find routes without structured logger import
grep -L "from '@/lib/logger'" src/app/api/**/route.ts | \
  xargs grep -l "console\."
```

## Examples from Codebase

### Example 1: Payment Route (Fixed)
**File:** `/src/app/api/payments/route.ts`
- ✅ Uses createProtectedRoute
- ✅ Has try-catch for additional error context
- ✅ Uses structured logger
- ✅ Context includes patientId, invoiceId

### Example 2: Lab Results Route (Fixed)
**File:** `/src/app/api/lab-results/route.ts`
- ✅ Uses createProtectedRoute
- ✅ Has try-catch for additional error context
- ✅ Uses structured logger
- ✅ Special handling for critical lab alerts

### Example 3: Auth Register Route (Good)
**File:** `/src/app/api/auth/register/route.ts`
- ✅ Standalone route with try-catch
- ✅ Uses structured logger
- ✅ Proper error messages

## Need Help?

- Check `/lib/api/middleware.ts` for middleware source code
- See `/ERROR_HANDLING_AUDIT_REPORT.md` for comprehensive audit
- Ask in #engineering-help channel
- Review existing routes for examples

---

**Remember:** When in doubt, use `createProtectedRoute`. It handles 99% of error scenarios automatically.
