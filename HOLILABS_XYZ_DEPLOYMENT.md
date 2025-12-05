# 🚀 Holi Labs - holilabs.xyz Production Deployment Guide

**Target Domain:** holilabs.xyz
**Infrastructure:** DigitalOcean Droplet + Cloudflare DNS + Docker
**Last Updated:** December 1, 2025

---

## 📋 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN                          │
│              (DNS, SSL, DDoS Protection, WAF)               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│             DigitalOcean Droplet (Ubuntu 22.04)              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Nginx (Port 80/443)                                │   │
│  │  - SSL Termination (Cloudflare Origin Cert)        │   │
│  │  - Reverse Proxy                                    │   │
│  │  - Rate Limiting                                    │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────┼───────────────────────────────────────┐   │
│  │  Docker Services (docker-compose.prod.yml)          │   │
│  │                                                      │   │
│  │  • Web App (Next.js):3000                          │   │
│  │  • PostgreSQL:5432                                 │   │
│  │  • Redis:6379                                      │   │
│  │  • Meilisearch:7700                               │   │
│  │  • Presidio Analyzer:5001                         │   │
│  │  • Presidio Anonymizer:5002                       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔑 Prerequisites

### 1. DigitalOcean Droplet
- **Size:** 4GB RAM / 2 vCPU minimum (Basic Droplet $24/month)
- **OS:** Ubuntu 22.04 LTS
- **SSH Access:** Confirmed ✓
- **Firewall Rules:**
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS)

### 2. Cloudflare Account
- **Status:** Logged in via GitHub ✓
- **Organization:** holilabs / HolisticHealthcareLabs
- **Domain:** holilabs.xyz (ready to configure)

### 3. Required Credentials
- DigitalOcean droplet IP address
- SSH private key or password
- Cloudflare API token (for DNS management)

---

## 📦 Step 1: Initial Server Setup

### SSH into Your Droplet

```bash
# Replace with your droplet IP
ssh root@YOUR_DROPLET_IP

# Or if using SSH key
ssh -i ~/.ssh/your_key root@YOUR_DROPLET_IP
```

### Update System and Install Dependencies

```bash
# Update package lists
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose V2
apt install docker-compose-plugin -y

# Verify installations
docker --version
docker compose version

# Install additional tools
apt install -y git curl wget nginx certbot ufw

# Enable firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## 🌐 Step 2: Cloudflare DNS Configuration

### A. Add DNS Records in Cloudflare

1. Log into Cloudflare Dashboard: https://dash.cloudflare.com
2. Select **holilabs.xyz** domain
3. Go to **DNS** → **Records**
4. Add the following records:

**Main Domain:**
```
Type: A
Name: @
Content: YOUR_DROPLET_IP
Proxy Status: Proxied (orange cloud)
TTL: Auto
```

**WWW Subdomain:**
```
Type: CNAME
Name: www
Content: holilabs.xyz
Proxy Status: Proxied (orange cloud)
TTL: Auto
```

**API Subdomain (optional, for future separation):**
```
Type: A
Name: api
Content: YOUR_DROPLET_IP
Proxy Status: Proxied (orange cloud)
TTL: Auto
```

### B. Configure SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to: **Full (strict)**
3. Go to **SSL/TLS** → **Edge Certificates**
4. Enable:
   - ✓ Always Use HTTPS
   - ✓ Automatic HTTPS Rewrites
   - ✓ Minimum TLS Version: 1.2

### C. Get Cloudflare Origin Certificate

1. Go to **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. Select:
   - Private key type: **RSA (2048)**
   - Hostnames: `holilabs.xyz` and `*.holilabs.xyz`
   - Certificate Validity: **15 years**
4. Click **Create**
5. Copy both:
   - **Origin Certificate** (save as `origin-cert.pem`)
   - **Private Key** (save as `origin-key.pem`)

### D. Configure Cloudflare Security

1. **Firewall Rules:**
   - Go to **Security** → **WAF**
   - Enable **OWASP Core Ruleset**
   - Create rule: "Block non-US traffic" (if US-only service)

2. **Rate Limiting:**
   - Go to **Security** → **Bots**
   - Enable **Bot Fight Mode**

3. **Page Rules** (optional):
   - Cache everything for static assets
   - Always use HTTPS

---

## 🔒 Step 3: Generate Production Secrets

On your local machine, generate all required secrets:

```bash
# Session secret (64 chars)
openssl rand -hex 32

# NextAuth secret (64 chars)
openssl rand -hex 32

# JWT secret (64 chars)
openssl rand -hex 32

# Encryption key for PHI (base64)
openssl rand -base64 32

# Redis password
openssl rand -hex 32

# PostgreSQL password
openssl rand -hex 32

# Meilisearch master key
openssl rand -hex 32
```

**⚠️ CRITICAL:** Save these in a secure password manager. Never commit to Git!

---

## 📂 Step 4: Deploy Application Files

### A. Clone Repository on Server

```bash
# On the droplet
cd /opt
git clone https://github.com/YOUR_USERNAME/holilabsv2.git holi-labs
cd holi-labs

# Or if using SSH
git clone git@github.com:YOUR_USERNAME/holilabsv2.git holi-labs
```

### B. Create Production Environment File

```bash
cd /opt/holi-labs

# Create .env.production file
nano .env.production
```

**Paste this configuration (update values):**

```bash
# ============================================================================
# NODE ENVIRONMENT
# ============================================================================
NODE_ENV=production
PORT=3000
NODE_OPTIONS="--max-old-space-size=512"

# ============================================================================
# DATABASE (PostgreSQL in Docker)
# ============================================================================
POSTGRES_USER=holi
POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
POSTGRES_DB=holi_protocol
DATABASE_URL="postgresql://holi:YOUR_POSTGRES_PASSWORD_HERE@postgres:5432/holi_protocol?schema=public"

# ============================================================================
# REDIS
# ============================================================================
REDIS_PASSWORD=YOUR_REDIS_PASSWORD_HERE
REDIS_URL="redis://:YOUR_REDIS_PASSWORD_HERE@redis:6379"

# ============================================================================
# MEILISEARCH
# ============================================================================
MEILI_MASTER_KEY=YOUR_MEILISEARCH_KEY_HERE
MEILI_HOST=http://meilisearch:7700

# ============================================================================
# AUTHENTICATION & SECURITY
# ============================================================================
NEXTAUTH_URL=https://holilabs.xyz
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET_HERE
SESSION_SECRET=YOUR_SESSION_SECRET_HERE
JWT_SECRET=YOUR_JWT_SECRET_HERE

# Encryption for PHI
ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY_BASE64_HERE
ENCRYPTION_MASTER_KEY=YOUR_MASTER_KEY_BASE64_HERE

# De-identification secret
DEID_SECRET=YOUR_DEID_SECRET_HERE

# ============================================================================
# SUPABASE (File Storage + Auth)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://yyteqajwjjrubiktornb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dGVxYWp3ampydWJpa3Rvcm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2ODE4MTksImV4cCI6MjA3NTI1NzgxOX0.b4FmPeZniO4D5Xm3_F10svynPBZYwKtJwDcBP94qq-4
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

# ============================================================================
# AI SERVICES
# ============================================================================
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY_HERE
DEEPGRAM_API_KEY=YOUR_DEEPGRAM_KEY_HERE

# ============================================================================
# EMAIL (Resend)
# ============================================================================
RESEND_API_KEY=YOUR_RESEND_KEY_HERE

# ============================================================================
# SMS & WHATSAPP (Twilio) - Optional
# ============================================================================
TWILIO_ACCOUNT_SID=YOUR_TWILIO_SID_HERE
TWILIO_AUTH_TOKEN=YOUR_TWILIO_TOKEN_HERE
TWILIO_PHONE_NUMBER=YOUR_TWILIO_NUMBER_HERE
TWILIO_WHATSAPP_NUMBER=YOUR_TWILIO_WHATSAPP_HERE

# ============================================================================
# MONITORING & ANALYTICS
# ============================================================================
NEXT_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN_HERE
SENTRY_AUTH_TOKEN=YOUR_SENTRY_TOKEN_HERE
SENTRY_ORG=your-org
SENTRY_PROJECT=holi-labs

NEXT_PUBLIC_POSTHOG_KEY=YOUR_POSTHOG_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# ============================================================================
# FEATURE FLAGS
# ============================================================================
ENABLE_BLOCKCHAIN=false
ENABLE_IPFS=false

# ============================================================================
# PRESIDIO (De-identification)
# ============================================================================
PRESIDIO_ANALYZER_URL=http://presidio-analyzer:5001
PRESIDIO_ANONYMIZER_URL=http://presidio-anonymizer:5002
PRESIDIO_TIMEOUT_MS=8000

# ============================================================================
# LOGGING
# ============================================================================
LOG_LEVEL=info
```

Save file: `Ctrl+X` → `Y` → `Enter`

### C. Set File Permissions

```bash
chmod 600 .env.production
chown root:root .env.production
```

---

## 🐳 Step 5: Configure Nginx Reverse Proxy

### A. Create Nginx Configuration

```bash
# Stop default Nginx (if running)
systemctl stop nginx

# Create Nginx config for Holi Labs
nano /etc/nginx/sites-available/holilabs
```

**Paste this configuration:**

```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name holilabs.xyz www.holilabs.xyz;

    # Cloudflare real IP
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2a06:98c0::/29;
    set_real_ip_from 2c0f:f248::/32;
    real_ip_header CF-Connecting-IP;

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS - Main Application
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name holilabs.xyz www.holilabs.xyz;

    # SSL Certificates (Cloudflare Origin)
    ssl_certificate /opt/holi-labs/ssl/origin-cert.pem;
    ssl_certificate_key /opt/holi-labs/ssl/origin-key.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Cloudflare real IP
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client settings
    client_max_body_size 10M;

    # Proxy to Docker container
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

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Longer timeout for AI processing
        proxy_read_timeout 120s;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/api/health;
    }
}
```

Save file: `Ctrl+X` → `Y` → `Enter`

### B. Create SSL Directory and Add Certificates

```bash
# Create SSL directory
mkdir -p /opt/holi-labs/ssl
cd /opt/holi-labs/ssl

# Create origin certificate file
nano origin-cert.pem
# Paste the Origin Certificate from Cloudflare (Step 2.C)

# Create private key file
nano origin-key.pem
# Paste the Private Key from Cloudflare (Step 2.C)

# Set secure permissions
chmod 600 origin-*.pem
chown root:root origin-*.pem
```

### C. Enable Nginx Configuration

```bash
# Create symlink
ln -s /etc/nginx/sites-available/holilabs /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Should output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Start Nginx
systemctl enable nginx
systemctl start nginx
```

---

## 🚢 Step 6: Deploy Docker Services

### A. Build and Start Services

```bash
cd /opt/holi-labs

# Load environment variables
export $(cat .env.production | xargs)

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                          STATUS          PORTS
holi-web-prod                 Up             0.0.0.0:3000->3000/tcp
holi-postgres-prod            Up (healthy)   0.0.0.0:5432->5432/tcp
holi-redis-prod               Up (healthy)   0.0.0.0:6379->6379/tcp
holi-meilisearch-prod         Up (healthy)   0.0.0.0:7700->7700/tcp
holi-presidio-analyzer        Up (healthy)   0.0.0.0:5001->5001/tcp
holi-presidio-anonymizer      Up (healthy)   0.0.0.0:5002->5002/tcp
```

### B. Run Database Migrations

```bash
# Enter the web container
docker compose -f docker-compose.prod.yml exec web sh

# Run Prisma migrations
npx prisma migrate deploy

# Seed initial data (if needed)
npx prisma db seed

# Exit container
exit
```

---

## ✅ Step 7: Verify Deployment

### A. Test from Local Machine

```bash
# Test HTTP to HTTPS redirect
curl -I http://holilabs.xyz

# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://holilabs.xyz/

# Test HTTPS endpoint
curl -I https://holilabs.xyz

# Should return: HTTP/2 200

# Test health endpoint
curl https://holilabs.xyz/api/health

# Expected: {"status":"ok","database":"connected","timestamp":"..."}
```

### B. Browser Tests

1. Open https://holilabs.xyz
2. Check SSL certificate (should show "Cloudflare" issuer)
3. Test login functionality
4. Create a test patient
5. Verify AI clinical note generation works

### C. Check Logs

```bash
# View application logs
docker compose -f docker-compose.prod.yml logs web --tail=100 -f

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Check container health
docker compose -f docker-compose.prod.yml ps
```

---

## 📱 Step 8: Create Landing Page

Now let's create a simple landing page for holilabs.xyz:

```bash
# Create public directory for landing page
mkdir -p /opt/holi-labs/public/landing
cd /opt/holi-labs/public/landing

# Create index.html
nano index.html
```

**Landing page will be created in next step...**

---

## 🔄 Step 9: Maintenance and Updates

### A. Update Application

```bash
cd /opt/holi-labs

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations (if any)
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

### B. Backup Database

```bash
# Create backup directory
mkdir -p /opt/holi-labs/backups

# Backup PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U holi holi_protocol > /opt/holi-labs/backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Compress backup
gzip /opt/holi-labs/backups/backup-*.sql

# Keep only last 7 days of backups
find /opt/holi-labs/backups -name "backup-*.sql.gz" -mtime +7 -delete
```

### C. Monitor Resources

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check Docker stats
docker stats --no-stream

# View system logs
journalctl -u docker -f
```

---

## 🚨 Troubleshooting

### Issue: Docker containers won't start

```bash
# Check Docker daemon
systemctl status docker

# View container logs
docker compose -f docker-compose.prod.yml logs

# Restart services
docker compose -f docker-compose.prod.yml restart
```

### Issue: 502 Bad Gateway

```bash
# Check if web container is running
docker compose -f docker-compose.prod.yml ps web

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### Issue: Database connection failed

```bash
# Check PostgreSQL container
docker compose -f docker-compose.prod.yml logs postgres

# Test connection
docker compose -f docker-compose.prod.yml exec postgres psql -U holi -d holi_protocol -c "SELECT NOW();"
```

### Issue: SSL certificate errors

```bash
# Verify Cloudflare origin certificates
openssl x509 -in /opt/holi-labs/ssl/origin-cert.pem -text -noout

# Check Nginx SSL configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## 📊 Monitoring Checklist

Daily:
- [ ] Check application logs for errors
- [ ] Verify all Docker containers are running
- [ ] Test health endpoint

Weekly:
- [ ] Review Sentry error reports
- [ ] Check PostHog analytics
- [ ] Verify database backups
- [ ] Review Nginx access logs

Monthly:
- [ ] Update system packages: `apt update && apt upgrade`
- [ ] Update Docker images: `docker compose pull`
- [ ] Review and rotate secrets
- [ ] HIPAA compliance audit

---

## 📞 Support Resources

**Cloudflare Dashboard:** https://dash.cloudflare.com
**DigitalOcean Console:** https://cloud.digitalocean.com
**Docker Documentation:** https://docs.docker.com
**Nginx Documentation:** https://nginx.org/en/docs

---

**Version:** 1.0
**Last Updated:** December 1, 2025
**Next Review:** January 1, 2026
