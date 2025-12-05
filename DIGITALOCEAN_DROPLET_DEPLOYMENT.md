# DigitalOcean Droplet Deployment Guide

**Infrastructure**: DigitalOcean Droplet + DigitalOcean Managed Database + Cloudflare

---

## 📋 Infrastructure Overview

### Components
1. **DigitalOcean Droplet** - Ubuntu 22.04 LTS (2GB RAM minimum, 4GB recommended)
2. **DigitalOcean Managed PostgreSQL** - Database cluster
3. **Cloudflare** - DNS, SSL, CDN
4. **PM2** - Process manager for Node.js
5. **Nginx** - Reverse proxy
6. **Systemd Cron** - Background jobs (alternative to Vercel Cron)

---

## 🚀 Deployment Steps

### 1. DigitalOcean Managed Database Setup (5 min)

1. Create PostgreSQL database cluster in DigitalOcean
2. Get connection details from DigitalOcean dashboard
3. Update `.env` with production DATABASE_URL:

```bash
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

**Example from DigitalOcean:**
```bash
DATABASE_URL="postgresql://doadmin:AVNS_xyz@db-postgresql-nyc3-12345.ondigitalocean.com:25060/holi_protocol?sslmode=require"
```

**Important**: DigitalOcean uses SSL by default, ensure `sslmode=require` is in the URL.

---

### 2. Droplet Setup (10 min)

SSH into your droplet:

```bash
ssh root@your-droplet-ip
```

#### Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install certbot for SSL (if not using Cloudflare proxy)
apt install -y certbot python3-certbot-nginx
```

---

### 3. Application Deployment (15 min)

#### Clone Repository

```bash
cd /var/www
git clone https://github.com/your-org/holilabs.git
cd holilabs
```

#### Environment Variables

Create production `.env` file:

```bash
cd apps/web
nano .env
```

**Required variables:**

```bash
# Database (DigitalOcean Managed PostgreSQL)
DATABASE_URL="postgresql://doadmin:password@host:port/holi_protocol?sslmode=require"

# Redis (if needed - can use DigitalOcean Managed Redis)
REDIS_URL="redis://default:password@host:port"

# S3 Storage (Use DigitalOcean Spaces)
S3_ENDPOINT="https://nyc3.digitaloceanspaces.com"
S3_ACCESS_KEY_ID="your-spaces-key"
S3_SECRET_ACCESS_KEY="your-spaces-secret"
S3_BUCKET_NAME="holi-documents"
S3_REGION="nyc3"

# Authentication
NEXTAUTH_URL="https://app.holilabs.com"
NEXTAUTH_SECRET="<generate-with-openssl-rand-hex-32>"
JWT_SECRET="<generate-with-openssl-rand-hex-32>"

# AI Services
ANTHROPIC_API_KEY="sk-ant-your-key"
DEEPGRAM_API_KEY="your-deepgram-key"

# Email Service (Phase 2 - REQUIRED)
EMAIL_PROVIDER=resend
RESEND_API_KEY="re_xxxxxxxxxxxxx"
FROM_EMAIL="noreply@holilabs.com"
FROM_NAME="Holi Labs"

# Cron Security (Phase 2 - REQUIRED)
CRON_SECRET="<generate-with-openssl-rand-hex-32>"

# Automation Settings (Phase 2)
APPOINTMENT_REMINDER_HOURS=24
CONSENT_REMINDER_DAYS=7

# Application
NEXT_PUBLIC_APP_URL="https://app.holilabs.com"
NODE_ENV="production"
```

**Generate secrets:**
```bash
# Generate NEXTAUTH_SECRET
openssl rand -hex 32

# Generate JWT_SECRET
openssl rand -hex 32

# Generate CRON_SECRET
openssl rand -hex 32
```

---

#### Install Dependencies and Build

```bash
cd /var/www/holilabs

# Install dependencies
pnpm install

# Generate Prisma client
cd apps/web
npx prisma generate

# Run database migration
npx prisma db push

# Build application
cd /var/www/holilabs
pnpm build
```

---

### 4. PM2 Process Manager Setup (5 min)

Create PM2 ecosystem file:

```bash
nano /var/www/holilabs/ecosystem.config.js
```

**Content:**

```javascript
module.exports = {
  apps: [
    {
      name: 'holi-web',
      cwd: '/var/www/holilabs/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/holi-web-error.log',
      out_file: '/var/log/pm2/holi-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
    },
  ],
};
```

**Start application with PM2:**

```bash
cd /var/www/holilabs

# Create log directory
mkdir -p /var/log/pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Run the command it outputs
```

**PM2 Commands:**

```bash
pm2 status                # Check status
pm2 logs holi-web         # View logs
pm2 restart holi-web      # Restart app
pm2 reload holi-web       # Zero-downtime reload
pm2 monit                 # Monitor resources
```

---

### 5. Nginx Reverse Proxy Setup (10 min)

Create Nginx configuration:

```bash
nano /etc/nginx/sites-available/holilabs
```

**Content:**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name app.holilabs.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.holilabs.com;

    # SSL Configuration (Cloudflare Origin Certificates)
    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support (for real-time features)
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Client max body size (for file uploads)
    client_max_body_size 50M;
}
```

**Enable site:**

```bash
# Create symlink
ln -s /etc/nginx/sites-available/holilabs /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

### 6. Cloudflare Setup (5 min)

#### DNS Configuration

1. Go to Cloudflare dashboard
2. Add A record:
   - **Type**: A
   - **Name**: app (or @)
   - **IPv4 address**: Your DigitalOcean droplet IP
   - **Proxy status**: Proxied (orange cloud)
   - **TTL**: Auto

#### SSL/TLS Settings

1. Go to SSL/TLS → Overview
2. Set SSL/TLS encryption mode: **Full (strict)**
3. Go to SSL/TLS → Origin Server
4. Create Origin Certificate:
   - Click "Create Certificate"
   - Copy certificate and private key
   - Save to droplet:

```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/cert.pem
# Paste certificate

nano /etc/ssl/cloudflare/key.pem
# Paste private key

chmod 600 /etc/ssl/cloudflare/key.pem
```

#### Cloudflare Settings

1. **Speed → Optimization**
   - Enable Auto Minify (JS, CSS, HTML)
   - Enable Brotli compression

2. **Security → Settings**
   - Security Level: Medium
   - Challenge Passage: 30 minutes

3. **Firewall Rules** (Optional)
   - Block countries if needed
   - Rate limiting rules

---

### 7. Cron Jobs Setup (10 min)

Since we're not using Vercel, we need to set up system cron jobs to call the API endpoints.

#### Create Cron Script

```bash
nano /var/www/holilabs/cron-runner.sh
```

**Content:**

```bash
#!/bin/bash

# Load environment variables
export $(grep -v '^#' /var/www/holilabs/apps/web/.env | xargs)

# Base URL
BASE_URL="http://localhost:3000"

# Authorization header
AUTH_HEADER="Authorization: Bearer ${CRON_SECRET}"

# Function to call cron endpoint
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

# Run the specified cron job
case "$1" in
    email-queue)
        call_cron "/api/cron/process-email-queue" "Email Queue Processing"
        ;;
    appointment-reminders)
        call_cron "/api/cron/send-appointment-reminders" "Appointment Reminders"
        ;;
    consent-reminders)
        call_cron "/api/cron/send-consent-reminders" "Consent Reminders"
        ;;
    expire-consents)
        call_cron "/api/cron/expire-consents" "Expire Consents"
        ;;
    *)
        echo "Usage: $0 {email-queue|appointment-reminders|consent-reminders|expire-consents}"
        exit 1
        ;;
esac
```

**Make executable:**

```bash
chmod +x /var/www/holilabs/cron-runner.sh
```

#### Setup System Crontab

```bash
crontab -e
```

**Add these lines:**

```bash
# Holi Labs Cron Jobs
# Process email queue every 5 minutes
*/5 * * * * /var/www/holilabs/cron-runner.sh email-queue >> /var/log/holi-cron.log 2>&1

# Send appointment reminders every hour
0 * * * * /var/www/holilabs/cron-runner.sh appointment-reminders >> /var/log/holi-cron.log 2>&1

# Send consent reminders daily at 8 AM
0 8 * * * /var/www/holilabs/cron-runner.sh consent-reminders >> /var/log/holi-cron.log 2>&1

# Expire consents daily at midnight
0 0 * * * /var/www/holilabs/cron-runner.sh expire-consents >> /var/log/holi-cron.log 2>&1
```

**Create log file:**

```bash
touch /var/log/holi-cron.log
chmod 644 /var/log/holi-cron.log
```

**Monitor cron jobs:**

```bash
# View cron log
tail -f /var/log/holi-cron.log

# Check cron is running
systemctl status cron
```

---

### 8. DigitalOcean Spaces Setup (Optional - for file storage)

If using DigitalOcean Spaces instead of MinIO:

1. Create a Space in DigitalOcean dashboard
2. Generate Spaces access keys
3. Update `.env`:

```bash
S3_ENDPOINT="https://nyc3.digitaloceanspaces.com"
S3_ACCESS_KEY_ID="your-spaces-key"
S3_SECRET_ACCESS_KEY="your-spaces-secret"
S3_BUCKET_NAME="holi-documents"
S3_REGION="nyc3"
```

4. Configure CORS if needed:

```json
[
  {
    "AllowedOrigins": ["https://app.holilabs.com"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 🔄 Deployment Updates

When you need to deploy updates:

```bash
cd /var/www/holilabs

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Run migrations if needed
cd apps/web
npx prisma generate
npx prisma db push

# Rebuild
cd /var/www/holilabs
pnpm build

# Reload with zero downtime
pm2 reload holi-web
```

---

## 🔐 Security Hardening

### Firewall Setup

```bash
# Enable UFW firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# If using Cloudflare, restrict to Cloudflare IPs only (optional)
# See: https://www.cloudflare.com/ips/
```

### Automatic Security Updates

```bash
apt install unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

### Fail2Ban (Brute Force Protection)

```bash
apt install fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📊 Monitoring & Logs

### Application Logs

```bash
# PM2 logs
pm2 logs holi-web

# PM2 error logs only
pm2 logs holi-web --err

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log

# Cron job logs
tail -f /var/log/holi-cron.log
```

### System Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk usage
df -h

# Database connections
# (from DigitalOcean dashboard)
```

---

## 🆘 Troubleshooting

### Application Not Starting

```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs holi-web --err

# Check environment variables loaded
pm2 env holi-web

# Restart application
pm2 restart holi-web
```

### Database Connection Issues

```bash
# Test database connection
cd /var/www/holilabs/apps/web
npx prisma db pull

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Ensure SSL mode is set
# DATABASE_URL should end with: ?sslmode=require
```

### Nginx Issues

```bash
# Test configuration
nginx -t

# Check Nginx status
systemctl status nginx

# Restart Nginx
systemctl restart nginx

# Check error logs
tail -f /var/log/nginx/error.log
```

### Cron Jobs Not Running

```bash
# Check cron service
systemctl status cron

# View cron logs
tail -f /var/log/holi-cron.log

# Test cron script manually
/var/www/holilabs/cron-runner.sh email-queue

# Verify CRON_SECRET is set
cd /var/www/holilabs/apps/web
cat .env | grep CRON_SECRET
```

### SSL/Certificate Issues

```bash
# Check certificate files exist
ls -la /etc/ssl/cloudflare/

# Verify certificate
openssl x509 -in /etc/ssl/cloudflare/cert.pem -text -noout

# Check Nginx SSL configuration
nginx -t
```

---

## 📋 Production Checklist

### Before Going Live

- [ ] DigitalOcean Managed PostgreSQL created and accessible
- [ ] Droplet provisioned (Ubuntu 22.04, 4GB RAM recommended)
- [ ] Node.js, pnpm, PM2, Nginx installed
- [ ] Repository cloned to `/var/www/holilabs`
- [ ] Production `.env` file created with all required variables
- [ ] Database migration completed (`npx prisma db push`)
- [ ] Application built successfully (`pnpm build`)
- [ ] PM2 running application (`pm2 status` shows online)
- [ ] Nginx configured and running
- [ ] Cloudflare DNS pointing to droplet IP
- [ ] Cloudflare SSL set to Full (strict)
- [ ] Origin certificates installed on droplet
- [ ] Cron jobs configured in system crontab
- [ ] Cron script executable and tested
- [ ] Email provider (Resend) configured and API key added
- [ ] DigitalOcean Spaces configured (if using)
- [ ] All secrets generated (NEXTAUTH_SECRET, JWT_SECRET, CRON_SECRET)
- [ ] Firewall (UFW) enabled and configured
- [ ] PM2 startup script enabled
- [ ] Test application accessible at https://app.holilabs.com
- [ ] Test cron jobs manually
- [ ] Monitor logs for first hour

### Post-Launch Monitoring

- [ ] Check PM2 logs daily: `pm2 logs holi-web`
- [ ] Monitor cron job execution: `tail -f /var/log/holi-cron.log`
- [ ] Review Nginx logs for errors
- [ ] Check DigitalOcean database metrics
- [ ] Verify email sending in EmailQueue table
- [ ] Monitor droplet resources (CPU, RAM, disk)
- [ ] Set up DigitalOcean monitoring alerts
- [ ] Configure backup strategy for database

---

## 🔄 Backup Strategy

### Database Backups

DigitalOcean Managed Databases have automatic daily backups. To create manual backup:

```bash
# Install PostgreSQL client
apt install postgresql-client

# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to Spaces (if configured)
s3cmd put backup-*.sql s3://holi-backups/
```

### Application Backups

```bash
# Backup application directory
tar -czf /backups/holilabs-$(date +%Y%m%d).tar.gz /var/www/holilabs

# Backup .env file securely
cp /var/www/holilabs/apps/web/.env /root/.env.backup
chmod 600 /root/.env.backup
```

---

## 📈 Performance Optimization

### PM2 Clustering

Already configured in `ecosystem.config.js` with `instances: 'max'` to use all CPU cores.

### Nginx Caching (Optional)

Add to Nginx config for static assets:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location /_next/static/ {
    proxy_cache my_cache;
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### Database Connection Pooling

Prisma handles this automatically. Monitor connections in DigitalOcean dashboard.

---

## 📞 Support Resources

- **DigitalOcean Docs**: https://docs.digitalocean.com
- **Cloudflare Docs**: https://developers.cloudflare.com
- **PM2 Docs**: https://pm2.keymetrics.io/docs
- **Nginx Docs**: https://nginx.org/en/docs

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Droplet IP**: _______________
**Database Host**: _______________
