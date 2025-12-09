# Casbin RBAC Implementation Guide

## Overview

Casbin is a powerful and efficient open-source access control library that supports multiple access control models (ACL, RBAC, ABAC, etc.). We use it to implement **policy-based authorization** for Holi Labs.

**SOC 2 Control**: CC6.3 (Authorization & Principle of Least Privilege)

**Why Casbin?**
- ✅ Centralized policy management (all permissions in one place)
- ✅ Role hierarchy (ADMIN inherits PHYSICIAN permissions)
- ✅ Attribute-based access control (ABAC)
- ✅ Multi-tenancy support (organization-level permissions)
- ✅ Audit trail of policy changes
- ✅ Policy versioning and testing

**Replaces**: Ad-hoc `if (user.role === 'ADMIN')` checks scattered throughout codebase.

---

## Architecture

### Policy Model

We use Casbin's **RBAC with Domain** model:

```
[request_definition]
r = sub, obj, act, dom

[policy_definition]
p = sub, obj, act, dom, eft

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.obj == p.obj && r.act == p.act && (r.dom == p.dom || p.dom == "*")
```

**Components:**
- `sub` (Subject): User ID or role name
- `obj` (Object): Resource (e.g., 'patients', 'prescriptions')
- `act` (Action): Operation (e.g., 'read', 'write', 'delete')
- `dom` (Domain): Organization ID or '*' for global
- `eft` (Effect): 'allow' or 'deny'

---

## Database Schema

Policies are stored in PostgreSQL via Prisma:

```prisma
model CasbinRule {
  id    Int     @id @default(autoincrement())
  ptype String  // Policy type (p = policy, g = grouping/role)
  v0    String? // Subject (role or user)
  v1    String? // Object (resource)
  v2    String? // Action (read, write, delete, etc.)
  v3    String? // Domain (organization ID or *)
  v4    String? // Effect (allow, deny)
  v5    String? // Condition (optional)

  @@index([ptype])
  @@index([v0])
  @@index([v1])
}
```

---

## Default Policies

Run `initializeDefaultPolicies()` once to set up base permissions:

### Role Hierarchy

```
g, ADMIN, PHYSICIAN, *  # ADMIN inherits all PHYSICIAN permissions
```

### PHYSICIAN Permissions

```
p, PHYSICIAN, patients, read, *, allow
p, PHYSICIAN, patients, write, *, allow
p, PHYSICIAN, patients, delete, *, allow
p, PHYSICIAN, prescriptions, read, *, allow
p, PHYSICIAN, prescriptions, write, *, allow
p, PHYSICIAN, consultations, read, *, allow
p, PHYSICIAN, consultations, write, *, allow
p, PHYSICIAN, lab-results, read, *, allow
p, PHYSICIAN, lab-results, write, *, allow
```

### CLINICIAN Permissions

```
p, CLINICIAN, patients, read, *, allow
p, CLINICIAN, patients, write, *, allow
p, CLINICIAN, consultations, read, *, allow
p, CLINICIAN, consultations, write, *, allow
p, CLINICIAN, prescriptions, read, *, allow
```

### NURSE Permissions

```
p, NURSE, patients, read, *, allow
p, NURSE, consultations, read, *, allow
p, NURSE, prescriptions, read, *, allow
p, NURSE, lab-results, read, *, allow
```

### RECEPTIONIST Permissions

```
p, RECEPTIONIST, patients, read, *, allow
p, RECEPTIONIST, patients, write, *, allow
p, RECEPTIONIST, appointments, read, *, allow
p, RECEPTIONIST, appointments, write, *, allow
p, RECEPTIONIST, appointments, delete, *, allow
```

### LAB_TECH Permissions

```
p, LAB_TECH, patients, read, *, allow
p, LAB_TECH, lab-results, read, *, allow
p, LAB_TECH, lab-results, write, *, allow
```

### PHARMACIST Permissions

```
p, PHARMACIST, patients, read, *, allow
p, PHARMACIST, prescriptions, read, *, allow
p, PHARMACIST, prescriptions, write, *, allow
```

### STAFF Permissions

```
p, STAFF, patients, read, *, allow
```

---

## Usage in Next.js API Routes

### Pattern 1: HOC with Explicit Resource/Action (Recommended)

```typescript
// app/api/patients/route.ts
import { withCasbinCheck } from '@/lib/auth/casbin-middleware';
import { prisma } from '@/lib/prisma';

// Require 'patients:read' permission
export const GET = withCasbinCheck('patients', 'read')(async (request) => {
  const patients = await prisma.patient.findMany();
  return Response.json({ patients });
});

// Require 'patients:write' permission
export const POST = withCasbinCheck('patients', 'write')(async (request) => {
  const data = await request.json();
  const patient = await prisma.patient.create({ data });
  return Response.json({ patient });
});

// Require 'patients:delete' permission
export const DELETE = withCasbinCheck('patients', 'delete')(async (request) => {
  const { id } = await request.json();
  await prisma.patient.delete({ where: { id } });
  return Response.json({ success: true });
});
```

### Pattern 2: Auto-Detect Resource/Action from URL

```typescript
// app/api/prescriptions/route.ts
import { withAutoCasbinCheck } from '@/lib/auth/casbin-middleware';

// Automatically detects 'prescriptions' from URL and 'read' from GET method
export const GET = withAutoCasbinCheck()(async (request) => {
  const prescriptions = await prisma.prescription.findMany();
  return Response.json({ prescriptions });
});

// Auto-detects 'prescriptions' and 'write' from POST
export const POST = withAutoCasbinCheck()(async (request) => {
  const data = await request.json();
  const prescription = await prisma.prescription.create({ data });
  return Response.json({ prescription });
});
```

### Pattern 3: Manual Permission Check

```typescript
// app/api/consultations/[id]/route.ts
import { checkPermission } from '@/lib/auth/casbin-middleware';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Manual permission check
  const result = await checkPermission(request, 'consultations', 'read');

  if (!result.allowed) {
    return Response.json(
      {
        error: 'Forbidden',
        message: 'You do not have permission to view consultations',
      },
      { status: 403 }
    );
  }

  // Permission granted
  const consultation = await prisma.consultation.findUnique({
    where: { id: params.id },
  });

  return Response.json({ consultation });
}
```

### Pattern 4: Role-Based Check (Simple)

```typescript
// app/api/admin/users/route.ts
import { requireRoles } from '@/lib/auth/casbin-middleware';

// Only ADMIN role can access
export const GET = requireRoles(['ADMIN'])(async (request) => {
  const users = await prisma.user.findMany();
  return Response.json({ users });
});

// ADMIN or PHYSICIAN can access
export const POST = requireRoles(['ADMIN', 'PHYSICIAN'])(async (request) => {
  const data = await request.json();
  const user = await prisma.user.create({ data });
  return Response.json({ user });
});
```

---

## Usage in Server Actions

```typescript
// app/patients/actions.ts
'use server';

import { enforceCasbinAction } from '@/lib/auth/casbin-middleware';
import { prisma } from '@/lib/prisma';

// Protect server action with Casbin
export const updatePatient = enforceCasbinAction(
  'patients',      // Resource
  'write',         // Action
  '*',             // Domain (organization)
  async (patientId: string, data: any) => {
    return await prisma.patient.update({
      where: { id: patientId },
      data,
    });
  }
);

// Another protected action
export const deletePatient = enforceCasbinAction(
  'patients',
  'delete',
  '*',
  async (patientId: string) => {
    return await prisma.patient.delete({
      where: { id: patientId },
    });
  }
);
```

**Usage in component:**

```typescript
// app/patients/[id]/edit/page.tsx
'use client';

import { updatePatient } from '../actions';

export default function EditPatient({ params }: { params: { id: string } }) {
  async function handleSubmit(formData: FormData) {
    try {
      await updatePatient(params.id, {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
      });
      alert('Patient updated!');
    } catch (error) {
      alert('Error: ' + error.message); // "Forbidden: You do not have permission to write patients"
    }
  }

  return <form action={handleSubmit}>...</form>;
}
```

---

## Managing Policies Programmatically

### Add a Policy

```typescript
import { addPolicy } from '@/lib/auth/casbin';

// Allow RECEPTIONIST to view invoices
await addPolicy('RECEPTIONIST', 'invoices', 'read', '*', 'allow');

// Deny STAFF from deleting patients
await addPolicy('STAFF', 'patients', 'delete', '*', 'deny');
```

### Remove a Policy

```typescript
import { removePolicy } from '@/lib/auth/casbin';

await removePolicy('RECEPTIONIST', 'invoices', 'read', '*', 'allow');
```

### Assign Role to User

```typescript
import { addRoleForUser } from '@/lib/auth/casbin';

// Assign PHYSICIAN role to user in organization
await addRoleForUser('user_123', 'PHYSICIAN', 'org_456');

// Assign global ADMIN role
await addRoleForUser('user_789', 'ADMIN', '*');
```

### Remove Role from User

```typescript
import { deleteRoleForUser } from '@/lib/auth/casbin';

await deleteRoleForUser('user_123', 'PHYSICIAN', 'org_456');
```

### Check User's Roles

```typescript
import { getRolesForUser } from '@/lib/auth/casbin';

const roles = await getRolesForUser('user_123', 'org_456');
console.log(roles); // ['PHYSICIAN', 'CLINICIAN']
```

### Get All Users with Role

```typescript
import { getUsersForRole } from '@/lib/auth/casbin';

const physicians = await getUsersForRole('PHYSICIAN', 'org_456');
console.log(physicians); // ['user_123', 'user_456', 'user_789']
```

---

## Multi-Tenancy (Organization-Level Permissions)

Casbin supports **domain-based** permissions for multi-tenancy:

```typescript
// User is PHYSICIAN in org_456 but not in org_789
await addRoleForUser('user_123', 'PHYSICIAN', 'org_456');

// Check permission in specific organization
const canReadInOrg456 = await enforce('user_123', 'patients', 'read', 'org_456'); // true
const canReadInOrg789 = await enforce('user_123', 'patients', 'read', 'org_789'); // false

// Global permission (all organizations)
await addPolicy('ADMIN', 'patients', 'read', '*', 'allow');
```

**Usage in API routes:**

```typescript
export const GET = withCasbinCheck('patients', 'read', 'org_456')(async (request) => {
  // Only users with 'patients:read' in org_456 can access
  const patients = await prisma.patient.findMany({
    where: { organizationId: 'org_456' },
  });
  return Response.json({ patients });
});
```

---

## Advanced: Attribute-Based Access Control (ABAC)

Casbin supports conditions based on attributes:

```typescript
// Only patient owner can update
p, PHYSICIAN, patients, write, *, owner

// Custom matcher in casbin-model.conf:
m = g(r.sub, p.sub, r.dom) && r.obj == p.obj && r.act == p.act && checkOwner(r.sub, r.obj)
```

**Implementation:**

```typescript
// Define custom function in Casbin enforcer
const enforcer = await getEnforcer();

enforcer.addFunction('checkOwner', (sub: string, obj: string) => {
  // Custom logic: check if user owns the resource
  const patient = prisma.patient.findUnique({ where: { id: obj } });
  return patient?.createdBy === sub;
});
```

---

## Testing Policies

### Unit Test Example

```typescript
// __tests__/casbin.test.ts
import { enforce, addRoleForUser, initializeDefaultPolicies } from '@/lib/auth/casbin';

describe('Casbin RBAC', () => {
  beforeAll(async () => {
    await initializeDefaultPolicies();
  });

  it('should allow PHYSICIAN to read patients', async () => {
    await addRoleForUser('user_123', 'PHYSICIAN', '*');
    const allowed = await enforce('user_123', 'patients', 'read', '*');
    expect(allowed).toBe(true);
  });

  it('should deny NURSE from deleting patients', async () => {
    await addRoleForUser('user_456', 'NURSE', '*');
    const allowed = await enforce('user_456', 'patients', 'delete', '*');
    expect(allowed).toBe(false);
  });

  it('should inherit PHYSICIAN permissions for ADMIN', async () => {
    await addRoleForUser('user_789', 'ADMIN', '*');
    const allowed = await enforce('user_789', 'prescriptions', 'write', '*');
    expect(allowed).toBe(true); // ADMIN inherits from PHYSICIAN
  });
});
```

---

## Initialization Script

Run this once to set up default policies:

```bash
# Initialize policies (fails if policies already exist)
pnpm tsx scripts/init-casbin.ts

# Preview changes without applying
pnpm tsx scripts/init-casbin.ts --dry-run

# Force overwrite existing policies
pnpm tsx scripts/init-casbin.ts --force

# Verbose output with detailed summary
pnpm tsx scripts/init-casbin.ts --verbose
```

**Script Features:**
- ✅ Idempotent (safe to run multiple times)
- ✅ Policy validation and integrity checks
- ✅ Detailed summary report
- ✅ Dry-run mode for testing
- ✅ Force mode for overwriting existing policies

**Script Location:** `/scripts/init-casbin.ts`

---

## Health Check

```typescript
// app/api/health/casbin/route.ts
import { checkCasbinHealth } from '@/lib/auth/casbin';

export async function GET() {
  const health = await checkCasbinHealth();
  return Response.json(health);
}
```

**Response:**

```json
{
  "healthy": true,
  "policyCount": 45
}
```

---

## Migration from Ad-Hoc RBAC

### Before (Ad-Hoc):

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession();

  // Ad-hoc role check (scattered throughout codebase)
  if (session.user.role !== 'PHYSICIAN' && session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const patients = await prisma.patient.findMany();
  return Response.json({ patients });
}
```

### After (Casbin):

```typescript
import { withCasbinCheck } from '@/lib/auth/casbin-middleware';

export const GET = withCasbinCheck('patients', 'read')(async (request) => {
  const patients = await prisma.patient.findMany();
  return Response.json({ patients });
});
```

**Benefits:**
- ✅ Centralized policy management
- ✅ Easier to audit and test
- ✅ Supports complex hierarchies and conditions
- ✅ No code changes to update permissions

---

## Troubleshooting

### Problem: Policy not working

**Symptom**: User has role but still gets 403 Forbidden.

**Solution:**

1. Check if policy exists:
```typescript
import { getAllPolicies } from '@/lib/auth/casbin';

const policies = await getAllPolicies();
console.log(policies);
```

2. Check user's roles:
```typescript
import { getRolesForUser } from '@/lib/auth/casbin';

const roles = await getRolesForUser('user_123', '*');
console.log(roles);
```

3. Test enforcement manually:
```typescript
import { enforce } from '@/lib/auth/casbin';

const allowed = await enforce('PHYSICIAN', 'patients', 'read', '*');
console.log(allowed); // Should be true
```

---

### Problem: Policies not persisting

**Symptom**: Policies disappear after restart.

**Solution**: Policies are stored in PostgreSQL. Check database:

```sql
SELECT * FROM casbin_rule;
```

If empty, run initialization:

```bash
pnpm tsx scripts/init-casbin.ts
```

---

## Performance Considerations

**Query Performance:**
- Casbin loads all policies into memory on startup
- Policy checks are O(1) in-memory lookups
- No database query on each authorization check

**Scalability:**
- 10,000 policies: <1ms enforcement latency
- 100,000 policies: <5ms enforcement latency

**Caching:**
- Enforcer instance is cached as singleton
- Call `clearEnforcerCache()` after bulk policy updates

---

## References

- [Casbin Official Documentation](https://casbin.org/docs/overview)
- [Casbin RBAC Model](https://casbin.org/docs/rbac)
- [Casbin Adapter Pattern](https://casbin.org/docs/adapters)
- [SOC 2 Trust Service Criteria - CC6.3](https://www.aicpa.org/resources/download/trust-services-criteria)

---

**Questions?** Contact the Holi Labs engineering team.
