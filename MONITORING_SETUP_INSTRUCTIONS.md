# 🚀 Monitoring & Analytics Setup - Step-by-Step Guide

**Time Required:** 45 minutes
**Last Updated:** October 27, 2025

---

## 📋 Overview

This guide will walk you through setting up:
1. **PostHog** (Product Analytics) - 15 minutes
2. **Sentry** (Error Tracking) - 15 minutes
3. **BetterStack** (Centralized Logging) - 10 minutes
4. **Verification** - 5 minutes

---

## 1️⃣ PostHog Setup (US Cloud for HIPAA)

### Step 1.1: Create Account

1. Go to: **https://us.posthog.com/signup** (MUST use US Cloud!)
2. Sign up with your email
3. Verify your email
4. Choose industry: **Healthcare**

### Step 1.2: Create Production Project

1. Project name: `Holi Labs - Production`
2. Project URL slug: `holi-labs-prod`
3. Time zone: `America/Sao_Paulo` (or your timezone)
4. Click **Create project**

### Step 1.3: Get API Keys

1. Navigate to: **Project Settings** (gear icon) → **Project API Key**
2. Copy these values:
   ```
   Project API Key: phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Host: https://us.i.posthog.com
   ```

### Step 1.4: Configure HIPAA Compliance

1. Go to: **Project Settings** → **Data Management**
2. Set these settings:
   - ✅ **Autocapture**: DISABLED
   - ✅ **Session Recording**: DISABLED
   - ✅ **Heatmaps**: DISABLED
   - ✅ **Block internal IPs**: ENABLED

3. Go to: **Project Settings** → **Data Retention**
   - Events: 1 year
   - Person data: 1 year

### Step 1.5: Add to DigitalOcean

1. Go to: https://cloud.digitalocean.com/apps
2. Select your app: `holilabs-lwp6y`
3. Navigate to: **Settings** → **App-Level Environment Variables**
4. Click **Edit**
5. Add these two variables:

| Key | Value | Type |
|-----|-------|------|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_your_actual_key_here` | Plain Text |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | Plain Text |

6. Click **Save** (app will auto-redeploy in 5-10 minutes)

---

## 2️⃣ Sentry Setup (Error Tracking)

### Step 2.1: Create Account

1. Go to: **https://sentry.io/signup/**
2. Sign up with GitHub or email
3. Verify email

### Step 2.2: Create Organization & Project

1. Organization name: `holi-labs`
2. Click **Create Organization**
3. Create project:
   - Platform: **Next.js**
   - Project name: `holi-labs-web`
   - Alert frequency: **On every new issue**
4. Click **Create Project**

### Step 2.3: Get Credentials

1. **Get DSN:**
   - Sentry Dashboard → **Settings** → **Projects** → `holi-labs-web`
   - Click **Client Keys (DSN)**
   - Copy the DSN: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx`

2. **Create Auth Token** (for source maps):
   - Sentry Dashboard → **Settings** → **Account** → **API** → **Auth Tokens**
   - Click **Create New Token**
   - Name: `holi-labs-deploy`
   - Scopes: Select these:
     - `project:read`
     - `project:releases`
     - `org:read`
   - Click **Create Token**
   - Copy token: `sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2.4: Add to DigitalOcean

Add these environment variables to DigitalOcean:

| Key | Value | Type |
|-----|-------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx` | Plain Text |
| `SENTRY_AUTH_TOKEN` | `sntrys_xxxxxxxxxxxxxxxxxxxxx` | Encrypted |
| `SENTRY_ORG` | `holi-labs` | Plain Text |
| `SENTRY_PROJECT` | `holi-labs-web` | Plain Text |

---

## 3️⃣ BetterStack (Logtail) Setup

### Step 3.1: Create Account

1. Go to: **https://betterstack.com/logtail**
2. Click **Start Free Trial**
3. Sign up with email or GitHub

### Step 3.2: Create Source

1. Click **Add Source**
2. Select: **Node.js** (or **Generic**)
3. Source name: `holi-labs-production`
4. Click **Create Source**

### Step 3.3: Get Token

1. You'll see a token: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
2. Copy it (32 character alphanumeric)

### Step 3.4: Add to DigitalOcean

| Key | Value | Type |
|-----|-------|------|
| `LOGTAIL_SOURCE_TOKEN` | `your-32-character-token` | Encrypted |

---

## ✅ Verification Steps

### Verify PostHog

After deployment completes:

```bash
# Check if PostHog is initialized
curl https://holilabs-lwp6y.ondigitalocean.app/api/health

# Trigger a test event (after we implement tracking)
# You'll see events in PostHog → Live Events in 30-60 seconds
```

### Verify Sentry

```bash
# Trigger a test error
curl https://holilabs-lwp6y.ondigitalocean.app/api/test-sentry

# Check Sentry Dashboard → Issues
# Should see "Test error from API" within 10 seconds
```

### Verify Logtail

```bash
# Logs will appear automatically in BetterStack dashboard
# Go to: https://logs.betterstack.com/team/[your-team]/tail

# Filter by: level >= 40 (errors)
```

---

## 📊 Quick Access Links

Save these for daily monitoring:

- **PostHog Live Events:** https://us.posthog.com/project/[id]/events
- **PostHog Dashboard:** https://us.posthog.com/project/[id]/dashboard
- **Sentry Issues:** https://sentry.io/organizations/holi-labs/issues/
- **BetterStack Logs:** https://logs.betterstack.com/team/[your-team]/tail
- **DigitalOcean Insights:** https://cloud.digitalocean.com/apps/[app-id]/insights

---

## 🆘 Troubleshooting

### PostHog events not showing

**Problem:** No events in PostHog after 5 minutes

**Solutions:**
1. Verify environment variables in DigitalOcean (Settings → Env Vars)
2. Check API key starts with `phc_`
3. Confirm using US Cloud host: `https://us.i.posthog.com`
4. Check browser console for PostHog errors
5. Verify app redeployed after adding env vars

### Sentry errors not appearing

**Problem:** Test error doesn't show in Sentry

**Solutions:**
1. Verify DSN format: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx`
2. Check Sentry project is active (not paused)
3. Verify auth token has correct scopes
4. Check DigitalOcean deployment logs for Sentry init errors

### BetterStack logs not flowing

**Problem:** No logs in BetterStack dashboard

**Solutions:**
1. Verify token is 32 characters (no extra spaces)
2. Check source is active in BetterStack
3. Wait 2-3 minutes for first logs to appear
4. Verify `LOGTAIL_SOURCE_TOKEN` env var is set
5. Check app logs for Logtail connection errors

---

## 🎯 Next Steps

After completing this setup:

1. ✅ Verify all three services are receiving data
2. ✅ Create feature flags in PostHog (see FEATURE_FLAGS_GUIDE.md)
3. ✅ Create funnels in PostHog (see FUNNELS_GUIDE.md)
4. ✅ Configure alert rules in Sentry
5. ✅ Set up uptime monitoring (UptimeRobot)

---

## 📝 Checklist

- [ ] PostHog account created on US Cloud
- [ ] PostHog production project configured
- [ ] PostHog HIPAA settings enabled
- [ ] PostHog API keys added to DigitalOcean
- [ ] Sentry account and project created
- [ ] Sentry DSN and auth token added
- [ ] BetterStack account created
- [ ] BetterStack source token added
- [ ] All environment variables added to DigitalOcean
- [ ] App redeployed successfully
- [ ] Verified PostHog events flowing
- [ ] Verified Sentry errors captured
- [ ] Verified BetterStack logs appearing

---

**Total Cost:** ~$36/month
- PostHog: Free (50k events/mo)
- Sentry: Free tier or $26/mo (Team plan)
- BetterStack: $10/mo (5GB logs)

**Time to First Data:** 5-10 minutes after deployment

**Support Contacts:**
- PostHog: hey@posthog.com
- Sentry: support@sentry.io
- BetterStack: support@betterstack.com
