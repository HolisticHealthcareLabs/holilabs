# 🚨 Deployment Failure Prevention Guide

**Created:** January 16, 2025 (after CSS syntax error incident)
**Purpose:** Prevent production deployment failures systematically

---

## ⚠️ Recent Incident (January 16, 2025)

**What Happened:**
- Production build failed with CSS syntax error
- Invalid property: `justify-center` (should be `justify-content: center`)
- File: `apps/web/src/styles/mobile.css:75`
- Impact: Blocked all deployments for ~10 minutes
- Root cause: Missing CSS validation in pre-commit checks

**Resolution:**
- Fixed CSS syntax error immediately
- Committed hotfix: a8115ad
- Implemented prevention mechanisms (this guide)

---

## ✅ Prevention Mechanisms Now in Place

### 1. Pre-Commit Hooks (Local)

**File:** `.husky/pre-commit`

**What it checks:**
- TypeScript compilation errors
- CSS syntax validation
- ESLint issues (auto-fixes)
- Common deployment blockers

**How to use:**
```bash
# Hooks run automatically on `git commit`
git commit -m "Your message"

# To bypass (NOT RECOMMENDED):
git commit -m "Your message" --no-verify
```

### 2. GitHub Actions CI (Remote)

**File:** `.github/workflows/ci.yml`

**What it checks:**
- Full TypeScript type check
- Lint entire codebase
- CSS syntax validation
- **Complete production build test**
- Uploads build artifacts

**Triggers:**
- Every push to `main` or `develop`
- Every pull request to `main` or `develop`

**How to check:**
1. Go to: https://github.com/HolisticHealthcareLabs/holilabs/actions
2. View latest workflow run
3. Green checkmark = safe to deploy ✅
4. Red X = fix before merging ❌

### 3. Local Build Test (Manual)

Before pushing to main, run:

```bash
cd apps/web
export DATABASE_URL="postgresql://user@localhost:5432/db"
export SESSION_SECRET="test-secret"
export NEXTAUTH_SECRET="test-secret"
pnpm build
```

If build succeeds locally → likely will succeed in production

---

## 🔍 Common Deployment Blockers Checklist

**Before committing to main, check:**

### CSS Issues
- [ ] No invalid CSS properties (`justify-center`, `align-content-center`)
- [ ] All CSS rules end with semicolons
- [ ] No typos in property names
- [ ] Proper flexbox/grid syntax

### TypeScript Issues
- [ ] Run `pnpm tsc --noEmit` with zero errors
- [ ] All imports resolve correctly
- [ ] No `any` types without explicit annotation
- [ ] Proper async/await usage

### Build Configuration
- [ ] All environment variables have fallbacks
- [ ] No hardcoded secrets in code
- [ ] `next.config.js` syntax is valid
- [ ] Prisma schema is valid (`pnpm prisma validate`)

### Dependencies
- [ ] `pnpm-lock.yaml` is committed
- [ ] No version conflicts in `package.json`
- [ ] All peer dependencies satisfied
- [ ] No deprecated packages with breaking changes

### Common Syntax Errors
```css
/* ❌ WRONG */
justify-center;
align-content-center;
flex-direction-row-reverse; /* (typo - should be 'row' or 'column') */

/* ✅ CORRECT */
justify-content: center;
align-items: center;
flex-direction: row;
```

---

## 🚀 Pre-Deployment Checklist

**Before pushing to main:**

1. **Run local checks:**
   ```bash
   cd apps/web
   pnpm tsc --noEmit
   pnpm lint
   pnpm build
   ```

2. **Verify critical files:**
   - [ ] No changes to `.env.production` (secrets)
   - [ ] No changes to `Dockerfile` (unless tested)
   - [ ] No changes to `next.config.js` (unless tested)

3. **Test locally:**
   - [ ] App runs: `pnpm dev`
   - [ ] No console errors in browser
   - [ ] Core flows work (login, create note, etc.)

4. **Git best practices:**
   - [ ] Commit message is descriptive
   - [ ] Changes are focused (not mixing features)
   - [ ] No temporary debug code (`console.log`, commented code)

5. **Push and monitor:**
   - [ ] Push to main
   - [ ] Watch GitHub Actions (link above)
   - [ ] Monitor DigitalOcean deployment logs
   - [ ] Verify health endpoint after deploy

---

## 🆘 If Deployment Fails

### Step 1: Check DigitalOcean Logs

1. Go to: https://cloud.digitalocean.com/apps
2. Click your app → **Runtime Logs** or **Build Logs**
3. Find the error message (usually near the end)

### Step 2: Identify Error Type

**CSS/PostCSS Errors:**
```
Syntax error: /app/apps/web/src/styles/*.css Unknown word
```
→ Fix CSS syntax, commit, push

**TypeScript Errors:**
```
Type error: Cannot find name 'X'
```
→ Fix TypeScript, commit, push

**Build Timeout:**
```
Build exceeded time limit
```
→ Optimize build or increase timeout

**Environment Variable Missing:**
```
Error: Missing environment variable 'X'
```
→ Add to DigitalOcean App Settings

### Step 3: Hotfix Procedure

```bash
# 1. Fix the issue locally
vim apps/web/src/styles/mobile.css

# 2. Test the fix
cd apps/web && pnpm build

# 3. Commit with clear message
git add .
git commit -m "Fix critical deployment error: [describe]"

# 4. Push immediately
git push origin main

# 5. Monitor deployment
# DigitalOcean auto-deploys in 5-10 minutes
```

### Step 4: Rollback (If Needed)

```bash
# Find last working commit
git log --oneline -10

# Revert to last working commit
git revert <commit-hash> --no-edit
git push origin main
```

---

## 📊 Monitoring Deployment Health

### Real-Time Monitoring

**Health Endpoint:**
```bash
curl https://holilabs-lwp6y.ondigitalocean.app/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": true,
  "databaseLatency": 137
}
```

### Post-Deployment Checks

After each deployment:

1. **Health check** (above)
2. **Login test** - Visit production URL, try logging in
3. **Core flow test** - Create a test patient/note
4. **Console check** - Open browser devtools, check for errors
5. **Sentry check** - Review recent errors

---

## 🔧 Preventing Specific Error Types

### CSS Syntax Errors

**Prevention:**
1. Use VS Code CSS IntelliSense
2. Install Stylelint extension
3. Run pre-commit hooks
4. Use Tailwind CSS classes (less error-prone)

**Common mistakes:**
```css
/* Missing 'content' */
justify-center;          → justify-content: center;
align-center;            → align-items: center;

/* Missing semicolon */
color: blue
background: red;         → color: blue;
                           background: red;

/* Invalid values */
display: flex-inline;    → display: inline-flex;
```

### TypeScript Errors

**Prevention:**
1. Enable strict mode in `tsconfig.json`
2. Run `pnpm tsc --noEmit` before committing
3. Use TypeScript's "Go to Definition" to verify imports
4. Avoid `any` types

### Environment Variable Errors

**Prevention:**
1. Use `.env.example` as template
2. Add fallbacks: `process.env.VAR || 'default'`
3. Validate required vars in `instrumentation.ts`
4. Document all vars in `README.md`

### Dependency Errors

**Prevention:**
1. Always use `pnpm install` (not `npm install`)
2. Commit `pnpm-lock.yaml`
3. Run `pnpm audit` before major updates
4. Test locally after dependency updates

---

## 📈 Success Metrics

**Target:**
- Zero deployment failures per month
- 100% of commits pass CI checks
- <5 minutes from commit to production
- 99.9% uptime

**Current Status:**
- Deployment failures: 1 (Jan 16, 2025) - CSS syntax
- Prevention mechanisms: ✅ Installed
- Next review: February 1, 2025

---

## 🔄 Regular Maintenance

**Weekly:**
- [ ] Review DigitalOcean deployment logs
- [ ] Check GitHub Actions success rate
- [ ] Update dependencies (`pnpm update`)

**Monthly:**
- [ ] Run full security audit (`pnpm audit`)
- [ ] Review and update this guide
- [ ] Test rollback procedure
- [ ] Update CI/CD timeouts if needed

---

## 🎯 Quick Reference

**Commands:**
```bash
# Local type check
pnpm tsc --noEmit

# Local build test
pnpm build

# Run all checks
pnpm lint && pnpm tsc --noEmit && pnpm build

# Check health (production)
curl https://holilabs-lwp6y.ondigitalocean.app/api/health

# View deployment logs
doctl apps logs <app-id> --follow
```

**Links:**
- GitHub Actions: https://github.com/HolisticHealthcareLabs/holilabs/actions
- DigitalOcean App: https://cloud.digitalocean.com/apps
- Production Health: https://holilabs-lwp6y.ondigitalocean.app/api/health

---

## 📞 Escalation

**If deployment is blocked and you can't fix it:**

1. Check this guide first
2. Review recent commit history: `git log -10`
3. Check GitHub Actions for detailed error
4. Rollback if needed: `git revert <hash>`
5. Contact senior engineer if still blocked

**Remember:** It's better to rollback and fix properly than to rush a broken deploy to production.

---

**Last Updated:** January 16, 2025
**Next Review:** February 1, 2025
**Maintainer:** Development Team
