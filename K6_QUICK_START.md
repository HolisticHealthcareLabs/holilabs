# k6 Load Testing - Quick Start Guide

**5-minute setup guide for HoliLabs load testing**

---

## ⚡ Fastest Path to Running Tests

### 1. Install k6 (2 minutes)

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

Verify:
```bash
k6 version
```

---

### 2. Run Your First Test (1 minute)

**Option A: Run all tests on staging**
```bash
./k6/run-tests.sh all staging
```

**Option B: Run single test**
```bash
./k6/run-tests.sh login-surge staging
```

**Option C: Direct k6 command**
```bash
export BASE_URL="https://staging.holilabs.xyz"
k6 run k6/scenarios/01-login-surge.js
```

---

### 3. View Results (1 minute)

Results are displayed in terminal:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LOGIN SURGE TEST RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Response Time (p95): 1842.34ms ✓
  Response Time (p99): 4231.12ms ✓
  Error Rate: 0.023% ✓
  Total Requests: 15423

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

JSON results saved to: `k6/results/`

---

## 🎯 Common Commands

### Run Specific Scenarios

```bash
# Login testing
./k6/run-tests.sh login-surge staging

# Appointment booking
./k6/run-tests.sh appointment-booking staging

# AI processing
./k6/run-tests.sh soap-generation staging

# Portal traffic
./k6/run-tests.sh portal-traffic staging

# API stress test
./k6/run-tests.sh api-stress staging
```

### Run Against Different Environments

```bash
# Staging (recommended)
./k6/run-tests.sh all staging

# Local development
./k6/run-tests.sh all local

# Production (with confirmation prompt)
./k6/run-tests.sh all production
```

### Custom Duration

```bash
# Run for 5 minutes instead of default
./k6/run-tests.sh login-surge staging 5m

# Quick smoke test (1 minute)
./k6/run-tests.sh api-stress staging 1m
```

---

## 📊 Available Test Scenarios

| Scenario | Load | Duration | Purpose |
|----------|------|----------|---------|
| **login-surge** | 100 users | 10m | Authentication stress test |
| **appointment-booking** | 50 users | 9m | Booking system validation |
| **soap-generation** | 20 AI requests | 12m | AI pipeline capacity test |
| **portal-traffic** | 200 users | 17m | Overall system capacity |
| **api-stress** | 500 req/s | 5m | API endpoint stress test |
| **all** | Combined | ~45m | Complete test suite |

---

## ✅ Success Criteria

Your tests pass if:

- ✓ Response time p95 < 2000ms
- ✓ Response time p99 < 5000ms
- ✓ Error rate < 0.1%
- ✓ No rate limiting issues
- ✓ All thresholds marked with ✓

---

## 🚨 If Tests Fail

**High error rates:**
1. Check if API is accessible: `curl $BASE_URL/api/health`
2. Verify authentication token
3. Review rate limits

**Slow response times:**
1. Check database performance
2. Review Sentry for bottlenecks
3. Monitor server resources

**Connection issues:**
1. Verify BASE_URL is correct
2. Check network connectivity
3. Ensure services are running

---

## 🔧 Optional: Configure Authentication

For authenticated tests, create `.env.test`:

```bash
# Copy example file
cp k6/.env.test.example k6/.env.test

# Edit with your values
BASE_URL=https://staging.holilabs.xyz
API_KEY=your-api-key-here
```

Or export variables:

```bash
export BASE_URL="https://staging.holilabs.xyz"
export API_KEY="your-api-key-here"
```

---

## 📚 Next Steps

After successful testing:

1. ✅ Review full documentation: `k6/README.md`
2. ✅ Set up GitHub Actions for automated tests
3. ✅ Configure monitoring dashboards
4. ✅ Integrate with Grafana (optional)

---

## 💡 Pro Tips

1. **Always test staging first** before production
2. **Monitor dashboards** during tests (Sentry, DigitalOcean)
3. **Run during off-peak hours** for production tests
4. **Notify the team** before running production tests
5. **Keep API keys secure** (use .env.test, never commit)

---

## 🎉 You're Ready!

Run your first test now:

```bash
./k6/run-tests.sh login-surge staging
```

---

**Need help?** Read the full documentation in `k6/README.md`

**Status:** ✅ Ready to use
**Version:** 1.0.0
