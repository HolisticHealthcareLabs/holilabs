# VPS Deployment Guide
## Holi Labs Healthcare Platform - Production Setup

This guide covers deploying Holi Labs to a traditional VPS (Virtual Private Server) using Docker Compose. Suitable for:
- Digital Ocean Droplets
- AWS EC2 instances
- Linode servers
- Any VPS with Docker support

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 22.04 LTS (recommended) or Ubuntu 20.04 LTS
- **RAM**: Minimum 4GB (8GB recommended for production)
- **CPU**: 2+ cores (4+ recommended)
- **Storage**: 50GB+ SSD
- **Network**: Static IP address and domain name

### Software Requirements
- Docker 24.0+
- Docker Compose V2
- Git
- SSL certificates (Let's Encrypt recommended)

---

## Initial Server Setup

### 1. Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl git build-essential
```

### 2. Install Docker

```bash
# Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
docker compose version
```

### 3. Configure Firewall

```bash
# Install ufw if not present
sudo apt-get install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/holilabs
sudo chown $USER:$USER /opt/holilabs

# Clone repository
cd /opt/holilabs
git clone https://github.com/YOUR_USERNAME/holilabsv2.git .

# Checkout main branch
git checkout main
```

### 2. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env.production

# Edit environment file
nano .env.production
```

**Required Environment Variables:**

```bash
# Database Configuration
POSTGRES_USER=holi
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>
POSTGRES_DB=holi_protocol

# Redis Configuration
REDIS_PASSWORD=<STRONG_PASSWORD_HERE>

# NextAuth Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<GENERATE_WITH: openssl rand -base64 32>
JWT_SECRET=<GENERATE_WITH: openssl rand -base64 32>

# AI Services
ANTHROPIC_API_KEY=<YOUR_ANTHROPIC_KEY>
DEEPGRAM_API_KEY=<YOUR_DEEPGRAM_KEY>

# Email Service (Resend)
RESEND_API_KEY=<YOUR_RESEND_KEY>

# SMS & WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=<YOUR_TWILIO_SID>
TWILIO_AUTH_TOKEN=<YOUR_TWILIO_TOKEN>
TWILIO_PHONE_NUMBER=<YOUR_TWILIO_NUMBER>
TWILIO_WHATSAPP_NUMBER=<YOUR_TWILIO_WHATSAPP>

# Meilisearch
MEILI_MASTER_KEY=<GENERATE_WITH: openssl rand -base64 32>

# Feature Flags
ENABLE_BLOCKCHAIN=false
ENABLE_IPFS=false

# Logging
LOG_LEVEL=info
```

### 3. Generate SSL Certificates

**Using Let's Encrypt (Recommended):**

```bash
# Install Certbot
sudo apt-get install -y certbot

# Stop any services on port 80
sudo systemctl stop nginx 2>/dev/null || true

# Generate certificates
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem \
  /opt/holilabs/nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem \
  /opt/holilabs/nginx/ssl/privkey.pem

# Set proper permissions
sudo chown $USER:$USER /opt/holilabs/nginx/ssl/*.pem
chmod 644 /opt/holilabs/nginx/ssl/fullchain.pem
chmod 600 /opt/holilabs/nginx/ssl/privkey.pem
```

**Using Self-Signed Certificate (Development Only):**

```bash
cd /opt/holilabs/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=HoliLabs/CN=yourdomain.com"
```

### 4. Update Nginx Configuration

Edit `nginx/nginx.conf` and replace `server_name _;` with your actual domain:

```bash
nano nginx/nginx.conf

# Change:
# server_name _;
# To:
# server_name yourdomain.com www.yourdomain.com;
```

### 5. Build and Start Services

```bash
# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 6. Run Database Migrations

```bash
# Wait for services to be healthy (about 60 seconds)
sleep 60

# Run Prisma migrations
docker compose -f docker-compose.prod.yml exec web pnpm prisma migrate deploy

# Generate Prisma client (if needed)
docker compose -f docker-compose.prod.yml exec web pnpm prisma generate
```

### 7. Verify Deployment

```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# Check health endpoint
curl http://localhost:3000/api/health

# Check HTTPS endpoint
curl https://yourdomain.com/api/health
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T...",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## Post-Deployment Configuration

### 1. Set Up Automatic SSL Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e

# Add this line to renew twice daily at midnight and noon
0 0,12 * * * certbot renew --quiet --post-hook "cd /opt/holilabs && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload"
```

### 2. Configure Automatic Backups

```bash
# Create backup cron job
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /opt/holilabs && docker compose -f docker-compose.prod.yml exec -T postgres /app/scripts/backup-database.sh >> /var/log/holi-backup.log 2>&1
```

### 3. Set Up Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/holilabs

# Add this configuration:
/opt/holilabs/nginx/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker compose -f /opt/holilabs/docker-compose.prod.yml exec nginx nginx -s reload > /dev/null 2>&1
    endscript
}
```

### 4. Configure System Monitoring

```bash
# Install monitoring tools
sudo apt-get install -y htop iotop nethogs

# Set up Docker resource limits (optional)
# Edit docker-compose.prod.yml and add:
#   deploy:
#     resources:
#       limits:
#         cpus: '2'
#         memory: 2G
```

---

## Maintenance Operations

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f nginx

# Nginx access logs
tail -f /opt/holilabs/nginx/logs/access.log

# Nginx error logs
tail -f /opt/holilabs/nginx/logs/error.log
```

### Updating the Application

```bash
cd /opt/holilabs

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.prod.yml exec web pnpm prisma migrate deploy
```

### Database Backup

```bash
# Manual backup
docker compose -f docker-compose.prod.yml exec postgres /app/scripts/backup-database.sh

# List backups
ls -lh /opt/holilabs/backups/

# Download backup to local machine
scp user@server:/opt/holilabs/backups/holi_backup_TIMESTAMP.sql.gz ./
```

### Database Restore

```bash
# List available backups
docker compose -f docker-compose.prod.yml exec postgres ls -lh /app/backups/

# Restore from backup
docker compose -f docker-compose.prod.yml exec postgres /app/scripts/restore-database.sh holi_backup_TIMESTAMP.sql.gz

# Run migrations after restore
docker compose -f docker-compose.prod.yml exec web pnpm prisma migrate deploy
```

### Restarting Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart web
docker compose -f docker-compose.prod.yml restart postgres
docker compose -f docker-compose.prod.yml restart nginx

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

### Checking Resource Usage

```bash
# Docker stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
docker compose -f docker-compose.prod.yml logs <service-name>

# Check if port is already in use
sudo netstat -tulpn | grep <port>

# Restart Docker daemon
sudo systemctl restart docker
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres

# Test database connection
docker compose -f docker-compose.prod.yml exec postgres psql -U holi -d holi_protocol -c "SELECT 1;"

# Reset database (WARNING: Destroys all data)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /opt/holilabs/nginx/ssl/fullchain.pem -text -noout

# Check Nginx configuration
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload Nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### High Memory Usage

```bash
# Check container memory usage
docker stats

# Restart memory-heavy services
docker compose -f docker-compose.prod.yml restart web
docker compose -f docker-compose.prod.yml restart postgres
```

---

## Security Hardening

### 1. SSH Hardening

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended changes:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

### 2. Fail2Ban Installation

```bash
# Install fail2ban
sudo apt-get install -y fail2ban

# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular Security Updates

```bash
# Enable automatic security updates
sudo apt-get install -y unattended-upgrades

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## HIPAA Compliance Checklist

- [ ] SSL/TLS certificates installed and configured
- [ ] All traffic encrypted (HTTPS only)
- [ ] Database backups configured and tested
- [ ] Access logs enabled and retained for audit
- [ ] Firewall configured to allow only necessary ports
- [ ] SSH access restricted to key-based authentication
- [ ] Regular security updates enabled
- [ ] Session timeout configured (15 minutes)
- [ ] Strong passwords for all services
- [ ] Backup encryption configured
- [ ] Disaster recovery plan documented

---

## Performance Optimization

### 1. Enable Redis Caching

Redis is already included in docker-compose.prod.yml and configured for:
- Session storage
- Rate limiting
- API response caching

### 2. Database Optimization

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U holi -d holi_protocol

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

# Vacuum database
VACUUM ANALYZE;
```

### 3. Nginx Caching

Nginx is configured to cache static assets automatically:
- Static files: 1 year
- Images: 30 days
- API responses: No cache (for security)

---

## Monitoring and Alerts

### Recommended Monitoring Services

- **Uptime Robot**: Free uptime monitoring
- **Sentry**: Error tracking and performance monitoring
- **DataDog**: Comprehensive infrastructure monitoring
- **New Relic**: Application performance monitoring

### Health Check Endpoints

- Main health: `https://yourdomain.com/api/health`
- Database health: Included in main health check

---

## Support and Documentation

- **GitHub Issues**: https://github.com/YOUR_USERNAME/holilabsv2/issues
- **Docker Logs**: `docker compose -f docker-compose.prod.yml logs`
- **System Logs**: `/var/log/syslog`

---

## Quick Reference Commands

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart application
docker compose -f docker-compose.prod.yml restart web

# Run migrations
docker compose -f docker-compose.prod.yml exec web pnpm prisma migrate deploy

# Backup database
docker compose -f docker-compose.prod.yml exec postgres /app/scripts/backup-database.sh

# Check health
curl https://yourdomain.com/api/health
```
