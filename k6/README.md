# HoliLabs Load Testing with k6

Comprehensive load testing suite for validating HoliLabs' production readiness and performance under stress.

## 📊 Test Scenarios

### 1. Login Surge Test (`01-login-surge.js`)
**Purpose:** Tests authentication system resilience during peak hours

- **Load:** 100 concurrent users
- **Duration:** 10 minutes
- **Targets:**
  - p95 response time < 2000ms
  - p99 response time < 5000ms
  - Error rate < 0.1%

**Simulates:**
- Magic link requests
- Session validation
- High concurrent authentication traffic

---

### 2. Appointment Booking Peak (`02-appointment-booking-peak.js`)
**Purpose:** Validates appointment scheduling system under load

- **Load:** 50 concurrent users
- **Duration:** 9 minutes
- **Targets:**
  - p95 response time < 3000ms
  - Full booking flow < 5000ms (p95)
  - Error rate < 0.1%

**Simulates:**
- Viewing available time slots
- Booking appointments
- Verifying bookings
- Calendar conflicts

---

### 3. SOAP Note Generation (`03-soap-note-generation.js`)
**Purpose:** Tests AI processing pipeline capacity

- **Load:** 20 concurrent AI requests
- **Duration:** 12 minutes
- **Targets:**
  - Transcription time < 15s (p95)
  - AI processing < 30s (p95)
  - Average confidence score > 80%

**Simulates:**
- Audio transcription
- AI-powered SOAP note generation
- Confidence scoring
- Review queue workflow

---

### 4. Patient Portal Traffic (`04-patient-portal-traffic.js`)
**Purpose:** Tests overall system capacity with realistic user behavior

- **Load:** 200 concurrent users
- **Duration:** 17 minutes
- **Targets:**
  - p95 response time < 2000ms
  - Page load time < 3000ms (p95)
  - Error rate < 0.1%

**Simulates:**
- Dashboard browsing
- Medical records viewing
- Message reading
- Profile updates
- Document downloads

---

### 5. API Stress Test (`05-api-stress-test.js`)
**Purpose:** Stresses critical API endpoints at scale

- **Load:** 500 requests/second
- **Duration:** 5 minutes
- **Targets:**
  - p95 response time < 1000ms
  - API latency < 800ms (p95)
  - Success rate > 99%

**Tests:**
- Health check endpoint
- Authentication APIs
- Patient queries
- Appointment APIs
- Medication search
- Lab results
- Analytics endpoints

---

## 🚀 Quick Start

### Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6

# Docker
docker pull grafana/k6:latest
```

Verify installation:

```bash
k6 version
```

---

## 🎯 Running Tests

### Method 1: Using the Helper Script (Recommended)

```bash
# Run all scenarios against staging
./k6/run-tests.sh all staging

# Run specific scenario
./k6/run-tests.sh login-surge staging

# Run against production (with confirmation)
./k6/run-tests.sh all production

# Run with custom duration
./k6/run-tests.sh api-stress staging 3m

# Run locally
./k6/run-tests.sh portal-traffic local
```

### Method 2: Direct k6 Command

```bash
# Set environment variables
export BASE_URL="https://staging.holilabs.xyz"
export API_KEY="your-api-key-here"

# Run specific test
k6 run k6/scenarios/01-login-surge.js

# Run with output to file
k6 run k6/scenarios/02-appointment-booking-peak.js --out json=results.json

# Run with custom duration
k6 run k6/scenarios/03-soap-note-generation.js --duration 5m

# Run with custom VUs
k6 run k6/scenarios/04-patient-portal-traffic.js --vus 100
```

### Method 3: GitHub Actions (CI/CD)

Trigger manually from GitHub Actions:

1. Go to: `https://github.com/HolisticHealthcareLabs/holilabs/actions`
2. Select "Load Testing (k6)"
3. Click "Run workflow"
4. Choose:
   - Environment (staging/production)
   - Scenario (all or specific)
   - Optional duration override

Automated weekly runs:
- Runs every Sunday at 3 AM UTC
- Tests staging environment
- Results uploaded as artifacts

---

## 📈 Understanding Results

### Command Line Output

Each test provides a summary with:
- **Response times:** p50, p95, p99 latencies
- **Error rates:** HTTP failures and custom errors
- **Success rates:** Percentage of successful requests
- **Custom metrics:** Scenario-specific measurements

Example output:

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

✓ = Passed threshold
✗ = Failed threshold

### JSON Results

Results are saved to `k6/results/*.json` with detailed metrics:

```json
{
  "metrics": {
    "http_req_duration": {
      "values": {
        "avg": 1234.56,
        "p(95)": 2000.00,
        "p(99)": 4500.00
      }
    },
    "http_req_failed": {
      "values": {
        "rate": 0.0002
      }
    }
  }
}
```

---

## 🎓 Best Practices

### Before Running Load Tests

1. **Notify the team** if testing production
2. **Verify test data** is set up correctly
3. **Check API keys** are valid
4. **Monitor resources** (CPU, memory, database)
5. **Have rollback plan** ready

### During Load Tests

1. **Monitor dashboards** (Sentry, DigitalOcean)
2. **Watch error logs** in real-time
3. **Track database performance**
4. **Observe API gateway metrics**

### After Load Tests

1. **Review all metrics** against thresholds
2. **Identify bottlenecks** from p99 latencies
3. **Check error logs** for patterns
4. **Document findings**
5. **Create optimization tasks** if needed

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
BASE_URL="https://holilabs.xyz"

# Optional (for authenticated tests)
API_KEY="your-api-key-here"

# Override test duration
K6_DURATION="5m"

# Override virtual users
K6_VUS="100"
```

Create `.env.test` file:

```bash
BASE_URL=https://staging.holilabs.xyz
API_KEY=sk-test-key-here
```

### config.json

Edit `k6/config.json` to:
- Modify test scenarios
- Adjust thresholds
- Configure monitoring integrations
- Set environment URLs

---

## 📊 Advanced Usage

### Cloud Integration

Run tests in k6 Cloud for advanced analytics:

```bash
# Sign up at https://app.k6.io
k6 login cloud

# Run test in cloud
k6 cloud k6/scenarios/01-login-surge.js
```

### Grafana Integration

Real-time monitoring with Grafana:

```bash
# Install InfluxDB
docker run -d --name influxdb -p 8086:8086 influxdb:1.8

# Run k6 with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 k6/scenarios/01-login-surge.js
```

Then visualize in Grafana:
- Import k6 dashboard template
- Connect to InfluxDB data source
- View real-time metrics

### Custom Metrics

Add custom metrics in test scripts:

```javascript
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

const myTrend = new Trend('custom_duration');
const myCounter = new Counter('custom_counter');
const myRate = new Rate('custom_rate');
const myGauge = new Gauge('custom_gauge');

export default function() {
  myTrend.add(response.timings.duration);
  myCounter.add(1);
  myRate.add(response.status === 200);
  myGauge.add(response.body.length);
}
```

---

## 🚨 Troubleshooting

### Tests Failing

**Problem:** High error rates
- **Solution:** Check API availability, rate limits, authentication

**Problem:** Timeouts
- **Solution:** Increase timeout in test script or reduce load

**Problem:** Connection refused
- **Solution:** Verify BASE_URL is correct and accessible

### Performance Issues

**Problem:** p95 > threshold
- **Check:** Database query performance
- **Check:** API response times in Sentry
- **Check:** Server resources (CPU, memory)

**Problem:** Rate limiting triggered
- **Solution:** Adjust test load or increase rate limits

### k6 Installation Issues

**Problem:** Command not found
- **Solution:** Follow installation steps above, ensure in PATH

**Problem:** Permission denied
- **Solution:** `chmod +x k6/run-tests.sh`

---

## 📋 Test Checklist

Before deploying to production, ensure:

- [ ] All 5 load tests pass on staging
- [ ] p95 latencies within thresholds
- [ ] Error rates < 0.1%
- [ ] No rate limiting issues
- [ ] Database performance acceptable
- [ ] API gateway handles load
- [ ] Monitoring alerts configured
- [ ] Team notified of test schedule

---

## 🎯 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| **Response Time (p95)** | < 2000ms | < 5000ms |
| **Response Time (p99)** | < 5000ms | < 10000ms |
| **Error Rate** | < 0.1% | < 1% |
| **Success Rate** | > 99% | > 95% |
| **Throughput** | > 100 req/sec | > 50 req/sec |

---

## 📚 Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Cloud](https://app.k6.io)
- [Grafana k6 Dashboards](https://grafana.com/grafana/dashboards/?search=k6)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/api-load-testing/)

---

## 🤝 Contributing

To add new load test scenarios:

1. Create new file in `k6/scenarios/`
2. Follow naming convention: `##-scenario-name.js`
3. Include summary handler
4. Add to `config.json`
5. Update this README
6. Test locally before committing

---

## 📞 Support

For load testing issues:
1. Check test output and logs
2. Review `config.json` settings
3. Verify environment configuration
4. Check GitHub Actions logs (for CI tests)

---

**Status:** ✅ Production Ready
**Last Updated:** December 15, 2025
**Version:** 1.0.0
