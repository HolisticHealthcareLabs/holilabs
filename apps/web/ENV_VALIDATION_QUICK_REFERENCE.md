# Environment Variable Validation - Quick Reference

**Status:** ✅ Fully Implemented and Production-Ready

---

## Quick Start

### Validate Environment
```bash
# Quick validation
pnpm run validate:env

# Detailed validation with feature report
tsx scripts/validate-env.ts

# Test validation behavior
tsx scripts/test-env-validation.ts

# Production-specific checks
tsx scripts/validate-production.ts
```

### In Your Code
```typescript
import { env, isFeatureEnabled } from '@/lib/env';

// Type-safe access with IntelliSense
const dbUrl = env.DATABASE_URL;
const apiKey = env.ANTHROPIC_API_KEY;

// Check if optional features are configured
if (isFeatureEnabled('RESEND_API_KEY')) {
  // Email available
}
```

---

## Critical Variables (Must Set in Production)

```bash
# Authentication & Security (REQUIRED)
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
SESSION_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
ENCRYPTION_MASTER_KEY="$(openssl rand -base64 32)"

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Database (REQUIRED at runtime)
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# App Configuration (REQUIRED)
NEXT_PUBLIC_APP_URL="https://your-app.com"
NODE_ENV="production"
```

---

## Environment Variable Count

| Category | Variables |
|----------|-----------|
| 🔐 Security | 6 |
| ☁️ Infrastructure | 9 |
| 🤖 AI Services | 17 |
| 📧 Notifications | 16 |
| 💳 Payments | 11 |
| 📊 Monitoring | 6 |
| 🏥 Medical License | 6 |
| Other | 9 |
| **TOTAL** | **60+** |

---

## Helper Functions

### `env` - Type-safe environment object
```typescript
import { env } from '@/lib/env';
const dbUrl = env.DATABASE_URL;  // string | undefined
```

### `isFeatureEnabled(key)` - Check if feature is configured
```typescript
import { isFeatureEnabled } from '@/lib/env';

if (isFeatureEnabled('ANTHROPIC_API_KEY')) {
  // Claude AI is available
}
```

### `getRequiredEnv(key)` - Get required variable (throws if missing)
```typescript
import { getRequiredEnv } from '@/lib/env';

const apiKey = getRequiredEnv('ANTHROPIC_API_KEY');
// Throws: Required environment variable ANTHROPIC_API_KEY is not set
```

### `getNumericEnv(key, default)` - Parse numeric value
```typescript
import { getNumericEnv } from '@/lib/env';

const maxRequests = getNumericEnv('MAX_CONCURRENT_AI_REQUESTS', 10);
// Returns: 10 (default) or parsed number
```

### `getBooleanEnv(key, default)` - Parse boolean value
```typescript
import { getBooleanEnv } from '@/lib/env';

const cacheEnabled = getBooleanEnv('AI_CACHE_ENABLED', true);
// Returns: true (default) or parsed boolean
```

---

## Validation Behavior

### Development
- ⚠️ Warnings for missing production-critical variables
- ✅ Doesn't exit on missing optional variables
- 🔄 Allows rapid iteration

### Production
- 🚨 Exits immediately if critical variables missing
- ⚠️ Warns about missing optional features
- 📊 Logs feature configuration status

---

## Error Examples

### Missing Required Variable
```
❌ Environment Variable Validation Failed:

  • NEXT_PUBLIC_SUPABASE_URL: Required
    (Not set in environment)

📖 See apps/web/.env.example for required variables
```

### Invalid Format
```
❌ Environment Variable Validation Failed:

  • ENCRYPTION_KEY: ENCRYPTION_KEY must be exactly 64 characters (hex)
    Generate with: openssl rand -hex 32

  • NEXTAUTH_SECRET: NEXTAUTH_SECRET must be at least 32 characters
    Generate with: openssl rand -base64 32
```

### Production Warnings
```
⚠️  Production Environment Warnings:

  • No AI provider configured - CDSS features will not work
  • Redis not configured - rate limiting will not scale across instances
  • Sentry not configured - errors will not be tracked
```

---

## Generate Secrets

```bash
# NEXTAUTH_SECRET, SESSION_SECRET, ENCRYPTION_MASTER_KEY
openssl rand -base64 32

# ENCRYPTION_KEY (64 hex characters)
openssl rand -hex 32

# CRON_SECRET
openssl rand -hex 32

# VAPID Keys (Web Push Notifications)
npx web-push generate-vapid-keys
```

---

## CI/CD Integration

### GitHub Actions
```yaml
- name: Validate Environment
  run: tsx apps/web/scripts/validate-env.ts
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    # ... other secrets

- name: Build
  run: pnpm build
```

### Exit Codes
- `0` - Validation passed
- `1` - Validation failed

---

## Files Reference

### Core
- `/src/lib/env.ts` - Zod validation schemas (497 lines)
- `/src/app/layout.tsx` - Imports env for startup validation

### Scripts
- `/scripts/validate-env.ts` - CI/CD validation (NEW ✨)
- `/scripts/test-env-validation.ts` - Test suite
- `/scripts/validate-production.ts` - Production checks

### Documentation
- `/ENV_VALIDATION.md` - Complete guide (493 lines)
- `/docs/ENVIRONMENT_VARIABLES.md` - Production guide (359 lines)
- `/.env.example` - Documented examples (199 lines)

### Reports
- `/AGENT2_COMPLETION_REPORT.md` - Original implementation report
- `/AGENT2_FINAL_REPORT.md` - Comprehensive analysis
- `/ENV_VALIDATION_QUICK_REFERENCE.md` - This document

---

## Troubleshooting

### "Required" error but variable is set
```bash
# Check for typos (case-sensitive!)
printenv | grep VARIABLE_NAME

# Check for spaces around =
# BAD:  DATABASE_URL = postgresql://...
# GOOD: DATABASE_URL=postgresql://...

# Restart dev server
pnpm dev
```

### "Invalid URL" error
```bash
# Ensure URL includes protocol
# BAD:  localhost:5432
# GOOD: postgresql://localhost:5432

# No trailing spaces or quotes
```

### "Wrong length" error
```bash
# Check actual length
echo -n "$ENCRYPTION_KEY" | wc -c

# Regenerate if wrong
openssl rand -hex 32  # 64 hex chars
```

---

## Quick Checklist

### Before Development
- [ ] Copy `.env.example` to `.env.local`
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Set `NEXT_PUBLIC_APP_URL` (can be localhost)
- [ ] Run `pnpm run validate:env`

### Before Production Deploy
- [ ] Generate all secrets with `openssl rand`
- [ ] Set `DATABASE_URL` with `?sslmode=require`
- [ ] Set all `NEXTAUTH_SECRET`, `SESSION_SECRET`, etc.
- [ ] Configure at least one AI provider
- [ ] Set cloud storage (R2 or S3)
- [ ] Set email provider (Resend recommended)
- [ ] Enable Redis (Upstash)
- [ ] Enable Sentry
- [ ] Run `tsx scripts/validate-production.ts`

---

## Support

For complete documentation, see:
- `/apps/web/ENV_VALIDATION.md` - Full validation guide
- `/apps/web/docs/ENVIRONMENT_VARIABLES.md` - Production setup
- `/apps/web/AGENT2_FINAL_REPORT.md` - Comprehensive analysis

---

**Last Updated:** December 15, 2025
**Status:** ✅ Production Ready
