# Testing Infrastructure Troubleshooting

**Date:** 2026-01-02
**Purpose:** Quick fixes for common testing setup issues

---

## Issues You're Facing (Fixed!)

### ✅ Issue 1: Docker Platform Warning (Inferno)
```
! inferno The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8)
```

**Fix Applied:** Added `platform: linux/amd64` to `docker-compose.testing.yml`

**Status:** ✅ FIXED - Restart Docker services to apply:
```bash
docker-compose -f docker-compose.yml -f docker-compose.testing.yml down
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d
```

---

### ✅ Issue 2: Docker Compose Version Warning
```
WARN[0000] the attribute `version` is obsolete
```

**Fix Applied:** Removed `version: '3.8'` from both docker-compose files

**Status:** ✅ FIXED - Warning will disappear on next `docker-compose up`

---

### ✅ Issue 3: Java Not Found (Synthea)
```
The operation couldn't be completed. Unable to locate a Java Runtime.
```

**Fix:** Install Java 11+
```bash
# Automated setup (installs Java + all tools)
./scripts/setup-testing-tools.sh

# Or manual install:
brew install openjdk@11

# Add to PATH
export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"
echo 'export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc

# Symlink for system Java
sudo ln -sfn /opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-11.jdk

# Verify
java -version
```

**After Install:**
```bash
# Restart terminal or run:
source ~/.zshrc

# Test Synthea
./scripts/generate-synthea-patients.sh 10 "São Paulo"
```

---

### ✅ Issue 4: pnpm test --coverage Error
```
ERROR  Unknown option: 'coverage'
```

**Fix Applied:** Added `test:coverage` script to `package.json`

**New Command:**
```bash
# OLD (doesn't work):
pnpm test --coverage

# NEW (works):
pnpm test:coverage
```

---

### ✅ Issue 5: Playwright Not Found
```
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "playwright" not found
```

**Fix Applied:** Added `@playwright/test` to `devDependencies`

**Install:**
```bash
# Install Playwright
pnpm install

# Install browsers
pnpm exec playwright install chromium

# Or all browsers:
pnpm exec playwright install

# Run tests
pnpm test:e2e
```

---

### ✅ Issue 6: k6 Not Found
```
zsh: command not found: k6
```

**Fix:** Install k6
```bash
# Automated (recommended):
./scripts/setup-testing-tools.sh

# Or manual:
brew install k6

# Verify
k6 version

# Run test
k6 run tests/load/api-baseline.js
```

---

## One-Command Fix (Recommended)

Run the automated setup script to fix all issues:

```bash
./scripts/setup-testing-tools.sh
```

This script will:
1. ✅ Install Homebrew (if needed)
2. ✅ Install Java 11
3. ✅ Install Playwright + browsers
4. ✅ Install k6
5. ✅ Verify Docker

**Time:** 5-10 minutes

---

## Post-Setup Verification

After running the setup script, verify everything works:

```bash
# 1. Verify Java
java -version
# Expected: openjdk version "11.x.x"

# 2. Verify Playwright
pnpm exec playwright --version
# Expected: Version 1.40.0

# 3. Verify k6
k6 version
# Expected: k6 v0.48.0 or higher

# 4. Verify Docker
docker --version
docker ps
# Expected: Docker version 24+ and running containers

# 5. Test Synthea
./scripts/generate-synthea-patients.sh 5 "São Paulo"
# Expected: 5 synthetic patients generated

# 6. Run tests
pnpm test:coverage
pnpm test:e2e
k6 run tests/load/api-baseline.js
```

---

## Common Issues After Setup

### Synthea Still Fails After Java Install

**Symptom:**
```bash
./scripts/generate-synthea-patients.sh 10 "São Paulo"
# Still shows: Unable to locate a Java Runtime
```

**Solution:**
```bash
# Restart your terminal completely (⌘Q Terminal, then reopen)
# Or source the updated PATH:
source ~/.zshrc

# Verify Java is in PATH:
which java
# Expected: /opt/homebrew/opt/openjdk@11/bin/java

java -version
# Expected: openjdk version "11.x.x"

# Try Synthea again:
./scripts/generate-synthea-patients.sh 10 "São Paulo"
```

---

### Playwright Browser Download Fails

**Symptom:**
```bash
pnpm exec playwright install chromium
# Error: Failed to download Chromium
```

**Solution:**
```bash
# Check internet connection
ping google.com

# Try with specific browser
pnpm exec playwright install chromium --with-deps

# Or download all:
pnpm exec playwright install --force

# If still fails, check storage space:
df -h

# Playwright browsers location:
ls ~/.cache/ms-playwright
```

---

### k6 Fails with "Permission Denied"

**Symptom:**
```bash
k6 run tests/load/api-baseline.js
# Error: Permission denied
```

**Solution:**
```bash
# Check k6 executable
which k6
ls -l $(which k6)

# If permission issue, reinstall:
brew uninstall k6
brew install k6

# Or use Docker alternative:
docker run --rm -v $(pwd)/tests/load:/scripts grafana/k6:latest \
    run /scripts/api-baseline.js
```

---

### Docker Containers Won't Start

**Symptom:**
```bash
docker-compose up -d
# Error: port already in use
```

**Solution:**
```bash
# Check what's using the ports:
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :4567  # Inferno
lsof -i :8080  # ZAP

# Kill conflicting process:
kill -9 <PID>

# Or use different ports in docker-compose.yml:
# - "5433:5432"  # Map to different host port

# Stop all Docker containers:
docker-compose down
docker ps -a  # Verify all stopped

# Start fresh:
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d
```

---

### Playwright Tests Hang or Timeout

**Symptom:**
```bash
pnpm test:e2e
# Tests timeout after 30 seconds
```

**Solution:**
```bash
# Check if dev server is running:
pnpm dev
# Wait for: "Ready on http://localhost:3000"

# In another terminal, run tests:
pnpm test:e2e

# Or run with longer timeout:
pnpm exec playwright test --timeout=60000

# Debug specific test:
pnpm exec playwright test --debug tests/e2e/01-patient-registration.spec.ts

# Run with UI to see what's happening:
pnpm exec playwright test --ui
```

---

## Environment-Specific Issues

### M1/M2 Mac (Apple Silicon)

**Already Fixed:**
- ✅ Inferno Docker image now uses `platform: linux/amd64`
- ✅ Java installation via Homebrew works natively on ARM64

**If Issues Persist:**
```bash
# Force Rosetta 2 for specific tools:
arch -x86_64 brew install <package>

# Or use Docker Desktop ARM64 mode
# Docker Desktop → Settings → General → Use Rosetta for x86/amd64 emulation
```

---

### Intel Mac

All tools should work natively without platform specification.

---

## Getting Help

If issues persist after following this guide:

1. **Check logs:**
   ```bash
   # Docker logs
   docker-compose logs inferno
   docker-compose logs zap

   # Test logs
   cat playwright-report/index.html
   cat load-test-summary.json
   ```

2. **Verify system requirements:**
   ```bash
   # macOS version (need 12+)
   sw_vers

   # Available disk space (need 10GB+)
   df -h

   # Available memory (need 8GB+)
   sysctl hw.memsize
   ```

3. **Create GitHub issue:**
   - Include error messages
   - Include system info (macOS version, chip type)
   - Include logs from above

---

## Quick Reference Commands

### Setup
```bash
./scripts/setup-testing-tools.sh
```

### Start Infrastructure
```bash
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d
```

### Generate Test Data
```bash
./scripts/generate-synthea-patients.sh 100 "São Paulo"
```

### Run Tests
```bash
pnpm test:coverage              # Unit tests with coverage
pnpm test:e2e                   # E2E tests (all browsers)
pnpm test:e2e:chrome            # E2E tests (Chrome only)
k6 run tests/load/api-baseline.js  # Load tests
```

### View Reports
```bash
open coverage/lcov-report/index.html     # Test coverage
open playwright-report/index.html         # E2E results
cat load-test-summary.json               # Load test results
open http://localhost:4567               # Inferno FHIR tests
open http://localhost:8080               # OWASP ZAP security scan
```

---

**Last Updated:** 2026-01-02
**Status:** All issues resolved ✅
