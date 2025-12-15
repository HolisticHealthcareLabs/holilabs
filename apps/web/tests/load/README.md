# CDSS Load Testing Suite

Comprehensive load testing for the Clinical Decision Support System (CDSS) to ensure production-ready performance.

## Prerequisites

### Install k6

```bash
# macOS (Homebrew)
brew install k6

# macOS (Direct Download)
# Download from: https://k6.io/docs/get-started/installation/

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (Chocolatey)
choco install k6
```

### Start Redis (Required for Caching)

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

### Start Application

```bash
cd apps/web
pnpm dev  # Starts on http://localhost:3000
```

## Running Load Tests

### Basic Load Test

```bash
# Run full load test (15 minutes)
k6 run tests/load/cdss-load-test.js

# Test against different environment
BASE_URL=https://staging.example.com k6 run tests/load/cdss-load-test.js
```

### Quick Smoke Test

```bash
# Run shorter test (5 concurrent users, 1 minute)
k6 run --vus 5 --duration 1m tests/load/cdss-load-test.js
```

### Stress Test (High Load)

```bash
# Test with 200 concurrent users for 10 minutes
k6 run --vus 200 --duration 10m tests/load/cdss-load-test.js
```

### Custom Configuration

```bash
# Override stages with environment variables
k6 run --stage 2m:50,5m:100,2m:0 tests/load/cdss-load-test.js

# Save results to file
k6 run --out json=results.json tests/load/cdss-load-test.js

# Generate HTML report (requires xk6-reporter)
k6 run --out json=results.json tests/load/cdss-load-test.js
k6 run --out web-dashboard tests/load/cdss-load-test.js
```

## Test Scenarios

The load test includes 5 realistic patient scenarios:

### 1. **Multiple Medications with Interactions**
- Patient with Warfarin, Aspirin, and Ibuprofen
- Tests drug-drug interaction detection
- Expected: Critical alerts for NSAID + anticoagulant

### 2. **Allergy Alert**
- Prescribing Penicillin to patient with Penicillin allergy
- Tests allergy checking
- Expected: Critical allergy alert

### 3. **Chronic Disease Management**
- Patient with diabetes, hypertension, hyperlipidemia
- Multiple medications and abnormal labs
- Tests guideline recommendations and lab monitoring

### 4. **Duplicate Therapy**
- Patient on Lisinopril, prescribing Enalapril (both ACE inhibitors)
- Tests duplicate therapy detection
- Expected: Warning about duplicate ACE inhibitor

### 5. **Prevention/Screening**
- 52-year-old female with no active conditions
- Tests preventive care recommendations
- Expected: Age-appropriate screening recommendations

## Performance Targets

### Response Time Thresholds (MUST PASS)
- **p50**: <500ms (median)
- **p95**: <2000ms (95th percentile) ✓ **CRITICAL**
- **p99**: <3000ms (99th percentile)

### Error Rate Thresholds (MUST PASS)
- **HTTP Errors**: <1% ✓ **CRITICAL**
- **Application Errors**: <1%

### System Health Indicators
- **Cache Hit Rate**: >70% (after warmup)
- **Slow Evaluations**: <5% over 2s threshold

## Understanding Results

### Sample Output

```
✓ status is 200                              99.2%
✓ response time < 2s                         98.5%
✓ has alerts array                           100%
✓ has evaluation metadata                    100%

checks.........................: 99.42%
data_received..................: 15 MB
data_sent......................: 2.4 MB
http_req_duration..............: avg=456ms min=23ms med=342ms max=2.1s p(95)=1.2s p(99)=1.8s
  ✓ p(95)<2000.................: true
  ✓ p(99)<3000.................: true
http_req_failed................: 0.8%
  ✓ rate<0.01..................: true
http_reqs......................: 12450
vus............................: 0

cdss_evaluation_duration.......: avg=234ms p(95)=876ms p(99)=1.4s
cache_hits.....................: 78.5%
  ✓ rate>0.7...................: true
alerts_generated...............: 18623
errors.........................: 0.8%
```

### Key Metrics to Monitor

1. **http_req_duration (p95)**: Should be <2000ms
   - This is end-to-end API response time
   - Includes network, parsing, and processing

2. **cdss_evaluation_duration**: Engine processing time only
   - Should be <2000ms at p95
   - Lower is better (indicates good optimization)

3. **cache_hits**: Cache hit rate
   - Should be >70% after warmup phase
   - Higher = better performance and Redis is working

4. **errors**: Application error rate
   - Should be <1%
   - Investigate logs if higher

5. **http_req_failed**: HTTP error rate
   - Should be <1%
   - Check for 500 errors or timeouts

## Troubleshooting

### High Response Times

**Symptoms**: p95 > 2000ms

**Solutions**:
1. Check Redis is running: `redis-cli ping`
2. Verify cache is being used: Look at `cache_hits` metric
3. Check CPU usage on server
4. Review database query performance
5. Increase Redis memory if needed

### Low Cache Hit Rate

**Symptoms**: `cache_hits` < 70%

**Solutions**:
1. Increase warmup phase duration
2. Check Redis memory limits: `redis-cli INFO memory`
3. Verify cache TTL settings in `cds-engine.ts`
4. Check for high patient variation in test data

### High Error Rate

**Symptoms**: `errors` > 1%

**Solutions**:
1. Check application logs: `pnpm dev` output
2. Verify database is accessible
3. Check for rule evaluation errors
4. Review server resources (CPU, memory)

### Redis Connection Errors

**Symptoms**: "ECONNREFUSED" or "Redis not available"

**Solutions**:
```bash
# Check Redis status
redis-cli ping

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux

# Check Redis logs
tail -f /usr/local/var/log/redis.log  # macOS
```

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/performance-test.yml`:

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  load-test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Build application
        run: pnpm build
        working-directory: apps/web

      - name: Start application
        run: |
          pnpm start &
          sleep 10
        working-directory: apps/web

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        run: k6 run tests/load/cdss-load-test.js
        working-directory: apps/web
        env:
          BASE_URL: http://localhost:3000

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: apps/web/results.json
```

## Performance Optimization Tips

### 1. Redis Caching
- Ensure Redis is configured correctly
- Monitor cache hit rate (target: >70%)
- Adjust TTL based on data freshness needs

### 2. Rule Parallelization
- Rules are evaluated in parallel
- CPU-intensive rules should be optimized
- Consider rule priority ordering

### 3. Database Queries
- Add indexes for common queries
- Use Prisma `include` judiciously
- Batch related queries

### 4. Circuit Breaker
- Redis circuit breaker prevents cascading failures
- Monitor circuit breaker state in logs
- Adjust thresholds if needed

## Next Steps

1. **Baseline Performance**: Run initial test to establish baseline
2. **Identify Bottlenecks**: Use results to find slow components
3. **Optimize**: Apply performance improvements
4. **Re-test**: Verify improvements with another test
5. **Monitor Production**: Set up ongoing performance monitoring

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Test Types](https://k6.io/docs/test-types/introduction/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-builder/)
- [Redis Performance](https://redis.io/docs/manual/performance/)
