# 🔐 PRODUCTION SECRETS - December 2025

**Generated:** December 8, 2025
**Status:** FRESH - Ready for Digital Ocean deployment

---

## ⚠️ SECURITY NOTICE

**CRITICAL:** These secrets are **PRODUCTION-READY** and should be:
1. ✅ Added to Digital Ocean App → Settings → Environment Variables
2. ✅ Stored in password manager (1Password, LastPass, Bitwarden)
3. ✅ NEVER committed to git
4. ✅ Rotated every 90 days

---

## 🔑 REQUIRED PRODUCTION SECRETS

Copy these EXACTLY to Digital Ocean (type: **Secret**, scope: **All components**):

```bash
# Session Management (64-character hex)
SESSION_SECRET=28c51ec3333c1851a9316433590dd476f2588e08712e2150d5c45b463eda082e

# NextAuth Authentication (64-character hex)
NEXTAUTH_SECRET=242a7f68a1e6c22dcb60681ffac94d7a8b31914c4aeb1cb19928ad9c56df3566

# PHI Encryption (32-byte base64)
ENCRYPTION_KEY=dWC5tbmaXkI2lha1XRLa74IAs8nmA/wWtCb80sn77Gc=

# Cron Job Authentication (64-character hex)
CRON_SECRET=3dd8353a44e007b254b856b39fcce127ffc08f7a161bb274e21ca3573e849d16

# De-identification Secret (64-character hex)
DEID_SECRET=4fb8b81510fdf27b5fabb05536aead385dc40596a7153963167fb518d2e2096e

# AI Cache Flag (boolean)
AI_CACHE_ENABLED=true
```

---

## 📋 MISSING SECRETS YOU NEED TO PROVIDE

You mentioned these are lost from Digital Ocean. You'll need to regenerate or retrieve them:

### **1. Twilio Credentials** (for SMS/WhatsApp)
```bash
TWILIO_ACCOUNT_SID=AC********************************
TWILIO_AUTH_TOKEN=********************************
```

**How to get:**
1. Log in to [console.twilio.com](https://console.twilio.com)
2. Dashboard → Account Info section
3. Copy "Account SID" and "Auth Token"
4. If you don't see Auth Token, click "View" to reveal it

---

### **2. Deepgram API Key** (for AI transcription)
```bash
DEEPGRAM_API_KEY=********************************
```

**How to get:**
1. Log in to [console.deepgram.com](https://console.deepgram.com)
2. API Keys section
3. Create new key or copy existing key
4. Name it "Holi Labs Production"

---

## 📝 STEP-BY-STEP: Add to Digital Ocean

### **Method 1: Via Web Dashboard** (Recommended)

1. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Click your app: **holilabs-lwp6y** (or current app name)
3. Click **Settings** tab
4. Scroll to **App-Level Environment Variables**
5. Click **Edit** button
6. For EACH secret above:
   - Click **Add Variable**
   - **Key:** `SESSION_SECRET` (exact name)
   - **Value:** `28c51ec3333c1851a9316433590dd476f2588e08712e2150d5c45b463eda082e`
   - **Type:** Click 🔒 to mark as **Secret** (encrypted)
   - **Scope:** All components
7. Click **Save**
8. App will redeploy automatically (5-10 minutes)

---

### **Method 2: Via DigitalOcean CLI** (Faster for bulk)

```bash
# Install doctl if not already installed
brew install doctl

# Authenticate
doctl auth init

# Get your app ID
doctl apps list

# Set environment variables (replace APP_ID with your actual ID)
doctl apps update APP_ID --env "SESSION_SECRET=28c51ec3333c1851a9316433590dd476f2588e08712e2150d5c45b463eda082e" \
  --env "NEXTAUTH_SECRET=242a7f68a1e6c22dcb60681ffac94d7a8b31914c4aeb1cb19928ad9c56df3566" \
  --env "ENCRYPTION_KEY=dWC5tbmaXkI2lha1XRLa74IAs8nmA/wWtCb80sn77Gc=" \
  --env "CRON_SECRET=3dd8353a44e007b254b856b39fcce127ffc08f7a161bb274e21ca3573e849d16" \
  --env "DEID_SECRET=4fb8b81510fdf27b5fabb05536aead385dc40596a7153963167fb518d2e2096e" \
  --env "AI_CACHE_ENABLED=true"
```

---

## ✅ VERIFICATION CHECKLIST

After adding secrets and deployment completes:

### **1. Health Check**
```bash
curl https://holilabs-lwp6y.ondigitalocean.app/api/health
```

Expected response:
```json
{"status":"healthy","database":true}
```

### **2. Test Login**
1. Visit production URL
2. Try to log in with test account
3. ✅ Login succeeds = secrets working
4. ❌ Login fails = check logs

### **3. Check Logs**
```bash
doctl apps logs APP_ID --type run
```

Look for errors related to:
- `NEXTAUTH_SECRET not found`
- `SESSION_SECRET missing`
- `Encryption key invalid`

---

## 🔄 SECRET ROTATION SCHEDULE

**Required every 90 days** for HIPAA compliance:

| Secret | Last Rotated | Next Rotation | Auto-Rotate? |
|--------|--------------|---------------|--------------|
| SESSION_SECRET | Dec 8, 2025 | Mar 8, 2026 | ❌ Manual |
| NEXTAUTH_SECRET | Dec 8, 2025 | Mar 8, 2026 | ❌ Manual |
| ENCRYPTION_KEY | Dec 8, 2025 | Mar 8, 2026 | ❌ Manual |
| CRON_SECRET | Dec 8, 2025 | Mar 8, 2026 | ❌ Manual |
| DEID_SECRET | Dec 8, 2025 | Mar 8, 2026 | ❌ Manual |
| TWILIO_AUTH_TOKEN | TBD | TBD | ✅ Auto (via Twilio) |
| DEEPGRAM_API_KEY | TBD | TBD | ❌ Manual |

**Set calendar reminder:** March 5, 2026 to rotate secrets

---

## 🛡️ SECURITY BEST PRACTICES

### ✅ DO:
- Store in password manager (1Password, Bitwarden)
- Use different secrets for staging/production
- Rotate every 90 days
- Audit access logs monthly
- Use Digital Ocean's Secret type (encrypted at rest)

### ❌ DON'T:
- Commit to git (even private repos)
- Share via Slack/email/SMS
- Reuse dev secrets in production
- Store in plain text files
- Use predictable patterns

---

## 📞 EMERGENCY CONTACTS

If secrets are compromised:

1. **Immediately rotate ALL secrets** (regenerate and redeploy)
2. **Invalidate all user sessions** (change SESSION_SECRET)
3. **Audit access logs** (who accessed what, when)
4. **Notify security team** (if applicable)
5. **Document incident** (HIPAA breach reporting if PHI exposed)

---

## 📚 REFERENCE COMMANDS

### Generate new secrets (if needed in future):
```bash
# Session secret (64-char hex)
openssl rand -hex 32

# Encryption key (32-byte base64)
openssl rand -base64 32
```

### Check current secrets in Digital Ocean:
```bash
doctl apps spec get APP_ID
```

### Update single secret:
```bash
doctl apps update APP_ID --env "SESSION_SECRET=new-value-here"
```

---

## 🔒 BACKUP STORAGE

**Save this entire file to:**
1. ✅ 1Password secure note (recommended)
2. ✅ Bitwarden secure note
3. ✅ LastPass secure note
4. ✅ Encrypted USB drive (offline backup)

**DO NOT save to:**
- ❌ Dropbox/Google Drive (unencrypted)
- ❌ Email drafts
- ❌ Slack saved messages
- ❌ Phone notes app
- ❌ Git repository

---

**Status:** ✅ Ready for production deployment
**Next Step:** Add to Digital Ocean → Settings → Environment Variables
**Timeline:** 15 minutes setup + 10 minutes deploy = 25 minutes total

---

*Document generated by Claude Code AI - December 8, 2025*
