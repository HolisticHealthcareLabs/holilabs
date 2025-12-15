# SSL Certificate Renewal Runbook

## Overview

This runbook covers the SSL/TLS certificate renewal process for HoliLabs production environment.

**Frequency**: Every 90 days (Let's Encrypt)
**Automation**: Certbot automatic renewal
**Alert Threshold**: 30 days before expiry
**Criticality**: P0 (Production blocking)

---

## Automatic Renewal (Preferred)

### Verify Auto-Renewal is Configured

```bash
# Check certbot timer status
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Check renewal logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

**Expected Result**: Timer active, dry run successful

### Manual Trigger (If Needed)

```bash
# Force renewal (only if < 30 days until expiry)
sudo certbot renew

# Force renewal even if > 30 days
sudo certbot renew --force-renewal

# Reload web server
sudo systemctl reload nginx
# OR
sudo systemctl reload apache2
```

---

## Manual Renewal (Fallback)

### Prerequisites

- [ ] Access to production server (SSH)
- [ ] Root/sudo privileges
- [ ] DNS records pointing to server
- [ ] Port 80 accessible (for HTTP challenge)

### Step 1: Stop Web Server (If Using Standalone)

```bash
sudo systemctl stop nginx
```

### Step 2: Request New Certificate

```bash
# For single domain
sudo certbot certonly --standalone -d holilabs.com

# For multiple domains
sudo certbot certonly --standalone \
  -d holilabs.com \
  -d www.holilabs.com \
  -d app.holilabs.com \
  -d api.holilabs.com
```

### Step 3: Verify Certificate

```bash
# List certificates
sudo certbot certificates

# Check expiry date
sudo openssl x509 -noout -dates -in /etc/letsencrypt/live/holilabs.com/fullchain.pem
```

### Step 4: Restart Web Server

```bash
# Nginx
sudo systemctl start nginx
sudo systemctl reload nginx

# Verify nginx config
sudo nginx -t

# Apache
sudo systemctl start apache2
sudo systemctl reload apache2
```

### Step 5: Test HTTPS

```bash
# Quick test
curl -I https://holilabs.com

# Detailed test
openssl s_client -connect holilabs.com:443 -servername holilabs.com

# SSL Labs test (wait 2-3 minutes)
# https://www.ssllabs.com/ssltest/analyze.html?d=holilabs.com
```

---

## Wildcard Certificate Renewal

### Prerequisites

- [ ] DNS provider API credentials (Cloudflare, Route53, etc.)
- [ ] Certbot DNS plugin installed

### Cloudflare DNS Challenge

```bash
# Install plugin
sudo apt install python3-certbot-dns-cloudflare

# Create credentials file
sudo mkdir -p /root/.secrets/
sudo nano /root/.secrets/cloudflare.ini
```

**File contents** (`/root/.secrets/cloudflare.ini`):
```ini
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
```

**Secure file**:
```bash
sudo chmod 600 /root/.secrets/cloudflare.ini
```

**Request wildcard certificate**:
```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  -d holilabs.com \
  -d '*.holilabs.com'
```

---

## Troubleshooting

### Issue: Auto-Renewal Failed

**Symptoms**:
- Received expiry alert email
- Renewal logs show errors

**Diagnosis**:
```bash
# Check logs
sudo tail -100 /var/log/letsencrypt/letsencrypt.log

# Test renewal
sudo certbot renew --dry-run
```

**Common Causes**:
1. **Port 80 blocked**
   ```bash
   # Check firewall
   sudo ufw status
   sudo ufw allow 80/tcp

   # Check if something is using port 80
   sudo netstat -tlnp | grep :80
   ```

2. **DNS not resolving**
   ```bash
   dig holilabs.com A
   dig www.holilabs.com A
   ```

3. **Web server config error**
   ```bash
   sudo nginx -t
   sudo apache2ctl configtest
   ```

**Solution**:
```bash
# Fix issues, then retry
sudo certbot renew --force-renewal
```

### Issue: Certificate Not Trusted

**Symptoms**:
- Browser shows "Not Secure"
- SSL Labs shows chain issues

**Diagnosis**:
```bash
# Check certificate chain
openssl s_client -connect holilabs.com:443 -showcerts
```

**Solution**:
```bash
# Ensure using fullchain.pem (not cert.pem)
sudo nano /etc/nginx/sites-available/holilabs.com

# Should be:
ssl_certificate /etc/letsencrypt/live/holilabs.com/fullchain.pem;

# Reload
sudo nginx -t
sudo systemctl reload nginx
```

### Issue: Mixed Content Warnings

**Symptoms**:
- HTTPS page loads HTTP resources
- Browser console warnings

**Solution**:
```bash
# Find HTTP links in code
grep -r "http://" /var/www/holilabs/src/

# Update to HTTPS or protocol-relative URLs
sed -i 's|http://|https://|g' file.js
```

### Issue: HSTS Not Working

**Symptoms**:
- No HSTS header in response
- SSL Labs shows no HSTS

**Diagnosis**:
```bash
curl -I https://holilabs.com | grep -i "strict-transport-security"
```

**Solution**:
```bash
# For Nginx
sudo nano /etc/nginx/sites-available/holilabs.com

# Add:
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Reload
sudo systemctl reload nginx
```

---

## Emergency Procedures

### Certificate Expired (Production Down)

**Immediate Actions**:

1. **Assess Impact** (2 minutes)
   ```bash
   # Check certificate
   echo | openssl s_client -servername holilabs.com -connect holilabs.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

2. **Emergency Renewal** (5 minutes)
   ```bash
   # Force renewal
   sudo certbot renew --force-renewal

   # Reload immediately
   sudo systemctl reload nginx
   ```

3. **Verify** (1 minute)
   ```bash
   curl -I https://holilabs.com
   ```

4. **Notify** (2 minutes)
   - Update status page
   - Notify users via email/Slack
   - Post on social media

**Total Time**: ~10 minutes

### Certificate Authority Rate Limit Hit

**Let's Encrypt Limits**:
- 50 certificates per registered domain per week
- 5 duplicate certificates per week

**Workaround**:
1. Wait for rate limit reset (1 week)
2. Use staging environment for testing
3. Use commercial certificate (temporary)

**Commercial Certificate Quick Setup** (if needed):
```bash
# Generate CSR
openssl req -new -newkey rsa:2048 -nodes \
  -keyout holilabs.key \
  -out holilabs.csr

# Submit CSR to CA (DigiCert, Sectigo, etc.)
# Receive certificate files

# Install certificate
sudo cp holilabs.crt /etc/ssl/certs/
sudo cp holilabs.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/holilabs.key

# Update nginx config
sudo nano /etc/nginx/sites-available/holilabs.com
# ssl_certificate /etc/ssl/certs/holilabs.crt;
# ssl_certificate_key /etc/ssl/private/holilabs.key;

sudo systemctl reload nginx
```

---

## Monitoring & Alerts

### Health Check Endpoint

**URL**: `https://holilabs.com/api/health/ssl`

**Expected Response**:
```json
{
  "status": "healthy",
  "domain": "holilabs.com",
  "certificate": {
    "subject": "holilabs.com",
    "issuer": "Let's Encrypt",
    "validFrom": "2024-12-15T00:00:00Z",
    "validTo": "2025-03-15T00:00:00Z",
    "daysUntilExpiry": 75,
    "isValid": true
  },
  "warning": null
}
```

**Alert Conditions**:
- `daysUntilExpiry < 30`: Warning alert
- `daysUntilExpiry < 7`: Critical alert
- `isValid: false`: Emergency alert

### Manual Checks

```bash
#!/bin/bash
# check-cert-expiry.sh

DOMAIN="holilabs.com"
THRESHOLD_DAYS=30

EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

echo "Certificate expires in $DAYS_LEFT days"

if [ $DAYS_LEFT -lt $THRESHOLD_DAYS ]; then
    echo "WARNING: Certificate expires soon!"
    exit 1
fi

exit 0
```

**Schedule check**:
```bash
# Add to crontab
0 9 * * * /usr/local/bin/check-cert-expiry.sh || mail -s "SSL Certificate Alert" admin@holilabs.com
```

---

## Post-Renewal Checklist

After renewal (manual or automatic):

- [ ] Certificate expiry date updated (> 80 days)
- [ ] HTTPS accessible (curl test)
- [ ] No browser warnings
- [ ] SSL Labs test: Grade A or A+
- [ ] Health check endpoint returning healthy
- [ ] All subdomains working (www, app, api, etc.)
- [ ] No mixed content warnings
- [ ] HSTS header present
- [ ] Monitoring alerts cleared
- [ ] Document incident (if manual renewal required)

**Quick verification script**:
```bash
#!/bin/bash
# verify-ssl.sh

DOMAIN="holilabs.com"
SUBDOMAINS="www app api admin"

echo "Verifying SSL for $DOMAIN and subdomains..."

for sub in "" $SUBDOMAINS; do
    if [ -z "$sub" ]; then
        URL="https://$DOMAIN"
    else
        URL="https://$sub.$DOMAIN"
    fi

    echo -n "Testing $URL... "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)

    if [ $STATUS -eq 200 ] || [ $STATUS -eq 301 ] || [ $STATUS -eq 302 ]; then
        echo "OK ($STATUS)"
    else
        echo "FAIL ($STATUS)"
    fi
done

echo ""
echo "Checking certificate expiry..."
openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates

echo ""
echo "Checking HSTS header..."
curl -I https://$DOMAIN 2>/dev/null | grep -i "strict-transport-security"

echo ""
echo "Done!"
```

---

## Escalation

### Level 1: Automated Renewal Failed
- **Response Time**: 24 hours
- **Action**: Check logs, retry renewal
- **Owner**: DevOps engineer

### Level 2: Certificate Expires in < 7 Days
- **Response Time**: 4 hours
- **Action**: Manual renewal, investigate auto-renewal failure
- **Owner**: Senior DevOps engineer

### Level 3: Certificate Expired (Production Down)
- **Response Time**: Immediate
- **Action**: Emergency renewal, incident post-mortem
- **Owner**: On-call engineer + Technical lead

### Contact Information
- **Primary**: DevOps team (devops@holilabs.com)
- **Secondary**: Technical lead (tech-lead@holilabs.com)
- **Emergency**: PagerDuty (if configured)

---

## Related Documentation

- **SSL/TLS Setup**: `/docs/SSL_TLS_SETUP.md`
- **DNS Configuration**: `/docs/DNS_CONFIGURATION.md`
- **Deployment Checklist**: `/docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Monitoring Strategy**: `/docs/MONITORING_STRATEGY.md`

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2024-12-15 | 1.0 | Agent 27 | Initial runbook |

---

**Last Updated**: 2024-12-15
**Owner**: DevOps Team
**Review Frequency**: Quarterly
