# SSL Certificates Directory

This directory should contain your SSL certificates for HTTPS.

## Required Files

Place the following files here:

- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key

## Generating SSL Certificates with Let's Encrypt

### Option 1: Using Certbot (Recommended)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos

# Copy certificates to this directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./privkey.pem
sudo chmod 644 fullchain.pem
sudo chmod 600 privkey.pem
```

### Option 2: Self-Signed Certificates (Development/Testing Only)

```bash
# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Auto-Renewal Setup

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab for automatic renewal
sudo crontab -e

# Add this line to renew twice daily
0 0,12 * * * certbot renew --quiet --post-hook "docker exec holi-nginx-prod nginx -s reload"
```

## Security Notes

- **NEVER** commit actual certificate files to git
- Keep `privkey.pem` permissions at 600 (read/write for owner only)
- Rotate certificates before expiration
- Use strong private keys (minimum 2048-bit RSA or 256-bit ECDSA)

## HIPAA Compliance

For HIPAA compliance, ensure:
- TLS 1.2 or higher (TLS 1.3 recommended)
- Strong cipher suites (configured in nginx.conf)
- Certificate from trusted CA (Let's Encrypt is acceptable)
- Regular certificate rotation
