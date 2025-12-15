# DNS Configuration Guide

## Overview

This guide covers DNS configuration for HoliLabs production deployment, including subdomain strategy, security records, and email authentication.

## Current Domain Strategy

**Primary Domain**: `holilabs.com` (or your production domain)

**Subdomain Structure**:
- `holilabs.com` or `www.holilabs.com` - Main application
- `app.holilabs.com` - Application (alternative)
- `api.holilabs.com` - API endpoints (if separated)
- `admin.holilabs.com` - Admin panel (if separated)
- `staging.holilabs.com` - Staging environment
- `dev.holilabs.com` - Development environment

---

## Table of Contents

1. [DNS Records Overview](#dns-records-overview)
2. [Core DNS Records](#core-dns-records)
3. [Email Authentication Records](#email-authentication-records)
4. [Security Records](#security-records)
5. [CDN Configuration](#cdn-configuration)
6. [Subdomain Strategy](#subdomain-strategy)
7. [DNS Providers](#dns-providers)
8. [Testing & Validation](#testing--validation)
9. [Troubleshooting](#troubleshooting)

---

## DNS Records Overview

### Record Types

| Type | Purpose | Example |
|------|---------|---------|
| **A** | IPv4 address | `holilabs.com → 192.0.2.1` |
| **AAAA** | IPv6 address | `holilabs.com → 2001:db8::1` |
| **CNAME** | Alias to another domain | `www → holilabs.com` |
| **MX** | Mail server | `mail.holilabs.com` |
| **TXT** | Text records (SPF, DKIM, verification) | `v=spf1 include:_spf.google.com ~all` |
| **CAA** | Certificate authority authorization | `0 issue "letsencrypt.org"` |
| **NS** | Name servers | `ns1.cloudflare.com` |

### Time to Live (TTL)

- **Production**: 3600-86400 seconds (1-24 hours)
- **Pre-launch**: 300 seconds (5 minutes) for quick changes
- **Post-launch**: 3600+ seconds for stability

---

## Core DNS Records

### Option 1: Vercel Deployment (Recommended)

**Setup**:
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add custom domain: `holilabs.com`
3. Vercel provides DNS records to configure

**DNS Records** (from Vercel):

```dns
# Root domain
A       @       76.76.21.21
AAAA    @       2606:4700:10::6814:0015

# www subdomain
CNAME   www     cname.vercel-dns.com.
```

**Alternative (Custom A record)**:
```dns
A       @       76.76.21.21
A       www     76.76.21.21
```

### Option 2: Self-Hosted (VPS/Dedicated Server)

**DNS Records**:

```dns
# Root domain - Replace with your server IP
A       @       203.0.113.10
AAAA    @       2001:db8::1

# www subdomain
A       www     203.0.113.10
AAAA    www     2001:db8::1

# Or use CNAME for www
CNAME   www     holilabs.com.
```

### Option 3: Cloudflare (Proxied)

**DNS Records**:

```dns
# Root domain - Proxied through Cloudflare
A       @       your-origin-ip       [Proxied: ON]
AAAA    @       your-ipv6           [Proxied: ON]

# www subdomain
CNAME   www     holilabs.com.       [Proxied: ON]
```

**Benefits**:
- DDoS protection
- CDN caching
- SSL certificate (automatic)
- WAF (Web Application Firewall)

---

## Subdomain Configuration

### Application Subdomains

```dns
# Main app (alternative to root)
A       app     203.0.113.10
AAAA    app     2001:db8::1

# API subdomain (if separated)
A       api     203.0.113.11
AAAA    api     2001:db8::2

# Admin panel (if separated)
A       admin   203.0.113.12
AAAA    admin   2001:db8::3

# Staging environment
A       staging 203.0.113.20
AAAA    staging 2001:db8::10

# Development environment
A       dev     203.0.113.21
AAAA    dev     2001:db8::11
```

### Static Assets / CDN

```dns
# CDN subdomain
CNAME   cdn     d111111abcdef8.cloudfront.net.

# OR for Cloudflare
CNAME   cdn     holilabs.com.        [Proxied: ON]

# Images
CNAME   images  cdn.holilabs.com.
```

### WebSocket Server (if separated)

```dns
# WebSocket subdomain
A       ws      203.0.113.10
AAAA    ws      2001:db8::1
```

---

## Email Authentication Records

### SPF (Sender Policy Framework)

**Purpose**: Specify which mail servers can send email from your domain

**Record**:

```dns
# For no email (recommended if not sending email)
TXT     @       "v=spf1 -all"

# For Resend (recommended email provider)
TXT     @       "v=spf1 include:_spf.resend.com ~all"

# For SendGrid
TXT     @       "v=spf1 include:sendgrid.net ~all"

# For Gmail/Google Workspace
TXT     @       "v=spf1 include:_spf.google.com ~all"

# For multiple providers
TXT     @       "v=spf1 include:_spf.resend.com include:_spf.google.com ~all"
```

**SPF Qualifiers**:
- `+all` - Allow all (NOT recommended)
- `~all` - Soft fail (recommended during testing)
- `-all` - Hard fail (recommended for production)
- `?all` - Neutral

### DKIM (DomainKeys Identified Mail)

**Purpose**: Cryptographically sign emails to verify sender

**Record** (provided by email provider):

```dns
# Resend DKIM
TXT     resend._domainkey     "v=DKIM1; k=rsa; p=MIGfMA0GCS..."

# SendGrid DKIM
CNAME   s1._domainkey         s1.domainkey.u12345.wl.sendgrid.net.
CNAME   s2._domainkey         s2.domainkey.u12345.wl.sendgrid.net.

# Google DKIM
TXT     google._domainkey     "v=DKIM1; k=rsa; p=MIIBIjANBgkq..."
```

**Setup Steps**:
1. Sign up with email provider (Resend, SendGrid, etc.)
2. Add domain to provider dashboard
3. Copy DKIM records provided
4. Add to DNS
5. Verify in provider dashboard

### DMARC (Domain-based Message Authentication)

**Purpose**: Tell email receivers what to do with unauthenticated emails

**Record**:

```dns
# Monitoring mode (recommended initially)
TXT     _dmarc  "v=DMARC1; p=none; rua=mailto:dmarc@holilabs.com; ruf=mailto:dmarc@holilabs.com; fo=1"

# Quarantine mode (after monitoring)
TXT     _dmarc  "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@holilabs.com; ruf=mailto:dmarc@holilabs.com"

# Reject mode (production)
TXT     _dmarc  "v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@holilabs.com; ruf=mailto:dmarc@holilabs.com"
```

**DMARC Policies**:
- `p=none` - Monitor only (no action)
- `p=quarantine` - Mark as spam
- `p=reject` - Reject email

**DMARC Tags**:
- `v=DMARC1` - Version
- `p=` - Policy (none, quarantine, reject)
- `pct=100` - Apply policy to 100% of emails
- `rua=` - Aggregate reports email
- `ruf=` - Forensic reports email
- `fo=1` - Report on any authentication failure

### MX (Mail Exchange) Records

**If receiving email**:

```dns
# Google Workspace
MX      @       1   aspmx.l.google.com.
MX      @       5   alt1.aspmx.l.google.com.
MX      @       5   alt2.aspmx.l.google.com.
MX      @       10  alt3.aspmx.l.google.com.
MX      @       10  alt4.aspmx.l.google.com.

# Custom mail server
MX      @       10  mail.holilabs.com.
```

**If NOT receiving email** (recommended):

```dns
# No MX records - reject all email
# OR set null MX record
MX      @       0   .
```

---

## Security Records

### CAA (Certificate Authority Authorization)

**Purpose**: Specify which CAs can issue certificates for your domain

**Records**:

```dns
# Let's Encrypt only
CAA     @       0   issue "letsencrypt.org"
CAA     @       0   issuewild "letsencrypt.org"

# Let's Encrypt + Cloudflare
CAA     @       0   issue "letsencrypt.org"
CAA     @       0   issue "pki.goog"
CAA     @       0   issue "comodoca.com"
CAA     @       0   issuewild "letsencrypt.org"

# Incident reporting
CAA     @       0   iodef "mailto:security@holilabs.com"
```

**CAA Record Format**:
```
CAA <flags> <tag> "<value>"
```

**Tags**:
- `issue` - Allow CA to issue certificates
- `issuewild` - Allow CA to issue wildcard certificates
- `iodef` - Email for incident reports

### DNSSEC (DNS Security Extensions)

**Purpose**: Cryptographically sign DNS records to prevent tampering

**Setup** (varies by provider):

**Cloudflare**:
1. Dashboard → DNS → Settings
2. Enable DNSSEC
3. Copy DS records
4. Add to domain registrar

**DS Record Example**:
```dns
DS      @       12345 13 2 1234567890ABCDEF...
```

**Verification**:
```bash
dig +dnssec holilabs.com
```

### TXT Records for Domain Verification

```dns
# Google Search Console
TXT     @       "google-site-verification=ABC123..."

# Facebook Domain Verification
TXT     @       "facebook-domain-verification=XYZ789..."

# Vercel Domain Verification
TXT     @       "vercel-domain-verification=DEF456..."
```

---

## CDN Configuration

### Cloudflare

**DNS Records**:
```dns
# Root domain (proxied)
A       @       your-origin-ip       [Proxied: ON]

# www subdomain (proxied)
CNAME   www     holilabs.com.       [Proxied: ON]

# API subdomain (proxied)
A       api     your-origin-ip       [Proxied: ON]
```

**Settings**:
- SSL/TLS: Full (strict)
- Always Use HTTPS: On
- Automatic HTTPS Rewrites: On
- HTTP Strict Transport Security (HSTS): Enabled

### AWS CloudFront

**DNS Records**:
```dns
# CloudFront distribution
CNAME   cdn     d111111abcdef8.cloudfront.net.
A       @       alias to CloudFront distribution
AAAA    @       alias to CloudFront distribution
```

### Vercel (Built-in CDN)

**DNS Records**:
```dns
# Provided by Vercel
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com.
```

---

## Subdomain Strategy

### Recommended Structure

**Single Application**:
```
holilabs.com          → Main app
www.holilabs.com      → Redirect to holilabs.com
```

**Multi-Tier Application**:
```
holilabs.com          → Marketing site
app.holilabs.com      → Web application
api.holilabs.com      → API server
admin.holilabs.com    → Admin panel
```

**With Environments**:
```
holilabs.com          → Production
staging.holilabs.com  → Staging
dev.holilabs.com      → Development
```

### www vs non-www

**Option 1: non-www (Recommended)**
```dns
# Primary domain
A       @       203.0.113.10

# Redirect www to non-www
CNAME   www     holilabs.com.
```

**Server redirect** (Nginx):
```nginx
server {
    server_name www.holilabs.com;
    return 301 https://holilabs.com$request_uri;
}
```

**Option 2: www as primary**
```dns
# Primary domain
CNAME   www     server.example.com.

# Redirect non-www to www
A       @       203.0.113.10
```

**Server redirect**:
```nginx
server {
    server_name holilabs.com;
    return 301 https://www.holilabs.com$request_uri;
}
```

---

## DNS Providers

### Recommended Providers

#### 1. Cloudflare (Recommended)

**Pros**:
- Free tier includes CDN, DDoS protection, SSL
- Fast DNS propagation
- Advanced security features
- Easy to use dashboard

**Cons**:
- Must use Cloudflare nameservers

**Setup**:
1. Sign up at https://cloudflare.com
2. Add site
3. Update nameservers at registrar
4. Configure DNS records

**Nameservers Example**:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

#### 2. AWS Route 53

**Pros**:
- High availability (100% SLA)
- Advanced routing (geolocation, latency-based)
- Integrates with AWS services

**Cons**:
- Paid ($0.50/hosted zone/month + queries)
- More complex setup

**Setup**:
1. Create hosted zone
2. Update nameservers at registrar
3. Configure records via AWS Console or CLI

#### 3. Google Cloud DNS

**Pros**:
- High performance
- Integrates with GCP
- Anycast network

**Cons**:
- Paid ($0.20/zone/month + queries)

#### 4. Vercel DNS

**Pros**:
- Free with Vercel
- Automatic SSL
- Integrated with Vercel deployments

**Cons**:
- Limited to Vercel projects
- Basic features

### Domain Registrar vs DNS Provider

**Best Practice**: Use separate registrar and DNS provider

**Registrar** (where you buy domain):
- Namecheap
- Google Domains
- GoDaddy

**DNS Provider** (where you manage DNS):
- Cloudflare
- AWS Route 53
- Vercel

---

## Complete DNS Configuration Example

### Production Setup (Vercel + Cloudflare)

```dns
# === Core Records ===
A       @       76.76.21.21                      [Proxied: ON]
AAAA    @       2606:4700:10::6814:0015         [Proxied: ON]
CNAME   www     cname.vercel-dns.com.           [Proxied: ON]

# === Application Subdomains ===
A       app     76.76.21.21                      [Proxied: ON]
A       api     76.76.21.21                      [Proxied: ON]
A       admin   76.76.21.21                      [Proxied: ON]

# === Environment Subdomains ===
CNAME   staging cname.vercel-dns.com.           [Proxied: ON]
CNAME   dev     cname.vercel-dns.com.           [Proxied: ON]

# === Email Authentication ===
TXT     @       "v=spf1 include:_spf.resend.com ~all"
TXT     resend._domainkey  "v=DKIM1; k=rsa; p=MIGfMA0GCS..."
TXT     _dmarc  "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@holilabs.com"

# === Security Records ===
CAA     @       0   issue "letsencrypt.org"
CAA     @       0   issuewild "letsencrypt.org"
CAA     @       0   iodef "mailto:security@holilabs.com"

# === Domain Verification ===
TXT     @       "google-site-verification=ABC123..."
TXT     @       "vercel-domain-verification=DEF456..."
```

---

## DNS Propagation

### Propagation Time

- **Initial setup**: 24-48 hours (max)
- **Typical**: 1-4 hours
- **Fast providers (Cloudflare)**: 1-5 minutes

### Check Propagation

**Online Tools**:
- https://dnschecker.org/
- https://www.whatsmydns.net/

**Command Line**:
```bash
# Check A record
dig holilabs.com

# Check from specific DNS server
dig @8.8.8.8 holilabs.com

# Check all records
dig holilabs.com ANY

# Trace DNS resolution
dig +trace holilabs.com
```

**Check from multiple locations**:
```bash
# Global DNS propagation
for server in 8.8.8.8 1.1.1.1 9.9.9.9; do
  echo "Checking $server"
  dig @$server holilabs.com +short
done
```

---

## Testing & Validation

### 1. DNS Record Check

```bash
# A record
dig holilabs.com A

# AAAA record
dig holilabs.com AAAA

# CNAME record
dig www.holilabs.com CNAME

# MX records
dig holilabs.com MX

# TXT records (SPF, DKIM, DMARC)
dig holilabs.com TXT
dig resend._domainkey.holilabs.com TXT
dig _dmarc.holilabs.com TXT

# CAA records
dig holilabs.com CAA

# All records
dig holilabs.com ANY
```

### 2. Email Authentication Check

**SPF**:
```bash
dig holilabs.com TXT | grep "v=spf1"
```

**DKIM**:
```bash
dig resend._domainkey.holilabs.com TXT
```

**DMARC**:
```bash
dig _dmarc.holilabs.com TXT
```

**Online Tools**:
- https://mxtoolbox.com/SuperTool.aspx
- https://dmarcian.com/dmarc-inspector/

### 3. SSL/TLS Check

```bash
# Certificate details
openssl s_client -connect holilabs.com:443 -servername holilabs.com

# Quick check
curl -I https://holilabs.com
```

### 4. Website Accessibility

```bash
# HTTP status
curl -I http://holilabs.com
curl -I https://holilabs.com
curl -I https://www.holilabs.com

# Follow redirects
curl -L http://holilabs.com
```

---

## Troubleshooting

### Issue: DNS Not Resolving

**Symptoms**:
- `NXDOMAIN` error
- Site not accessible

**Solutions**:
1. Check nameservers:
   ```bash
   dig holilabs.com NS
   ```
2. Verify nameservers at registrar match DNS provider
3. Wait for propagation (24-48 hours max)
4. Check DNS records at provider dashboard

### Issue: www Not Working

**Solutions**:
1. Add CNAME record:
   ```dns
   CNAME   www     holilabs.com.
   ```
2. Or add A record:
   ```dns
   A       www     203.0.113.10
   ```
3. Configure server redirect

### Issue: Email Not Sending

**Check SPF**:
```bash
dig holilabs.com TXT | grep "v=spf1"
```

**Check DKIM**:
```bash
dig resend._domainkey.holilabs.com TXT
```

**Check DMARC**:
```bash
dig _dmarc.holilabs.com TXT
```

**Test email**:
- Send test email
- Check spam folder
- Use https://www.mail-tester.com/

### Issue: SSL Certificate Not Working

**Check CAA records**:
```bash
dig holilabs.com CAA
```

**Verify CAA allows your certificate authority**:
```dns
CAA     @       0   issue "letsencrypt.org"
```

### Issue: Slow DNS Resolution

**Solutions**:
1. Lower TTL (300 seconds)
2. Use faster DNS provider (Cloudflare, Route 53)
3. Enable DNS caching
4. Check DNSSEC (can slow resolution if misconfigured)

---

## DNS Migration Checklist

Migrating DNS to new provider:

- [ ] Export current DNS records
- [ ] Create account with new DNS provider
- [ ] Add domain to new provider
- [ ] Configure all DNS records
- [ ] Lower TTL to 300 seconds (1 hour before migration)
- [ ] Update nameservers at registrar
- [ ] Wait for propagation (24-48 hours)
- [ ] Verify all records resolving correctly
- [ ] Monitor for issues
- [ ] Increase TTL back to 3600+ seconds

---

## Production Checklist

Before going live:

- [ ] A/AAAA records for root domain
- [ ] CNAME or A record for www subdomain
- [ ] Subdomain records configured (app, api, admin, etc.)
- [ ] SPF record configured
- [ ] DKIM records configured
- [ ] DMARC record configured
- [ ] CAA records configured (Let's Encrypt authorized)
- [ ] MX records configured (if receiving email)
- [ ] TXT records for domain verification
- [ ] DNSSEC enabled (optional but recommended)
- [ ] DNS propagation complete (check dnschecker.org)
- [ ] HTTP → HTTPS redirect working
- [ ] www → non-www redirect working (or vice versa)
- [ ] All subdomains accessible
- [ ] SSL certificate valid for all domains/subdomains
- [ ] Email sending working (test with mail-tester.com)
- [ ] No mixed content warnings

---

## Resources

### Tools
- **DNS Checker**: https://dnschecker.org/
- **MX Toolbox**: https://mxtoolbox.com/
- **DNS Propagation**: https://www.whatsmydns.net/
- **Email Tester**: https://www.mail-tester.com/
- **DMARC Analyzer**: https://dmarcian.com/
- **CAA Test**: https://caatest.co.uk/

### Documentation
- **Cloudflare DNS**: https://developers.cloudflare.com/dns/
- **AWS Route 53**: https://docs.aws.amazon.com/route53/
- **Google Cloud DNS**: https://cloud.google.com/dns/docs

### Standards
- **RFC 1035** - DNS Specification
- **RFC 7208** - SPF
- **RFC 6376** - DKIM
- **RFC 7489** - DMARC
- **RFC 6844** - CAA

---

## Support

For issues or questions:
- DNS Provider: Check provider documentation
- Domain Registrar: Contact support
- HoliLabs: admin@holilabs.com

---

**Last Updated**: 2024-12-15
**Author**: Agent 27 (Claude Sonnet 4.5)
**Status**: Production Ready
