# 🚀 Deployment Guide

## Quick Deploy to DigitalOcean App Platform

### Step 1: Push to GitHub

```bash
# Create a new repo on GitHub: https://github.com/new
# Name it: holilabs-health-ai

# Then push your code:
git remote add origin https://github.com/YOUR_USERNAME/holilabs-health-ai.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to DigitalOcean

1. Go to https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Select **"GitHub"** as source
4. Authorize DigitalOcean to access your GitHub
5. Select repository: `holilabs-health-ai`
6. Branch: `main`
7. Click **"Next"**

### Step 3: Configure Build Settings

**App Name:** `holilabs-health-ai`

**Region:** Choose closest to your users (e.g., `nyc` for Americas)

**Build Command:**
```bash
pnpm install && cd apps/web && pnpm build
```

**Run Command:**
```bash
cd apps/web && node server.js
```

**HTTP Port:** `3000`

**Environment Variables:**
Add these in the DigitalOcean dashboard:

```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Step 4: Configure Database (Optional)

If you need the full backend:

1. Add a **PostgreSQL Dev Database** ($7/mo)
2. Add a **Redis** instance
3. Set environment variables:
   - `DATABASE_URL` (auto-filled by DO)
   - `REDIS_URL` (auto-filled by DO)

### Step 5: Deploy! 🎉

1. Click **"Next"** → **"Create Resources"**
2. Wait 5-10 minutes for build
3. Your app will be live at: `https://holilabs-health-ai-xxxxx.ondigitalocean.app`

### Step 6: Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add `holilabs.xyz`
3. Update DNS records at your domain provider:
   - CNAME: `www` → `holilabs-health-ai-xxxxx.ondigitalocean.app`
   - A: `@` → (DO provides IP)

---

## Alternative: Docker Deployment

If you prefer Docker on your droplet (129.212.184.190):

### Fix Firewall First

```bash
# On your DigitalOcean dashboard:
# Networking → Firewalls → Add Rule
# SSH (22) from your IP: YOUR_IP/32
```

### Then Deploy

```bash
# SSH into your server
ssh root@129.212.184.190

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone repo
git clone https://github.com/YOUR_USERNAME/holilabs-health-ai.git
cd holilabs-health-ai

# Build and run
docker build -t holilabs-web .
docker run -d -p 80:3000 --name holilabs holilabs-web
```

Your site will be live at `http://129.212.184.190`

---

## Estimated Costs

### DigitalOcean App Platform
- **Basic (512MB RAM, 1 vCPU):** $5/month
- **With Database:** $12/month total

### Droplet + Docker
- **Basic Droplet:** $6/month
- **Full control, more setup**

---

## Next Steps

1. **Push to GitHub** (see Step 1 above)
2. **Deploy to DO App Platform** (easiest, recommended)
3. **Share URL with Gemini** for UX feedback
4. **Monitor and iterate** based on feedback

Need help? The code is ready to deploy! 🚀
