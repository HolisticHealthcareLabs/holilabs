# 🚀 Deploy Holi Labs to DigitalOcean App Platform

## Prerequisites
- ✅ DigitalOcean account ([Sign up here](https://cloud.digitalocean.com/registrations/new))
- ✅ GitHub repository with your code
- ✅ Domain registered on Porkbun (holilabs.xyz) ✓
- ✅ PostgreSQL database (can be on DigitalOcean or external)

---

## Step 1: Push Your Code to GitHub

```bash
# Make sure all changes are committed
cd /Users/nicolacapriroloteran/holilabs-health-ai
git add .
git commit -m "Prepare for DigitalOcean deployment"
git push origin main
```

---

## Step 2: Create App on DigitalOcean

### 2.1 Go to DigitalOcean Dashboard
1. Log in to [DigitalOcean](https://cloud.digitalocean.com/)
2. Click **"Create"** → **"Apps"**

### 2.2 Connect GitHub Repository
1. Click **"GitHub"** as source
2. Authorize DigitalOcean to access your GitHub
3. Select repository: `holilabs-health-ai`
4. Select branch: `main`
5. Check **"Autodeploy"** (deploys on every push)

### 2.3 Configure App
DigitalOcean will auto-detect your `.do/app.yaml` configuration!

**Important:** Your app already has a configuration file at `.do/app.yaml` which specifies:
- Build command: `cd apps/web && pnpm install && pnpm build`
- Run command: `cd apps/web && pnpm start`
- Port: 3000
- Environment: Node.js

Click **"Next"** to continue.

---

## Step 3: Set Environment Variables

In the DigitalOcean dashboard, go to **Settings → Environment Variables** and add these:

### Required Variables

```bash
# Database (REQUIRED - Create PostgreSQL database first!)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# App URLs (CHANGE after domain is configured)
NEXT_PUBLIC_APP_URL=https://holilabs.xyz
NEXTAUTH_URL=https://holilabs.xyz

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yyteqajwjjrubiktornb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dGVxYWp3ampydWJpa3Rvcm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2ODE4MTksImV4cCI6MjA3NTI1NzgxOX0.b4FmPeZniO4D5Xm3_F10svynPBZYwKtJwDcBP94qq-4
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Security (GENERATE NEW SECRETS FOR PRODUCTION!)
NEXTAUTH_SECRET=GENERATE_NEW_SECRET_HERE
ENCRYPTION_KEY=GENERATE_NEW_SECRET_HERE

# AI Services
ASSEMBLYAI_API_KEY=7c91616a78b2492ab808c14b6f0a9600
GOOGLE_AI_API_KEY=AIzaSyCy7CTGP0Wp0zaYHrd2pmhGpt2AknsVIM8

# Email
RESEND_API_KEY=re_SEBRpWwx_PVp8TJ5NY6GSbaXrhi8dXwhJ

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPgdD0ETGgvkFq0yV3jyRcIoq725bXPbytjUQxmO5LQt5OOG4GH5bx9hyLf5Vr3m9bnzKIwAnyEciPqaK87qalw
VAPID_PRIVATE_KEY=JIiusRQIKGIduu_7_j0GEjESSRw2VJLQASKTB6a_2yk
VAPID_EMAIL=mailto:notifications@holilabs.xyz

# De-identification
DEID_SECRET=CHANGE_THIS_IN_PRODUCTION

# Blockchain (Optional)
ENABLE_BLOCKCHAIN=false
```

### Generate New Production Secrets

**Run these commands locally and copy the output:**

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

---

## Step 4: Create PostgreSQL Database (Recommended)

### Option A: DigitalOcean Managed PostgreSQL (Recommended)

1. In DigitalOcean, click **"Create"** → **"Databases"**
2. Choose **PostgreSQL 15**
3. Select plan: **Basic ($15/month)** or **Starter ($7/month)**
4. Choose datacenter: **New York** or **San Francisco** (closest to your users)
5. Name: `holi-labs-prod`
6. Click **"Create Database"**

**After creation:**
1. Click **"Connection Details"**
2. Copy the **Connection String** (includes SSL)
3. Update `DATABASE_URL` environment variable in your App

### Option B: External Database (Supabase, Railway, etc.)

If using external database, make sure:
- SSL is enabled
- Firewall allows DigitalOcean IP ranges
- Connection string format: `postgresql://user:pass@host:port/db?sslmode=require`

---

## Step 5: Add Custom Domain (holilabs.xyz)

### 5.1 In DigitalOcean App Settings

1. Go to your app → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `holilabs.xyz`
4. Click **"Add Domain"**
5. Repeat for: `www.holilabs.xyz`

DigitalOcean will show you DNS records to add.

### 5.2 Configure DNS in Porkbun

1. Log in to [Porkbun](https://porkbun.com/)
2. Go to **"Domain Management"** → **holilabs.xyz**
3. Click **"DNS Records"**

**Add these records:**

#### Record 1: Root domain
```
Type: A
Host: @ (or leave blank)
Answer: [IP from DigitalOcean - shown in dashboard]
TTL: 600
```

#### Record 2: WWW subdomain
```
Type: CNAME
Host: www
Answer: holilabs.xyz
TTL: 600
```

**Important:** DigitalOcean will show you the exact IP address in the "Domains" section. Copy it from there.

---

## Step 6: Update Environment Variables with Domain

After DNS is configured and app is deployed:

1. Go to **Settings → Environment Variables**
2. Update these variables:
   ```bash
   NEXT_PUBLIC_APP_URL=https://holilabs.xyz
   NEXTAUTH_URL=https://holilabs.xyz
   VAPID_EMAIL=mailto:notifications@holilabs.xyz
   ```
3. Click **"Save"**
4. App will automatically redeploy

---

## Step 7: SSL Certificate

DigitalOcean automatically provisions SSL certificates via Let's Encrypt.

**This happens automatically after:**
- DNS is configured correctly
- Domain points to your app
- Wait 5-15 minutes

You'll see a green checkmark next to your domain when SSL is active.

---

## Step 8: Deploy!

1. Click **"Create Resources"** at the bottom
2. DigitalOcean will:
   - Build your app
   - Run database migrations
   - Deploy to production
   - Provision SSL certificate

**Build time:** 5-10 minutes

---

## Step 9: Monitor Deployment

### View Build Logs
1. Go to your app dashboard
2. Click **"Runtime Logs"**
3. Watch for:
   ```
   ✓ Compiled successfully
   ✓ Ready on port 3000
   ```

### Check Health
Once deployed, visit:
- `https://your-app.ondigitalocean.app` (temporary URL)
- `https://holilabs.xyz` (after DNS propagates)

---

## Step 10: Run Database Migrations

After first deployment, you may need to run Prisma migrations:

### Option A: Via DigitalOcean Console

1. Go to **Console** tab in your app
2. Run:
   ```bash
   cd apps/web
   pnpm prisma migrate deploy
   pnpm db:seed
   ```

### Option B: Via Local Connection

```bash
# Set production DATABASE_URL locally (temporarily)
export DATABASE_URL="postgresql://your-prod-db-url"

# Run migrations
cd apps/web
pnpm prisma migrate deploy
pnpm db:seed
```

---

## Troubleshooting

### Build Fails: "pnpm not found"

**Fix:** Add build environment variable:
```bash
NPM_CONFIG_PREFER_FROZEN_LOCKFILE=false
```

### Database Connection Error

**Check:**
- `DATABASE_URL` includes `?sslmode=require`
- Database firewall allows DigitalOcean IPs
- Connection string has correct username/password

### SSL Certificate Pending

**Wait time:** 5-15 minutes after DNS propagation

**Check DNS:**
```bash
dig holilabs.xyz
nslookup holilabs.xyz
```

### App Crashes on Startup

**Check Runtime Logs:**
1. Go to **Runtime Logs** tab
2. Look for error messages
3. Common issues:
   - Missing environment variables
   - Database connection failed
   - Port binding issues

---

## Costs Breakdown

### Basic Setup
- **App Platform:** $12/month (Basic plan, 1GB RAM)
- **PostgreSQL Database:** $15/month (1GB RAM, 10GB storage)
- **Total:** $27/month

### Starter Setup (Cheaper)
- **App Platform:** $5/month (Starter plan, 512MB RAM)
- **External Database:** $0-7/month (Supabase free tier or Railway)
- **Total:** $5-12/month

---

## Auto-Deployment

✅ **Already configured!**

Every time you push to `main` branch:
1. GitHub webhook triggers DigitalOcean
2. DigitalOcean pulls latest code
3. Builds app
4. Deploys automatically
5. Zero downtime deployment

---

## Scaling (Future)

When you need more resources:

1. Go to **Settings → Resources**
2. Upgrade plan:
   - **Professional:** $24/month (2GB RAM)
   - **Advanced:** $48/month (4GB RAM)

---

## Backup & Monitoring

### Database Backups
- **Automatic daily backups** (included with managed PostgreSQL)
- Retention: 7 days
- Can restore from any backup point

### App Monitoring
- **Built-in metrics** in DigitalOcean dashboard
- CPU usage, memory, request count
- Add **Sentry** for error tracking (recommended)

---

## Security Checklist

- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Generate new `ENCRYPTION_KEY` for production
- [ ] Enable database SSL (`?sslmode=require`)
- [ ] Set `ALLOWED_ORIGINS=https://holilabs.xyz`
- [ ] Enable CORS restrictions
- [ ] Review all API keys (remove test keys)
- [ ] Enable DigitalOcean alerts
- [ ] Set up database backups

---

## Quick Commands Reference

```bash
# View app info
doctl apps list

# View app logs
doctl apps logs <app-id>

# Force rebuild
doctl apps create-deployment <app-id>

# Update environment variable (via dashboard is easier)
# Settings → Environment Variables → Edit
```

---

## Need Help?

- **DigitalOcean Docs:** https://docs.digitalocean.com/products/app-platform/
- **Community:** https://www.digitalocean.com/community/
- **Support:** https://cloud.digitalocean.com/support

---

## Next Steps After Deployment

1. ✅ Test login at https://holilabs.xyz
2. ✅ Create first clinician account
3. ✅ Add test patient
4. ✅ Test SOAP note creation
5. ✅ Verify email notifications work
6. ✅ Test pain assessment tracking
7. ✅ Run Lighthouse performance audit
8. ✅ Set up Sentry error monitoring
9. ✅ Configure backup strategy
10. ✅ Train Pequeno Cotolêngo staff

---

**🎉 Your app is now live at https://holilabs.xyz!**
