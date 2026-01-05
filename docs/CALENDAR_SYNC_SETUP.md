# Calendar Sync Setup Guide

## Overview

This guide explains how to configure Google Calendar and Microsoft Outlook calendar synchronization for the HoliLabs platform.

---

## Current Issue

**Error:** `{"error":"Authentication required"}` when accessing calendar authorization endpoints

**Root Causes:**
1. Missing environment variables for OAuth configuration
2. OAuth client credentials not configured
3. Production URL mismatch between environment and actual deployment

---

## Prerequisites

Before setting up calendar sync, ensure:
- ✅ User is authenticated to the platform
- ✅ OAuth applications are created in Google/Microsoft developer consoles
- ✅ Environment variables are properly configured

---

## Part 1: Google Calendar Setup

### Step 1: Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project: "HoliLabs"
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the consent screen:
   - Application name: **HoliLabs Healthcare Platform**
   - User support email: your-email@holilabs.xyz
   - Developer contact: your-email@holilabs.xyz
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **HoliLabs Calendar Sync**
   - Authorized redirect URIs:
     ```
     https://holilabs.xyz/api/calendar/google/callback
     http://localhost:3000/api/calendar/google/callback  (for development)
     ```
7. Copy the **Client ID** and **Client Secret**

### Step 2: Enable Google Calendar API

1. In Google Cloud Console, navigate to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click **Enable**

### Step 3: Configure Environment Variables

Add to your `.env.production` file:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"

# Production URL (CRITICAL: Must match your actual domain)
NEXT_PUBLIC_APP_URL="https://holilabs.xyz"
NEXTAUTH_URL="https://holilabs.xyz"
```

---

## Part 2: Microsoft Outlook Setup

### Step 1: Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure application:
   - Name: **HoliLabs Calendar Sync**
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI:
     - Type: **Web**
     - URI: `https://holilabs.xyz/api/calendar/microsoft/callback`
5. Click **Register**
6. Copy the **Application (client) ID**

### Step 2: Create Client Secret

1. In your app registration, navigate to **Certificates & secrets**
2. Click **New client secret**
3. Description: **HoliLabs Production**
4. Expires: **24 months** (or custom)
5. Click **Add**
6. **IMPORTANT:** Copy the secret value immediately (it won't be shown again)

### Step 3: Configure API Permissions

1. Navigate to **API permissions**
2. Click **Add a permission** → **Microsoft Graph**
3. Select **Delegated permissions**
4. Add the following permissions:
   - ✅ `Calendars.ReadWrite` - Read and write to user calendars
   - ✅ `User.Read` - Sign in and read user profile
   - ✅ `offline_access` - Maintain access to data you have given it access to
5. Click **Add permissions**
6. Click **Grant admin consent** (if you're an admin)

### Step 4: Configure Environment Variables

Add to your `.env.production` file:

```bash
# Microsoft Calendar OAuth
MICROSOFT_CLIENT_ID="your-application-id-here"
MICROSOFT_CLIENT_SECRET="your-client-secret-here"
```

---

## Part 3: Apple Calendar (iCloud) Setup

Apple Calendar uses CalDAV protocol, which requires:
- Apple ID
- App-specific password (for 2FA accounts)

### Environment Variables

```bash
# Apple Calendar (CalDAV) - User-specific, configured per clinician
# No OAuth credentials needed - users provide credentials in-app
```

**Note:** Apple Calendar sync uses per-user credentials stored encrypted in the database.

---

## Part 4: Update Production Environment

### Option 1: DigitalOcean App Platform (Recommended)

1. Log in to [DigitalOcean](https://cloud.digitalocean.com/)
2. Navigate to your app: **holilabs-production**
3. Go to **Settings** → **App-Level Environment Variables**
4. Add/update the following variables:

```bash
NEXT_PUBLIC_APP_URL=https://holilabs.xyz
NEXTAUTH_URL=https://holilabs.xyz
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

5. Click **Save**
6. Deploy the updated configuration

### Option 2: Manual Environment File

Update `/Users/nicolacapriroloteran/prototypes/holilabsv2/.env`:

```bash
# Base URLs
NEXT_PUBLIC_APP_URL="https://holilabs.xyz"
NEXTAUTH_URL="https://holilabs.xyz"

# Google Calendar OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft Calendar OAuth
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
```

---

## Part 5: Testing the Integration

### Test 1: Authentication Check

1. Log in to https://holilabs.xyz
2. Verify you're authenticated (check session cookie)

### Test 2: Google Calendar Authorization

1. Navigate to: `https://holilabs.xyz/api/calendar/google/authorize`
2. Expected: Redirect to Google OAuth consent screen
3. Approve permissions
4. Expected: Redirect back to your app with success message

### Test 3: Microsoft Calendar Authorization

1. Navigate to: `https://holilabs.xyz/api/calendar/microsoft/authorize`
2. Expected: Redirect to Microsoft OAuth consent screen
3. Approve permissions
4. Expected: Redirect back to your app with success message

### Test 4: Calendar Sync

1. Create an appointment in HoliLabs
2. Click "Sync to Calendar"
3. Expected: Appointment appears in your Google/Microsoft calendar

---

## Part 6: Troubleshooting

### Error: `{"error":"Authentication required"}`

**Cause:** User not logged in to HoliLabs platform

**Solution:**
1. Log in to https://holilabs.xyz first
2. Ensure session cookie is present
3. Then try accessing calendar authorization endpoints

### Error: `redirect_uri_mismatch`

**Cause:** Redirect URI in code doesn't match OAuth app configuration

**Solution:**
1. Verify `NEXT_PUBLIC_APP_URL` matches your actual domain
2. Ensure redirect URI in Google/Microsoft console matches exactly:
   - Google: `https://holilabs.xyz/api/calendar/google/callback`
   - Microsoft: `https://holilabs.xyz/api/calendar/microsoft/callback`

### Error: `invalid_client`

**Cause:** Incorrect client ID or secret

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
2. Regenerate secrets if needed
3. Update environment variables

### Error: `insufficient_scope`

**Cause:** Missing required OAuth scopes

**Solution:**
1. Verify API permissions in Azure/Google Console
2. Required scopes:
   - **Google:** `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/calendar.events`
   - **Microsoft:** `Calendars.ReadWrite`, `User.Read`, `offline_access`

---

## Security Considerations

### Token Storage

- ✅ OAuth access tokens are **encrypted at rest** using AES-256-GCM
- ✅ Refresh tokens are stored separately with additional encryption layer
- ✅ Token encryption uses `TOKEN_ENCRYPTION_KEY` environment variable
- ✅ See `/apps/web/src/lib/calendar/token-encryption.ts` for implementation

### Required Environment Variables for Token Encryption

```bash
# Token Encryption (CRITICAL for security)
TOKEN_ENCRYPTION_KEY="your-32-byte-hex-key"  # Generate with: openssl rand -hex 32
```

### HIPAA Compliance

- ✅ Audit logging for all calendar operations
- ✅ Access reason tracking required
- ✅ Token revocation on user account deletion
- ✅ No PHI in calendar event descriptions (only appointment times)

---

## Next Steps

1. **Complete OAuth app setup** in Google Cloud Console and Azure Portal
2. **Update environment variables** in DigitalOcean App Platform
3. **Generate token encryption key**: `openssl rand -hex 32`
4. **Test authentication flow** on production
5. **Document OAuth app credentials** in secure password manager
6. **Set up monitoring** for OAuth token refresh failures

---

## Related Files

- `/apps/web/src/app/api/calendar/google/authorize/route.ts` - Google OAuth initiation
- `/apps/web/src/app/api/calendar/google/callback/route.ts` - Google OAuth callback
- `/apps/web/src/app/api/calendar/microsoft/authorize/route.ts` - Microsoft OAuth initiation
- `/apps/web/src/app/api/calendar/microsoft/callback/route.ts` - Microsoft OAuth callback
- `/apps/web/src/lib/calendar/token-encryption.ts` - Token encryption utilities
- `/apps/web/src/lib/calendar/sync.ts` - Calendar sync logic

---

## Support

If you continue experiencing issues:
1. Check server logs: `pnpm logs:production`
2. Verify environment variables: `doctl apps list` → check app config
3. Review OAuth app status in Google/Microsoft consoles
4. Check Sentry for error details: https://sentry.io/organizations/holilabs

---

**Last Updated:** 2026-01-01
**Maintainer:** HoliLabs Engineering Team
