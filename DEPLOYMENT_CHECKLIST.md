# Deployment Checklist - DigitalOcean + Cloudflare

**Quick reference for deploying Holi Labs to production**

---

## 🎯 What You Need Before Deploying

### 1. Email Service (CRITICAL)
- [ ] Create account at [Resend.com](https://resend.com) (recommended)
- [ ] Verify your domain (holilabs.com)
- [ ] Get API key from dashboard
- [ ] Add to `.env`: `RESEND_API_KEY=re_xxxxx`

**Alternatives**: SendGrid, AWS SES, or SMTP (see `.env.example`)

---

### 2. DigitalOcean Managed Database (CRITICAL)
- [ ] Create PostgreSQL cluster in DigitalOcean
- [ ] Note connection string (includes `sslmode=require`)
- [ ] Add to `.env`: `DATABASE_URL="postgresql://..."`

**Example format:**
```
DATABASE_URL="postgresql://doadmin:password@db-postgresql-nyc3-12345.ondigitalocean.com:25060/holi_protocol?sslmode=require"
```

---

### 3. DigitalOcean Droplet (CRITICAL)
- [ ] Create Ubuntu 22.04 droplet (4GB RAM recommended)
- [ ] Note the IP address
- [ ] SSH access configured

---

### 4. Cloudflare (CRITICAL for SSL)
- [ ] Domain added to Cloudflare
- [ ] A record pointing to droplet IP
- [ ] SSL set to "Full (strict)"
- [ ] Origin certificate generated and downloaded

---

### 5. Required Environment Variables

Generate these secrets **before** deployment:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -hex 32

# Generate JWT_SECRET
openssl rand -hex 32

# Generate CRON_SECRET
openssl rand -hex 32
```

**Add to production `.env`:**
```bash
# Authentication
NEXTAUTH_SECRET="<generated-secret>"
JWT_SECRET="<generated-secret>"

# Email
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_xxxxx"
FROM_EMAIL="noreply@holilabs.com"
FROM_NAME="Holi Labs"

# Cron Security
CRON_SECRET="<generated-secret>"

# URLs
NEXTAUTH_URL="https://app.holilabs.com"
NEXT_PUBLIC_APP_URL="https://app.holilabs.com"
```

---

## 📋 Step-by-Step Deployment

### Phase 1: Setup Infrastructure (30 min)

**On your droplet (via SSH):**

```bash
# 1. Install Node.js, pnpm, PM2, Nginx
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx
npm install -g pnpm pm2

# 2. Clone repository
cd /var/www
git clone https://github.com/your-org/holilabs.git
cd holilabs

# 3. Create production .env file
cd apps/web
nano .env
# Paste all production environment variables

# 4. Install dependencies
cd /var/www/holilabs
pnpm install

# 5. Generate Prisma client and run migration
cd apps/web
npx prisma generate
npx prisma db push

# 6. Build application
cd /var/www/holilabs
pnpm build
```

---

### Phase 2: Configure PM2 (10 min)

**Create ecosystem file:**

```bash
nano /var/www/holilabs/ecosystem.config.js
```

**Paste this:**
```javascript
module.exports = {
  apps: [{
    name: 'holi-web',
    cwd: '/var/www/holilabs/apps/web',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
    error_file: '/var/log/pm2/holi-web-error.log',
    out_file: '/var/log/pm2/holi-web-out.log',
    max_memory_restart: '1G',
  }],
};
```

**Start application:**
```bash
mkdir -p /var/log/pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd  # Run the command it outputs
```

---

### Phase 3: Configure Nginx (10 min)

**Create Nginx config:**

```bash
nano /etc/nginx/sites-available/holilabs
```

**Paste this** (see full config in `DIGITALOCEAN_DROPLET_DEPLOYMENT.md`):
```nginx
server {
    listen 80;
    server_name app.holilabs.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.holilabs.com;

    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

**Install Cloudflare certificates:**
```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/cert.pem  # Paste certificate
nano /etc/ssl/cloudflare/key.pem   # Paste private key
chmod 600 /etc/ssl/cloudflare/key.pem
```

**Enable site:**
```bash
ln -s /etc/nginx/sites-available/holilabs /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

### Phase 4: Setup Cron Jobs (10 min)

**Create cron script:**

```bash
nano /var/www/holilabs/cron-runner.sh
```

**Paste this:**
```bash
#!/bin/bash
export $(grep -v '^#' /var/www/holilabs/apps/web/.env | xargs)
BASE_URL="http://localhost:3000"
AUTH_HEADER="Authorization: Bearer ${CRON_SECRET}"

call_cron() {
    local endpoint=$1
    local job_name=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running ${job_name}..."
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${BASE_URL}${endpoint}" \
        -H "${AUTH_HEADER}" \
        -H "Content-Type: application/json")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    if [ "$http_code" -eq 200 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ ${job_name} completed: ${body}"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ${job_name} failed (HTTP ${http_code}): ${body}"
    fi
}

case "$1" in
    email-queue) call_cron "/api/cron/process-email-queue" "Email Queue" ;;
    appointment-reminders) call_cron "/api/cron/send-appointment-reminders" "Appointment Reminders" ;;
    consent-reminders) call_cron "/api/cron/send-consent-reminders" "Consent Reminders" ;;
    expire-consents) call_cron "/api/cron/expire-consents" "Expire Consents" ;;
    *) echo "Usage: $0 {email-queue|appointment-reminders|consent-reminders|expire-consents}"; exit 1 ;;
esac
```

**Make executable:**
```bash
chmod +x /var/www/holilabs/cron-runner.sh
```

**Add to crontab:**
```bash
crontab -e
```

**Paste these lines:**
```bash
# Holi Labs Cron Jobs
*/5 * * * * /var/www/holilabs/cron-runner.sh email-queue >> /var/log/holi-cron.log 2>&1
0 * * * * /var/www/holilabs/cron-runner.sh appointment-reminders >> /var/log/holi-cron.log 2>&1
0 8 * * * /var/www/holilabs/cron-runner.sh consent-reminders >> /var/log/holi-cron.log 2>&1
0 0 * * * /var/www/holilabs/cron-runner.sh expire-consents >> /var/log/holi-cron.log 2>&1
```

**Create log file:**
```bash
touch /var/log/holi-cron.log
chmod 644 /var/log/holi-cron.log
```

---

### Phase 5: Cloudflare Configuration (5 min)

**In Cloudflare dashboard:**

1. **DNS Settings:**
   - Add A record: `app` → Your droplet IP
   - Proxy status: Proxied (orange cloud) ☁️

2. **SSL/TLS:**
   - Set encryption mode: **Full (strict)**
   - Generate Origin Certificate
   - Copy certificate and key to droplet (already done in Phase 3)

3. **Speed Settings:**
   - Enable Auto Minify (JS, CSS, HTML)
   - Enable Brotli compression

4. **Security:**
   - Set Security Level: Medium
   - Challenge Passage: 30 minutes

---

## ✅ Verification Steps

### 1. Test Application Access
```bash
# Should return HTML
curl https://app.holilabs.com
```

### 2. Test PM2
```bash
pm2 status  # Should show "online"
pm2 logs holi-web  # Check for errors
```

### 3. Test Database Connection
```bash
cd /var/www/holilabs/apps/web
npx prisma db pull  # Should succeed
```

### 4. Test Cron Jobs Manually
```bash
/var/www/holilabs/cron-runner.sh email-queue
# Should return: ✅ Email Queue completed
```

### 5. Test Email Sending
```bash
curl -X POST http://localhost:3000/api/cron/process-email-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
# Should return: {"success":true,"processed":0,"failed":0}
```

### 6. Monitor Logs
```bash
# Application logs
pm2 logs holi-web

# Nginx logs
tail -f /var/log/nginx/error.log

# Cron logs
tail -f /var/log/holi-cron.log
```

---

## 🚨 Critical Environment Variables Summary

**Minimum required for production:**

```bash
# Database
DATABASE_URL="postgresql://..."  # From DigitalOcean

# Authentication
NEXTAUTH_SECRET="..."  # Generated
JWT_SECRET="..."       # Generated
NEXTAUTH_URL="https://app.holilabs.com"

# Email (Phase 2)
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_..."  # From Resend
FROM_EMAIL="noreply@holilabs.com"
FROM_NAME="Holi Labs"

# Cron Security (Phase 2)
CRON_SECRET="..."  # Generated

# Application
NEXT_PUBLIC_APP_URL="https://app.holilabs.com"
NODE_ENV="production"

# AI Services
ANTHROPIC_API_KEY="sk-ant-..."
```

---

## 📊 What Happens After Deployment

### Automated Systems Running:
1. ✅ **Email Queue** - Processes 50 emails every 5 minutes
2. ✅ **Appointment Reminders** - Sends reminders 24 hours before appointments (every hour)
3. ✅ **Consent Reminders** - Sends reminders 7 days before expiration (daily 8am)
4. ✅ **Consent Expiration** - Auto-expires outdated consents (daily midnight)

### User Workflows:
1. ✅ Doctor creates patient → Default consent auto-created
2. ✅ Patient logs in → Full portal access
3. ✅ Patient manages consents → Privacy page functional
4. ✅ AI generates SOAP notes → With confidence scoring
5. ✅ CDS alerts clinicians → Drug interactions, protocols
6. ✅ Mobile apps work offline → Sync when online

---

## 🔄 Deploying Updates

```bash
cd /var/www/holilabs
git pull origin main
pnpm install
cd apps/web && npx prisma generate && npx prisma db push
cd /var/www/holilabs && pnpm build
pm2 reload holi-web  # Zero-downtime reload
```

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| App not accessible | Check `pm2 status`, `nginx -t`, firewall |
| 502 Bad Gateway | Check PM2 is running: `pm2 restart holi-web` |
| Database errors | Verify `DATABASE_URL` has `sslmode=require` |
| Emails not sending | Check `RESEND_API_KEY`, test with curl |
| Cron jobs not running | Check `/var/log/holi-cron.log`, verify `CRON_SECRET` |
| SSL errors | Verify Cloudflare certificates in `/etc/ssl/cloudflare/` |

---

## 📚 Full Documentation

- **Complete Guide**: `DIGITALOCEAN_DROPLET_DEPLOYMENT.md`
- **Feature Summary**: `DEPLOYMENT_READY_STATUS.md`
- **Environment Variables**: `.env.example`

---

## ✅ Final Pre-Launch Checklist

- [ ] All environment variables set in production `.env`
- [ ] Database migration completed (`npx prisma db push`)
- [ ] Application builds successfully (`pnpm build`)
- [ ] PM2 running and set to auto-start (`pm2 startup`)
- [ ] Nginx configured and SSL working
- [ ] Cloudflare DNS pointing to droplet
- [ ] Cron jobs configured in crontab
- [ ] Email provider configured and tested
- [ ] Test application at `https://app.holilabs.com`
- [ ] Monitor logs for first hour

**Estimated Total Deployment Time**: 60-90 minutes

---

**Status**: Ready for deployment ✅
**Last Updated**: December 3, 2025
