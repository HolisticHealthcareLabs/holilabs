# 🔐 Secrets Generation Guide

**Generated**: October 9, 2025
**Status**: ⚠️ CONFIDENTIAL - Store securely, never commit to Git

---

## 🎯 Quick Start

### Step 1: Generate New Production Secrets

```bash
# NEXTAUTH_SECRET (for session signing)
openssl rand -base64 32
# Result: USgMzLhnghPGvVU0A91X1V+OFQu/6F/T7Vo4efabdxY=

# ENCRYPTION_KEY (for PHI encryption)
openssl rand -hex 32
# Result: 77696601664cfffc19b28ce3d0ebf03a05b655020d08772d81f627ebf5337460

# DEID_SECRET (for de-identification hashing)
openssl rand -base64 64
# Result: 6kdxbT4ZOSbh9m1irHC39XDF5vQvJr5qARcoQAodsV1h/5OkyRt4T8yHj+IZnULW
# d+uB6BNvu9mHds4b/+NUBw==
```

### Step 2: Generate VAPID Keys (Push Notifications)

```bash
# Install web-push CLI
npm install -g web-push

# Generate VAPID key pair
npx web-push generate-vapid-keys

# Example output:
# =======================================
# Public Key:
# BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
#
# Private Key:
# UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
# =======================================
```

---

## 📋 Secrets Checklist

### Critical Secrets (Must Generate Immediately)

- [x] `NEXTAUTH_SECRET` - Generated ✅
- [x] `ENCRYPTION_KEY` - Generated ✅
- [x] `DEID_SECRET` - Generated ✅
- [ ] `VAPID_PUBLIC_KEY` - Run `npx web-push generate-vapid-keys`
- [ ] `VAPID_PRIVATE_KEY` - Same as above

### API Keys to Rotate (URGENT)

**⚠️ Current keys are EXPOSED in .env.local - rotate immediately!**

- [ ] **AssemblyAI API Key**
  - Current (COMPROMISED): `7c91616a78b2492ab808c14b6f0a9600`
  - Action: Go to https://www.assemblyai.com/app/account
  - Steps: Settings → API Keys → Revoke old key → Generate new key
  - New key: `__________________________`

- [ ] **Google AI API Key**
  - Current (COMPROMISED): `AIzaSyCy7CTGP0Wp0zaYHrd2pmhGpt2AknsVIM8`
  - Action: Go to https://console.cloud.google.com/apis/credentials
  - Steps: API Keys → Delete old key → Create new key → Restrict to AI Studio API
  - New key: `__________________________`

- [ ] **Resend API Key**
  - Current (COMPROMISED): `re_SEBRpWwx_PVp8TJ5NY6GSbaXrhi8dXwhJ`
  - Action: Go to https://resend.com/api-keys
  - Steps: Revoke old key → Create new key
  - New key: `__________________________`

### Supabase Keys

- [ ] **Supabase Service Role Key**
  - Current: Placeholder (`your-service-role-key-here`)
  - Action: Go to https://supabase.com/dashboard/project/yyteqajwjjrubiktornb/settings/api
  - Copy: `service_role` secret key (starts with `eyJhbGci...`)
  - New key: `__________________________`

---

## 🚀 Deployment to DigitalOcean

### Method 1: Using DigitalOcean App Platform UI (Recommended)

1. Go to: https://cloud.digitalocean.com/apps
2. Select your app: `holi-labs`
3. Go to: Settings → App-Level Environment Variables
4. Click: **Edit** → **Bulk Editor**
5. Paste all secrets (format: `KEY=value`)
6. Click: **Save**
7. App will automatically redeploy

### Method 2: Using doctl CLI

```bash
# Install doctl
brew install doctl  # macOS
# OR
snap install doctl  # Linux

# Authenticate
doctl auth init

# Set environment variables
doctl apps update <app-id> --env "NEXTAUTH_SECRET=USgMzLhnghPGvVU0A91X1V+OFQu/6F/T7Vo4efabdxY="
doctl apps update <app-id> --env "ENCRYPTION_KEY=77696601664cfffc19b28ce3d0ebf03a05b655020d08772d81f627ebf5337460"
# ... repeat for all secrets
```

### Method 3: Using .env File (Less Secure)

```bash
# On DigitalOcean droplet/server:
cd /app
nano .env.production

# Paste all secrets, then:
export $(cat .env.production | xargs)
pm2 restart holi-labs
```

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets
```bash
# Add to .gitignore (already done ✅)
.env
.env.local
.env.production
.env.*.local
*.secret
```

### 2. Rotate Secrets Regularly
- **API Keys**: Every 90 days
- **Encryption Keys**: Every 180 days (requires data re-encryption!)
- **Session Secrets**: Every 30 days
- **Database Passwords**: Every 90 days

### 3. Use Secret Management Tools

**Option A: DigitalOcean App Platform** (Current setup)
- Built-in secret storage
- Encrypted at rest
- Access via environment variables

**Option B: HashiCorp Vault** (Enterprise)
```bash
# Install Vault
brew install vault

# Store secret
vault kv put secret/holi-labs/nextauth-secret value="USgMzLhnghPGvVU0A91X1V+OFQu/6F/T7Vo4efabdxY="

# Retrieve secret
vault kv get -field=value secret/holi-labs/nextauth-secret
```

**Option C: AWS Secrets Manager** (If migrating to AWS)
```bash
aws secretsmanager create-secret \
  --name holi-labs/nextauth-secret \
  --secret-string "USgMzLhnghPGvVU0A91X1V+OFQu/6F/T7Vo4efabdxY="
```

### 4. Restrict Access
- Only DevOps team should have access to production secrets
- Use IAM roles with least privilege
- Enable audit logging for secret access

---

## 📊 Secret Storage Matrix

| Secret | Where to Store | Rotation | Critical? |
|--------|---------------|----------|-----------|
| `NEXTAUTH_SECRET` | DigitalOcean Env | 30 days | ✅ Yes |
| `ENCRYPTION_KEY` | DigitalOcean Env | 180 days* | ✅ Yes |
| `DEID_SECRET` | DigitalOcean Env | 180 days | ✅ Yes |
| `ASSEMBLYAI_API_KEY` | DigitalOcean Env | 90 days | ✅ Yes |
| `GOOGLE_AI_API_KEY` | DigitalOcean Env | 90 days | ✅ Yes |
| `RESEND_API_KEY` | DigitalOcean Env | 90 days | ⚠️ Medium |
| `SUPABASE_SERVICE_ROLE_KEY` | DigitalOcean Env | Never* | ✅ Yes |
| `VAPID_PRIVATE_KEY` | DigitalOcean Env | 365 days | ⚠️ Medium |
| `TWILIO_AUTH_TOKEN` | DigitalOcean Env | 90 days | ⚠️ Medium |
| `DATABASE_URL` | DigitalOcean Env | 90 days | ✅ Yes |

*Note: Rotating encryption keys requires re-encrypting all data. Plan carefully!

---

## 🧪 Testing Secrets in Staging

Before deploying to production, test in staging:

```bash
# 1. Create staging environment on DigitalOcean
doctl apps create --spec .do/app-staging.yaml

# 2. Set staging-specific secrets (same format, different values)
doctl apps update <staging-app-id> --env "NEXTAUTH_SECRET=<staging-secret>"

# 3. Deploy and test
curl https://staging.holilabs.com/api/health
```

---

## 🆘 Emergency: Secret Compromised

If a secret is exposed (e.g., committed to Git):

### Immediate Actions (Within 1 hour)

1. **Rotate the compromised secret immediately**
   ```bash
   # Generate new secret
   openssl rand -base64 32

   # Update in DigitalOcean
   doctl apps update <app-id> --env "COMPROMISED_KEY=<new-value>"
   ```

2. **Revoke API keys**
   - AssemblyAI: https://www.assemblyai.com/app/account
   - Google AI: https://console.cloud.google.com/apis/credentials
   - Resend: https://resend.com/api-keys

3. **Check for unauthorized access**
   ```bash
   # Check Supabase logs
   # Check DigitalOcean access logs
   # Check API usage dashboards
   ```

4. **Notify affected services**
   - If PHI was accessed: HIPAA breach notification (72 hours)
   - If user data compromised: GDPR/CCPA notification

### Follow-up Actions (Within 24 hours)

1. **Audit Git history**
   ```bash
   # Search for secret in all commits
   git log -S "7c91616a78b2492ab808c14b6f0a9600" --all

   # Use BFG Repo-Cleaner to remove from history
   brew install bfg
   bfg --replace-text passwords.txt
   ```

2. **Update incident response documentation**
3. **Review access logs for suspicious activity**
4. **Implement additional security measures** (e.g., IP whitelisting)

---

## 📞 Support Contacts

**If you need help with secrets:**
- DevOps Lead: [Your contact]
- Security Team: security@holilabs.com
- DigitalOcean Support: https://cloud.digitalocean.com/support

**Vendor Support for API Key Issues:**
- AssemblyAI: support@assemblyai.com
- Google Cloud: https://cloud.google.com/support
- Resend: support@resend.com
- Supabase: support@supabase.com

---

## ✅ Pre-Production Checklist

Before launching to production:

- [ ] All placeholder secrets replaced with real values
- [ ] All API keys rotated (old keys revoked)
- [ ] VAPID keys generated for push notifications
- [ ] Secrets stored in DigitalOcean App Platform (not .env files)
- [ ] Supabase Service Role Key added
- [ ] `.env.local` deleted from production server
- [ ] Git history cleaned (no secrets in commits)
- [ ] Secret rotation schedule documented
- [ ] Team trained on secret management procedures
- [ ] Incident response plan tested

---

**⚠️ REMEMBER**: Secrets are like passwords - never share, never commit, rotate regularly!

**Document Version**: 1.0
**Last Updated**: October 9, 2025
**Next Review**: Before production deployment
