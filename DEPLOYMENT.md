# 🚀 Holi Labs - DigitalOcean Deployment Guide

Complete step-by-step guide to deploy Holi Labs on DigitalOcean App Platform.

---

## 📋 Prerequisites

- ✅ GitHub account with repo access
- ✅ DigitalOcean account
- ✅ Supabase project (already created)
- ✅ Domain name (optional, but recommended)

---

## 🗄️ Step 1: Create Production Database

### 1.1 Create Managed PostgreSQL Database

1. Go to DigitalOcean Dashboard: https://cloud.digitalocean.com/databases
2. Click **"Create Database Cluster"**
3. Configure:
   - **Database Engine**: PostgreSQL 15
   - **Datacenter Region**: Choose closest to your users (e.g., `New York` for US, `Toronto` for Canada, `São Paulo` for LATAM)
   - **Plan**: 
     - Development: **Basic** ($15/month - 1GB RAM, 10GB disk)
     - Production: **Professional** ($60/month - 4GB RAM, 38GB disk)
   - **Cluster Name**: `holi-labs-db`
4. Click **"Create Database Cluster"**
5. Wait 3-5 minutes for provisioning

### 1.2 Configure Database

Once created:

1. Go to **"Users & Databases"** tab
2. Create database:
   - Name: `holi_labs_prod`
   - Click **"Save"**
3. Go to **"Connection Details"**
4. Copy the **Connection String** (starts with `postgresql://`)
5. **Important**: Add `?sslmode=require` to the end of the connection string

Example:
```
postgresql://doadmin:password@holi-labs-db-do-user-123.ondigitalocean.com:25060/holi_labs_prod?sslmode=require
```

---

## 🌐 Step 2: Deploy Application on App Platform

### 2.1 Create New App

1. Go to: https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Choose **"GitHub"** as source
4. Select your repository: `vidabanq-health-ai`
5. Select branch: `main`
6. Click **"Next"**

### 2.2 Configure Resources

1. **Edit Plan**:
   - App Name: `holi-labs`
   - Region: Same as database (e.g., `New York`)
   - Instance Type: **Professional XS** ($12/month - 1GB RAM)
   - Instance Count: `1` (start with 1, scale later)

2. **Edit Source**:
   - Source Directory: `/apps/web`
   - Dockerfile Path: `/apps/web/Dockerfile`
   - Build Command: (Leave empty, Dockerfile handles it)
   - Run Command: (Leave empty, Dockerfile handles it)
   - HTTP Port: `3000`

3. Click **"Next"**

### 2.3 Add Environment Variables

Click **"Edit"** next to your app, then **"Environment Variables"**.

Add these variables:

#### Required - Core Application
```bash
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

#### Required - Database
```bash
DATABASE_URL=postgresql://doadmin:password@...?sslmode=require
```
*(Paste your connection string from Step 1.2)*

#### Required - Supabase Authentication
```bash
NEXT_PUBLIC_SUPABASE_URL=https://yyteqajwjjrubiktornb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dGVxYWp3ampydWJpa3Rvcm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2ODE4MTksImV4cCI6MjA3NTI1NzgxOX0.b4FmPeZniO4D5Xm3_F10svynPBZYwKtJwDcBP94qq-4
```

#### Required - Security
```bash
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-random-32-char-secret-here
NEXTAUTH_URL=https://holi-labs-xxxxx.ondigitalocean.app

# Must be 32+ characters
ENCRYPTION_KEY=your-32-char-encryption-key-change-in-prod
DEID_SECRET=holi-labs-prod-deid-secret-2025-v1
```

#### Optional - Services
```bash
# Email (if using Resend)
RESEND_API_KEY=re_your_key_here

# AI (if using Claude)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Blockchain (if enabled)
ENABLE_BLOCKCHAIN=false
```

**🔒 Mark as "Secret"**: Check the encrypt checkbox for all sensitive values (passwords, API keys, secrets)

### 2.4 Launch App

1. Click **"Next"** to review
2. Review all settings
3. Click **"Create Resources"**
4. Wait 5-10 minutes for initial deployment

---

## 🗃️ Step 3: Run Database Migrations

Once the app is deployed, you need to set up the database schema.

### 3.1 Access Console

1. Go to your app in DigitalOcean
2. Click on the **"Console"** tab
3. Click **"Open Console"**

### 3.2 Run Migrations

In the console, run:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx tsx prisma/seed.ts
```

### 3.3 Verify

```bash
# Check tables were created
npx prisma db pull
```

---

## ✅ Step 4: Verify Deployment

### 4.1 Test Health

Visit your app URL (provided by DigitalOcean):
```
https://holi-labs-xxxxx.ondigitalocean.app
```

You should see the Holi Labs homepage.

### 4.2 Test Authentication

1. Go to: `https://your-app-url.ondigitalocean.app/auth/signup`
2. Create a test account
3. Check email for confirmation
4. Log in at: `https://your-app-url.ondigitalocean.app/auth/login`
5. Access dashboard: `https://your-app-url.ondigitalocean.app/dashboard`

### 4.3 Test Patient API

```bash
curl https://your-app-url.ondigitalocean.app/api/patients
```

Should return JSON with patient list.

---

## 🌍 Step 5: Add Custom Domain (Optional)

### 5.1 Add Domain in DigitalOcean

1. Go to your app settings
2. Click **"Domains"** tab
3. Click **"Add Domain"**
4. Enter your domain: `holilabs.com` or `app.holilabs.com`
5. Copy the CNAME record provided

### 5.2 Update DNS

In your domain registrar (GoDaddy, Namecheap, etc.):

1. Add CNAME record:
   - **Type**: CNAME
   - **Name**: `app` (or `@` for root domain)
   - **Value**: `holi-labs-xxxxx.ondigitalocean.app.`
   - **TTL**: 3600

2. Wait 10-60 minutes for DNS propagation

### 5.3 Update Environment Variables

Go back to your app's environment variables and update:

```bash
NEXTAUTH_URL=https://app.holilabs.com
```

Redeploy the app.

---

## 📊 Step 6: Monitoring & Maintenance

### 6.1 View Logs

1. Go to your app dashboard
2. Click **"Runtime Logs"** tab
3. Monitor for errors

### 6.2 Set Up Alerts

1. Go to **"Settings"** → **"Alerts"**
2. Enable:
   - Deployment failures
   - High CPU usage
   - High memory usage
   - App crashes

### 6.3 Database Backups

Your managed database automatically creates daily backups.

To restore:
1. Go to database cluster
2. Click **"Backups"** tab
3. Select backup and restore

---

## 💰 Cost Breakdown

| Resource | Plan | Cost |
|----------|------|------|
| App (Web) | Professional XS | $12/month |
| Database | Basic | $15/month |
| **Total** | | **$27/month** |

For production with higher traffic:
- App: Professional M ($48/month - 4GB RAM)
- Database: Professional ($60/month)
- **Total**: ~$108/month

---

## 🔧 Troubleshooting

### Build Fails

**Error**: `Dockerfile not found`
- **Fix**: Make sure Dockerfile is in `/apps/web/` directory

**Error**: `pnpm: command not found`
- **Fix**: Add `RUN npm install -g pnpm` in Dockerfile (already included)

### Database Connection Error

**Error**: `SSL connection required`
- **Fix**: Add `?sslmode=require` to DATABASE_URL

**Error**: `FATAL: remaining connection slots are reserved`
- **Fix**: Upgrade database plan or implement connection pooling

### Environment Variables Not Working

- Make sure to check **"Encrypt"** for sensitive values
- Restart the app after adding variables
- Verify variables are in "Run Time" scope

### App Crashes on Startup

1. Check runtime logs for specific error
2. Verify all required environment variables are set
3. Ensure DATABASE_URL is correct
4. Check that migrations were run

---

## 🚀 Next Steps

1. ✅ Deploy application
2. ⏳ Set up custom domain
3. ⏳ Configure monitoring (Sentry)
4. ⏳ Set up CI/CD pipeline
5. ⏳ Enable auto-scaling
6. ⏳ Implement connection pooling
7. ⏳ Set up staging environment

---

## 📞 Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **Issues**: Create GitHub issue in repo
- **Email**: support@holilabs.com

---

**🎉 Congratulations! Your Holi Labs platform is now live on DigitalOcean!**
