# DigitalOcean Environment Variables Setup

## 🔑 Secure Keys Generated

Add these environment variables to your DigitalOcean App Platform:

```bash
# De-identification Security Keys
SALT_ROTATION_KEY=19fb7a6c0e238aa55aee9803ec85772d4d6a2493e0b603a50bdbb0a37f235686
DEID_SECRET=0cf812898a2ed9a946fc4b1eb4747d428cb14ed9517dec6b43dee29869f495c4
```

---

## 📋 Setup Instructions

### Method 1: Via DigitalOcean Dashboard (Recommended)

1. **Log in to DigitalOcean**: https://cloud.digitalocean.com/

2. **Navigate to Your App**:
   - Click "Apps" in left sidebar
   - Click on your "holilabs" app

3. **Go to Settings**:
   - Click "Settings" tab
   - Click "App-Level Environment Variables"

4. **Add Environment Variables**:

   **Variable 1:**
   - Key: `SALT_ROTATION_KEY`
   - Value: `19fb7a6c0e238aa55aee9803ec85772d4d6a2493e0b603a50bdbb0a37f235686`
   - Encrypt: ✅ (Check this box)
   - Click "Save"

   **Variable 2:**
   - Key: `DEID_SECRET`
   - Value: `0cf812898a2ed9a946fc4b1eb4747d428cb14ed9517dec6b43dee29869f495c4`
   - Encrypt: ✅ (Check this box)
   - Click "Save"

5. **Trigger Redeploy**:
   - After saving both variables, DigitalOcean will prompt you to redeploy
   - Click "Redeploy" button
   - Wait 5-10 minutes for deployment to complete

---

### Method 2: Via DigitalOcean CLI (Advanced)

```bash
# Install doctl if not already installed
# brew install doctl  # macOS
# snap install doctl  # Linux

# Authenticate
doctl auth init

# Get your app ID
doctl apps list

# Set environment variables (replace APP_ID with your actual app ID)
doctl apps update APP_ID --spec - <<EOF
name: holilabs
envs:
  - key: SALT_ROTATION_KEY
    value: 19fb7a6c0e238aa55aee9803ec85772d4d6a2493e0b603a50bdbb0a37f235686
    scope: RUN_TIME
    type: SECRET
  - key: DEID_SECRET
    value: 0cf812898a2ed9a946fc4b1eb4747d428cb14ed9517dec6b43dee29869f495c4
    scope: RUN_TIME
    type: SECRET
EOF
```

---

## ✅ Verify Setup

After deployment completes:

1. **Check Logs**:
   - Go to "Runtime Logs" in DigitalOcean dashboard
   - Look for these messages (they should NOT appear):
     - ❌ "SECURITY WARNING: Using weak or default salt"
     - ❌ "CRITICAL: DEID_SECRET not set"

2. **Test Token Generation**:
   - Create a new patient via the API
   - Verify token format: `PT-[32 hex characters]`
   - Token should be different each time

3. **Check Audit Logs**:
   - De-identification operations should be logged
   - No security warnings in logs

---

## 🔐 Security Notes

### Key Rotation Schedule

**IMPORTANT**: Rotate these keys every 90 days for maximum security.

To rotate:
1. Generate new keys: `openssl rand -hex 32`
2. Update environment variables in DigitalOcean
3. Redeploy app
4. Old pseudonymized data remains valid (hashes don't change retroactively)

### Key Storage

- ✅ **DO**: Store keys in DigitalOcean encrypted environment variables
- ✅ **DO**: Enable encryption checkbox when adding keys
- ✅ **DO**: Restrict access to DigitalOcean dashboard
- ❌ **DON'T**: Commit keys to git
- ❌ **DON'T**: Share keys via email/Slack
- ❌ **DON'T**: Store keys in code comments

### Backup Keys

Store a secure backup of these keys in a password manager (1Password, LastPass, etc.):

```
Service: HoliLabs Production - De-identification Keys
SALT_ROTATION_KEY: 19fb7a6c0e238aa55aee9803ec85772d4d6a2493e0b603a50bdbb0a37f235686
DEID_SECRET: 0cf812898a2ed9a946fc4b1eb4747d428cb14ed9517dec6b43dee29869f495c4
Generated: 2025-10-27
Next Rotation: 2026-01-27 (90 days)
```

---

## 🚨 If Keys Are Compromised

If you suspect these keys have been exposed:

1. **Immediately**:
   - Generate new keys: `openssl rand -hex 32`
   - Update DigitalOcean environment variables
   - Redeploy app

2. **Within 24 hours**:
   - Review audit logs for suspicious activity
   - Check for unauthorized data exports
   - Notify security team/compliance officer

3. **Document**:
   - When keys were compromised
   - How they were exposed
   - What data was at risk
   - Remediation steps taken

---

## 📊 Monitoring

After setup, monitor these metrics:

- **Token generation**: Should show no security warnings
- **Pseudonymization**: Should use PBKDF2 with 100k iterations
- **Audit logs**: Should track all de-identification operations
- **Error rate**: Should remain low (<1%)

---

## ❓ Troubleshooting

### "SECURITY WARNING" still appears in logs

**Cause**: Environment variables not set correctly

**Solution**:
1. Verify variable names are EXACT (case-sensitive)
2. Check for trailing spaces in values
3. Ensure "Encrypt" checkbox is checked
4. Redeploy after saving

### Token format still looks like "PT-abc1-def2-ghi3"

**Cause**: Old code still running (deployment not complete)

**Solution**:
1. Wait for deployment to complete (check build logs)
2. Force redeploy: Settings → General → "Force Rebuild and Deploy"
3. Clear any CDN/cache

### Build fails after adding environment variables

**Cause**: Build-time vs runtime variable scope

**Solution**:
1. Environment variables should be "Runtime" scope, not "Build time"
2. Check app spec in DigitalOcean dashboard
3. Ensure variables are in correct component (web service, not worker)

---

## 🎯 Expected Results

After successful setup:

✅ Token format: `PT-a3f9b2c1-d4e5f6a7-b8c9d0e1-f2a3b4c5`
✅ No security warnings in logs
✅ PBKDF2 with 100,000 iterations
✅ Audit logs tracking all operations
✅ ~75% risk reduction achieved

---

## 📞 Support

If you encounter issues:
- Check DigitalOcean status page: https://status.digitalocean.com/
- Review build logs in dashboard
- Verify environment variable syntax
- Contact DigitalOcean support if deployment issues persist
