# Environment Variable Validation

## ✅ What Was Implemented

We've added **automatic environment variable validation** using Zod that runs on app startup and fails fast with clear error messages if required configuration is missing.

---

## 🎯 Benefits

### Before:
- App crashes mysteriously in production
- Hard to debug missing env vars
- No type safety for `process.env`
- Silent failures

### After:
- ✅ **Fails fast** with clear error messages
- ✅ **Type-safe** environment variables
- ✅ **Automatic validation** on startup
- ✅ **Helpful warnings** for optional but recommended vars
- ✅ **Prevents production bugs** before they happen

---

## 📖 How It Works

### Validation Schema

All environment variables are defined in `/src/lib/env.ts` using Zod:

```typescript
const envSchema = z.object({
  // Required
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Optional but validated
  DATABASE_URL: z.string().url().optional(),
  ENCRYPTION_KEY: z.string().length(64).optional(),
  // ... etc
});
```

###When Validation Runs

**Automatically on:**
1. App startup (server start)
2. Any time you call `getEnv()` or `validateEnv()`

**NOT during:**
- Build time (DATABASE_URL can be missing during build)
- Test runs (unless explicitly called)

---

## 🚨 What Happens On Failure

### Example Output:

```
❌ Environment Variable Validation Failed:

  • DATABASE_URL: Required
    (Not set in environment)
  • ENCRYPTION_KEY: ENCRYPTION_KEY must be exactly 64 characters (hex). Generate with: openssl rand -hex 32
  • RESEND_API_KEY: RESEND_API_KEY must start with "re_"

📖 See apps/web/.env.production.example for required variables
```

### In Production:
- **Process exits with code 1** (fail fast)
- Clear error messages logged
- Prevents app from starting with bad config

### In Development:
- Warnings only (doesn't crash)
- Lets you develop without all vars set

---

## 📋 Required Variables

These MUST be set or app won't start in production:

| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Authentication | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth (public key) | Supabase Dashboard → Settings → API |

---

## ⚠️ Recommended Variables

App will start without these, but with warnings:

| Variable | Purpose | Impact if Missing |
|----------|---------|-------------------|
| `DATABASE_URL` | PostgreSQL connection | No database access |
| `ENCRYPTION_KEY` | Encrypt OAuth tokens | **Security risk!** Tokens stored in plaintext |
| `NEXTAUTH_SECRET` | Session security | Sessions may be insecure |
| `RESEND_API_KEY` | Send emails | Email features won't work |

---

## 🔧 Optional Variables

No warnings if missing, but features won't work:

### Calendar OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`

### AI Services
- `ANTHROPIC_API_KEY`

### Monitoring
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`

### Redis (for later)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Blockchain (optional)
- `ENABLE_BLOCKCHAIN`
- `POLYGON_RPC_URL`
- `HEALTH_CONTRACT_ADDRESS`

---

## 🎨 Usage in Code

### Get Type-Safe Environment Variables

```typescript
import { getEnv } from '@/lib/env';

const env = getEnv();

// Type-safe! TypeScript knows all available properties
console.log(env.DATABASE_URL);
console.log(env.NEXT_PUBLIC_SUPABASE_URL);
```

### Check if Feature is Enabled

```typescript
import { isFeatureEnabled } from '@/lib/env';

if (isFeatureEnabled('ENABLE_BLOCKCHAIN')) {
  // Blockchain code
}

if (isFeatureEnabled('NEXT_PUBLIC_SENTRY_DSN')) {
  // Initialize Sentry
}
```

### Get Required Variable (with runtime check)

```typescript
import { getRequiredEnv } from '@/lib/env';

// Throws if not set
const databaseUrl = getRequiredEnv('DATABASE_URL');
```

### Manual Validation

```typescript
import { validateEnv } from '@/lib/env';

// Validate without exiting on error
try {
  const env = validateEnv({ exitOnError: false });
} catch (error) {
  // Handle validation failure
}
```

---

## 🧪 Testing

Run the test script to verify validation:

```bash
pnpm tsx src/lib/__tests__/env.test.ts
```

This will:
1. Test validation with current environment
2. Check feature flags
3. Simulate missing variables
4. Show current environment status

---

## 🔐 Security Best Practices

### ✅ DO:
- Set `ENCRYPTION_KEY` in production (64 hex chars)
- Use strong `NEXTAUTH_SECRET` (32+ characters)
- Rotate secrets regularly
- Keep `.env.local` in `.gitignore`

### ❌ DON'T:
- Commit secrets to git
- Share `.env` files in Slack/email
- Use development secrets in production
- Log environment variable values

---

## 📊 Validation Output

### Success (Development):
```
[22:12:19 UTC] INFO: Validating environment variables...
    event: "env_validation_start"

[22:12:19 UTC] INFO: Environment validation passed
    event: "env_validation_success"
    duration: 5
    nodeEnv: "development"
    hasDatabaseUrl: true
    hasSupabase: true
    hasEncryption: true
    hasRedis: false
```

### Success with Warnings (Production):
```
⚠️  Production Environment Warnings:

  • ENCRYPTION_KEY not set - OAuth tokens will NOT be encrypted (security risk!)
  • Redis not configured - rate limiting will not scale across instances
  • Sentry not configured - errors will not be tracked
```

---

## 🚀 How to Add New Environment Variables

1. **Add to schema** in `src/lib/env.ts`:
   ```typescript
   const envSchema = z.object({
     // ... existing vars
     MY_NEW_VAR: z.string().optional(),
   });
   ```

2. **Add to `.env.production.example`**:
   ```bash
   # My Feature
   MY_NEW_VAR=some-value-here
   ```

3. **TypeScript will autocomplete** - no manual types needed!

---

## 🔍 Debugging

### Check Current Environment:
```bash
pnpm tsx src/lib/__tests__/env.test.ts
```

### View Validation Logs:
Look for these events in your logs:
- `env_validation_start`
- `env_validation_success`
- `env_validation_failed`
- `env_validation_warnings`

### Common Issues:

**"Required" error but var is set:**
- Check for typos in variable name
- Ensure no spaces around `=` in `.env`
- Restart development server

**"Must be a valid URL" error:**
- Ensure URL includes `https://`
- No trailing spaces
- No quotes around URL

**"Must be X characters" error:**
- Check actual length: `echo -n $VAR | wc -c`
- Regenerate if needed

---

## 📞 Generating Secrets

### NEXTAUTH_SECRET (32+ chars):
```bash
openssl rand -base64 32
```

### ENCRYPTION_KEY (64 hex chars):
```bash
openssl rand -hex 32
```

### CSRF_SECRET:
```bash
openssl rand -base64 24
```

---

## 🎯 Next Steps

1. **In DigitalOcean:**
   - Go to your app → Settings → App-Level Environment Variables
   - Add all required variables
   - Redeploy

2. **After Deployment:**
   - Check logs for validation messages
   - Fix any warnings
   - Test that features work

3. **Optional:**
   - Add Sentry DSN for error tracking
   - Add Resend API key for emails
   - Add Redis for rate limiting

---

## ✅ Checklist for Production

Before deploying, ensure these are set in DigitalOcean:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `DATABASE_URL`
- [ ] `ENCRYPTION_KEY` (64 hex characters)
- [ ] `NEXTAUTH_SECRET` (32+ characters)
- [ ] `NODE_ENV=production`

Optional but recommended:
- [ ] `RESEND_API_KEY` (for emails)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (for error tracking)
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (for Redis)

---

**🎉 You now have bulletproof environment variable validation!**

No more mysterious production crashes due to missing config.
