# 🔍 Sentry Error Monitoring Setup

Sentry provides real-time error tracking and performance monitoring for production applications.

---

## Why Sentry is Critical

- **Debug production errors** - See exact error messages, stack traces, and user context
- **Get alerted immediately** - Email/Slack notifications when errors occur
- **Track performance** - Monitor slow API calls and page loads
- **User privacy** - Automatically scrubs sensitive data (PHI)
- **Free tier** - 5,000 errors/month free

---

## Step 1: Create Sentry Account (Free)

1. Go to **https://sentry.io**
2. Click **"Get Started"**
3. Sign up with GitHub or email
4. Verify your email

---

## Step 2: Create a Project

1. In Sentry dashboard, click **"Create Project"**
2. **Select platform:** `Next.js`
3. **Set alert frequency:** `On every new issue`
4. **Project name:** `holi-labs-web`
5. **Team:** `#holi-labs` (or your team name)
6. Click **"Create Project"**

---

## Step 3: Get Your DSN (Data Source Name)

After creating the project:

1. You'll see a page that says **"Configure SDK"**
2. Look for a code snippet like:
   ```javascript
   Sentry.init({
     dsn: "https://abc123def456@o123456.ingest.sentry.io/789012",
   });
   ```
3. **Copy the DSN** (the long URL)
4. It will look like: `https://abc123def456@o123456.ingest.sentry.io/789012`

---

## Step 4: Add DSN to Environment Variables

### **For Local Development** (`.env.local`):

```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012
NEXT_PUBLIC_APP_VERSION=1.0.0-dev
```

### **For Production** (DigitalOcean):

1. Go to DigitalOcean → Your App → **Settings** → **Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```
3. Click **"Save"**
4. App will automatically redeploy

---

## Step 5: Test Sentry Integration

### **Option A: Trigger a Test Error (Client)**

1. Go to any page in your app
2. Open browser console
3. Type:
   ```javascript
   throw new Error("Sentry test error from browser");
   ```
4. Press Enter
5. Check Sentry dashboard - you should see the error within 10 seconds

### **Option B: Create a Test Error Button**

Add this to any page temporarily:

```tsx
<button
  onClick={() => {
    throw new Error("Test Sentry error!");
  }}
>
  Trigger Error
</button>
```

Click the button → Error appears in Sentry

---

## Step 6: Configure Alerts

1. In Sentry, go to **Settings** → **Alerts**
2. Create alert rule:
   - **When:** `A new issue is created`
   - **Notify:** `Your email`
   - **For project:** `holi-labs-web`
3. Click **"Save Rule"**

**Optional:** Add Slack integration:
1. Go to **Settings** → **Integrations**
2. Find **"Slack"** → Click **"Install"**
3. Authorize Slack
4. Choose channel: `#alerts` or `#errors`

---

## Step 7: Production Best Practices

### **Filter Out Noise**

In `sentry.server.config.ts` and `sentry.client.config.ts`:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors from production
  environment: process.env.NODE_ENV,

  // Sample rate (100% for production start, reduce to 10-20% later)
  tracesSampleRate: 1.0,

  // Ignore common errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'chrome-extension://',
    // Network errors (user went offline)
    'NetworkError',
    'Failed to fetch',
    // CORS errors
    'CORS',
  ],
});
```

### **Set User Context**

When a user logs in:

```typescript
import * as Sentry from '@sentry/nextjs';

// After successful login
Sentry.setUser({
  id: user.id,
  email: user.email,
  role: user.role,
});

// On logout
Sentry.setUser(null);
```

### **Add Breadcrumbs**

Track user actions before errors:

```typescript
Sentry.addBreadcrumb({
  category: 'patient',
  message: 'Viewed patient record',
  data: {
    patientId: 'PT-123',
  },
  level: 'info',
});
```

---

## What Sentry Captures Automatically

✅ **Errors:**
- JavaScript errors
- Unhandled promise rejections
- React component errors (via ErrorBoundary)
- API route errors

✅ **Context:**
- User browser, OS, device
- Page URL when error occurred
- User actions before error (breadcrumbs)
- Console logs
- Network requests

✅ **Performance:**
- Page load times
- API response times
- Component render times

❌ **Not Captured (Privacy):**
- Passwords
- Credit card numbers
- PHI data (auto-scrubbed)

---

## Sentry Dashboard Overview

### **Issues Tab:**
- See all errors grouped by type
- Shows frequency (how many times occurred)
- Shows affected users
- Click to see stack trace

### **Performance Tab:**
- Slow API calls
- Slow page loads
- Bottlenecks

### **Releases Tab:**
- Track which version has errors
- Compare error rates between versions

---

## Troubleshooting

### **Sentry not receiving errors?**

1. Check DSN is set:
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
2. Check Sentry is initialized:
   - Open browser DevTools → Network tab
   - Trigger an error
   - Look for request to `sentry.io/api`

3. Check Sentry config files exist:
   ```bash
   ls apps/web/sentry.*.config.ts
   ```
   Should show:
   - `sentry.client.config.ts`
   - `sentry.server.config.ts`
   - `sentry.edge.config.ts`

### **Too many errors?**

Adjust sample rate in config:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // Only send 10% of errors
});
```

---

## Cost Breakdown

**Free Tier:**
- 5,000 errors/month
- 10,000 transactions/month
- 1 user
- 30-day data retention

**Team Plan ($26/month):**
- 50,000 errors/month
- 100,000 transactions/month
- Unlimited users
- 90-day data retention
- Slack integration

**For Holi Labs:**
Start with **Free tier** during pilot. Upgrade if you exceed limits.

---

## Next Steps

1. ✅ Sign up at https://sentry.io
2. ✅ Create `holi-labs-web` project
3. ✅ Copy DSN
4. ✅ Add to `.env.local` (dev) and DigitalOcean (prod)
5. ✅ Test with a sample error
6. ✅ Configure alerts
7. ✅ Add to team Slack channel

---

## Example: Real Error in Sentry

When an error occurs, Sentry shows:

```
Error: Cannot read property 'patientId' of undefined
  at PatientDetailPage (apps/web/src/app/dashboard/patients/[id]/page.tsx:42:15)
  at renderWithHooks (react-dom.js:1234)

User: doctor@holilabs.com (ID: usr_abc123)
Browser: Chrome 120.0 on macOS
URL: https://holilabs.xyz/dashboard/patients/PT-123
Time: 2025-10-15 14:32:18

Breadcrumbs:
  1. User navigated to /dashboard/patients
  2. User clicked on patient "Maria Gonzalez"
  3. API call to /api/patients/PT-123 succeeded
  4. Error occurred while rendering patient details
```

This gives you **everything** you need to fix the bug!

---

**🎉 Sentry Setup Complete! Your app is now production-ready with real-time error monitoring.**
