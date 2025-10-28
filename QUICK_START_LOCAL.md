# 🚀 Quick Start: Run HoliLabs Locally (5 Minutes)

**Your local development environment is already set up and running!**

---

## ✅ What's Already Done

- ✅ `.env.local` created with Phase 1 & 2 security keys
- ✅ Dependencies installed
- ✅ `deid` package built
- ✅ Development server started at **http://localhost:3000**

---

## 🌐 Access Your Local Site

**Open your browser and go to:**

```
http://129.212.184.190:3000
```

**Or from the terminal:**

```bash
# Open in browser
xdg-open http://129.212.184.190:3000
```

**Note:** If accessing from a different machine, use the server IP (129.212.184.190) instead of localhost

---

## 🎮 What You Can Do Now

### 1. Browse the Site
- Navigate to http://129.212.184.190:3000
- All Phase 1 & 2 security features are active
- Changes you make will auto-reload

### 2. Make Changes
Edit any file in `/root/holilabs/apps/web/src/` and save - the browser will auto-refresh!

### 3. Test Phase 2 Features

**Test Secure Export API:**
```bash
curl -X POST http://129.212.184.190:3000/api/patients/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "JSON",
    "options": {
      "enforceKAnonymity": true,
      "k": 5
    }
  }'
```

**Test Differential Privacy:**
```bash
curl -X POST http://129.212.184.190:3000/api/patients/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "AGGREGATE",
    "options": {
      "applyDifferentialPrivacy": true,
      "epsilon": 0.1
    }
  }'
```

---

## 📁 Important Files

```
/root/holilabs/
├── apps/web/.env.local          ← Your environment variables
├── apps/web/src/                ← Edit your code here
│   ├── app/                     ← Next.js app router
│   ├── lib/security/            ← Phase 1 token generation
│   └── lib/audit/               ← Phase 1 audit logging
├── packages/deid/src/           ← Phase 2 de-identification
│   ├── k-anonymity.ts           ← k-anonymity checker
│   ├── nlp-redaction.ts         ← NLP redaction
│   └── differential-privacy.ts  ← Differential privacy
└── LOCAL_DEVELOPMENT_SETUP.md   ← Full setup guide
```

---

## 🛠️ Common Commands

```bash
# View server logs
tail -f /tmp/dev-server.log

# Stop the server
lsof -ti :3000 | xargs kill -9

# Restart the server
cd /root/holilabs/apps/web && pnpm dev

# Open database GUI
cd /root/holilabs/apps/web && pnpm prisma studio
```

---

## 🔄 Development Workflow

### Making Changes

1. **Edit a file** (e.g., `/root/holilabs/apps/web/src/app/page.tsx`)
2. **Save** - Browser auto-reloads
3. **Test** in browser
4. **Commit** when ready:
   ```bash
   cd /root/holilabs
   git add .
   git commit -m "Your change description"
   ```
5. **Push to deploy to DigitalOcean**:
   ```bash
   git push origin main
   ```

---

## 🐛 Quick Fixes

### Server Not Running?

```bash
# Check if it's running
curl http://129.212.184.190:3000

# If not, start it
cd /root/holilabs/apps/web && pnpm dev
```

### Port 3000 Already in Use?

```bash
# Kill whatever is using port 3000
lsof -ti :3000 | xargs kill -9

# Restart server
cd /root/holilabs/apps/web && pnpm dev
```

### Changes Not Showing?

```bash
# Hard refresh browser: Ctrl+Shift+R (Linux/Windows) or Cmd+Shift+R (Mac)
# Or restart the dev server
```

---

## 🔐 Security Keys Already Set

Your `.env.local` file has Phase 1 & 2 security keys pre-configured:

- ✅ `SALT_ROTATION_KEY` - For secure pseudonymization
- ✅ `DEID_SECRET` - For HMAC pepper layer
- ✅ `NEXTAUTH_SECRET` - For session management
- ✅ `ENCRYPTION_KEY` - For data encryption

**These are the same keys we'll use on DigitalOcean!**

---

## 📊 Monitor Your Changes

### Terminal Logs
```bash
# Watch development server logs in real-time
tail -f /tmp/dev-server.log
```

### Browser Console
Open browser DevTools (F12) to see:
- Network requests
- Console logs
- JavaScript errors

---

## 🚀 Deploy When Ready

Once you're happy with your changes:

```bash
cd /root/holilabs

# Commit your changes
git add .
git commit -m "Describe your changes"

# Push to trigger DigitalOcean deployment
git push origin main
```

**DigitalOcean will automatically:**
1. Detect the git push
2. Pull latest code
3. Build the project
4. Deploy to https://holilabs-lwp6y.ondigitalocean.app

---

## 📝 Next Steps

1. **Browse your local site** at http://129.212.184.190:3000
2. **Make some changes** and watch them reload
3. **Test Phase 2 features** (k-anonymity, differential privacy)
4. **Commit and push** when ready to deploy

For detailed setup instructions, see:
- `LOCAL_DEVELOPMENT_SETUP.md` - Full setup guide
- `DIGITALOCEAN_ENV_SETUP.md` - Production environment setup

---

## 🎉 You're All Set!

Your local HoliLabs instance is running with:
- ✅ Phase 1 security (crypto tokens, PBKDF2, audit logs)
- ✅ Phase 2 features (k-anonymity, NLP, differential privacy)
- ✅ Auto-reload on file changes
- ✅ Ready to develop and test!

**Happy coding! 🚀**
