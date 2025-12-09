# Quick Start: Google Auth & Intro Animation

## 🚀 Get Started in 5 Minutes

### Step 1: Get Google OAuth Credentials (5 min)

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a project: "Holi Labs"
3. Enable Google+ API
4. OAuth consent screen:
   - App name: `Holi Labs`
   - Email: `admin@holilabs.xyz`
   - Scopes: `email`, `profile`, `openid`
5. Create credentials:
   - Type: OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
6. Copy **Client ID** and **Client Secret**

### Step 2: Set Environment Variables (1 min)

Create/update `.env`:

```bash
# Paste your credentials from Step 1
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Generate secret: openssl rand -base64 32
NEXTAUTH_SECRET=your-32-char-secret-here

# Local development
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### Step 3: Start the App (1 min)

```bash
# Install dependencies (if needed)
pnpm install

# Generate Prisma client
pnpm prisma generate

# Start dev server
pnpm dev
```

### Step 4: Test It! (2 min)

1. **Test Intro Animation**:
   ```
   Open: http://localhost:3000
   → See animated Holi Labs logo (3 seconds)
   → Auto-dismisses to landing page
   ```

2. **Test Google Sign-In**:
   ```
   Open: http://localhost:3000/auth/login
   → Click "Iniciar sesión con Google"
   → Select Google account
   → Grant permissions
   → Redirects to dashboard
   → ✅ You're logged in!
   ```

3. **Test Development Mode**:
   ```
   On login page:
   → Enter any email (e.g., test@holilabs.com)
   → Click "Sign in"
   → ✅ Instant login (dev only)
   ```

---

## ✅ That's It!

### What You Just Got

- ✨ Beautiful animated intro with your logo
- 🔐 Secure Google OAuth authentication
- 👤 Automatic user creation in database
- 🔒 JWT session management
- 🛠️ Development mode for testing

### File Structure

```
apps/web/src/
├── components/
│   └── IntroAnimation.tsx          ← Animated intro
├── app/
│   ├── page.tsx                    ← Landing page (with intro)
│   └── auth/
│       └── login/
│           └── page.tsx            ← Login (with Google button)
└── lib/
    └── auth.ts                     ← NextAuth config (Google OAuth)
```

---

## 🎯 Quick Commands

```bash
# Clear intro animation (to see it again)
# In browser console:
sessionStorage.clear()

# Check database users
pnpm prisma studio

# View logs
tail -f apps/web/logs/app.log

# Generate new secret
openssl rand -base64 32
```

---

## 🐛 Quick Fixes

### Intro not showing?
```javascript
// Browser console
sessionStorage.clear()
location.reload()
```

### Google button not working?
```bash
# Check environment variables
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# Restart server
pnpm dev
```

### "Redirect URI mismatch"?
```
Add this to Google Cloud Console:
http://localhost:3000/api/auth/callback/google
```

---

## 📖 Full Documentation

For complete setup guide, see:
- `GOOGLE_OAUTH_SETUP.md` - Detailed OAuth setup
- `INTRO_AND_GOOGLE_AUTH_IMPLEMENTATION.md` - Full technical docs

---

## 💡 Tips

1. **First time setup**: Use development email mode to test quickly
2. **Google OAuth**: Works with any Google account (no whitelist needed in dev)
3. **Intro animation**: Only shows once per session (intentional UX)
4. **Brand logo**: Located at `/public/logos/Logo 1_Dark.svg`

---

**Need Help?** Check the troubleshooting sections in:
- `GOOGLE_OAUTH_SETUP.md`
- `INTRO_AND_GOOGLE_AUTH_IMPLEMENTATION.md`

---

**Ready for Production?**
See `GOOGLE_OAUTH_SETUP.md` → "Production Deployment Checklist"

