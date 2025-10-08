# Production Deployment Checklist

**Date:** 2025-10-07
**Version:** v1.0.0 - Security Hardened Release
**Deployment Target:** DigitalOcean App Platform

---

## ✅ Pre-Deployment Security Configuration

### 1. Environment Variables (CRITICAL)

All of these must be set in DigitalOcean App Platform **before** deployment:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Encryption (CRITICAL - HIPAA Required)
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
# IMPORTANT: Use a different key than development!
# NEVER commit this key to Git

# AI Provider APIs (Required for functionality)
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
# Required for: Audio transcription (Portuguese/Spanish support)
# Cost: ~$0.015/min (~50% cheaper than Whisper)
# Sign up: https://www.assemblyai.com/

GOOGLE_AI_API_KEY=your-google-ai-api-key
# Required for: SOAP note generation (Gemini 2.0 Flash)
# Cost: ~$0.003/note (~35x cheaper than Claude)
# Sign up: https://ai.google.dev/

# Supabase (Required for file storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
# Note: Service role key needed for server-side storage access

# Next.js (Required)
NEXTAUTH_URL=https://holilabs-lwp6y.ondigitalocean.app
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Optional: Connection pool tuning
DB_POOL_SIZE=10
DB_TIMEOUT=10000
DB_QUERY_TIMEOUT=15000
DB_POOL_TIMEOUT=10000
```

**Verification Command:**
```bash
# Test encryption key format (must be 64 hex characters)
echo -n "$ENCRYPTION_KEY" | wc -c  # Should output: 64
```

---

### 2. Supabase Storage Configuration (CRITICAL)

**Bucket: `medical-recordings`**

1. **Create bucket if not exists:**
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('medical-recordings', 'medical-recordings', false);
   ```

2. **Set bucket to PRIVATE (not public):**
   - Go to Supabase Dashboard → Storage → medical-recordings
   - Ensure "Public bucket" is **OFF**
   - Files should only be accessible via signed URLs

3. **Configure RLS Policies:**
   ```sql
   -- Allow authenticated service role to upload/download
   CREATE POLICY "Service role can upload medical recordings"
   ON storage.objects FOR INSERT
   TO service_role
   WITH CHECK (bucket_id = 'medical-recordings');

   CREATE POLICY "Service role can download medical recordings"
   ON storage.objects FOR SELECT
   TO service_role
   USING (bucket_id = 'medical-recordings');

   -- Prevent public access
   CREATE POLICY "No public access to medical recordings"
   ON storage.objects FOR SELECT
   TO anon
   USING (false);
   ```

4. **Verify:**
   - Try accessing a file URL without authentication → Should return 403/401
   - Signed URLs should work for 24 hours

---

### 3. Database Schema Migration

**Ensure Prisma migrations are applied:**

```bash
# From your local machine (with DATABASE_URL pointing to production)
pnpm prisma migrate deploy

# Verify all tables exist
pnpm prisma db pull
```

**Expected tables:**
- users
- patients
- scribe_sessions
- transcriptions
- soap_notes
- medications
- prescriptions
- consents
- appointments
- documents
- clinical_notes
- audit_logs
- blockchain_transactions

---

### 4. PHI Encryption Verification

**Important:** Existing patient data will be automatically encrypted on first access.

**Migration Strategy:**
1. On first patient read → Data is returned unencrypted (legacy)
2. On first patient update → Data is encrypted and stored
3. No manual migration script needed

**Test Encryption:**
```bash
# After deployment, check database directly
psql $DATABASE_URL -c "SELECT \"firstName\", \"lastName\" FROM patients LIMIT 1;"

# Should see base64 strings like: "iY3R5cA==:dGVzdA==:ZW5jcnlwdGVk"
# NOT plain text names
```

---

### 5. API Key Security Audit

**Before deployment, verify:**

- [ ] No API keys hardcoded in source code
- [ ] `.env.local` is in `.gitignore` (verified ✅)
- [ ] No API keys in Git history (run: `git log -p | grep -i "sk-"`)
- [ ] API keys use least privilege (read-only where possible)
- [ ] API keys have rate limits configured

---

## 🔒 HIPAA Compliance Verification

### Business Associate Agreements (BAAs)

**Status:** 🚨 **REQUIRED BEFORE PRODUCTION**

Must sign BAAs with:
1. **Supabase** (Database + Storage)
   - Contact: enterprise@supabase.com
   - Requirement: Pro plan or higher

2. **DigitalOcean** (Hosting)
   - Contact: sales@digitalocean.com
   - Requirement: Business/Enterprise plan

3. **AssemblyAI** (Audio Transcription)
   - Contact: https://www.assemblyai.com/docs/security-and-compliance/hipaa
   - Status: ✅ HIPAA-compliant with BAA available
   - Requirement: Enterprise plan
   - Features: Built-in PHI redaction + speaker diarization

4. **Google Cloud** (Gemini AI)
   - Contact: https://cloud.google.com/security/compliance/hipaa-compliance
   - Status: ✅ Google Cloud AI is HIPAA-compliant
   - Requirement: Must use Vertex AI (not AI Studio) for BAA
   - Note: Gemini API via AI Studio is NOT HIPAA-compliant

**Without BAAs, you CANNOT legally process PHI in production.**

---

## 💰 **Updated Cost Analysis (2025)**

### **New AI Stack: AssemblyAI + Gemini 2.0 Flash**

**Per Doctor (20 patients/day, 200 days/year):**

| Service | Usage | Cost/Unit | Annual Cost | Monthly |
|---------|-------|-----------|-------------|---------|
| **AssemblyAI** | 8,000 min/year | $0.015/min | $120/year | $10/month |
| **Gemini 2.0 Flash** | 4,000 notes/year | $0.0008/note | $3.20/year | $0.27/month |
| **TOTAL** | - | - | **$123.20/year** | **$10.25/month** |

**Previous Stack (Whisper + Claude):**
- Annual Cost: $234/year ($19.50/month)
- **SAVINGS: $111/year (47% cheaper)**

**At Scale (100 doctors):**
- New Stack: $12,320/year ($1,027/month)
- Old Stack: $23,400/year ($1,950/month)
- **TOTAL SAVINGS: $11,080/year**

**Quality Comparison:**
- AssemblyAI: 89% accuracy (vs Whisper 88%) + PHI redaction + speaker diarization
- Gemini 2.0 Flash: 84% PubMedQA (vs Claude 88%) but 3x faster (6 sec vs 18 sec)
- Both fully support Portuguese and Spanish for LATAM markets

---

### Security Features Implemented ✅

- [x] Field-level PHI encryption (AES-256-GCM)
- [x] Audio file encryption before storage
- [x] Private storage buckets with signed URLs
- [x] Server-side audio transcription (no client-controlled data)
- [x] AssemblyAI PHI redaction (automatic detection + removal)
- [x] Speaker diarization (Doctor vs Patient labeling)
- [x] Prompt injection prevention (XML tag separation)
- [x] Fail-safe audit logging (operation fails if audit fails)
- [x] TLS 1.2+ for all connections
- [x] PostgreSQL SSL mode required
- [x] Connection pooling with timeout limits
- [x] Medical-grade input validation (Zod schemas)

### Security Features Pending ⏳

- [x] CSRF protection on state-changing endpoints (**COMPLETE**)
- [x] Input validation with Zod schemas (**COMPLETE**)
- [ ] Session HMAC signatures
- [ ] File type verification (magic bytes check)
- [ ] Rate limiting per user (currently per IP)
- [ ] DDoS protection (CloudFlare/Fastly recommended)

---

## 🚀 Deployment Steps

### Step 1: Pre-flight Checks

```bash
# 1. Run tests (if available)
pnpm test

# 2. Build locally to verify
pnpm build

# 3. Check for security issues
pnpm audit --production

# 4. Verify environment variables are NOT in code
grep -r "sk-ant" src/  # Should return nothing
grep -r "sk-proj" src/  # Should return nothing
```

### Step 2: Deploy to DigitalOcean

```bash
# Option A: Automatic deployment (GitHub integration)
git push origin main
# DigitalOcean will auto-deploy on push

# Option B: Manual deployment via CLI
doctl apps create --spec .do/app.yaml
```

### Step 3: Post-Deployment Verification

**1. Health Check:**
```bash
curl https://holilabs-lwp6y.ondigitalocean.app/api/health
# Expected: {"status":"ok","database":"connected"}
```

**2. Database Connection:**
```bash
curl https://holilabs-lwp6y.ondigitalocean.app/api/patients
# Should require authentication (401 Unauthorized)
```

**3. Test Patient Creation (Encryption):**
```bash
# Create test patient via API
curl -X POST https://holilabs-lwp6y.ondigitalocean.app/api/patients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Patient","dateOfBirth":"1990-01-01"}'

# Check database - firstName/lastName should be encrypted
psql $DATABASE_URL -c "SELECT \"firstName\" FROM patients ORDER BY \"createdAt\" DESC LIMIT 1;"
# Should see: "iY3R5cA==:dGVzdA==:..." NOT "Test"
```

**4. Test Audio Upload (Encryption):**
- Upload a test audio file via Scribe interface
- Check Supabase Storage → Bucket should show `.encrypted` extension
- Try accessing file URL directly → Should fail (403)
- Check signed URL → Should work

**5. Test Whisper Transcription:**
- Upload audio and finalize session
- Check logs for: "Transcription completed in XXXms"
- Verify SOAP note was generated

**6. Test Audit Logging:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM audit_logs WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';"
# Should show recent activity
```

---

## 🔍 Monitoring & Alerts

### Set up monitoring for:

1. **Database Connection Pool:**
   - Alert if connections > 80% of max
   - Check: `SELECT count(*) FROM pg_stat_activity;`

2. **API Error Rate:**
   - Alert if 5xx errors > 1% of requests
   - Check DigitalOcean App Platform logs

3. **Audit Log Failures:**
   - Alert immediately (indicates potential compliance breach)
   - Search logs for: "CRITICAL: Audit log failed"

4. **Encryption Errors:**
   - Search logs for: "phi_encryption_failed" or "phi_decryption_failed"
   - Alert immediately (indicates key misconfiguration)

5. **AI API Usage:**
   - Monitor OpenAI token usage (billing)
   - Monitor Anthropic token usage (billing)
   - Alert if usage exceeds budget

---

## 🚨 Incident Response

### If PHI data breach detected:

1. **Immediately:**
   - Document the incident (timestamp, scope, affected users)
   - Isolate affected systems (disable user accounts if needed)

2. **Within 24 hours:**
   - Notify legal team
   - Begin breach assessment

3. **Within 60 days:**
   - Notify affected patients (HIPAA requirement)
   - Report to HHS Office for Civil Rights if >500 patients affected

4. **Mitigation:**
   - Rotate all API keys and encryption keys
   - Force password resets for all users
   - Review audit logs for unauthorized access

### Emergency Contacts:

- **Security Lead:** [Your Name/Email]
- **Legal Team:** [Legal Contact]
- **HIPAA Compliance Officer:** [Compliance Contact]
- **DigitalOcean Support:** https://cloudsupport.digitalocean.com

---

## 📋 Post-Deployment Tasks

### Week 1:
- [ ] Monitor error logs daily
- [ ] Check database connection pool usage
- [ ] Verify all audit logs are being created
- [ ] Test disaster recovery (database backup restore)

### Week 2:
- [ ] Review AI token usage and costs
- [ ] Schedule penetration test with security firm
- [ ] Document any production issues

### Month 1:
- [ ] Complete remaining security tasks (CSRF, input validation, etc.)
- [ ] Schedule HIPAA compliance audit
- [ ] Review and update incident response plan

---

## 🔧 Rollback Plan

If deployment fails or critical issues arise:

```bash
# 1. Revert to previous deployment
doctl apps deployment list <app-id>
doctl apps deployment rollback <app-id> <deployment-id>

# 2. Check database integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM patients WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';"

# 3. Verify no data loss
# Check audit logs for all operations during failed deployment

# 4. Communicate with users
# Post status update: "Temporary maintenance - service restored"
```

---

## ✅ Sign-off

**Deployment Approved By:**

- [ ] Engineering Lead: _____________________ Date: _______
- [ ] Security Officer: _____________________ Date: _______
- [ ] Compliance Officer: ___________________ Date: _______

**Production Go-Live Date:** ___________________

**Notes:**

---

## 📚 Additional Resources

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [Anthropic Security Practices](https://www.anthropic.com/security)
- [OpenAI Enterprise Security](https://openai.com/enterprise-privacy)
- [Supabase Security Guide](https://supabase.com/docs/guides/platform/security)
- [DigitalOcean Security Best Practices](https://docs.digitalocean.com/products/app-platform/concepts/security/)

---

**Last Updated:** 2025-10-07
**Version:** 1.0.0
**Maintained By:** Development Team
