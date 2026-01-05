# Developer Security Guidelines
**Version:** 1.0
**Last Updated:** 2026-01-01
**Owner:** Security Team
**Review Cycle:** Quarterly

---

## Overview

This document provides security guidelines for developers working on Holi Labs healthcare platform. Because we handle Protected Health Information (PHI), security is not optional - it's a compliance requirement under HIPAA.

**Who Should Read This:**
- All software engineers
- Frontend developers
- Backend developers
- DevOps engineers
- Technical leads

**Key Principles:**
1. **Assume Breach:** Design as if attackers are already inside
2. **Least Privilege:** Grant minimum necessary access
3. **Defense in Depth:** Multiple layers of security
4. **Fail Securely:** Errors should not expose sensitive data
5. **Audit Everything:** Log all PHI access (HIPAA requirement)

---

## Table of Contents

1. [PHI Handling Guidelines](#1-phi-handling-guidelines)
2. [Authentication and Authorization](#2-authentication-and-authorization)
3. [Input Validation and Sanitization](#3-input-validation-and-sanitization)
4. [Encryption and Cryptography](#4-encryption-and-cryptography)
5. [Secure Coding Practices](#5-secure-coding-practices)
6. [OWASP Top 10 Vulnerabilities](#6-owasp-top-10-vulnerabilities)
7. [API Security](#7-api-security)
8. [Database Security](#8-database-security)
9. [Logging and Monitoring](#9-logging-and-monitoring)
10. [Security Code Review Checklist](#10-security-code-review-checklist)
11. [Security Testing](#11-security-testing)
12. [Security Tools](#12-security-tools)

---

## 1. PHI Handling Guidelines

### 1.1 What is PHI?

**Protected Health Information (PHI)** is any information that can identify a patient and relates to their health:

**Identifiers (18 HIPAA Identifiers):**
- ✅ Names
- ✅ Addresses (street, city, zip >3 digits)
- ✅ Dates (birth, admission, discharge, death)
- ✅ Phone numbers, fax numbers
- ✅ Email addresses
- ✅ Social Security Numbers
- ✅ Medical record numbers
- ✅ Account numbers
- ✅ Biometric data (fingerprints, voice)
- ✅ Photos, images
- ✅ IP addresses (if linked to patient)
- ✅ Device identifiers, serial numbers
- ✅ Web URLs, UUIDs (if linked to patient)

**Health Information:**
- ✅ Diagnoses, conditions
- ✅ Medications, prescriptions
- ✅ Lab results, test results
- ✅ Treatment plans
- ✅ Clinical notes
- ✅ Appointment history
- ✅ Insurance information

**Not PHI:**
- ❌ De-identified data (identifiers removed)
- ❌ Aggregate statistics (no individual identification)
- ❌ Public health data (approved for research)

---

### 1.2 PHI Handling Rules

#### Rule 1: Never Log PHI

**❌ WRONG:**
```typescript
logger.info({ event: 'patient_accessed', patientName: 'John Doe', ssn: '123-45-6789' });
console.log(`Sending email to ${patient.email}`);
```

**✅ CORRECT:**
```typescript
logger.info({ event: 'patient_accessed', patientId: patient.id });
logger.info({ event: 'email_sent', recipientId: patient.id });
```

**Exception:** Audit logs in dedicated `AuditLog` table (never in application logs)

---

#### Rule 2: Never Store PHI in Client-Side Storage

**❌ WRONG:**
```typescript
// Browser local storage, session storage, cookies
localStorage.setItem('patient', JSON.stringify(patient));
document.cookie = `patientId=${patient.id}`;
```

**✅ CORRECT:**
```typescript
// Store only session ID (non-PHI)
// Fetch patient data from API on each request
const session = await getSession();
const patient = await fetchPatient(session.userId);
```

---

#### Rule 3: Always Encrypt PHI at Rest

**✅ CORRECT:**
```typescript
// Use Prisma encryption extension (automatic)
const patient = await prisma.patient.create({
  data: {
    firstName: 'John',  // Automatically encrypted
    lastName: 'Doe',    // Automatically encrypted
    ssn: '123-45-6789', // Automatically encrypted
  },
});
```

**See Section 4: Encryption and Cryptography for details.**

---

#### Rule 4: Always Use HTTPS for PHI Transmission

**✅ ENFORCED:** All API endpoints use HTTPS (TLS 1.3)

**Verify:**
```typescript
// In Next.js API routes, check protocol
export async function GET(request: NextRequest) {
  // Next.js in production always uses HTTPS
  // Middleware enforces HTTPS redirect
}
```

---

#### Rule 5: Always Audit PHI Access

**✅ CORRECT:**
```typescript
// Every PHI read/write must create audit log
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { user } = await requireAuth(request);

  // Fetch patient
  const patient = await prisma.patient.findUnique({ where: { id: context.params.id } });

  // CRITICAL: Create audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'READ',
      resource: 'Patient',
      resourceId: patient.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date(),
    },
  });

  return NextResponse.json(patient);
}
```

**Use Audit Middleware (Recommended):**
```typescript
import { createProtectedRoute } from '@/lib/api/middleware';

export const GET = createProtectedRoute(
  async (request, context, { user }) => {
    const patient = await prisma.patient.findUnique({ where: { id: context.params.id } });
    return NextResponse.json(patient);
  },
  {
    requiredRole: 'CLINICIAN',
    audit: { action: 'READ', resource: 'Patient' }, // Automatic audit logging
  }
);
```

---

#### Rule 6: Implement Minimum Necessary Access

**HIPAA §164.502(b):** Only access the minimum PHI necessary for the task

**✅ CORRECT:**
```typescript
// Require accessReason query parameter for PHI access
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const accessReason = searchParams.get('accessReason');

  if (!accessReason) {
    return NextResponse.json(
      {
        error: 'accessReason query parameter required',
        hipaaReference: 'HIPAA §164.502(b) - Minimum Necessary Standard',
      },
      { status: 400 }
    );
  }

  // Log access reason
  await prisma.auditLog.create({
    data: {
      // ...
      details: { accessReason },
    },
  });

  // Fetch patient
  const patient = await prisma.patient.findUnique({ where: { id: context.params.id } });
  return NextResponse.json(patient);
}
```

---

### 1.3 PHI in Error Messages

**❌ WRONG:**
```typescript
throw new Error(`Patient ${patient.name} not found`);
```

**✅ CORRECT:**
```typescript
throw new Error(`Patient not found`);
// Or use patient ID (non-PHI if random UUID):
throw new Error(`Patient with ID ${patientId} not found`);
```

**Error Responses:**
```typescript
// ❌ WRONG: Leak PHI in error
return NextResponse.json(
  { error: `Email ${email} already registered` },
  { status: 400 }
);

// ✅ CORRECT: Generic error
return NextResponse.json(
  { error: 'Email already registered' },
  { status: 400 }
);
```

---

## 2. Authentication and Authorization

### 2.1 Authentication Patterns

#### Pattern 1: Session-Based Authentication (Current)

```typescript
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const { user } = await requireAuth(request);

  // user object contains: id, email, role, tenantId
  return NextResponse.json({ user });
}
```

**Session Storage:** Encrypted cookie (httpOnly, secure, sameSite)

---

#### Pattern 2: API Key Authentication (Machine-to-Machine)

```typescript
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 });
  }

  // Verify API key (hashed in database)
  const app = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(apiKey) },
  });

  if (!app || !app.isActive) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Rate limit by API key
  await applyRateLimit(request, 'api', app.id);

  // Process request
  return NextResponse.json({ success: true });
}
```

---

### 2.2 Authorization Patterns

#### Pattern 1: Role-Based Access Control (RBAC)

**Roles:**
- `ADMIN`: Full access
- `CLINICIAN`: Access to assigned patients
- `NURSE`: Limited clinical access
- `STAFF`: Administrative access only
- `PATIENT`: Access to own records only

**Example:**
```typescript
export const GET = createProtectedRoute(
  async (request, context, { user }) => {
    // Route handler
  },
  {
    requiredRole: 'CLINICIAN', // Only CLINICIAN and above
  }
);
```

---

#### Pattern 2: Resource-Based Access Control

**Rule:** Users can only access resources they're granted access to

**Example:**
```typescript
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { user } = await requireAuth(request);

  // Check if user has access to this patient
  const access = await prisma.dataAccessGrant.findFirst({
    where: {
      userId: user.id,
      patientId: context.params.id,
      revokedAt: null,
    },
  });

  if (!access && user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // User has access, proceed
  const patient = await prisma.patient.findUnique({ where: { id: context.params.id } });
  return NextResponse.json(patient);
}
```

**Use Middleware (Recommended):**
```typescript
export const GET = createProtectedRoute(
  async (request, context, { user }) => {
    // User already verified to have access
    const patient = await prisma.patient.findUnique({ where: { id: context.params.id } });
    return NextResponse.json(patient);
  },
  {
    requiredRole: 'CLINICIAN',
    checkResourceAccess: async (user, context) => {
      return await prisma.dataAccessGrant.findFirst({
        where: { userId: user.id, patientId: context.params.id, revokedAt: null },
      });
    },
  }
);
```

---

#### Pattern 3: Tenant Isolation (Multi-Tenancy)

**Rule:** Users from Tenant A cannot access data from Tenant B

**✅ CORRECT:**
```typescript
export async function GET(request: NextRequest) {
  const { user } = await requireAuth(request);

  // Always filter by user's tenant
  const patients = await prisma.patient.findMany({
    where: {
      tenantId: user.tenantId, // CRITICAL: Prevent cross-tenant access
    },
  });

  return NextResponse.json(patients);
}
```

**Use Prisma Middleware (Automatic Tenant Isolation):**
```typescript
// prisma/middleware.ts
prisma.$use(async (params, next) => {
  if (params.action === 'findMany' || params.action === 'findFirst') {
    // Automatically add tenantId filter
    params.args.where = {
      ...params.args.where,
      tenantId: getCurrentTenantId(), // From auth context
    };
  }
  return next(params);
});
```

---

### 2.3 Preventing Common Auth Vulnerabilities

#### Vulnerability 1: Insecure Direct Object Reference (IDOR)

**❌ VULNERABLE:**
```typescript
// URL: /api/patients/123
// User can change ID to 456 and access other patient's data
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({ where: { id: context.params.id } });
  return NextResponse.json(patient); // No authorization check!
}
```

**✅ SECURE:**
```typescript
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { user } = await requireAuth(request);

  // Check authorization BEFORE returning data
  const patient = await prisma.patient.findFirst({
    where: {
      id: context.params.id,
      tenantId: user.tenantId,
      // AND user has access grant
      dataAccessGrants: {
        some: {
          userId: user.id,
          revokedAt: null,
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  return NextResponse.json(patient);
}
```

---

#### Vulnerability 2: Broken Authentication

**❌ WRONG:** Weak session management
```typescript
// Don't roll your own auth
const sessionId = Math.random().toString(); // Predictable!
```

**✅ CORRECT:** Use established auth library
```typescript
import { NextAuth } from 'next-auth';
// Handles session generation, CSRF protection, secure cookies
```

---

#### Vulnerability 3: JWT Token Issues

**If Using JWTs (Not Currently, But Common):**

**❌ WRONG:**
```typescript
// Don't put sensitive data in JWT (it's just base64 encoded)
const token = jwt.sign({ ssn: patient.ssn }, secret);
```

**✅ CORRECT:**
```typescript
// Only put non-sensitive identifiers in JWT
const token = jwt.sign({ userId: user.id, role: user.role }, secret, {
  expiresIn: '1h',
  algorithm: 'HS256',
});
```

**JWT Best Practices:**
- Short expiration (1 hour max)
- Store in httpOnly cookie (not localStorage)
- Verify signature on every request
- Use strong secret (32+ characters, random)
- Include `exp`, `iat`, `nbf` claims

---

## 3. Input Validation and Sanitization

### 3.1 Validate All User Input

**Rule:** Never trust user input. Always validate.

**❌ WRONG:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  // No validation! Could be anything.
  const patient = await prisma.patient.create({
    data: body,
  });

  return NextResponse.json(patient);
}
```

**✅ CORRECT:**
```typescript
import { z } from 'zod';

const PatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().datetime(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(), // E.164 format
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate input
  const validation = PatientSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Create patient with validated data
  const patient = await prisma.patient.create({
    data: validation.data,
  });

  return NextResponse.json(patient);
}
```

---

### 3.2 SQL Injection Prevention

**✅ ALWAYS USE:** Parameterized queries (Prisma, pg, etc.)

**❌ NEVER DO THIS:**
```typescript
// VULNERABLE TO SQL INJECTION
const result = await prisma.$queryRawUnsafe(
  `SELECT * FROM "Patient" WHERE email = '${email}'`
);
```

**✅ DO THIS:**
```typescript
// Parameterized query (safe)
const result = await prisma.$queryRaw`
  SELECT * FROM "Patient" WHERE email = ${email}
`;

// Or use Prisma query builder (preferred)
const patient = await prisma.patient.findUnique({ where: { email } });
```

---

### 3.3 XSS Prevention (Cross-Site Scripting)

**✅ React Default:** React escapes variables by default

**❌ DANGEROUS:**
```typescript
// dangerouslySetInnerHTML allows XSS
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**✅ SAFE:**
```typescript
// React automatically escapes
<div>{userInput}</div>

// Or use DOMPurify for rich text
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

---

### 3.4 Command Injection Prevention

**❌ NEVER DO THIS:**
```typescript
// VULNERABLE TO COMMAND INJECTION
import { exec } from 'child_process';
exec(`convert ${userFilename}.jpg ${userFilename}.png`);
```

**✅ DO THIS:**
```typescript
import { execFile } from 'child_process';
// Use execFile with argument array (not string concatenation)
execFile('convert', [userFilename + '.jpg', userFilename + '.png']);
```

**Better:** Avoid shell commands entirely. Use libraries (e.g., sharp for image processing).

---

## 4. Encryption and Cryptography

### 4.1 Encryption at Rest

**PHI Encryption:** All PHI fields automatically encrypted using Prisma extension

**Algorithm:** AES-256-GCM (NIST-approved)

**Key Management:** Encryption key stored in Doppler (secrets manager)

**Example:**
```typescript
// Transparent encryption (automatic)
const patient = await prisma.patient.create({
  data: {
    firstName: 'John',  // Encrypted before writing to DB
    lastName: 'Doe',    // Encrypted before writing to DB
  },
});

// Automatic decryption on read
const patient = await prisma.patient.findUnique({ where: { id: '123' } });
console.log(patient.firstName); // "John" (decrypted automatically)
```

**See:** `/docs/TRANSPARENT_ENCRYPTION_GUIDE.md` for details

---

### 4.2 Encryption in Transit

**All API Communication:** HTTPS (TLS 1.3)

**Enforced By:**
- CloudFlare (SSL termination)
- Next.js (HSTS headers)
- DigitalOcean Load Balancer (SSL certificates)

**No Action Required:** Automatic

---

### 4.3 Hashing Passwords

**❌ NEVER:**
```typescript
// Don't store plaintext passwords
await prisma.user.create({ data: { password: plainPassword } });

// Don't use weak hashing (MD5, SHA1)
const hash = crypto.createHash('md5').update(plainPassword).digest('hex');
```

**✅ ALWAYS:**
```typescript
import bcrypt from 'bcryptjs';

// Hash password before storing
const passwordHash = await bcrypt.hash(plainPassword, 12); // 12 rounds
await prisma.user.create({ data: { passwordHash } });

// Verify password
const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
```

**Rounds:** Use 12 rounds (balance between security and performance)

---

### 4.4 Generating Secure Random Values

**❌ WRONG:**
```typescript
// Math.random() is NOT cryptographically secure
const sessionId = Math.random().toString(36);
```

**✅ CORRECT:**
```typescript
import crypto from 'crypto';

// Cryptographically secure random bytes
const sessionId = crypto.randomBytes(32).toString('hex');

// Or use UUID v4 (random)
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

---

### 4.5 Key Storage

**❌ NEVER:**
```typescript
// Don't hardcode keys in code
const ENCRYPTION_KEY = '0123456789abcdef...';
```

**✅ ALWAYS:**
```typescript
// Store keys in environment variables (Doppler)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY not configured');
}
```

**Key Rotation:** Rotate encryption keys annually (see Operations Manual)

---

## 5. Secure Coding Practices

### 5.1 Principle of Least Privilege

**Code Access:**
```typescript
// ❌ WRONG: Grant broad access
if (user.role === 'CLINICIAN') {
  // Can access ALL patients
}

// ✅ CORRECT: Grant specific access only
if (user.role === 'CLINICIAN' && hasAccessGrant(user, patient)) {
  // Can only access assigned patients
}
```

**Database Access:**
```typescript
// ❌ WRONG: Use admin connection for all queries
const prisma = new PrismaClient({ datasourceUrl: ADMIN_DATABASE_URL });

// ✅ CORRECT: Use read-only connection for read queries
const prismaRead = new PrismaClient({ datasourceUrl: READ_REPLICA_URL });
```

---

### 5.2 Fail Securely

**❌ WRONG:**
```typescript
try {
  const patient = await fetchPatient(id);
  return patient;
} catch (error) {
  // On error, accidentally return sensitive data
  return { error: error.message, patient };
}
```

**✅ CORRECT:**
```typescript
try {
  const patient = await fetchPatient(id);
  return patient;
} catch (error) {
  // On error, return generic message (no sensitive data)
  logger.error({ event: 'fetch_patient_error', error });
  return { error: 'Failed to fetch patient' };
}
```

---

### 5.3 Secure Defaults

**✅ Examples:**
- Cookies: `httpOnly: true, secure: true, sameSite: 'strict'` by default
- API routes: Require authentication by default (opt-in to public)
- Database queries: Filter by `tenantId` by default (tenant isolation)
- File uploads: Reject by default, whitelist allowed types

---

### 5.4 Error Handling

**❌ WRONG:**
```typescript
catch (error) {
  return NextResponse.json({ error: error.stack }, { status: 500 });
}
```

**✅ CORRECT:**
```typescript
catch (error) {
  // Log full error server-side
  logger.error({ event: 'api_error', error: error.message, stack: error.stack });

  // Return generic error to client (no sensitive details)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

### 5.5 Dependency Management

**Keep Dependencies Updated:**
```bash
# Check for vulnerabilities weekly
pnpm audit

# Update dependencies monthly
pnpm update

# Check for outdated dependencies
pnpm outdated
```

**Vulnerability Response:**
- **Critical:** Patch within 24 hours
- **High:** Patch within 7 days
- **Medium:** Patch within 30 days
- **Low:** Patch within 90 days

**Use Tools:**
- Snyk (automated scanning)
- Dependabot (automated PRs)
- `pnpm audit` (manual checks)

---

## 6. OWASP Top 10 Vulnerabilities

### 6.1 A01:2021 - Broken Access Control

**Vulnerability:** Users can access resources they shouldn't

**Prevention:**
- ✅ Always check authorization before returning data
- ✅ Use middleware for consistent authorization checks
- ✅ Implement tenant isolation
- ✅ Validate user has access grant to specific resources

**Example:**
```typescript
// Check BEFORE returning data
if (!userHasAccess(user, resource)) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

---

### 6.2 A02:2021 - Cryptographic Failures

**Vulnerability:** Sensitive data transmitted or stored without encryption

**Prevention:**
- ✅ Use HTTPS for all communication (enforced)
- ✅ Encrypt PHI at rest (automatic via Prisma extension)
- ✅ Hash passwords with bcrypt (never store plaintext)
- ✅ Use strong encryption algorithms (AES-256-GCM, TLS 1.3)

---

### 6.3 A03:2021 - Injection

**Vulnerability:** Untrusted data sent to interpreter (SQL, NoSQL, OS commands)

**Prevention:**
- ✅ Use parameterized queries (Prisma, prepared statements)
- ✅ Validate and sanitize all user input
- ✅ Use ORM/query builder (avoid raw SQL)
- ✅ Escape special characters in user input

**Example:**
```typescript
// ✅ Safe: Parameterized query
await prisma.$queryRaw`SELECT * FROM "Patient" WHERE email = ${email}`;

// ❌ Unsafe: String concatenation
await prisma.$queryRawUnsafe(`SELECT * FROM "Patient" WHERE email = '${email}'`);
```

---

### 6.4 A04:2021 - Insecure Design

**Vulnerability:** Missing or ineffective security design

**Prevention:**
- ✅ Threat modeling during design phase
- ✅ Secure design patterns (defense in depth)
- ✅ Security requirements in user stories
- ✅ Security review before implementation

---

### 6.5 A05:2021 - Security Misconfiguration

**Vulnerability:** Insecure default configurations, incomplete setup

**Prevention:**
- ✅ Harden security headers (CSP, HSTS, etc.)
- ✅ Disable unnecessary features (directory listing, debug mode in prod)
- ✅ Keep software updated (dependencies, Docker images)
- ✅ Use secure defaults (see Section 5.3)

**Example:**
```typescript
// Security headers (enforced in next.config.js)
headers: {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=63072000',
}
```

---

### 6.6 A06:2021 - Vulnerable and Outdated Components

**Vulnerability:** Using components with known vulnerabilities

**Prevention:**
- ✅ Run `pnpm audit` weekly
- ✅ Use Snyk/Dependabot for automated scanning
- ✅ Update dependencies monthly
- ✅ Subscribe to security advisories

---

### 6.7 A07:2021 - Identification and Authentication Failures

**Vulnerability:** Weak or broken authentication

**Prevention:**
- ✅ Use established auth library (NextAuth, Passport)
- ✅ Implement MFA for admin accounts
- ✅ Use strong session management (httpOnly cookies)
- ✅ Implement rate limiting on login endpoints
- ✅ Implement account lockout after failed attempts

**Example:**
```typescript
// Rate limit authentication endpoints
export const POST = createRateLimitedRoute(
  async (request) => {
    // Login logic
  },
  { rateLimiter: 'auth' } // 5 requests per 15 minutes
);
```

---

### 6.8 A08:2021 - Software and Data Integrity Failures

**Vulnerability:** Code/data integrity not verified

**Prevention:**
- ✅ Use CI/CD with automated tests
- ✅ Code review required before merge
- ✅ Verify npm packages (lock file)
- ✅ Sign Docker images (future enhancement)
- ✅ Verify backup integrity

---

### 6.9 A09:2021 - Security Logging and Monitoring Failures

**Vulnerability:** Insufficient logging, no alerting

**Prevention:**
- ✅ Log all authentication events (login, logout, failed attempts)
- ✅ Log all PHI access (HIPAA requirement)
- ✅ Monitor for anomalies (failed auth spikes, unusual access patterns)
- ✅ Alert on security events (PagerDuty, Slack)

**Example:**
```typescript
// Log security events
logger.warn({
  event: 'login_failed',
  email: email, // Not PHI if email alone
  ipAddress: request.headers.get('x-forwarded-for'),
  reason: 'invalid_password',
});
```

---

### 6.10 A10:2021 - Server-Side Request Forgery (SSRF)

**Vulnerability:** Application fetches remote resource without validating URL

**Prevention:**
- ✅ Validate and whitelist URLs
- ✅ Don't allow user to control full URL
- ✅ Use allowlist of trusted domains
- ✅ Disable redirects in HTTP client

**❌ VULNERABLE:**
```typescript
// User can make server fetch internal resources
const url = request.query.url;
const response = await fetch(url); // SSRF vulnerability
```

**✅ SECURE:**
```typescript
const url = request.query.url;

// Validate URL
const parsed = new URL(url);
const allowedDomains = ['api.example.com', 'cdn.example.com'];

if (!allowedDomains.includes(parsed.hostname)) {
  return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
}

const response = await fetch(url);
```

---

## 7. API Security

### 7.1 Rate Limiting

**Purpose:** Prevent abuse, brute force, DDoS

**Implementation:**
```typescript
import { applyRateLimit } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limit
  const rateLimitResult = await applyRateLimit(request, 'api');

  if (!rateLimitResult.success) {
    return rateLimitResult.response; // 429 Too Many Requests
  }

  // Process request
  return NextResponse.json({ success: true });
}
```

**Rate Limit Tiers:**
- `auth`: 5 requests per 15 minutes (strictest)
- `api`: 100 requests per minute
- `search`: 20 requests per minute
- `upload`: 10 requests per minute

**See:** `/docs/RATE_LIMITING.md` for details

---

### 7.2 CORS Configuration

**Purpose:** Prevent unauthorized cross-origin requests

**Implementation:**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://holilabs.xyz' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};
```

**Don't Use:** `Access-Control-Allow-Origin: *` (allows any origin)

---

### 7.3 API Versioning

**Pattern:** Include version in URL path

**Example:**
```
/api/v1/patients
/api/v2/patients (breaking changes)
```

**Benefits:**
- Allows deprecating old versions gracefully
- Maintains backward compatibility
- Clear communication to API consumers

---

### 7.4 Request Size Limits

**Purpose:** Prevent resource exhaustion

**Implementation:**
```typescript
// next.config.js
module.exports = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Limit request body size
    },
  },
};
```

---

## 8. Database Security

### 8.1 Parameterized Queries

**ALWAYS Use:**
```typescript
// ✅ Parameterized (safe)
await prisma.$queryRaw`SELECT * FROM "Patient" WHERE id = ${id}`;

// ✅ Query builder (safe)
await prisma.patient.findUnique({ where: { id } });
```

**NEVER Use:**
```typescript
// ❌ String interpolation (SQL injection risk)
await prisma.$queryRawUnsafe(`SELECT * FROM "Patient" WHERE id = '${id}'`);
```

---

### 8.2 Principle of Least Privilege

**Database Users:**
- `app_user`: SELECT, INSERT, UPDATE, DELETE on application tables only
- `readonly_user`: SELECT only (for reporting, analytics)
- `admin_user`: Full access (used sparingly, only for migrations)

**Connection String:**
```bash
# Use app_user for application (not admin)
DATABASE_URL="postgresql://app_user:password@localhost:5432/holi_db"
```

---

### 8.3 Encryption at Rest

**✅ Implemented:** All PHI fields encrypted using Prisma extension

**Algorithm:** AES-256-GCM

**Key Rotation:** Annually (see Operations Manual)

---

### 8.4 Database Backups

**Frequency:** Daily (2:00 AM UTC)

**Retention:** 90 days (Standard) → Glacier (long-term)

**Encryption:** AES-256 server-side encryption (S3)

**Testing:** Weekly restore test to staging

**See:** `/docs/OPS_MANUAL.md` Section 4 for details

---

## 9. Logging and Monitoring

### 9.1 What to Log

**✅ DO Log:**
- Authentication events (login, logout, password reset)
- Authorization failures (access denied)
- PHI access (HIPAA requirement via AuditLog table)
- Security events (failed auth, unusual patterns)
- Application errors
- API requests (method, path, status code, latency)
- Configuration changes

**❌ DON'T Log:**
- Passwords (plaintext or hashed)
- PHI (names, SSNs, diagnoses, etc.) in application logs
- Session tokens, API keys
- Credit card numbers

---

### 9.2 Structured Logging

**Use Pino Logger:**
```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger({ route: '/api/patients' });

// ✅ Structured logging
logger.info({
  event: 'patient_created',
  patientId: patient.id, // ID is ok, not PHI
  clinicianId: user.id,
  duration: endTime - startTime,
});

// ❌ Unstructured logging
console.log(`Patient ${patient.name} created by ${user.email}`); // Logs PHI!
```

---

### 9.3 Log Retention

**Application Logs:** 6 years (HIPAA requirement)

**Audit Logs (PHI access):** 6 years (HIPAA requirement)

**Storage:** AWS S3 (Standard → Glacier → Deep Archive)

**See:** `/docs/LOG_RETENTION_POLICY.md` for details

---

### 9.4 Security Monitoring

**Automated Alerts:**
- High failed auth rate (>10/hour) → Potential brute force
- Audit log not writing → Compliance risk
- Unusual PHI access patterns → Potential breach

**Tools:**
- Prometheus + Grafana (metrics, alerting)
- Sentry (error tracking)
- PagerDuty (on-call alerts)

**See:** `/docs/OPS_MANUAL.md` Section 3 for details

---

## 10. Security Code Review Checklist

### 10.1 Authentication and Authorization

- [ ] All API routes require authentication (unless explicitly public)
- [ ] User authorization checked before accessing resources
- [ ] Tenant isolation enforced (user.tenantId filter)
- [ ] Access grants verified for PHI access
- [ ] Role-based access control (RBAC) enforced
- [ ] No hardcoded credentials or API keys

---

### 10.2 Input Validation

- [ ] All user input validated (Zod schemas)
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (React escaping, DOMPurify for rich text)
- [ ] Command injection prevented (no shell execution with user input)
- [ ] File uploads validated (type, size, content)
- [ ] URL validation for SSRF prevention

---

### 10.3 PHI Handling

- [ ] PHI not logged in application logs
- [ ] PHI encrypted at rest (automatic via Prisma extension)
- [ ] PHI transmitted over HTTPS only
- [ ] PHI access audited (AuditLog entry created)
- [ ] PHI not stored in client-side storage (localStorage, cookies)
- [ ] PHI not exposed in error messages

---

### 10.4 Encryption and Cryptography

- [ ] HTTPS enforced (TLS 1.3)
- [ ] Passwords hashed with bcrypt (12 rounds)
- [ ] Secure random values (crypto.randomBytes, not Math.random)
- [ ] Encryption keys stored in environment variables (Doppler)
- [ ] No weak algorithms (MD5, SHA1, DES)

---

### 10.5 Error Handling

- [ ] Generic error messages to client (no stack traces)
- [ ] Detailed errors logged server-side
- [ ] No PHI in error messages
- [ ] Errors don't expose system details

---

### 10.6 Rate Limiting

- [ ] Rate limiting applied to authentication endpoints
- [ ] Rate limiting applied to resource-intensive endpoints
- [ ] Rate limiting applied to PHI export endpoints

---

### 10.7 Logging and Monitoring

- [ ] Security events logged (auth, authorization failures)
- [ ] PHI access logged in AuditLog table
- [ ] No PHI in application logs
- [ ] Structured logging (Pino)

---

### 10.8 Dependencies

- [ ] No high/critical vulnerabilities (`pnpm audit`)
- [ ] Dependencies up-to-date
- [ ] No unnecessary dependencies

---

## 11. Security Testing

### 11.1 Unit Tests

**Test Security Logic:**
```typescript
// Test authorization
describe('Patient API Authorization', () => {
  it('should deny access to patient without grant', async () => {
    const user = createMockUser({ role: 'CLINICIAN' });
    const patient = createMockPatient();

    // No access grant exists
    const response = await GET(mockRequest(), { params: { id: patient.id } });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Access denied' });
  });
});
```

---

### 11.2 Integration Tests

**Test End-to-End Security:**
```typescript
describe('Patient API E2E', () => {
  it('should prevent cross-tenant access', async () => {
    const tenant1User = await createUser({ tenantId: 'tenant1' });
    const tenant2Patient = await createPatient({ tenantId: 'tenant2' });

    // Tenant 1 user tries to access Tenant 2 patient
    const response = await authenticatedRequest(tenant1User, `/api/patients/${tenant2Patient.id}`);

    expect(response.status).toBe(404); // Not found (as if it doesn't exist)
  });
});
```

---

### 11.3 Security Scanning

**Automated Tools:**

```bash
# Dependency vulnerabilities
pnpm audit

# Static code analysis
pnpm eslint . --ext .ts,.tsx

# Secret detection
gitleaks detect --source . --verbose

# Container scanning (Snyk)
snyk container test holi-web:latest
```

**CI/CD Integration:**
All security scans run automatically on every PR.

---

### 11.4 Manual Security Testing

**Quarterly Security Testing:**
- SQL injection testing (manual)
- XSS testing (manual)
- IDOR testing (try accessing other users' resources)
- Authorization bypass attempts
- Session hijacking attempts

**Annual Penetration Testing:**
- External firm conducts full security audit
- Simulated attacks on production environment
- Report delivered with findings and remediation

---

## 12. Security Tools

### 12.1 Development Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| **ESLint** | Static analysis | `pnpm eslint .` |
| **TypeScript** | Type safety | `pnpm tsc --noEmit` |
| **Prettier** | Code formatting | `pnpm prettier --check .` |
| **Zod** | Runtime validation | `import { z } from 'zod'` |

---

### 12.2 Security Scanning Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| **pnpm audit** | Dependency vulnerabilities | `pnpm audit` |
| **Snyk** | Dependency + container scanning | `snyk test` |
| **Gitleaks** | Secret detection | `gitleaks detect` |
| **OWASP ZAP** | Dynamic security testing | Manual |
| **Dependabot** | Automated dependency updates | GitHub integration |

---

### 12.3 Monitoring Tools

| Tool | Purpose | URL |
|------|---------|-----|
| **Sentry** | Error tracking | https://sentry.io/holi-labs |
| **Grafana** | Metrics, alerting | https://metrics.holilabs.xyz |
| **PagerDuty** | Incident management | https://holilabs.pagerduty.com |
| **CloudWatch** | AWS monitoring | https://console.aws.amazon.com/cloudwatch |

---

### 12.4 Security Resources

**Internal:**
- `/docs/HIPAA_COMPLIANCE_CHECKLIST.md`
- `/docs/HIPAA_RISK_ASSESSMENT.md`
- `/docs/INCIDENT_RESPONSE_PLAN.md`

**External:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- CWE Top 25: https://cwe.mitre.org/top25/

---

## Document Control

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-01 | Initial release |

**Review Schedule:** Quarterly

**Next Review:** 2026-04-01

---

## Quick Reference

### Security Checklist (Print and Post)

**Before Committing Code:**
- [ ] No PHI in logs
- [ ] Input validated (Zod)
- [ ] Authorization checked
- [ ] PHI encrypted (automatic)
- [ ] PHI access audited
- [ ] Tests pass
- [ ] No secrets in code
- [ ] `pnpm audit` clean

**Before Merging PR:**
- [ ] Code review approved
- [ ] Security review (if high-risk)
- [ ] CI/CD tests pass
- [ ] No new vulnerabilities

**Before Deploying:**
- [ ] Tested on staging
- [ ] Database migration tested
- [ ] Rollback plan ready
- [ ] Monitoring configured

---

**END OF DEVELOPER SECURITY GUIDELINES**

For questions or security concerns, contact: security@holilabs.xyz

**Report Security Vulnerabilities:** security@holilabs.xyz (confidential)

---

**Remember:** Security is everyone's responsibility. When in doubt, ask!
