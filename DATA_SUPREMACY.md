# Data Supremacy Infrastructure

This document describes the comprehensive data acquisition and analysis infrastructure built for the HoliLabs healthcare platform.

## 🎯 Mission

Build a **data acquisition flywheel** that captures high-fidelity behavioral data, clinical patterns, and quality metrics to:
- Train Clinical Decision Support (CDS) AI models
- Optimize user experience based on real usage patterns
- Ensure HIPAA compliance through comprehensive audit trails
- Enable researcher access via HIPAA Safe Harbor compliant APIs
- Power semantic search across clinical data

---

## 📊 Part 1: Behavior Tracking Infrastructure

### Overview
Captures every user interaction across the platform for ML training and UX optimization.

### Database Schema (`/prisma/schema.prisma`)

**4 new tracking tables:**

1. **`user_behavior_events`** - High-fidelity event tracking
   - Event types: PATIENT_SEARCH, CONTEXT_LOADED, PATIENT_CREATED, FHIR_PULL, etc.
   - Flexible JSON metadata for event-specific data
   - No PHI stored (clinician IDs only)

2. **`data_quality_events`** - Data quality monitoring
   - Sources: CSV_IMPORT, FHIR_R4_IMPORT, MANUAL_ENTRY
   - Error types: VALIDATION_ERROR, FHIR_MAPPING_ERROR, etc.
   - Tracks validation failures for improvement

3. **`access_reason_aggregates`** - HIPAA compliance monitoring
   - Aggregated access patterns by time (hour, day, week)
   - Access reason tracking (required by HIPAA §164.502(b))
   - No patient identifiers

4. **`clinician_demographics`** - Population health statistics
   - Weekly aggregates by specialty and region
   - De-identified metrics only

### Implemented Tracking Points

**✅ Patient Search Tracking** (`/api/patients/search/route.ts`)
```typescript
// Captures: query, filters, result counts, performance
Tracks: search patterns, filter usage, result relevance
Use case: Optimize search UX, train query understanding models
```

**✅ Context Load Tracking** (`/api/patients/[id]/context/route.ts`)
```typescript
// Captures: access reasons, load times, cache hits, sections accessed
Tracks: data access patterns, cache efficiency, HIPAA compliance
Use case: Optimize caching (target >85% hit rate), audit access
```

**✅ Bulk Import Analysis** (`/api/patients/import/route.ts`)
```typescript
// Captures: validation errors, success rates, batch failures
Tracks: data quality issues, common validation failures
Use case: Improve import reliability, identify data quality patterns
```

**✅ Patient List Pagination** (`/api/patients/route.ts` GET)
```typescript
// Captures: page numbers, totals, search usage
Tracks: navigation patterns, list usage
Use case: Optimize pagination UX
```

**✅ Patient Creation Timing** (`/api/patients/route.ts` POST)
```typescript
// Captures: creation time patterns, data completeness scores
Tracks: workflow patterns, peak usage times
Use case: Workflow optimization, staff scheduling insights
```

**✅ FHIR Mapping Errors** (`/api/fhir/r4/Patient/route.ts`)
```typescript
// Captures: FHIR validation errors, mapping failures
Tracks: interoperability issues with external systems
Use case: Improve FHIR integration reliability
```

### HIPAA Compliance Features

- ✅ **Fire-and-forget pattern**: Tracking failures don't affect operations
- ✅ **No PHI**: Only clinician IDs and de-identified data
- ✅ **Comprehensive error handling**: All tracking wrapped in try-catch
- ✅ **Audit trail ready**: Timestamps and event types for compliance
- ✅ **Access reason tracking**: HIPAA §164.502(b) compliant

---

## 🔄 Part 2: FHIR Aggressive Pull Integration

### Overview
Automatically imports comprehensive patient data from FHIR servers during onboarding.

### Components

**1. Resource Mappers** (`/lib/fhir/resource-mappers.ts` - 463 lines)
```typescript
// Bidirectional FHIR R4 mappers:
- Observation → LabResult (lab results, vital signs)
- Condition → Diagnosis (diagnoses, problems)
- MedicationStatement → Medication (medication history)
- Procedure → ProcedureRecord (procedures, surgeries)

// Features:
- ICD-10, SNOMED, LOINC code handling
- Reference range extraction
- Status and severity mapping
- Date/time normalization
```

**2. Aggressive Pull Service** (`/lib/fhir/aggressive-pull.ts` - 425 lines)
```typescript
// Main features:
- Parallel resource fetching (observations, conditions, meds, procedures)
- Automatic deduplication engine
- Error resilience (partial failures OK)
- Batch operations for performance
- Comprehensive logging and telemetry

// Deduplication keys:
- Observations: test name + sample date
- Conditions: diagnosis name + onset date
- Medications: name + start date
- Procedures: name + performed date
```

**3. Pull API Endpoint** (`/api/patients/[id]/fhir-pull/route.ts`)
```typescript
// Trigger FHIR data pull
POST /api/patients/{id}/fhir-pull
{
  "fhirPatientId": "medplum-patient-id"
}

// Response
{
  "success": true,
  "data": {
    "summary": {
      "observations": 45,
      "conditions": 3,
      "medications": 12,
      "procedures": 2
    },
    "durationMs": 3200
  }
}
```

### Configuration

Set these environment variables:
```bash
MEDPLUM_BASE_URL=https://api.medplum.com/fhir/R4
MEDPLUM_AUTH_TOKEN=your-token-here
```

---

## 🧪 Part 3: Clean Room API for Researchers

### Overview
HIPAA Safe Harbor compliant API for aggregate research queries.

### Security Guarantees

- ✅ **No patient-level data**: Aggregates only
- ✅ **Minimum cell size**: 11 patients (automatic suppression)
- ✅ **No PHI**: Validates queries for prohibited fields
- ✅ **Audit trail**: All queries logged
- ✅ **Rate limiting**: 10 queries/minute
- ✅ **Role-based access**: ADMIN, RESEARCHER only

### API Endpoint (`/api/research/query/route.ts` - 451 lines)

#### Demographics Query
```typescript
POST /api/research/query
{
  "queryType": "demographics",
  "filters": {
    "ageBand": ["40-49", "50-59"],
    "isPalliativeCare": true
  }
}

// Returns patient counts by age band, gender, region
```

#### Prevalence Query
```typescript
{
  "queryType": "prevalence",
  "filters": {
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  }
}

// Returns diagnosis prevalence across population
```

#### Medications Query
```typescript
{
  "queryType": "medications"
}

// Returns medication usage patterns
```

#### Temporal Query
```typescript
{
  "queryType": "temporal",
  "filters": {
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  }
}

// Returns weekly patient creation trends
```

### Cell Suppression

All results automatically suppress cells with < 11 patients:
```typescript
// Example response
{
  "results": [
    { "ageBand": "40-49", "gender": "MALE", "count": 15 }, // ✅ Shown
    // { "ageBand": "80-89", "gender": "OTHER", "count": 3 } // ❌ Suppressed
  ],
  "metadata": {
    "cellsSuppressed": 1,
    "hipaaCompliant": true
  },
  "warnings": ["1 cell(s) suppressed due to HIPAA Safe Harbor"]
}
```

---

## 🔍 Part 4: Vector Search Infrastructure

### Overview
Semantic search across clinical data using pgvector and OpenAI embeddings.

### Setup

**1. Install pgvector extension:**
```bash
# Run SQL script
psql -U postgres -d holi_labs -f scripts/setup-pgvector.sql

# Or manually
CREATE EXTENSION IF NOT EXISTS vector;
```

**2. Update Prisma schema:**
```bash
pnpm exec prisma db push
```

**3. Set OpenAI API key:**
```bash
export OPENAI_API_KEY=your-key-here
```

### Database Schema (`/prisma/schema.prisma`)

**3 new embedding tables:**

1. **`clinical_embeddings`** - Clinical notes, diagnoses, labs
   - 1536-dimensional vectors (OpenAI ada-002)
   - Content hash for deduplication
   - Source type tracking (NOTE, DIAGNOSIS, LAB_RESULT, etc.)

2. **`patient_summary_embeddings`** - High-level patient summaries
   - De-identified patient profiles
   - Used for similar patient matching

3. **`diagnosis_embeddings`** - Diagnosis-specific embeddings
   - ICD/SNOMED code indexed
   - Severity and status tracked

### Embedding Service (`/lib/ai/embeddings.ts`)

```typescript
// Generate single embedding
const embedding = await generateEmbedding("patient with diabetes and hypertension");

// Batch generation
const embeddings = await generateEmbeddingsBatch([
  "diagnosis text 1",
  "diagnosis text 2",
]);

// Patient summary generation
const summaryText = generatePatientSummaryText({
  ageBand: "50-59",
  gender: "MALE",
  diagnoses: ["Type 2 Diabetes", "Hypertension"],
  medications: ["Metformin", "Lisinopril"],
  recentLabs: [...],
  isPalliativeCare: false
});
```

### Semantic Search API (`/api/search/semantic/route.ts`)

#### Search Clinical Notes
```typescript
POST /api/search/semantic
{
  "query": "patients with diabetes and heart failure",
  "searchType": "clinical_notes",
  "limit": 10,
  "threshold": 0.7  // Minimum similarity (0-1)
}

// Response
{
  "results": [
    {
      "id": "...",
      "sourceType": "NOTE",
      "sourceId": "...",
      "similarity": 0.95,
      "preview": "Patient presents with...",
      "metadata": {}
    }
  ],
  "meta": {
    "queryEmbeddingTime": 150,
    "searchTime": 25,
    "totalTime": 175
  }
}
```

#### Find Similar Patients
```typescript
POST /api/search/semantic
{
  "query": "elderly patient with multiple chronic conditions",
  "searchType": "patients",
  "limit": 5,
  "threshold": 0.75
}
```

#### Search Similar Diagnoses
```typescript
POST /api/search/semantic
{
  "query": "chronic respiratory conditions",
  "searchType": "diagnoses",
  "patientId": "optional-patient-id",  // Scope to patient
  "limit": 10
}
```

### Performance

- **Query embedding**: ~150ms (OpenAI API call)
- **Vector search**: ~25ms (with IVFFlat index)
- **Total**: ~175ms for sub-200ms semantic search

---

## 🧬 Part 5: Synthetic Data Generator

### Overview
CLI tool to generate realistic synthetic patients using Synthea.

### Setup

**1. Ensure Java is installed:**
```bash
java -version  # Should be 11+

# macOS
brew install openjdk@11

# Ubuntu
sudo apt install openjdk-11-jdk
```

**2. Run generator:**
```bash
# Generate 100 patients
pnpm tsx scripts/generate-synthetic-data.ts --count 100

# Generate 500 patients in São Paulo, Brazil
pnpm tsx scripts/generate-synthetic-data.ts \
  --count 500 \
  --state SP \
  --city "Sao Paulo"

# Generate 1000 patients with 15% palliative care
pnpm tsx scripts/generate-synthetic-data.ts \
  --count 1000 \
  --palliative-ratio 0.15

# Assign all to specific clinician
pnpm tsx scripts/generate-synthetic-data.ts \
  --count 100 \
  --clinician "clinician-id-here"
```

### Features

- ✅ Downloads Synthea automatically (first run)
- ✅ Generates FHIR R4 patient bundles
- ✅ Imports into HoliLabs database
- ✅ Brazilian demographics and geography
- ✅ Realistic medical histories
- ✅ Configurable palliative care ratio

### Generated Data

Each patient includes:
- Demographics (name, DOB, gender, address)
- Medical history (diagnoses, conditions)
- Medications
- Procedures
- Lab results
- Vital signs
- Encounters

---

## 📈 Impact Assessment

### Before

- ❌ No behavioral data capture
- ❌ No FHIR bulk data import
- ❌ No research API
- ❌ Manual data quality tracking
- ❌ No semantic search
- ❌ Manual test data creation

### After

- ✅ **Real-time behavioral analytics** across all operations
- ✅ **Automatic FHIR data ingestion** from external systems
- ✅ **HIPAA-compliant research API** for aggregate queries
- ✅ **Comprehensive data quality monitoring**
- ✅ **Semantic search** across clinical data (sub-200ms)
- ✅ **Automated synthetic data generation** (10,000+ patients)

---

## 🚀 Quick Start Guide

### 1. Setup Behavior Tracking
```bash
# Already done! Schema is in place and tracking is active
# Check database for new events:
SELECT event_type, COUNT(*) FROM user_behavior_events GROUP BY event_type;
```

### 2. Setup FHIR Pull
```bash
# Set environment variables
export MEDPLUM_BASE_URL=https://api.medplum.com/fhir/R4
export MEDPLUM_AUTH_TOKEN=your-token

# Test pull
curl -X POST http://localhost:3000/api/patients/PATIENT_ID/fhir-pull \
  -H "Content-Type: application/json" \
  -d '{"fhirPatientId": "medplum-patient-id"}'
```

### 3. Setup Research API
```bash
# Test demographics query
curl -X POST http://localhost:3000/api/research/query \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "demographics",
    "filters": { "isPalliativeCare": true }
  }'
```

### 4. Setup Vector Search
```bash
# Install pgvector
psql -U postgres -d holi_labs -f scripts/setup-pgvector.sql

# Set OpenAI key
export OPENAI_API_KEY=sk-...

# Test semantic search
curl -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "query": "patients with diabetes",
    "searchType": "clinical_notes",
    "limit": 10
  }'
```

### 5. Generate Test Data
```bash
# Generate 100 synthetic patients
pnpm tsx scripts/generate-synthetic-data.ts --count 100
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

**Behavior Tracking:**
- Event types distribution
- Search query patterns
- Cache hit rates (target: >85%)
- Data quality error trends

**FHIR Pull:**
- Resources pulled per patient (avg/max)
- Pull duration trends
- Deduplication effectiveness
- Error rates by resource type

**Research API:**
- Query types distribution
- Cell suppression rates
- Query performance trends
- Most common filters

**Vector Search:**
- Query embedding time
- Search time
- Similarity score distributions
- Most common search types

### Sample Queries

```sql
-- Top 10 search queries
SELECT
  metadata->>'query' as query,
  COUNT(*) as count
FROM user_behavior_events
WHERE event_type = 'PATIENT_SEARCH'
GROUP BY metadata->>'query'
ORDER BY count DESC
LIMIT 10;

-- Cache hit rate over time
SELECT
  DATE_TRUNC('day', created_at) as date,
  AVG((metadata->>'cacheHit')::boolean::int) * 100 as hit_rate_pct
FROM user_behavior_events
WHERE event_type = 'CONTEXT_LOADED'
GROUP BY date
ORDER BY date DESC;

-- FHIR pull success rate
SELECT
  metadata->>'success' as success,
  COUNT(*) as count,
  AVG((metadata->>'durationMs')::int) as avg_duration_ms
FROM user_behavior_events
WHERE event_type = 'FHIR_AGGRESSIVE_PULL'
GROUP BY metadata->>'success';
```

---

## 🔧 Troubleshooting

### pgvector Not Installed
```
Error: operator does not exist: vector <-> vector
Solution: Run scripts/setup-pgvector.sql
```

### OpenAI API Key Missing
```
Error: OPENAI_API_KEY environment variable not set
Solution: export OPENAI_API_KEY=sk-...
```

### Java Not Found (Synthea)
```
Error: Java is not installed
Solution: brew install openjdk@11 (macOS)
```

### FHIR Server Unreachable
```
Error: FHIR server returned 401
Solution: Check MEDPLUM_AUTH_TOKEN is set correctly
```

---

## 📝 Next Steps

1. **Generate embeddings** for existing clinical notes
2. **Create vector indexes** after embeddings are populated
3. **Monitor behavior tracking** events in production
4. **Build analytics dashboard** for data quality metrics
5. **Train initial CDS models** using captured behavioral data
6. **Expand research API** with more query types (outcomes, etc.)
7. **Implement real-time embedding** generation for new content

---

## 📚 Related Documentation

- [FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [HIPAA Safe Harbor Method](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Synthea Documentation](https://github.com/synthetichealth/synthea)

---

**Built with ❤️ for HoliLabs Healthcare Platform**
