# Schema Migration Guide

## ✅ COMPLETED: Unified Schema Package

All validation schemas have been consolidated into `packages/schemas` as a single source of truth.

### Architecture

```
packages/schemas/src/
├── constants.ts           # Shared constants (field limits, vital ranges)
├── patient.schema.ts      # Patient validation
├── clinical.schema.ts     # SOAP notes, vital signs, diagnoses
├── prescription.schema.ts # Prescriptions & medications
├── appointment.schema.ts  # Scheduling
├── compliance.schema.ts   # Consents, documents, audit logs
├── user.schema.ts         # User management
├── analytics.schema.ts    # Analytics & search
└── index.ts              # Single export point
```

## Migration Steps

### 1. Frontend Forms

**BEFORE (❌ BROKEN):**
```typescript
// apps/web/src/lib/validation/schemas.ts
import { CreatePatientSchema } from '@/lib/validation/schemas';
```

**AFTER (✅ CORRECT):**
```typescript
import { CreatePatientSchema } from '@holi/schemas';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<CreatePatientInput>({
  resolver: zodResolver(CreatePatientSchema)
});
```

### 2. Backend API Routes

**BEFORE (❌ BROKEN):**
```typescript
// apps/web/src/app/api/patients/route.ts
import { CreatePatientSchema } from '@/lib/api/schemas';
```

**AFTER (✅ CORRECT):**
```typescript
import { CreatePatientSchema, CreatePatientInput } from '@holi/schemas';

export async function POST(req: Request) {
  const body = await req.json();
  const validated = CreatePatientSchema.parse(body);
  // ...
}
```

### 3. Type Imports

All TypeScript types are automatically exported:

```typescript
import type {
  CreatePatientInput,
  UpdatePatientInput,
  CreateSOAPNoteInput,
  VitalSignsInput,
  // etc...
} from '@holi/schemas';
```

## Critical Invariants (MUST FOLLOW)

### ✅ Invariant 1: Single Schema Source
- ❌ FORBIDDEN: Creating schemas in `apps/web/src/lib/validation/` or `apps/web/src/lib/api/`
- ✅ REQUIRED: All schemas MUST live in `packages/schemas/src/`

### ✅ Invariant 2: Forms Use Shared Schemas
```typescript
// ✅ CORRECT
import { CreatePatientSchema } from '@holi/schemas';
const form = useForm({ resolver: zodResolver(CreatePatientSchema) });

// ❌ FORBIDDEN
const form = useForm({
  validate: (values) => { /* manual validation */ }
});
```

### ✅ Invariant 3: Backend Uses Same Schemas
```typescript
// Frontend and backend MUST use identical validation
import { CreatePatientSchema } from '@holi/schemas';
```

## Files to Delete

After migration is complete, delete these duplicate files:

```bash
rm apps/web/src/lib/validation/schemas.ts
rm apps/web/src/lib/api/schemas.ts
```

## Testing

```bash
# Build schemas package
cd packages/schemas
pnpm build

# Verify frontend imports
cd ../../apps/web
pnpm tsc --noEmit
```

## Example: Patient Form

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePatientSchema, CreatePatientInput } from '@holi/schemas';

export function PatientForm() {
  const form = useForm<CreatePatientInput>({
    resolver: zodResolver(CreatePatientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      country: 'MX',
    }
  });

  const onSubmit = async (data: CreatePatientInput) => {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      // Success - frontend validation matches backend
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## Pre-commit Hook (TODO)

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
# Enforce single schema source

FORBIDDEN_PATHS=(
  "apps/web/src/lib/validation/schemas.ts"
  "apps/web/src/lib/api/schemas.ts"
)

for path in "${FORBIDDEN_PATHS[@]}"; do
  if [ -f "$path" ]; then
    echo "❌ ERROR: Duplicate schema file detected: $path"
    echo "✅ Use packages/schemas instead"
    exit 1
  fi
done
```

## Benefits

### 🎯 Type Safety Loop Closed
```
Frontend Input → @holi/schemas Validation → API Call
                       ↑                         ↓
                       └───── Same Schema ───────┘
```

### 🔄 Deterministic State
- Frontend forms CANNOT drift from backend validation
- TypeScript types are always in sync
- Runtime validation matches compile-time types

### 🚀 Developer Experience
- Single import: `import { CreatePatientSchema } from '@holi/schemas'`
- Auto-complete for all schemas and types
- Refactoring is safe (change once, update everywhere)

## Next Steps

1. ✅ Schema package created and built
2. ⏳ Migrate frontend forms to use `@holi/schemas`
3. ⏳ Migrate backend routes to use `@holi/schemas`
4. ⏳ Delete duplicate schema files
5. ⏳ Add pre-commit hook enforcement
