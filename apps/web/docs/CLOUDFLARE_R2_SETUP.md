# Cloudflare R2 Setup Guide

Step-by-step guide to configure R2 storage for Holi Labs.

---

## Step 1: Access R2 Storage

1. In your Cloudflare dashboard (you're already there!)
2. Click **"R2 object storage"** in the left sidebar
3. If prompted, click **"Get Started"** or **"Create bucket"**

---

## Step 2: Create Your First Bucket

### 2.1: Click "Create bucket"

**Bucket Configuration:**
```
Bucket name: holi-labs-storage
Location: Automatic (Cloudflare chooses optimal location)
Storage class: Standard
```

**Naming rules:**
- Lowercase only
- 3-63 characters
- No spaces or special characters (except hyphens)

**Recommended name:** `holi-labs-storage` or `holilabs-medical-files`

### 2.2: Configure Settings (Optional)

**For healthcare/HIPAA compliance:**
- ✅ Enable "Object Lock" (prevents accidental deletion)
- ✅ Enable "Versioning" (keeps file history)
- ⚠️ **Do NOT** enable "Public access" (keep files private)

Click **"Create bucket"** ✅

---

## Step 3: Generate API Tokens

### 3.1: Go to API Tokens

1. Look for **"Manage R2 API Tokens"** button (usually top-right)
2. Or navigate to: Account → R2 → Manage API Tokens

### 3.2: Create API Token

Click **"Create API Token"**

**Token Configuration:**
```
Token name: holi-labs-production
Permissions: Object Read & Write
Buckets: Apply to specific buckets → Select "holi-labs-storage"
TTL: Forever (or set expiration if you prefer)
```

Click **"Create API Token"**

### 3.3: Save Credentials ⚠️ IMPORTANT

You'll see a screen with:
```
Access Key ID: abc123...
Secret Access Key: xyz789...
```

**⚠️ Copy these immediately!** You won't see the Secret Access Key again.

**Save to your secrets file:**
```bash
# Add to ~/holi-secrets.txt
R2_ACCESS_KEY_ID=abc123...
R2_SECRET_ACCESS_KEY=xyz789...
```

---

## Step 4: Get Your R2 Endpoint

### 4.1: Find Your Account ID

Look at your Cloudflare dashboard URL:
```
https://dash.cloudflare.com/abc123def456/r2/overview
                              ^^^^^^^^^^^^
                              This is your Account ID
```

Or find it in: Account → R2 → Overview (right side panel)

### 4.2: Construct Your Endpoint

**Format:**
```
https://<account-id>.r2.cloudflarestorage.com
```

**Example:**
```
https://abc123def456.r2.cloudflarestorage.com
```

**Save to your secrets file:**
```bash
R2_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com
R2_BUCKET=holi-labs-storage
```

---

## Step 5: Test Connection (Optional but Recommended)

### 5.1: Install AWS CLI (if not installed)

```bash
# macOS
brew install awscli

# Or using pip
pip3 install awscli
```

### 5.2: Configure AWS CLI for R2

```bash
# Add R2 profile
aws configure --profile r2

# When prompted:
AWS Access Key ID: [paste your R2_ACCESS_KEY_ID]
AWS Secret Access Key: [paste your R2_SECRET_ACCESS_KEY]
Default region name: auto
Default output format: json
```

### 5.3: Test Upload

```bash
# Create test file
echo "Test file for Holi Labs R2" > test-upload.txt

# Upload to R2
aws s3 cp test-upload.txt s3://holi-labs-storage/test-upload.txt \
  --endpoint-url=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --profile r2

# Expected output:
# upload: ./test-upload.txt to s3://holi-labs-storage/test-upload.txt
```

### 5.4: Test List

```bash
# List files in bucket
aws s3 ls s3://holi-labs-storage/ \
  --endpoint-url=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --profile r2

# Expected output:
# 2025-10-11 09:00:00     28 test-upload.txt
```

### 5.5: Test Download

```bash
# Download file
aws s3 cp s3://holi-labs-storage/test-upload.txt downloaded-test.txt \
  --endpoint-url=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --profile r2

# Verify
cat downloaded-test.txt
# Should show: "Test file for Holi Labs R2"
```

### 5.6: Clean Up Test

```bash
# Delete test file
aws s3 rm s3://holi-labs-storage/test-upload.txt \
  --endpoint-url=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --profile r2

# Clean up local files
rm test-upload.txt downloaded-test.txt
```

---

## Step 6: Configure CORS (For Browser Uploads)

### 6.1: Create CORS Policy

In R2 dashboard:
1. Click on your bucket (`holi-labs-storage`)
2. Go to **Settings** tab
3. Scroll to **CORS policy**
4. Click **"Edit CORS policy"**

### 6.2: Add CORS Configuration

**For Development:**
```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://holilabs-lwp6y.ondigitalocean.app",
      "https://yourdomain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**For Production (more restrictive):**
```json
[
  {
    "AllowedOrigins": [
      "https://yourdomain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Length",
      "Content-MD5"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

Click **"Save"**

---

## Step 7: Enable Public Access (Optional)

**⚠️ Only if you need public file sharing**

### For Patient Portal Shared Links:

1. Go to your bucket settings
2. Scroll to **"Public access"**
3. Click **"Allow Access"**
4. Configure custom domain (optional)

**Note:** With encryption enabled in your code, files are encrypted before upload, so even with public access, content remains secure.

---

## Step 8: Set Up Custom Domain for R2 (Optional)

**Why:** Branded URLs like `files.holilabs.com` instead of R2's default URL

### 8.1: Add Custom Domain

1. In your R2 bucket settings
2. Go to **"Custom Domains"** section
3. Click **"Connect Domain"**
4. Enter: `files.yourdomain.com` (or subdomain of your choice)

### 8.2: Add DNS Record

Cloudflare will provide a CNAME record:
```
Type: CNAME
Name: files
Content: holi-labs-storage.abc123.r2.cloudflarestorage.com
Proxy: Enabled (orange cloud)
```

Add this to your domain's DNS settings.

### 8.3: Update Environment Variables

```bash
# Use custom domain instead of R2 endpoint
R2_PUBLIC_URL=https://files.yourdomain.com
```

---

## Step 9: Configure Lifecycle Rules (Optional)

**For cost optimization:**

1. Go to your bucket → **Lifecycle rules**
2. Create rules like:
   - Delete incomplete multipart uploads after 7 days
   - Move old backups to infrequent access tier after 90 days
   - Delete temporary files after 30 days

**Example Rule:**
```
Rule name: Delete temp files
Prefix: temp/
Days: 30
Action: Delete
```

---

## Step 10: Add to Your App

### 10.1: Update Environment Variables

Add to DigitalOcean App Platform (Settings → Environment Variables):

```bash
R2_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com
R2_BUCKET=holi-labs-storage
R2_ACCESS_KEY_ID=your-access-key-from-step-3
R2_SECRET_ACCESS_KEY=your-secret-key-from-step-3
```

### 10.2: Verify Code Configuration

Your code already supports R2! Check `src/lib/storage/cloud-storage.ts`:

```typescript
const STORAGE_CONFIG = {
  endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
  bucket: process.env.R2_BUCKET || process.env.S3_BUCKET,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  },
};
```

✅ No code changes needed!

### 10.3: Deploy

```bash
# Push changes (if any)
git add .
git commit -m "Add R2 storage configuration"
git push origin main

# Or manual deploy
doctl apps create-deployment YOUR_APP_ID
```

---

## Step 11: Test in Production

### 11.1: Upload Test File

1. Log into your app
2. Go to Dashboard → Upload Document
3. Upload a test PDF or image
4. Verify it appears in R2 bucket

### 11.2: Check Cloudflare Dashboard

1. Go to R2 → Your bucket
2. Click **"Browse objects"**
3. You should see your uploaded file (encrypted)

### 11.3: Test Download

1. In your app, click to view/download the file
2. Verify it downloads correctly
3. Verify file is decrypted and readable

---

## Troubleshooting

### Error: "Access Denied"

**Solution:**
- Verify API token has "Read & Write" permissions
- Check bucket name matches exactly
- Ensure token is applied to correct bucket

### Error: "Endpoint not found"

**Solution:**
- Verify Account ID in endpoint URL
- Check format: `https://<account-id>.r2.cloudflarestorage.com`
- Ensure no typos or extra slashes

### Error: "CORS policy error"

**Solution:**
- Add your domain to CORS AllowedOrigins
- Include both HTTP (dev) and HTTPS (prod)
- Wait 2-3 minutes for CORS changes to propagate

### Files not appearing in bucket

**Solution:**
- Check R2_BUCKET name matches exactly
- Verify API token has write permissions
- Check application logs for errors

---

## Security Best Practices

### ✅ DO:
- Use separate buckets for dev/staging/production
- Rotate API tokens every 90 days
- Enable versioning for compliance
- Monitor usage in Cloudflare dashboard
- Set up CloudTrail-equivalent logging

### ❌ DON'T:
- Don't commit API keys to git
- Don't enable public access unless necessary
- Don't reuse tokens across environments
- Don't skip encryption (your code already encrypts!)

---

## Cost Monitoring

### Track Usage:

1. Go to R2 Dashboard
2. Click **"Usage"** or **"Metrics"**
3. Monitor:
   - Storage used (GB)
   - Operations (reads/writes)
   - Egress (should be $0!)

### Set Up Alerts:

1. Account → Notifications
2. Create alert for:
   - Storage exceeds 100GB
   - Operations exceed 1M/month
   - Budget threshold

---

## Summary: Your R2 Credentials

Save these to `~/holi-secrets.txt`:

```bash
# === CLOUDFLARE R2 STORAGE ===
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=holi-labs-storage
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key

# Optional: Custom domain
R2_PUBLIC_URL=https://files.yourdomain.com
```

---

## Next Steps

After R2 is configured:

1. ✅ Set up Upstash Redis (rate limiting)
2. ✅ Configure Sentry (error monitoring)
3. ✅ Add all environment variables to DigitalOcean
4. ✅ Deploy to production
5. ✅ Test file uploads/downloads

---

**Need Help?**
- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- Your code: `src/lib/storage/cloud-storage.ts`
- Support: Cloudflare Community or DM me

**Last Updated:** October 11, 2025
