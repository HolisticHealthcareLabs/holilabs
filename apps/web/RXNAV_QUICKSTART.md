# RxNav API Integration - Quick Start Guide

## 🚀 Getting Started

### 1. Environment Setup (Optional)

For best performance, configure Redis caching:

```bash
# In apps/web/.env.local
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

**Note**: Redis is optional. The system uses in-memory cache as fallback.

### 2. Usage in Code

#### Check Drug Interactions (Async - Recommended)

```typescript
import { checkDrugInteractionsWithAPI } from '@/lib/cds/rules/drug-interactions';

// Example: Check for interactions
const medications = [
  { name: 'Warfarin', rxNormCode: '11289' },
  { name: 'Aspirin', rxNormCode: '1191' },
];

const interactions = await checkDrugInteractionsWithAPI(medications);

if (interactions.length > 0) {
  interactions.forEach(interaction => {
    console.log(`${interaction.severity}: ${interaction.drug1.name} + ${interaction.drug2.name}`);
    console.log(`Description: ${interaction.description}`);
    console.log(`Management: ${interaction.management}`);
  });
}
```

#### Check Drug Interactions (Sync - Fallback Only)

```typescript
import { checkDrugInteractionsHardcoded } from '@/lib/cds/rules/drug-interactions';

// Uses hardcoded database only (14 interactions)
const interactions = checkDrugInteractionsHardcoded(medications);
```

#### Direct RxNav API Access

```typescript
import { rxNavClient } from '@/lib/integrations/rxnav-api';

// Get RxCUI for a drug name
const rxcui = await rxNavClient.getRxCUI('metformin');
console.log(`Metformin RxCUI: ${rxcui}`);

// Get interactions for two drugs
const interactions = await rxNavClient.getInteractions('11289', '1191');

// Check multiple medications
const meds = [
  { name: 'Warfarin', rxNormCode: '11289' },
  { name: 'Aspirin', rxNormCode: '1191' },
  { name: 'Ibuprofen', rxNormCode: '5640' },
];
const allInteractions = await rxNavClient.checkMultipleInteractions(meds);
```

### 3. Monitoring

#### Check API Health

```bash
curl http://localhost:3000/api/health/rxnav
```

#### Get Metrics Programmatically

```typescript
import { getHealthMetrics } from '@/lib/integrations/monitoring';

const health = getHealthMetrics();
console.log('Success Rate:', health.rxnav.health.successRate);
console.log('Cache Hit Rate:', health.rxnav.health.cacheHitRate);
console.log('Average Latency:', health.rxnav.health.averageLatency);
```

### 4. Testing

```bash
# Run integration tests
cd apps/web
npx tsx scripts/test-rxnav-integration.ts
```

## 🎯 Key Features

### Automatic Fallback
The system automatically falls back to hardcoded interactions if the API is unavailable:

```typescript
// You don't need to handle fallback - it's automatic!
const interactions = await checkDrugInteractionsWithAPI(medications);
// ✅ Returns live data if API available
// ✅ Returns hardcoded data if API unavailable
// ✅ Never throws errors - always returns results
```

### Intelligent Caching
- First call: ~500ms (API request)
- Subsequent calls: ~50ms (cache hit)
- RxCUI lookups: Cached 30 days
- Interactions: Cached 7 days

### Rate Limiting Protection
- Automatic exponential backoff
- 5 retries with increasing delays
- 10-second timeout per request
- No manual rate limit handling needed

## 📊 Integration with CDS Engine

The CDS Engine automatically uses the RxNav API:

```typescript
// The drug-interaction-check rule now uses RxNav API automatically
// No changes needed to trigger rules - it just works!

import { cdsEngine } from '@/lib/cds/engines/cds-engine';

const result = await cdsEngine.evaluate({
  patientId: '123',
  userId: 'doc-456',
  hookInstance: 'uuid',
  hookType: 'medication-prescribe',
  context: {
    patientId: '123',
    medications: [
      { id: '1', name: 'Warfarin', status: 'active' },
      { id: '2', name: 'Aspirin', status: 'active' },
    ],
  },
});

// result.alerts will include drug interaction alerts from RxNav API
```

## 🛠️ Common Patterns

### Pattern 1: Medication Order Entry

```typescript
async function validateMedicationOrder(newMedication: string, currentMeds: string[]) {
  const allMeds = [
    ...currentMeds.map(name => ({ name })),
    { name: newMedication },
  ];

  const interactions = await checkDrugInteractionsWithAPI(allMeds);

  // Filter to only interactions involving the new medication
  const relevantInteractions = interactions.filter(
    i => i.drug1.name.includes(newMedication) || i.drug2.name.includes(newMedication)
  );

  if (relevantInteractions.length > 0) {
    return {
      safe: false,
      warnings: relevantInteractions.map(i => ({
        severity: i.severity,
        message: i.description,
        management: i.management,
      })),
    };
  }

  return { safe: true };
}
```

### Pattern 2: Medication Reconciliation

```typescript
async function reconcileMedications(patientMeds: Array<{ name: string }>) {
  const interactions = await checkDrugInteractionsWithAPI(patientMeds);

  // Group by severity
  const critical = interactions.filter(i => i.severity === 'contraindicated');
  const major = interactions.filter(i => i.severity === 'major');
  const moderate = interactions.filter(i => i.severity === 'moderate');

  return {
    totalInteractions: interactions.length,
    criticalCount: critical.length,
    majorCount: major.length,
    moderateCount: moderate.length,
    interactions,
  };
}
```

### Pattern 3: Real-time Validation

```typescript
// In a React component
import { useState, useEffect } from 'react';
import { checkDrugInteractionsWithAPI } from '@/lib/cds/rules/drug-interactions';

function MedicationSelector({ currentMeds }) {
  const [selectedMed, setSelectedMed] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedMed) return;

    const checkInteractions = async () => {
      setLoading(true);
      const allMeds = [...currentMeds, { name: selectedMed }];
      const interactions = await checkDrugInteractionsWithAPI(allMeds);
      setWarnings(interactions);
      setLoading(false);
    };

    checkInteractions();
  }, [selectedMed, currentMeds]);

  return (
    <div>
      <input
        value={selectedMed}
        onChange={(e) => setSelectedMed(e.target.value)}
        placeholder="Enter medication name"
      />
      {loading && <p>Checking for interactions...</p>}
      {warnings.length > 0 && (
        <div className="warnings">
          {warnings.map((w, i) => (
            <div key={i} className={`alert-${w.severity}`}>
              <strong>{w.severity.toUpperCase()}</strong>: {w.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 🔍 Debugging

### Enable Verbose Logging

The system automatically logs:
- Cache hits/misses
- API call timing
- Fallback events
- Error details

Watch your console for:
```
[RxNav] Cache hit for RxCUI: warfarin
[Drug Interactions] RxNav API returned 3 interactions in 234ms
[RxNav] Found RxCUI for aspirin: 1191
```

### Check Health Status

```typescript
import { rxNavClient } from '@/lib/integrations/rxnav-api';

const metrics = rxNavClient.getMetrics();
console.log('Total calls:', metrics.totalCalls);
console.log('Success rate:', metrics.successfulCalls / metrics.totalCalls);
console.log('Cache hit rate:', metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses));

const health = rxNavClient.getHealthStatus();
console.log('Healthy:', health.healthy);
console.log('Average latency:', health.averageLatency);
```

## ⚠️ Important Notes

### RxNorm Codes
- Provide RxNorm codes when available for faster lookups
- If not provided, system will look them up automatically
- Lookups add ~200-500ms to first request

### Caching
- RxCUI lookups are cached for 30 days
- Interactions are cached for 7 days
- Cache is shared across all requests
- Clear cache by restarting app (or manually via Redis)

### Performance
- First request: ~500-1500ms (includes RxCUI lookup)
- Cached requests: ~20-100ms
- Target: <2s for worst case
- Batch requests for multiple medications

### Error Handling
- API failures are handled automatically
- System falls back to hardcoded database
- No errors thrown - always returns results
- Check logs for fallback events

## 📈 Performance Tips

1. **Provide RxNorm codes when available**
   ```typescript
   // FASTER: Includes RxNorm codes
   const meds = [
     { name: 'Warfarin', rxNormCode: '11289' },
     { name: 'Aspirin', rxNormCode: '1191' },
   ];

   // SLOWER: Must lookup RxNorm codes first
   const meds = [
     { name: 'Warfarin' },
     { name: 'Aspirin' },
   ];
   ```

2. **Batch medication checks**
   ```typescript
   // BETTER: Single API call
   const interactions = await checkDrugInteractionsWithAPI(allMeds);

   // WORSE: Multiple API calls
   for (const med of allMeds) {
     const interactions = await checkDrugInteractionsWithAPI([med]);
   }
   ```

3. **Let caching work**
   ```typescript
   // Cache warms up with use
   // First request: ~500ms
   // Second request: ~50ms
   // Don't bypass cache unless absolutely necessary
   ```

## 🎓 Learning Resources

### RxNav API Documentation
- Main site: https://rxnav.nlm.nih.gov/
- API docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/
- Interaction API: https://lhncbc.nlm.nih.gov/RxNav/APIs/InteractionAPIs.html

### RxNorm Basics
- What is RxNorm: https://www.nlm.nih.gov/research/umls/rxnorm/
- RxCUI lookup: https://mor.nlm.nih.gov/RxNav/

### Implementation Details
- Full documentation: See `RXNAV_INTEGRATION.md`
- Source code: `/src/lib/integrations/rxnav-api.ts`
- Test suite: `/scripts/test-rxnav-integration.ts`

## 🆘 Support

### Common Issues

**Q: API calls are slow**
- A: First call is slower (RxCUI lookup). Subsequent calls use cache.
- Solution: Provide RxNorm codes when available.

**Q: Getting fallback warnings**
- A: RxNav API may be temporarily unavailable.
- Solution: System automatically uses hardcoded data. Check `/api/health/rxnav`.

**Q: Want to use hardcoded data only**
- A: Use `checkDrugInteractionsHardcoded()` instead of `checkDrugInteractionsWithAPI()`.

**Q: How to clear cache?**
- A: Restart app, or use Redis CLI to clear cache keys.

### Need Help?

Check the full implementation report: `RXNAV_INTEGRATION.md`
