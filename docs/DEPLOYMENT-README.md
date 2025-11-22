# Deployment Options - Quick Start Guide

Holi Labs supports three deployment strategies. Choose the one that fits your needs:

---

## 1. Digital Ocean App Platform (Recommended for Production)

**Best for:** Production deployments with minimal DevOps overhead

**Features:**
- Fully managed PostgreSQL database
- Auto-scaling
- Built-in SSL/CDN
- Zero-downtime deployments
- Automatic health monitoring

**Quick Start:**
```bash
# 1. Update GitHub repository URL in .do/app.yaml (line 24)
# 2. Create app
doctl apps create --spec .do/app.yaml

# 3. Set secrets via Digital Ocean dashboard
# Apps → Your App → Settings → Environment Variables

# 4. Push to main branch → Auto-deploy
git push origin main
```

**Cost:** ~$25-50/month (Basic tier)

**Setup Time:** 15 minutes

**Documentation:** [.do/app.yaml](.do/app.yaml) | [DEPLOYMENT-DO.md](DEPLOYMENT-DO.md)

---

## 2. VPS with Docker Compose (Full Control)

**Best for:** Cost-sensitive deployments or custom infrastructure needs

**Features:**
- Full server control
- Docker orchestration
- Nginx reverse proxy
- Automated backups
- Custom SSL configuration

**Quick Start:**
```bash
# 1. SSH into your VPS
ssh user@your-vps-ip

# 2. Run setup script
curl -fsSL https://get.docker.com | sh

# 3. Deploy
docker compose -f docker-compose.prod.yml up -d

# 4. Generate SSL certificates
sudo certbot certonly --standalone -d yourdomain.com
```

**Cost:** ~$12-24/month (Droplet/EC2)

**Setup Time:** 30-45 minutes

**Documentation:** [DEPLOYMENT-VPS.md](DEPLOYMENT-VPS.md)

---

## 3. Automated CI/CD Deployments

**Best for:** Teams with continuous deployment workflows

**Features:**
- Automated testing on every push
- Security scanning
- Automatic deployments to staging/production
- Post-deployment health monitoring
- Automatic rollback on failure

**Quick Start:**
```bash
# 1. Configure GitHub Secrets
# Settings → Secrets → Actions

# 2. Push to main branch
git push origin main
# → Automatically deploys to production

# 3. Or manual VPS deployment
gh workflow run deploy-vps.yml -f environment=production -f confirm=deploy
```

**Cost:** Free (GitHub Actions included with repository)

**Setup Time:** 20 minutes (secret configuration)

**Documentation:** [CI-CD-SETUP.md](CI-CD-SETUP.md)

---

## Comparison Matrix

| Feature | Digital Ocean | VPS + Docker | CI/CD |
|---------|--------------|--------------|-------|
| Ease of Setup | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cost | $$$ | $ | Free |
| Control | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Auto-scaling | ✅ | ❌ | Depends on platform |
| Managed DB | ✅ | ❌ | Depends on platform |
| Zero-downtime | ✅ | Manual | ✅ (with workflow) |
| SSL | Auto | Manual | Auto (DO) / Manual (VPS) |
| Backups | Auto | Manual | Manual |
| Monitoring | Built-in | Custom | Custom |

---

## Recommended Approach

### For Production
**Digital Ocean App Platform** with automated CI/CD deployments

Provides the best balance of ease-of-use, reliability, and HIPAA compliance.

### For Staging
**VPS with Docker Compose** for cost savings

Manual deployment acceptable for non-production environments.

### For Development
**Local Docker Compose** for fastest iteration

```bash
docker compose up -d
pnpm dev
```

---

## Next Steps

1. **Choose your deployment strategy** from the options above
2. **Review the detailed documentation** for your chosen method
3. **Configure secrets** (GitHub, environment variables)
4. **Run initial deployment**
5. **Set up monitoring** (Sentry, health checks)
6. **Configure backups** (automated for Digital Ocean, manual for VPS)

---

## Getting Help

- **Deployment Issues:** See troubleshooting section in respective docs
- **GitHub Actions Issues:** Check `.github/workflows/` logs
- **Server Issues:** SSH into VPS and check `docker compose logs`
- **Database Issues:** See [DEPLOYMENT-VPS.md](DEPLOYMENT-VPS.md) backup/restore section

---

## Security Checklist

Before deploying to production:

- [ ] All secrets configured in GitHub/environment
- [ ] SSL certificates generated and installed
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] Strong passwords set (32+ characters)
- [ ] SSH key-based authentication only
- [ ] Database backups configured
- [ ] Health monitoring enabled
- [ ] Error tracking configured (Sentry)
- [ ] Logging retention set to 90+ days
- [ ] HIPAA compliance checklist completed

---

## Support

For detailed setup instructions, see:
- [CI-CD-SETUP.md](CI-CD-SETUP.md) - Complete CI/CD guide
- [DEPLOYMENT-VPS.md](DEPLOYMENT-VPS.md) - VPS deployment guide
- Digital Ocean docs: https://docs.digitalocean.com/products/app-platform/

For issues, open a GitHub issue or contact the DevOps team.
