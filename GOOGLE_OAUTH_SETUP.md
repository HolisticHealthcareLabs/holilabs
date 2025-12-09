# Google OAuth Setup Guide

## Overview

This guide explains how to set up Google OAuth authentication for Holi Labs clinician login.

## Features Implemented

✅ **Intro Animation**: Beautiful double helix logo animation on landing page
✅ **Google OAuth**: Sign in with Google button on login page
✅ **Development Mode**: Email-based login for development/testing
✅ **NextAuth Integration**: Seamless authentication with JWT sessions

---

## Google OAuth Configuration

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in the required information:
   - **App name**: Holi Labs
   - **User support email**: admin@holilabs.xyz
   - **Developer contact**: admin@holilabs.xyz
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
5. Save and continue

### Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Configure the application:
   - **Name**: Holi Labs Web App
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://holilabs.xyz
     https://www.holilabs.xyz
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/callback/google
     https://holilabs.xyz/api/auth/callback/google
     https://www.holilabs.xyz/api/auth/callback/google
     ```
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 4: Environment Variables

Add these variables to your `.env` file:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars

# Generate NEXTAUTH_SECRET with:
# openssl rand -base64 32
```

### Production Environment Variables

For production (`holilabs.xyz`), use:

```bash
NEXTAUTH_URL=https://holilabs.xyz
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
NEXTAUTH_SECRET=your-production-secret-different-from-dev
```

---

## Testing

### Development Mode

1. Navigate to `/auth/login`
2. Enter any email address (e.g., `test@holilabs.com`)
3. Click "Sign in" - automatically creates user in development mode

### Google OAuth

1. Navigate to `/auth/login`
2. Click "Iniciar sesión con Google"
3. Select your Google account
4. Grant permissions
5. Redirects to `/dashboard` upon success

---

## User Flow

```
Landing Page (with intro animation)
    ↓
/auth/login
    ↓
  [Choose]
    ├─→ Development Email (dev only) → Dashboard
    └─→ Sign in with Google → Google OAuth → Dashboard
```

---

## Security Features

### NextAuth Configuration

- **Adapter**: PrismaAdapter for database persistence
- **Session Strategy**: JWT (JSON Web Tokens)
- **Session Duration**: 30 days
- **Providers**:
  - Google OAuth (production)
  - Development Credentials (development only)
  - Supabase OAuth (optional)

### Callbacks

- **signIn**: Creates user in database if doesn't exist
- **jwt**: Attaches user data to token
- **session**: Exposes user data to client
- **signOut**: Logs user activity

### Database Integration

When a user signs in:
1. Check if user exists in `users` table by email
2. If not, create new user with:
   - Email from OAuth provider
   - First/last name from profile
   - Role: `CLINICIAN`
   - Auto-generated unique ID
3. Store user session as JWT
4. Redirect to dashboard

---

## Files Modified

### New Files

- `/apps/web/src/components/IntroAnimation.tsx` - Animated logo intro
- `/GOOGLE_OAUTH_SETUP.md` - This documentation

### Updated Files

- `/apps/web/src/lib/auth.ts` - Added Google OAuth provider
- `/apps/web/src/app/auth/login/page.tsx` - Added Google Sign-In button
- `/apps/web/src/app/page.tsx` - Added intro animation

---

## Intro Animation Features

The intro animation shows:
- ✅ Animated Holi Labs double helix logo (from `/public/logos/Logo 1_Dark.svg`)
- ✅ Pulsing circles (DNA helix effect)
- ✅ Brand name with tagline: "Health 3.0 Platform"
- ✅ Progress bar at bottom
- ✅ Auto-dismisses after 3 seconds
- ✅ Only shows once per session (stored in sessionStorage)

### Customization

Edit `/apps/web/src/components/IntroAnimation.tsx`:

```typescript
<IntroAnimation 
  onComplete={() => setShowIntro(false)} 
  duration={3000}  // Duration in milliseconds
/>
```

---

## Troubleshooting

### "Redirect URI mismatch" error

**Cause**: The redirect URI in your Google OAuth settings doesn't match the callback URL.

**Solution**: 
1. Check the error message for the exact URI being used
2. Add it to "Authorized redirect URIs" in Google Cloud Console
3. Format: `https://your-domain.com/api/auth/callback/google`

### "Access blocked: This app's request is invalid"

**Cause**: OAuth consent screen not properly configured.

**Solution**: 
1. Complete all required fields in OAuth consent screen
2. Add test users if app is in "Testing" mode
3. Publish app for production use

### User not created in database

**Cause**: Database connection issue or Prisma client not initialized.

**Solution**: 
1. Check DATABASE_URL is correctly set
2. Run `pnpm prisma generate`
3. Run `pnpm prisma migrate dev`
4. Check logs in `/apps/web/logs/`

### Development mode not working

**Cause**: `NODE_ENV` not set to `development`.

**Solution**: 
```bash
# In .env or .env.local
NODE_ENV=development
```

---

## Production Deployment Checklist

- [ ] Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for production
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Add production redirect URIs to Google OAuth settings
- [ ] Verify OAuth consent screen is published
- [ ] Test Google Sign-In on staging environment
- [ ] Remove or disable development credentials provider in production
- [ ] Set up proper error tracking (Sentry)
- [ ] Monitor authentication logs

---

## Support

For issues or questions:
- Email: admin@holilabs.xyz
- Check logs: `/apps/web/logs/`
- NextAuth docs: https://next-auth.js.org/

---

## Next Steps

1. **Add more OAuth providers**:
   - Microsoft/Azure AD
   - Apple Sign In
   - Supabase (already configured)

2. **Enhance user onboarding**:
   - Collect additional profile info after first login
   - Email verification
   - Two-factor authentication (2FA)

3. **User management**:
   - Admin panel for user management
   - Role-based access control (RBAC)
   - User analytics dashboard

---

**Last Updated**: December 9, 2025
**Version**: 1.0.0
**Author**: Holi Labs Development Team

