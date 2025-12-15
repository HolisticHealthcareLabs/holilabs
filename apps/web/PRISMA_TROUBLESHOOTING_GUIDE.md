# Prisma Troubleshooting Guide

## Common Issue: "Property does not exist on type PrismaClient"

### Symptoms
```
error TS2339: Property 'modelName' does not exist on type 'PrismaClient'
error TS2339: Property 'passwordResetToken' does not exist on type 'PrismaClient'
error TS2339: Property 'devicePairing' does not exist on type 'PrismaClient'
```

### Root Cause
Prisma client types are outdated. The schema contains the model, but the generated TypeScript types haven't been updated.

### Solution
```bash
pnpm prisma generate
```

That's it. This regenerates all Prisma client types from your schema.

### When This Happens
- After pulling code with schema changes
- After adding a new model to schema.prisma
- After modifying existing models
- After switching branches with different schemas
- After merging PRs that touch schema.prisma

---

## Quick Diagnosis

### Step 1: Check if model exists in schema
```bash
grep "model YourModelName" prisma/schema.prisma
```

**If found:** Schema is correct, just regenerate types (see solution above)
**If not found:** Model is missing from schema (need to add it)

### Step 2: Verify Prisma client is installed
```bash
ls -la node_modules/@prisma/client
```

**If missing:** Run `pnpm install`

### Step 3: Check Prisma version
```bash
pnpm prisma --version
```

Expected: `6.7.0` or similar

---

## Prevention Checklist

### After Pulling Code
```bash
pnpm install              # Install dependencies
pnpm prisma generate      # Regenerate Prisma client
pnpm tsc --noEmit         # Check for errors
```

### Before Committing Schema Changes
```bash
pnpm prisma format        # Format schema
pnpm prisma validate      # Validate schema
pnpm prisma generate      # Generate types
pnpm tsc --noEmit         # Verify no errors
```

### CI/CD Integration
Add to your GitHub Actions or deployment pipeline:
```yaml
- name: Generate Prisma Client
  run: pnpm prisma generate

- name: Validate Schema
  run: pnpm prisma validate

- name: Type Check
  run: pnpm tsc --noEmit
```

---

## Error Categories

### 1. Model Not Found
**Error:** `Property 'modelName' does not exist on type 'PrismaClient'`
**Fix:** `pnpm prisma generate`

### 2. Field Not Found
**Error:** `Property 'fieldName' does not exist on type 'ModelName'`
**Diagnosis:**
1. Check if field exists in schema: `grep "fieldName" prisma/schema.prisma`
2. If found: `pnpm prisma generate`
3. If not found: Add field to schema, then generate

### 3. Relation Not Found
**Error:** `Property 'relationName' does not exist on type 'ModelName'`
**Check:**
```prisma
model Patient {
  appointments Appointment[]  // Relation must be defined
}

model Appointment {
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id])
}
```

### 4. Wrong Type
**Error:** Type mismatch between code and schema
**Fix:**
1. Check schema definition
2. Run `pnpm prisma generate`
3. Update code to match schema types

---

## Complete Reset (Nuclear Option)

If nothing else works:

```bash
# Remove generated files
rm -rf node_modules/@prisma/client
rm -rf node_modules/.prisma

# Reinstall
pnpm install

# Regenerate
pnpm prisma generate

# Verify
pnpm tsc --noEmit
```

---

## Common Commands Reference

```bash
# Essential Commands
pnpm prisma generate          # Generate Prisma Client
pnpm prisma validate          # Validate schema
pnpm prisma format            # Format schema file

# Database Commands
pnpm prisma migrate dev       # Create migration (dev)
pnpm prisma migrate deploy    # Apply migrations (prod)
pnpm prisma db push           # Push schema changes (dev only)
pnpm prisma db pull           # Pull schema from database

# Utility Commands
pnpm prisma studio            # Open database GUI
pnpm tsc --noEmit            # Check TypeScript errors
```

---

## Real-World Example: Agent 16 Fix

**Problem:**
- 23 TypeScript errors
- Models: PasswordResetToken, DevicePairing, DevicePermission, ClinicianPreferences
- All missing from PrismaClient types

**Investigation:**
```bash
# Checked if models exist
grep "model PasswordResetToken" prisma/schema.prisma
# Found: YES

# Checked if types were outdated
pnpm tsc --noEmit | grep -i prisma
# Result: 23 errors
```

**Solution:**
```bash
pnpm prisma generate
```

**Result:**
- All 23 errors resolved
- 0 code changes required
- Time: < 1 minute

---

## When to Ask for Help

**Ask for help if:**
1. `pnpm prisma generate` fails with errors
2. Model exists in schema but still shows errors after generate
3. Database migrations are involved
4. You see Prisma version conflicts

**Don't ask for help if:**
1. Error is simply "property does not exist" → Just run `pnpm prisma generate`
2. You forgot to run generate after pulling code → Run it now
3. You just added a model → Run generate

---

## Pro Tips

1. **Add to pre-commit hook:**
```json
{
  "husky": {
    "pre-commit": "pnpm prisma generate && pnpm tsc --noEmit"
  }
}
```

2. **VS Code: Reload window after generate**
   - Cmd+Shift+P → "Reload Window"
   - This refreshes TypeScript IntelliSense

3. **Check git status before generate**
   - Generating creates files in node_modules
   - These should NOT be committed
   - Only commit schema.prisma and migrations

4. **Keep Prisma up to date**
```bash
pnpm update @prisma/client prisma
```

---

## Schema File Location

```
/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/prisma/schema.prisma
```

**Total Models:** 95
**Database:** PostgreSQL
**Current Prisma Version:** 6.7.0

---

## Additional Resources

- **Full Report:** `AGENT16_PRISMA_SCHEMA_FIX_REPORT.md`
- **Quick Reference:** `PRISMA_QUICK_REFERENCE.md`
- **Files Affected:** `AGENT16_FILES_AFFECTED.md`
- **Prisma Docs:** https://www.prisma.io/docs

---

**Created:** 2025-12-15
**Author:** Agent 16
**Last Updated:** 2025-12-15
