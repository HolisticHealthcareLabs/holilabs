# SSL/TLS Setup Guide

## Overview

This guide covers SSL/TLS certificate setup for production deployment with security best practices. HoliLabs requires HTTPS enforcement with HSTS headers for HIPAA compliance and data security.

## Current Status

- **HSTS Headers**: ✅ Already configured in `/apps/web/src/lib/security-headers.ts`
- **HTTPS Enforcement**: ✅ Middleware includes `upgrade-insecure-requests` CSP directive
- **Target SSL Grade**: A+ (SSL Labs)
- **TLS Version**: TLS 1.2+ only (no SSLv3, TLS 1.0, TLS 1.1)

---

## Table of Contents

1. [Certificate Options](#certificate-options)
2. [Let's Encrypt Setup (Recommended)](#lets-encrypt-setup-recommended)
3. [Certificate Installation](#certificate-installation)
4. [Auto-Renewal Configuration](#auto-renewal-configuration)
5. [HTTPS Enforcement](#https-enforcement)
6. [Testing & Validation](#testing--validation)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Troubleshooting](#troubleshooting)

---

## Certificate Options

### Option 1: Let's Encrypt (Recommended)

**Pros**:
- Free
- Automated renewal
- Trusted by all major browsers
- 90-day validity (forces good renewal practices)

**Cons**:
- Requires domain validation
- 90-day renewal cycle (automated)

**Use Case**: Production deployments, staging environments

### Option 2: Cloudflare SSL

**Pros**:
- Free with Cloudflare
- Automatic setup
- Universal SSL certificate
- DDoS protection included

**Cons**:
- Must use Cloudflare DNS
- End-to-end encryption requires origin certificate

**Use Case**: Sites using Cloudflare CDN

### Option 3: Commercial Certificate (e.g., DigiCert, Sectigo)

**Pros**:
- Extended validity (1-2 years)
- Organization Validation (OV) or Extended Validation (EV) options
- Dedicated support

**Cons**:
- Expensive ($50-$300/year)
- Manual renewal process

**Use Case**: Enterprise requirements, EV certificates for trust badges

---

## Let's Encrypt Setup (Recommended)

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# OR for standalone server
sudo apt install certbot -y
```

### Method 1: Nginx + Certbot (Recommended)

**Step 1: Configure Nginx for domain**

```nginx
# /etc/nginx/sites-available/holilabs.com
server {
    listen 80;
    server_name holilabs.com www.holilabs.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

**Step 2: Obtain certificate**

```bash
# Single domain
sudo certbot --nginx -d holilabs.com

# Multiple domains (recommended)
sudo certbot --nginx -d holilabs.com -d www.holilabs.com -d app.holilabs.com -d api.holilabs.com

# Email for renewal notifications
# Email: admin@holilabs.com
```

**Step 3: Verify installation**

```bash
sudo certbot certificates
```

### Method 2: Standalone (No Nginx)

```bash
# Stop any web server on port 80
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d holilabs.com -d www.holilabs.com

# Start web server
sudo systemctl start nginx
```

### Method 3: DNS Challenge (For Wildcard Certificates)

```bash
# Requires DNS provider plugin
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d holilabs.com \
  -d *.holilabs.com
```

**Cloudflare credentials file** (`~/.secrets/cloudflare.ini`):
```ini
dns_cloudflare_api_token = your-cloudflare-api-token
```

---

## Certificate Installation

### For Nginx

Let's Encrypt automatically configures Nginx. Manual configuration:

```nginx
# /etc/nginx/sites-available/holilabs.com
server {
    listen 443 ssl http2;
    server_name holilabs.com www.holilabs.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/holilabs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/holilabs.com/privkey.pem;

    # SSL Configuration (Mozilla Modern)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/holilabs.com/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # DH Parameters
    ssl_dhparam /etc/nginx/dhparam.pem;

    # SSL Session Cache
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers (additional to app middleware)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js app
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
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name holilabs.com www.holilabs.com;
    return 301 https://$host$request_uri;
}
```

**Generate DH parameters** (one-time, takes 5-10 minutes):

```bash
sudo openssl dhparam -out /etc/nginx/dhparam.pem 4096
```

**Test and reload Nginx**:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### For Apache

```apache
<VirtualHost *:443>
    ServerName holilabs.com
    ServerAlias www.holilabs.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/holilabs.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/holilabs.com/privkey.pem

    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off

    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

### For Vercel

Vercel automatically provisions SSL certificates. No configuration needed.

**Custom domains**:
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS (see DNS_CONFIGURATION.md)
4. Vercel automatically provisions SSL

---

## Auto-Renewal Configuration

### Let's Encrypt Auto-Renewal

**Check renewal status**:

```bash
sudo certbot renew --dry-run
```

**Certbot creates automatic renewal** via systemd timer:

```bash
# Check timer status
sudo systemctl status certbot.timer

# List all timers
sudo systemctl list-timers
```

**Manual renewal test**:

```bash
sudo certbot renew
```

### Custom Renewal Script (Optional)

Create `/etc/cron.d/certbot-renew`:

```bash
# Renew certificates daily at 2:30 AM
30 2 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
```

**Or using cron.daily**:

```bash
#!/bin/bash
# /etc/cron.daily/certbot-renew

certbot renew --quiet --post-hook "systemctl reload nginx"

# Log renewal
if [ $? -eq 0 ]; then
    echo "[$(date)] Certificate renewal successful" >> /var/log/certbot-renew.log
else
    echo "[$(date)] Certificate renewal FAILED" >> /var/log/certbot-renew.log
    # Send alert email
    echo "Certificate renewal failed. Check logs." | mail -s "SSL Certificate Renewal Failed" admin@holilabs.com
fi
```

Make executable:

```bash
sudo chmod +x /etc/cron.daily/certbot-renew
```

### Renewal Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/check-cert-expiry.sh

DOMAIN="holilabs.com"
THRESHOLD_DAYS=30
EMAIL="admin@holilabs.com"

# Get certificate expiry date
EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt $THRESHOLD_DAYS ]; then
    echo "Certificate for $DOMAIN expires in $DAYS_LEFT days!" | mail -s "SSL Certificate Expiring Soon" $EMAIL
fi
```

**Add to crontab**:

```bash
# Check daily at 9 AM
0 9 * * * /usr/local/bin/check-cert-expiry.sh
```

---

## HTTPS Enforcement

### Application Level (Next.js Middleware)

**Already configured** in `/apps/web/src/lib/security-headers.ts`:

```typescript
// HSTS Header (production only)
if (process.env.NODE_ENV === 'production') {
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
}

// CSP upgrade-insecure-requests
const cspDirectives = [
  // ... other directives
  ...(!isDev ? ["upgrade-insecure-requests"] : []),
];
```

### Server Level (Nginx)

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name holilabs.com www.holilabs.com;
    return 301 https://$host$request_uri;
}
```

### Environment Variables

Add to `.env.production`:

```bash
NEXT_PUBLIC_APP_URL="https://holilabs.com"
NODE_ENV="production"
```

---

## Testing & Validation

### 1. SSL Labs Test (Primary)

**URL**: https://www.ssllabs.com/ssltest/

**Steps**:
1. Enter your domain: `holilabs.com`
2. Wait 2-3 minutes for scan
3. Target grade: **A+**

**Common Issues**:
- **Grade B or lower**: Update cipher suites, enable HSTS
- **No forward secrecy**: Add ECDHE ciphers
- **Vulnerable to POODLE**: Disable SSLv3

### 2. Manual OpenSSL Test

```bash
# Test TLS 1.2 connection
openssl s_client -connect holilabs.com:443 -tls1_2

# Test TLS 1.3 connection
openssl s_client -connect holilabs.com:443 -tls1_3

# Verify certificate chain
openssl s_client -connect holilabs.com:443 -showcerts

# Check certificate expiry
echo | openssl s_client -servername holilabs.com -connect holilabs.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 3. Browser DevTools

**Steps**:
1. Open Chrome DevTools (F12)
2. Navigate to Security tab
3. Check:
   - Valid certificate
   - Secure connection
   - TLS 1.2 or 1.3
   - Strong cipher suite

### 4. Automated Tests

```bash
# testssl.sh (comprehensive testing)
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh
./testssl.sh https://holilabs.com

# nmap SSL scan
nmap --script ssl-enum-ciphers -p 443 holilabs.com
```

### 5. HSTS Preload Test

**URL**: https://hstspreload.org/

**Requirements for preload**:
- Valid certificate
- Redirect from HTTP to HTTPS
- Serve all subdomains over HTTPS
- Serve HSTS header:
  - `max-age` at least 31536000 seconds (1 year)
  - `includeSubDomains` directive
  - `preload` directive

**Submit to preload list** (optional):
1. Verify all requirements at https://hstspreload.org/
2. Submit domain
3. Wait 2-3 months for inclusion in browser preload lists

### 6. Certificate Transparency Check

**URL**: https://crt.sh/

Search for your domain to verify certificate transparency logs.

---

## Monitoring & Alerts

### 1. Certificate Expiry Monitoring

**Tools**:
- **Let's Encrypt Email Notifications** (automatic)
- **SSL Labs Monitoring** (free, checks weekly)
- **Uptime Robot** (free, monitors HTTPS)
- **AWS CloudWatch** (if using AWS)
- **Sentry** (already configured, can add custom checks)

### 2. Uptime Robot Setup

**Steps**:
1. Sign up at https://uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: https://holilabs.com
   - Interval: 5 minutes
3. Add alert contacts (email, Slack, etc.)
4. Enable SSL expiry alerts (30 days before)

### 3. Custom Health Check

Add to `/apps/web/src/app/api/health/ssl/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

export async function GET(request: NextRequest) {
  const domain = process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') || 'holilabs.com';

  try {
    const cert = await new Promise((resolve, reject) => {
      const options = {
        hostname: domain,
        port: 443,
        method: 'GET',
        agent: false,
        rejectUnauthorized: true,
      };

      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();
        resolve(cert);
      });

      req.on('error', reject);
      req.end();
    });

    const validTo = new Date(cert.valid_to);
    const daysUntilExpiry = Math.floor((validTo - Date.now()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      status: 'healthy',
      domain,
      issuer: cert.issuer.O,
      validFrom: cert.valid_from,
      validTo: cert.valid_to,
      daysUntilExpiry,
      warning: daysUntilExpiry < 30 ? 'Certificate expires soon' : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
```

**Monitor this endpoint**:
```bash
curl https://holilabs.com/api/health/ssl
```

### 4. Alerting

**Add to monitoring dashboard**:
- Certificate expiry < 30 days: Warning
- Certificate expiry < 7 days: Critical
- Certificate invalid: Critical
- HTTPS unavailable: Critical

**Notification channels**:
- Email: admin@holilabs.com
- Slack: #alerts channel
- PagerDuty: (for critical issues)

---

## Troubleshooting

### Issue: Certificate Not Trusted

**Symptoms**:
- "Your connection is not private" error
- Certificate warning in browser

**Solutions**:
1. Check certificate chain:
   ```bash
   openssl s_client -connect holilabs.com:443 -showcerts
   ```
2. Verify intermediate certificates:
   ```bash
   curl https://holilabs.com
   ```
3. Reinstall with full chain:
   ```bash
   sudo certbot renew --force-renewal
   ```

### Issue: Mixed Content Warnings

**Symptoms**:
- HTTPS page loads HTTP resources
- Browser console warnings

**Solutions**:
1. Update all URLs to HTTPS:
   ```bash
   grep -r "http://" apps/web/src
   ```
2. Add CSP header (already configured):
   ```
   upgrade-insecure-requests
   ```
3. Use protocol-relative URLs:
   ```html
   <img src="//example.com/image.png">
   ```

### Issue: Certificate Renewal Fails

**Symptoms**:
- `certbot renew` fails
- Email notification of renewal failure

**Solutions**:
1. Check DNS records:
   ```bash
   dig holilabs.com
   ```
2. Verify port 80 accessible:
   ```bash
   sudo netstat -tlnp | grep :80
   ```
3. Check firewall rules:
   ```bash
   sudo ufw status
   ```
4. Manual renewal:
   ```bash
   sudo certbot renew --force-renewal
   ```
5. Check logs:
   ```bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

### Issue: HSTS Not Working

**Symptoms**:
- No HSTS header in response
- SSL Labs shows no HSTS

**Solutions**:
1. Verify production environment:
   ```bash
   echo $NODE_ENV  # Should be "production"
   ```
2. Check middleware:
   ```typescript
   // In security-headers.ts
   if (process.env.NODE_ENV === 'production') {
     response.headers.set('Strict-Transport-Security', '...');
   }
   ```
3. Clear browser HSTS cache:
   - Chrome: `chrome://net-internals/#hsts`
   - Delete domain security policies

### Issue: SSL Labs Grade Below A+

**Common fixes**:

**Grade A**:
- Enable HSTS with long max-age
- Add `preload` directive

**Grade B**:
- Disable weak ciphers
- Enable forward secrecy (ECDHE)

**Grade C or lower**:
- Disable SSLv3, TLS 1.0, TLS 1.1
- Update cipher suites
- Enable OCSP stapling

---

## Security Best Practices

### 1. Certificate Storage

**Permissions**:
```bash
# Let's Encrypt certificates
sudo chown root:root /etc/letsencrypt/live/holilabs.com/privkey.pem
sudo chmod 600 /etc/letsencrypt/live/holilabs.com/privkey.pem
```

**Backup**:
```bash
# Backup certificates
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/

# Store securely (encrypted, offsite)
```

### 2. Cipher Suite Selection

**Recommended (Mozilla Modern)**:
```
ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
```

**Update regularly**:
- Check Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/

### 3. Protocol Versions

**Enable**:
- TLS 1.2
- TLS 1.3

**Disable**:
- SSLv2
- SSLv3
- TLS 1.0
- TLS 1.1

### 4. Additional Security Headers

Already configured in `security-headers.ts`:
- Strict-Transport-Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Content-Security-Policy

---

## Production Checklist

Before going live:

- [ ] SSL certificate installed
- [ ] HTTPS enforcement enabled (HTTP → HTTPS redirect)
- [ ] HSTS header configured (`max-age=31536000; includeSubDomains; preload`)
- [ ] SSL Labs test: Grade A or A+
- [ ] Certificate auto-renewal configured
- [ ] Monitoring alerts set up (30 days before expiry)
- [ ] Backup certificates stored securely
- [ ] DNS records configured (see DNS_CONFIGURATION.md)
- [ ] Mixed content warnings resolved
- [ ] All subdomains use HTTPS
- [ ] OCSP stapling enabled
- [ ] Forward secrecy enabled (ECDHE ciphers)
- [ ] Weak ciphers disabled
- [ ] TLS 1.0/1.1 disabled
- [ ] Certificate transparency verified (crt.sh)
- [ ] Health check endpoint monitoring SSL

---

## Resources

### Documentation
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Certbot**: https://certbot.eff.org/
- **Mozilla SSL Config**: https://ssl-config.mozilla.org/

### Testing Tools
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **HSTS Preload**: https://hstspreload.org/
- **testssl.sh**: https://github.com/drwetter/testssl.sh
- **Certificate Transparency**: https://crt.sh/

### Monitoring Services
- **Uptime Robot**: https://uptimerobot.com
- **SSL Labs Monitoring**: https://www.ssllabs.com/ssltest/
- **Let's Encrypt Expiry Bot**: Automatic email notifications

---

## Support

For issues or questions:
- Check logs: `/var/log/letsencrypt/letsencrypt.log`
- Certbot docs: https://certbot.eff.org/docs/
- HoliLabs support: admin@holilabs.com

---

**Last Updated**: 2024-12-15
**Author**: Agent 27 (Claude Sonnet 4.5)
**Status**: Production Ready
