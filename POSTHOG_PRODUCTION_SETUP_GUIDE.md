# 📊 PostHog Production Setup Guide

**Last Updated:** January 15, 2025
**Time Required:** 30 minutes
**Prerequisites:** BAA signed with PostHog (or proceed with extra PHI sanitization)

---

## 🎯 Overview

This guide walks you through:
1. Creating a PostHog production project (US Cloud for HIPAA)
2. Setting up feature flags for A/B testing
3. Creating funnels for user activation tracking
4. Adding API keys to DigitalOcean
5. Verifying events are being tracked
6. HIPAA compliance configuration

---

## 📝 Step 1: Create PostHog Account (US Cloud)

### 1.1 Sign Up

1. Go to: https://us.posthog.com/signup
   - **IMPORTANT:** Use `us.posthog.com` NOT `posthog.com`
   - US Cloud is required for HIPAA compliance
2. Sign up with your work email
3. Verify email
4. Choose "Healthcare" as industry

### 1.2 Create Production Project

1. Project name: `Holi Labs - Production`
2. Project URL slug: `holi-labs-prod`
3. Time zone: `America/Sao_Paulo` (or your local timezone)
4. Click "Create project"

### 1.3 Get Your API Keys

1. Go to: Project Settings → Project API Key
2. Copy these values:
   - **Project API Key**: `phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Host**: `https://us.i.posthog.com`

3. Save them temporarily (we'll add to DigitalOcean next)

---

## 🔐 Step 2: Add Environment Variables to DigitalOcean

### 2.1 Navigate to App Settings

1. Go to: https://cloud.digitalocean.com/apps
2. Click your app: `holilabs-lwp6y`
3. Go to: **Settings** tab
4. Scroll to: **App-Level Environment Variables**
5. Click: **Edit**

### 2.2 Add PostHog Variables

Add these 2 new environment variables:

| Key | Value | Type |
|-----|-------|------|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_your_actual_key_here` | Plain Text |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | Plain Text |

**Important:** These are `NEXT_PUBLIC_` variables so they are NOT encrypted (they're client-side). This is expected for PostHog.

### 2.3 Save and Redeploy

1. Click **Save**
2. App will automatically redeploy (takes 5-10 minutes)
3. Wait for deployment to complete

### 2.4 Verify Variables Set

After deployment, verify:

```bash
curl https://holilabs-lwp6y.ondigitalocean.app/api/health
```

Should return: `{"status":"healthy",...}`

---

## 🚩 Step 3: Create Feature Flags for A/B Testing

### 3.1 Navigate to Feature Flags

1. In PostHog dashboard, go to: **Feature Flags** (left sidebar)
2. Click: **New feature flag**

### 3.2 Create These 3 Feature Flags

#### Flag #1: New Dashboard Layout

1. **Key**: `new-dashboard-layout`
2. **Name**: New Dashboard Layout (2025 Redesign)
3. **Description**: Test new dashboard with greeting cards and metrics
4. **Type**: Boolean
5. **Rollout**:
   - Start at 0% (disabled)
   - Later increase to 50% for A/B test
6. **Filters**: None (random 50/50 split)
7. Click **Save**

#### Flag #2: AI Scribe Beta

1. **Key**: `ai-scribe-beta`
2. **Name**: AI SOAP Note Generation Beta
3. **Description**: Enable new Claude Sonnet 4.5 AI features
4. **Type**: Boolean
5. **Rollout**:
   - Start at 100% (enabled for all)
   - Can disable if AI quality issues
6. Click **Save**

#### Flag #3: Voice Recording V2

1. **Key**: `voice-recording-v2`
2. **Name**: Voice Recording V2 (WebRTC)
3. **Description**: Test new WebRTC voice recorder vs MediaRecorder
4. **Type**: Multivariate
5. **Variants**:
   - `control` (50%) - Current MediaRecorder
   - `webrtc` (50%) - New WebRTC implementation
6. Click **Save**

---

## 📈 Step 4: Create Funnels for User Activation

### 4.1 Navigate to Insights

1. In PostHog, go to: **Insights** → **New insight**
2. Select: **Funnel**

### 4.2 Funnel #1: Onboarding Funnel

1. **Name**: Onboarding Funnel
2. **Steps**:
   - Step 1: `user_signed_up` (event)
   - Step 2: `patient_created` (event)
   - Step 3: `clinical_note_created` (event)
3. **Filters**:
   - Time window: 7 days
   - Breakdown by: `user_role` property
4. Click **Save & add to dashboard**

### 4.3 Funnel #2: Activation (5+ Notes)

1. **Name**: Activation Funnel (5+ Notes)
2. **Steps**:
   - Step 1: `user_signed_up`
   - Step 2: `clinical_note_created` (at least 5 times)
3. **Filters**:
   - Time window: 7 days
   - Only include users who signed up in last 30 days
4. Click **Save & add to dashboard**

### 4.4 Funnel #3: Weekly Retention

1. **Name**: Weekly Retention
2. **Type**: Retention insight (not funnel)
3. **Event**: Users who performed `clinical_note_created`
4. **Came back to perform**: `clinical_note_created` again
5. **Time interval**: Weekly
6. Click **Save & add to dashboard**

---

## 🔒 Step 5: Configure HIPAA Compliance Settings

### 5.1 Enable Person Profiles (Carefully)

1. Go to: **Project Settings** → **Person & Group Analytics**
2. **IMPORTANT:** We want to track users but NOT store PHI
3. Keep **Person Profiles** enabled BUT:
   - Never send patient names as user properties
   - Always use hashed user IDs
   - No CPF numbers in events

### 5.2 Configure Data Sanitization

1. Go to: **Project Settings** → **Data Management**
2. **Block internal IPs**: ✅ Enabled
3. **Autocapture**: ❌ Disabled (we use manual tracking)
4. **Session Recording**: ❌ Disabled (HIPAA risk)
5. **Heatmaps**: ❌ Disabled (HIPAA risk)

### 5.3 Set Up Data Retention

1. Go to: **Project Settings** → **Data Retention**
2. **Events**: 1 year (default)
3. **Person data**: 1 year
4. **Session recordings**: N/A (disabled)

---

## 🧪 Step 6: Test PostHog Integration Locally

### 6.1 Add Environment Variables Locally

Edit `apps/web/.env.local`:

```bash
# Add these lines
NEXT_PUBLIC_POSTHOG_KEY=phc_your_actual_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 6.2 Install PostHog Package (if not already installed)

Check if PostHog is installed:

```bash
cd apps/web
cat package.json | grep posthog
```

If not installed:

```bash
pnpm add posthog-js
```

### 6.3 Create PostHog Provider

Check if file exists: `apps/web/src/providers/posthog-provider.tsx`

If not, create it:

```typescript
'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

if (typeof window !== 'undefined') {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') console.log('PostHog loaded');
      },
      capture_pageviews: false, // We'll manually track pages
      autocapture: false, // HIPAA compliance - no automatic capture
      disable_session_recording: true, // HIPAA compliance
      session_recording: {
        maskAllInputs: true, // Extra safety
        maskTextSelector: '*', // Extra safety
      },
      sanitize_properties: (properties, event) => {
        // Remove any PHI that might have leaked
        const sanitized = { ...properties };

        // Remove common PHI properties
        delete sanitized.patient_name;
        delete sanitized.cpf;
        delete sanitized.email;
        delete sanitized.phone;
        delete sanitized.diagnosis;

        // Remove any properties that look like CPF (xxx.xxx.xxx-xx)
        Object.keys(sanitized).forEach((key) => {
          const value = sanitized[key];
          if (typeof value === 'string' && /\d{3}\.\d{3}\.\d{3}-\d{2}/.test(value)) {
            delete sanitized[key];
          }
        });

        return sanitized;
      },
    });
  }
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

### 6.4 Add Provider to Root Layout

Edit `apps/web/src/app/layout.tsx`:

```typescript
import { PHProvider } from '@/providers/posthog-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PHProvider>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
```

### 6.5 Test Event Tracking

Create a test page or add to existing page:

```typescript
'use client';

import { usePostHog } from 'posthog-js/react';

export default function TestPostHog() {
  const posthog = usePostHog();

  const handleTestEvent = () => {
    posthog.capture('test_event', {
      timestamp: new Date().toISOString(),
      source: 'manual_test',
    });
    alert('Event sent! Check PostHog dashboard in 30 seconds.');
  };

  return (
    <div>
      <button onClick={handleTestEvent}>Send Test Event to PostHog</button>
    </div>
  );
}
```

### 6.6 Run Local Dev Server

```bash
cd apps/web
export DATABASE_URL="postgresql://nicolacapriroloteran@localhost:5432/holi_labs?schema=public"
pnpm dev
```

### 6.7 Verify in PostHog Dashboard

1. Open http://localhost:3000
2. Click your test button
3. Wait 30 seconds
4. Go to PostHog → **Events** → **Live events**
5. You should see `test_event` appear

---

## 📊 Step 7: Track Key Events in Production

### 7.1 Add Event Tracking to Critical User Flows

#### Event: User Signup

File: `apps/web/src/app/api/auth/signup/route.ts`

```typescript
import { posthog } from '@/lib/posthog';

// After user created successfully
posthog.capture({
  distinctId: user.id, // Hashed UUID, no real name
  event: 'user_signed_up',
  properties: {
    timestamp: new Date().toISOString(),
    user_role: user.role,
    signup_method: 'email', // or 'google', 'microsoft'
  },
});
```

#### Event: Patient Created

File: `apps/web/src/app/api/patients/route.ts`

```typescript
import { posthog } from '@/lib/posthog';

// After patient created
posthog.capture({
  distinctId: user.id,
  event: 'patient_created',
  properties: {
    timestamp: new Date().toISOString(),
    // NO patient name or CPF!
  },
});
```

#### Event: Clinical Note Created

File: `apps/web/src/app/api/clinical-notes/route.ts`

```typescript
import { posthog } from '@/lib/posthog';

// After note saved
posthog.capture({
  distinctId: user.id,
  event: 'clinical_note_created',
  properties: {
    timestamp: new Date().toISOString(),
    note_type: noteType, // 'soap', 'progress', etc.
    ai_generated: true, // or false
    word_count: wordCount,
    // NO diagnosis or patient info!
  },
});
```

### 7.2 Create PostHog Utility File

File: `apps/web/src/lib/posthog.ts`

```typescript
import { PostHog } from 'posthog-node';

// Server-side PostHog client
export const posthog = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  }
);

// Ensure PostHog shuts down gracefully on exit
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', async () => {
    await posthog.shutdown();
  });
  process.on('SIGTERM', async () => {
    await posthog.shutdown();
  });
}
```

### 7.3 Install PostHog Node SDK

```bash
cd apps/web
pnpm add posthog-node
```

---

## ✅ Step 8: Verify Production Tracking

### 8.1 Deploy to Production

Your changes should already be deployed if you added env vars to DigitalOcean. If not:

```bash
git add .
git commit -m "Add PostHog production tracking with HIPAA compliance

- Configured PostHog US Cloud instance
- Added PHI sanitization in event properties
- Disabled session recording and autocapture
- Added key event tracking:
  * user_signed_up
  * patient_created
  * clinical_note_created
- Created server-side PostHog client
- Added graceful shutdown handlers

Next: Create feature flags and funnels in PostHog dashboard

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

### 8.2 Test in Production

1. Go to: https://holilabs-lwp6y.ondigitalocean.app
2. Sign up with a new test account
3. Create a test patient
4. Create a test clinical note
5. Wait 1-2 minutes
6. Check PostHog → **Events** → **Live events**
7. You should see your 3 events

### 8.3 Verify HIPAA Compliance

**Check these in PostHog events:**

✅ **GOOD** - Should see:
- `user_signed_up` with `user_role` property
- `patient_created` with `timestamp`
- `clinical_note_created` with `note_type`, `word_count`
- Hashed user IDs (UUIDs like `550e8400-e29b-41d4-a716-446655440000`)

❌ **BAD** - Should NOT see:
- Patient names in any events
- CPF numbers (xxx.xxx.xxx-xx format)
- Email addresses
- Phone numbers
- Diagnoses or clinical data
- Real user names

If you see ANY PHI in events, STOP immediately and fix the sanitization.

---

## 📈 Step 9: Create Production Dashboard

### 9.1 Create Dashboard

1. In PostHog, go to: **Dashboards** → **New dashboard**
2. Name: `Holi Labs - Week 1 Launch Metrics`
3. Description: Key metrics for first week after BAA signatures

### 9.2 Add These Insights

#### Panel 1: Daily Active Users (DAU)

- Type: Trend
- Event: Any event
- Group by: Unique users
- Time range: Last 7 days

#### Panel 2: Onboarding Funnel (from Step 4.2)

- Add existing funnel created earlier

#### Panel 3: Notes Created Per Day

- Type: Trend
- Event: `clinical_note_created`
- Time range: Last 7 days
- Breakdown by: `note_type`

#### Panel 4: Activation Rate

- Type: Formula
- Formula: (Users with 5+ notes / Total signups) * 100
- Time range: Last 7 days

#### Panel 5: Feature Flag Usage

- Type: Trend
- Event: Any event
- Filter by: `new-dashboard-layout` = true
- Compare to: `new-dashboard-layout` = false

### 9.3 Share Dashboard

1. Click dashboard **Share** button
2. Copy public link
3. Bookmark for daily checking

---

## 🚨 Troubleshooting

### Problem: Events not showing in PostHog

**Check:**
1. Environment variables set correctly in DigitalOcean
2. PostHog API key starts with `phc_`
3. Using US Cloud host: `https://us.i.posthog.com`
4. Check browser console for PostHog errors
5. Check DigitalOcean logs for server errors

**Solution:**
```bash
# Verify env vars are set
doctl apps spec get <your-app-id> | grep POSTHOG
```

### Problem: Too many events / high volume

**Solution:**
1. Go to PostHog → **Project Settings** → **Sampling**
2. Set sampling to 10% (tracks 1 in 10 events)
3. Saves costs on high-volume plans

### Problem: PHI leaking into events

**Solution:**
1. Review `posthog-provider.tsx` sanitization function
2. Add more aggressive filtering:
   ```typescript
   sanitize_properties: (properties) => {
     // Remove ALL custom properties to be ultra-safe
     return {
       timestamp: properties.timestamp,
       $browser: properties.$browser,
       $os: properties.$os,
     };
   },
   ```

---

## 📚 Additional Resources

- **PostHog Docs:** https://posthog.com/docs
- **HIPAA Compliance:** https://posthog.com/docs/privacy/hipaa-compliance
- **Feature Flags:** https://posthog.com/docs/feature-flags
- **Funnels:** https://posthog.com/docs/user-guides/funnels

---

## ✅ Completion Checklist

After completing this guide:

- [ ] PostHog account created on US Cloud
- [ ] Production project created
- [ ] Environment variables added to DigitalOcean
- [ ] 3 feature flags created
- [ ] 3 funnels created
- [ ] PostHog provider added to codebase
- [ ] PHI sanitization configured
- [ ] Test events tracked successfully
- [ ] Production dashboard created
- [ ] Verified NO PHI in events
- [ ] Bookmarked dashboard for daily checks

---

**Next Steps:** Monitor dashboard daily for first week, adjust feature flag rollouts based on metrics, and track toward 5+ active physicians goal.

**Estimated Setup Time:** 30 minutes
**Estimated Testing Time:** 15 minutes
**Total Time:** 45 minutes

**Ready for BAA:** Once PostHog BAA is signed, enable all features. Until then, triple-check PHI sanitization.
