# 🌐 Domain Migration to holilabs.xyz

## ✅ Pre-Migration Checklist

- [ ] Choose deployment platform (DigitalOcean or Vercel)
- [ ] Have access to domain registrar (where holilabs.xyz is registered)
- [ ] Backup current database
- [ ] Document current environment variables

---

## 🚀 Migration Steps

### **Option A: DigitalOcean App Platform**

#### 1. DNS Configuration
Add these records at your domain registrar:

```
Type: A
Name: @
Value: [Get from DigitalOcean App Dashboard]
TTL: 3600

Type: CNAME
Name: www
Value: holilabs.xyz
TTL: 3600
```

#### 2. DigitalOcean Configuration

```bash
# List your apps
doctl apps list

# Get app details
doctl apps get <app-id>

# Add domain in dashboard:
# Apps → Your App → Settings → Domains → Add Domain
# - holilabs.xyz
# - www.holilabs.xyz
```

#### 3. Update Environment Variables

In DigitalOcean Dashboard (Apps → Settings → Environment Variables):

```bash
NEXT_PUBLIC_APP_URL=https://holilabs.xyz
NEXTAUTH_URL=https://holilabs.xyz
NEXTAUTH_SECRET=[generate-new-secret]
```

#### 4. Deploy

```bash
git add .
git commit -m "Configure holilabs.xyz domain"
git push origin main
```

DigitalOcean will auto-deploy from GitHub.

---

### **Option B: Vercel (Recommended for Speed)**

#### 1. Deploy to Vercel

```bash
cd /Users/nicolacapriroloteran/holilabs-health-ai
pnpm install -g vercel
vercel login
vercel --prod
```

#### 2. Add Custom Domain

```bash
vercel domains add holilabs.xyz
vercel domains add www.holilabs.xyz
```

#### 3. Configure DNS

Vercel will show you the exact DNS records. Typically:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### 4. Set Environment Variables

```bash
# Set production env vars
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://holilabs.xyz

vercel env add NEXTAUTH_URL production
# Enter: https://holilabs.xyz

vercel env add DATABASE_URL production
# Enter: [your-production-database-url]
```

#### 5. Redeploy

```bash
vercel --prod
```

---

## 🔐 Security Checklist

### **SSL Certificate**
- [ ] SSL automatically provisioned by platform
- [ ] Force HTTPS redirect enabled
- [ ] Test: https://holilabs.xyz (should work)
- [ ] Test: http://holilabs.xyz (should redirect to https)

### **Environment Variables to Update**

```bash
# Required
NEXT_PUBLIC_APP_URL=https://holilabs.xyz
NEXTAUTH_URL=https://holilabs.xyz
VAPID_EMAIL=mailto:notifications@holilabs.xyz

# Optional (if using)
ALLOWED_ORIGINS=https://holilabs.xyz,https://www.holilabs.xyz
CORS_ORIGIN=https://holilabs.xyz
```

### **Generate New Secrets for Production**

```bash
# NextAuth secret
openssl rand -base64 32

# Session secret
openssl rand -hex 32

# Encryption key
openssl rand -hex 32
```

---

## 🧪 Testing Checklist

After migration, test:

- [ ] **Homepage**: https://holilabs.xyz
- [ ] **WWW redirect**: https://www.holilabs.xyz → https://holilabs.xyz
- [ ] **HTTP redirect**: http://holilabs.xyz → https://holilabs.xyz
- [ ] **Login**: Test authentication flow
- [ ] **API Routes**: Test /api/health or /api/patients
- [ ] **Database Connection**: Verify data loads
- [ ] **File Uploads**: Test Supabase storage
- [ ] **Email**: Test Resend integration
- [ ] **SMS/WhatsApp**: Test Twilio integration
- [ ] **SSL Certificate**: Check green padlock in browser
- [ ] **Performance**: Run Lighthouse audit

---

## 📊 DNS Propagation

**DNS changes can take 1-48 hours to propagate globally.**

Check propagation status:
```bash
# Check if DNS is live
dig holilabs.xyz
nslookup holilabs.xyz

# Online checker
https://dnschecker.org/#A/holilabs.xyz
```

---

## 🔄 Rollback Plan

If something goes wrong:

### **Quick Rollback**

1. **Revert DNS**: Point holilabs.xyz back to old IP
2. **Revert Env Vars**: Restore previous `NEXT_PUBLIC_APP_URL`
3. **Redeploy**: Deploy previous version

### **Keep Old Domain Active**

Keep your old domain active for 30 days as backup:
- Old domain continues to work
- New domain holilabs.xyz added alongside
- Gradual migration of users

---

## 📝 Post-Migration Tasks

- [ ] Update Google Search Console with new domain
- [ ] Update Google Analytics/Tag Manager
- [ ] Update social media profiles
- [ ] Update email signatures
- [ ] Update marketing materials
- [ ] Notify users of new domain
- [ ] Set up 301 redirects from old domain (if applicable)
- [ ] Update API documentation
- [ ] Update mobile app configurations (if applicable)
- [ ] Monitor error logs for 48 hours
- [ ] Update SSL pinning (if using mobile apps)

---

## 🆘 Troubleshooting

### **"Site can't be reached"**
- DNS not propagated yet (wait 24-48 hours)
- Check DNS records at registrar
- Clear browser DNS cache: `chrome://net-internals/#dns`

### **"SSL Certificate Invalid"**
- Wait for platform to provision cert (5-15 minutes)
- Force SSL renewal in platform dashboard
- Check CNAME record is correct

### **"Database Connection Error"**
- Verify `DATABASE_URL` env var is set correctly
- Check database IP whitelist includes new platform IPs
- Test database connection from platform console

### **"API calls failing"**
- Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`
- Check CORS settings allow new domain
- Verify all webhooks updated to new domain

---

## 🎯 Quick Start (Choose Your Path)

### **Path 1: Vercel (Fastest)**
```bash
vercel --prod
vercel domains add holilabs.xyz
# Add DNS records shown by Vercel
# Wait 15 minutes → Done! 🎉
```

### **Path 2: DigitalOcean**
```bash
doctl apps list
# Add domain in dashboard
# Add DNS A record
# Deploy from GitHub
# Wait 30 minutes → Done! 🎉
```

---

## 📞 Support

- **Vercel**: https://vercel.com/support
- **DigitalOcean**: https://www.digitalocean.com/support
- **DNS Issues**: Check with your domain registrar

---

## ✅ Migration Complete!

Once everything is working:

1. ✅ Site loads at https://holilabs.xyz
2. ✅ SSL certificate valid (green padlock)
3. ✅ All features tested and working
4. ✅ Users notified
5. ✅ Old domain (if any) set to redirect

**🎉 Congratulations! Your site is now live at holilabs.xyz**
