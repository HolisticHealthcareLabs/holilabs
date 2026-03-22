# @holi/integration-tests

End-to-end integration tests for the Health 3.0 platform. Validates the complete data flow across all packages without requiring Redis, databases, or external services.

## Overview

This package tests the complete pipeline:

```
FHIR Data → Ingestion → Canonical → Event Bus → Prevention Engine → FHIR Output
```

All 4 safety invariants are enforced and tested:

- **CYRUS**: Tenant isolation in events
- **ELENA**: Evidence sourcing in alerts
- **RUTH**: ANVISA/RNDS compliance
- **QUINN**: Non-blocking error handling

## Test Suites

### 1. `e2e-ingestion-flow.test.ts`

Tests the complete data pipeline from FHIR ingestion through prevention evaluation.

**Tests:**
- FHIR Bundle → canonical conversion without imputation (ELENA)
- Canonical → event publishing with tenantId (CYRUS)
- Event → prevention evaluation
- Prevention alerts generation
- Pipeline timing < 100ms (no I/O)
- QUINN: Event bus failures don't crash
- ELENA: Invalid records produce no alerts

### 2. `e2e-fhir-roundtrip.test.ts`

Tests bidirectional FHIR conversion with prevention alerts.

**Tests:**
- FHIR Bundle → canonical → evaluation → data integrity
- Patient data preservation (CPF, addresses, demographics)
- Observation data preservation (lab values, units, codes)
- Condition preservation (ICD-10 codes)
- Medication preservation (ANVISA codes)
- Prevention alerts generated during canonical phase
- Complex FHIR structures handled correctly
- Source authority preserved through pipeline

### 3. `safety-invariants.test.ts`

Dedicated tests for all 4 safety invariants.

**CYRUS (Tenant Isolation):**
- tenantId present in every event envelope
- Cross-tenant data isolation in alerts
- Patient IDs don't leak between tenants

**ELENA (Evidence Sourcing):**
- sourceAuthority + citationUrl in every alert
- humanReviewRequired=true for all alerts
- Source authority preserved in canonical records
- No imputation of missing values

**RUTH (ANVISA Compliance):**
- CPF format validation (11 digits)
- ICD-10 code preservation
- ANVISA medication code preservation
- CEP format (8 digits)
- State code format (2 characters, UF)

**QUINN (Non-blocking):**
- Invalid records don't throw
- Evaluation continues despite issues
- Batch processing resilient to failures

### 4. `brazilian-compliance.test.ts`

Brazil-specific compliance testing (RNDS/ANVISA/LGPD).

**CPF Validation:**
- Extract and validate CPF from FHIR Patient
- Preserve through bundle conversion
- Handle missing CPF gracefully

**ICD-10 Preservation:**
- Preserve codes like E11.9 (Type 2 Diabetes)
- Preserve codes like E87.6 (Hypokalemia)
- Preserve codes like O80 (Pregnancy)
- Through full bundle conversion

**ANVISA Medication Codes:**
- Preserve RxNorm codes
- Prefer ANVISA codes when available
- Preserve through full bundle

**Address Format:**
- Format CEP as 8 digits
- Pad CEP if shorter
- Validate state code (2 chars, UF)
- Preserve full address through pipeline

**Bundle Validation:**
- Complete bundle conversion
- Patient extraction
- Observation extraction
- Condition extraction with ICD-10
- Medication extraction
- Data integrity through pipeline

**LGPD Protection:**
- Sensitive field preservation with proper marking
- Phone number handling
- Audit trail (sourceAuthority)
- Import timestamp

## Test Fixtures

### `fhir-bundle-diabetic-patient.ts`

Realistic FHIR Bundle: João Silva, 58yo male, São Paulo

**Resources:**
- Patient with CPF 12345678901
- HbA1c = 7.2% (triggers HIGH severity alert)
- Fasting Glucose = 145 mg/dL
- Blood Pressure = 142/88 mmHg (Stage 2 hypertension)
- Condition: Type 2 Diabetes (ICD-10: E11.9)
- Medication: Metformin 850mg (RxNorm: 860998)
- Medication: Losartan 50mg (RxNorm: 83515)

### `fhir-bundle-pregnant-patient.ts`

Realistic FHIR Bundle: Maria Santos, 28yo female, Rio de Janeiro

**Resources:**
- Patient with CPF 98765432109
- Pregnancy condition (ICD-10: O80)
- Gestational age = 28 weeks
- Blood Pressure = 128/82 mmHg
- Medication: Prenatal Vitamin

### `fhir-bundle-emergency.ts`

Realistic FHIR Bundle: Carlos Oliveira, emergency patient

**Resources:**
- Patient with CPF 55544433322
- Emergency encounter (in-progress)
- Critical potassium = 2.3 mEq/L (triggers CRITICAL alert)
- Condition: Hypokalemia (ICD-10: E87.6)

## Running Tests

```bash
# Install dependencies
pnpm install

# Run all tests with verbose output
pnpm test

# Run with watch mode
pnpm test:watch

# Run specific test suite
pnpm test e2e-ingestion-flow.test.ts
pnpm test safety-invariants.test.ts
pnpm test brazilian-compliance.test.ts
pnpm test e2e-fhir-roundtrip.test.ts
```

## Test Coverage

Tests validate:

1. **Data Flow**: FHIR → Canonical → Events → Alerts → FHIR
2. **Data Integrity**: No data loss through conversions
3. **Safety Invariants**: CYRUS, ELENA, RUTH, QUINN
4. **Compliance**: RNDS, ANVISA, LGPD
5. **Performance**: < 100ms for in-process pipeline
6. **Error Handling**: Graceful failure modes

## Architecture Notes

- **No external dependencies**: Tests use real instances of all classes, mocks for I/O only
- **No Redis required**: EventPublisher tested with mock Redis
- **No database required**: In-memory evaluation
- **Real prevention rules**: Uses actual rule registry from prevention-engine
- **Real converters**: Uses actual FHIR↔Canonical converters
- **Real validators**: Uses actual Zod schemas

## Key Invariants Tested

### CYRUS (Tenant Isolation)
```typescript
// Every event must have tenantId
{
  type: 'record.ingested',
  payload: {
    tenantId: string, // REQUIRED
    patientId: string,
    // No cross-tenant data leakage
  }
}
```

### ELENA (Evidence Sourcing)
```typescript
// Every alert must cite source + have human review flag
{
  citationUrl: string, // Must be valid URL
  rule: {
    sourceAuthority: string, // Must cite actual evidence
    // LLM output NOT permitted as sourceAuthority
  },
  humanReviewRequired: true // Always true
}
```

### RUTH (ANVISA Compliance)
```typescript
// Brazilian compliance
{
  patient: {
    cpf: string, // 11 digits, CYRUS: encrypted
    address: {
      postalCode: string, // 8 digits (CEP)
      state: string, // 2 chars (UF)
    }
  },
  conditions: [{
    icd10Code: string, // Must match pattern: ^[A-Z]\d{2}(\.\d{1,2})?$
  }],
  medications: [{
    medicationCode: string, // ANVISA or RxNorm, preserved
  }]
}
```

### QUINN (Non-blocking)
```typescript
// Errors don't propagate
try {
  const alerts = evaluator.evaluate(invalidRecord);
  // Returns empty array, not throw
} catch (e) {
  // Should not occur
}

// Multiple records processed even if one fails
const allAlerts = records
  .map(r => evaluator.evaluate(r)) // No throw on any record
  .flat();
```

## Implementation Notes

1. **Fixtures use valid UUIDs**: All IDs are UUID v4, not placeholder strings
2. **Dates use ISO 8601 with timezone**: `2025-03-20T10:00:00Z` format
3. **Prevention rules from actual registry**: Tests use real rules from prevention-engine
4. **Zod schema validation**: All canonical types validated against actual schemas
5. **No imputation**: Tests verify raw values preserved without conversion
6. **Bundle structure matches FHIR R4**: All fixtures are valid FHIR R4 Bundles

## Files

```
packages/integration-tests/
├── package.json                          # Dependencies + scripts
├── tsconfig.json                         # TypeScript config
├── jest.config.js                        # Jest configuration
├── src/
│   ├── __tests__/
│   │   ├── e2e-ingestion-flow.test.ts    # Pipeline flow tests
│   │   ├── e2e-fhir-roundtrip.test.ts    # Roundtrip tests
│   │   ├── safety-invariants.test.ts     # CYRUS/ELENA/RUTH/QUINN
│   │   └── brazilian-compliance.test.ts  # RNDS/ANVISA/LGPD
│   └── fixtures/
│       ├── fhir-bundle-diabetic-patient.ts
│       ├── fhir-bundle-pregnant-patient.ts
│       └── fhir-bundle-emergency.ts
└── README.md                             # This file
```

## Future Enhancements

1. Add snapshot testing for large data structures
2. Add performance benchmarks for large batches
3. Add integration with actual Redis (optional, CI-only)
4. Add database integration tests (optional)
5. Add stress testing with 1000+ records
6. Add coverage reports
