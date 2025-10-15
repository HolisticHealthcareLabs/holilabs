# 🚀 Quick Start: Deploy to DigitalOcean in 30 Minutes

## What You'll Do
1. ✅ Create DigitalOcean PostgreSQL database (5 min)
2. ✅ Create DigitalOcean App from GitHub (10 min)
3. ✅ Add environment variables (5 min)
4. ✅ Configure DNS in Porkbun (5 min)
5. ✅ Wait for deployment + SSL (5 min)

---

## Step 1: Create PostgreSQL Database (5 minutes)

1. Go to [DigitalOcean Databases](https://cloud.digitalocean.com/databases)
2. Click **"Create Database Cluster"**
3. Choose:
   - **Database Engine:** PostgreSQL 15
   - **Plan:** Basic ($15/month) or Starter ($7/month)
   - **Datacenter:** New York 1 (or closest to your users)
   - **Database name:** `holi-labs-prod`
4. Click **"Create Database Cluster"**
5. **Wait 2-3 minutes** for database to provision
6. Click **"Connection Details"** → Copy the **Connection String**
   - Should look like: `postgresql://doadmin:XXXXX@db-postgresql-nyc1-12345.ondigitalocean.com:25060/defaultdb?sslmode=require`
7. **Save this** - you'll need it in Step 3

---

## Step 2: Create App from GitHub (10 minutes)

### 2.1 Connect GitHub

1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Choose **"GitHub"** as source
4. Click **"Manage Access"** → Authorize DigitalOcean
5. Select repository: **`vidabanq-health-ai`**
6. Select branch: **`main`**
7. Check **"Autodeploy"** (✅ checked)
8. Click **"Next"**

### 2.2 Configure Resources

DigitalOcean will auto-detect your Next.js app:

- **Type:** Web Service
- **Source Directory:** `/` (root)
- **Build Command:** Auto-detected from `.do/app.yaml`
- **Run Command:** Auto-detected from `.do/app.yaml`

Click **"Next"**

### 2.3 Choose Plan

- **Plan:** Basic ($12/month) - 1 GB RAM, 1 vCPU
- **Containers:** 1

Click **"Next"**

### 2.4 Name Your App

- **App Name:** `holi-labs`
- **Region:** New York (same as database)

Click **"Next"**

---

## Step 3: Add Environment Variables (5 minutes)

**IMPORTANT:** Don't deploy yet! Add environment variables first.

1. Before clicking "Create Resources", go to **"Environment Variables"** section
2. Click **"Edit"** or **"Add Variable"**
3. **Open the file** `PRODUCTION_SECRETS.txt` in your project
4. Add each variable **one by one** from that file:

### Required Variables (copy from PRODUCTION_SECRETS.txt):

```bash
# Security (REQUIRED)
NEXTAUTH_SECRET=ug8H38nV9FU6UXEMzAHUCMNm7kmxDmP4GHKuhN6zfYk=
ENCRYPTION_KEY=627489027106db5d9c3dd4482b5bfc4a3d0857c252086933fbcc46a1c0ef4c83
DEID_SECRET=8e8599dc18fb3ddfebf0831ec1ff44dea83f356eb88fdeba8685bdfb7939154b

# Database (paste connection string from Step 1)
DATABASE_URL=postgresql://doadmin:XXXXX@db-postgresql-nyc1-12345.ondigitalocean.com:25060/defaultdb?sslmode=require

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yyteqajwjjrubiktornb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

# AI Services
ASSEMBLYAI_API_KEY=7c91616a78b2492ab808c14b6f0a9600
GOOGLE_AI_API_KEY=AIzaSyCy7CTGP0Wp0zaYHrd2pmhGpt2AknsVIM8

# Email
RESEND_API_KEY=re_SEBRpWwx_PVp8TJ5NY6GSbaXrhi8dXwhJ

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPgdD0ETGgvkFq0yV3jyRcIoq725bXPbytjUQxmO5LQt5OOG4GH5bx9hyLf5Vr3m9bnzKIwAnyEciPqaK87qalw
VAPID_PRIVATE_KEY=JIiusRQIKGIduu_7_j0GEjESSRw2VJLQASKTB6a_2yk
VAPID_EMAIL=mailto:notifications@holilabs.xyz

# App URLs
NEXT_PUBLIC_APP_URL=https://holilabs.xyz
NEXTAUTH_URL=https://holilabs.xyz

# Blockchain (disabled)
ENABLE_BLOCKCHAIN=false
```

**Pro Tip:** Mark sensitive values as **"Encrypt"** (🔒 icon)

---

## Step 4: Deploy App (Click Button!)

1. Scroll to bottom
2. Click **"Create Resources"**
3. ☕ **Wait 5-10 minutes** for initial build
4. Watch **"Build Logs"** tab for progress

**You should see:**
```
✓ Building...
✓ Installing dependencies...
✓ Running build command...
✓ Compiled successfully
✓ Build complete!
✓ Deploying...
✓ Deployed to: https://holi-labs-xxxxx.ondigitalocean.app
```

---

## Step 5: Configure Domain in Porkbun (5 minutes)

### 5.1 Get IP Address from DigitalOcean

1. In your app dashboard, go to **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter: `holilabs.xyz`
4. Click **"Add Domain"**
5. DigitalOcean will show you the **IP address** to use
   - Example: `143.198.123.45`
6. **Copy this IP address**

### 5.2 Configure DNS in Porkbun

1. Log in to [Porkbun](https://porkbun.com/account/domainsSpeedy)
2. Find **holilabs.xyz** → Click **"DNS"**
3. **Delete any existing A or CNAME records** for @ and www

**Add Record 1: Root domain**
```
Type: A
Host: @ (or leave blank)
Answer: 143.198.123.45 (IP from DigitalOcean)
TTL: 600
```

**Add Record 2: WWW subdomain**
```
Type: CNAME
Host: www
Answer: holilabs.xyz
TTL: 600
```

4. Click **"Submit"** for each record
5. **Wait 5-15 minutes** for DNS propagation

### 5.3 Verify DNS

```bash
# Check if DNS is working
dig holilabs.xyz

# Should return the DigitalOcean IP address
```

Or visit: https://dnschecker.org/#A/holilabs.xyz

---

## Step 6: Wait for SSL Certificate (5-15 minutes)

DigitalOcean automatically provisions SSL certificates via Let's Encrypt.

1. Go to **Settings → Domains**
2. Look for **green checkmark** ✅ next to `holilabs.xyz`
3. This means SSL is active!

**If it says "Pending":**
- Wait 5-15 minutes
- DNS must propagate first
- Check DNS with `dig holilabs.xyz`

---

## Step 7: Run Database Migrations

After first deployment, run Prisma migrations:

### Option A: Via DigitalOcean Console

1. Go to your app → **"Console"** tab
2. Click **"Launch Console"**
3. Run:
   ```bash
   cd apps/web
   pnpm prisma migrate deploy
   pnpm db:seed
   ```

### Option B: Via Local Terminal

```bash
# Temporarily set production DATABASE_URL
export DATABASE_URL="postgresql://doadmin:XXXXX@your-db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# Run migrations
cd apps/web
pnpm prisma migrate deploy
pnpm db:seed
```

---

## Step 8: Test Your Deployment! 🎉

Visit: **https://holilabs.xyz**

**Test checklist:**
- [ ] ✅ Site loads (green padlock in browser)
- [ ] ✅ Login page appears
- [ ] ✅ Can create clinician account
- [ ] ✅ Dashboard loads
- [ ] ✅ Can add patient
- [ ] ✅ SOAP note creation works
- [ ] ✅ Pain assessment tracking works
- [ ] ✅ Email notifications work

---

## Troubleshooting

### Build fails: "Module not found"

**Fix:** Clear build cache:
1. Go to **Settings → Build Phase**
2. Click **"Clear Cache"**
3. Click **"Force Rebuild"**

### Database connection error

**Check:**
- `DATABASE_URL` ends with `?sslmode=require`
- Database is running (green checkmark in Databases section)
- Firewall allows connections (should be automatic)

### SSL certificate stuck on "Pending"

**Check DNS:**
```bash
dig holilabs.xyz
```

Should return DigitalOcean IP. If not:
- Check Porkbun DNS records
- Wait 15 more minutes
- Try `dig @8.8.8.8 holilabs.xyz` (force Google DNS)

### App crashes: "Cannot find module 'sharp'"

**Fix:** Add to environment variables:
```bash
NEXT_SHARP_PATH=/app/apps/web/node_modules/sharp
```

---

## Costs Summary

**Monthly Costs:**
- App Platform (Basic): $12/month
- PostgreSQL Database (Basic): $15/month
- **Total: $27/month**

**Cheaper option:**
- App Platform (Starter): $5/month
- External DB (Supabase free): $0/month
- **Total: $5/month**

---

## Auto-Deployment

✅ **Already configured!**

Every `git push` to `main` triggers automatic deployment:
```bash
git add .
git commit -m "Update feature"
git push origin main
# DigitalOcean automatically deploys in 3-5 minutes
```

---

## What's Next?

1. ✅ Set up monitoring (Settings → Alerts)
2. ✅ Enable automatic database backups (already on)
3. ✅ Add Sentry for error tracking
4. ✅ Run Lighthouse performance audit
5. ✅ Train Pequeno Cotolêngo staff
6. ✅ Start 2-week pilot!

---

## Need Help?

- **Full Guide:** See `DIGITALOCEAN_DEPLOYMENT.md`
- **Secrets File:** See `PRODUCTION_SECRETS.txt`
- **Support:** https://cloud.digitalocean.com/support

---

**🎉 Congratulations! Your app is live at https://holilabs.xyz**
