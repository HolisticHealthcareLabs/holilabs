# SSL/TLS Quick Reference

**Quick reference guide for SSL/TLS configuration and troubleshooting.**

---

## Quick Links

- **Full Setup Guide**: [SSL_TLS_SETUP.md](./SSL_TLS_SETUP.md)
- **DNS Configuration**: [DNS_CONFIGURATION.md](./DNS_CONFIGURATION.md)
- **Deployment Checklist**: [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- **Renewal Runbook**: [runbooks/ssl-certificate-renewal.md](./runbooks/ssl-certificate-renewal.md)

---

## Quick Commands

### Check Certificate Expiry
```bash
echo | openssl s_client -servername holilabs.com -connect holilabs.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Test HTTPS
```bash
curl -I https://holilabs.com
```

### Check HSTS Header
```bash
curl -I https://holilabs.com | grep -i "strict-transport-security"
```

### Renew Certificate
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Check Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### SSL Labs Test
```
https://www.ssllabs.com/ssltest/analyze.html?d=holilabs.com
```

---

## Current Configuration Status

### Security Headers ✅
- **File**: `/apps/web/src/lib/security-headers.ts`
- **HSTS**: Configured (production only)
- **CSP**: upgrade-insecure-requests enabled
- **Grade Target**: A+ (SSL Labs)

### Health Check ✅
- **Endpoint**: `https://holilabs.com/api/health/ssl`
- **Monitors**: Certificate expiry, validity, issuer
- **Alerts**: 30 days (warning), 7 days (critical)

---

## Production Setup (5 Steps)

1. **Configure DNS** (1-2 hours)
   ```bash
   # Add A record: holilabs.com → your-server-ip
   # Add CNAME: www → holilabs.com
   # Add CAA: authorize letsencrypt.org
   ```

2. **Obtain Certificate** (15 minutes)
   ```bash
   sudo certbot --nginx -d holilabs.com -d www.holilabs.com
   ```

3. **Verify HTTPS** (5 minutes)
   ```bash
   curl -I https://holilabs.com
   curl http://holilabs.com  # Should redirect to HTTPS
   ```

4. **SSL Labs Test** (5 minutes)
   - Visit: https://www.ssllabs.com/ssltest/
   - Target: A+ grade

5. **Setup Monitoring** (30 minutes)
   - Configure UptimeRobot
   - Enable certificate expiry alerts (30 days)
   - Test alert delivery

---

## Emergency: Certificate Expired

**Recovery Time**: 10 minutes

```bash
# 1. Force renewal
sudo certbot renew --force-renewal

# 2. Reload web server
sudo systemctl reload nginx

# 3. Verify
curl -I https://holilabs.com

# 4. Check expiry
echo | openssl s_client -servername holilabs.com -connect holilabs.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Common Issues

### Issue: Auto-Renewal Failed
```bash
# Check logs
sudo tail -100 /var/log/letsencrypt/letsencrypt.log

# Test renewal
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew --force-renewal
```

### Issue: Mixed Content Warnings
```bash
# Find HTTP links
grep -r "http://" apps/web/src/

# Solution: Update to HTTPS or use protocol-relative URLs
```

### Issue: HSTS Not Working
```bash
# Verify production environment
echo $NODE_ENV  # Should be "production"

# Check header
curl -I https://holilabs.com | grep -i "strict-transport-security"
```

---

## Monitoring & Alerts

### Health Check
```bash
curl https://holilabs.com/api/health/ssl
```

**Expected Response**:
```json
{
  "status": "healthy",
  "certificate": {
    "daysUntilExpiry": 75,
    "isValid": true
  }
}
```

### Alert Thresholds
- **Warning**: < 30 days until expiry
- **Critical**: < 7 days until expiry
- **Emergency**: Certificate expired or invalid

---

## Testing Tools

- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/
- **DNS Checker**: https://dnschecker.org/
- **HSTS Preload**: https://hstspreload.org/

---

## Contact

- **DevOps**: devops@holilabs.com
- **Emergency**: PagerDuty (if configured)
- **Documentation**: See links at top of page

---

**Last Updated**: 2024-12-15
**Status**: Production Ready
