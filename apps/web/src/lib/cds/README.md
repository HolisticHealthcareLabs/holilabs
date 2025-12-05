# Clinical Decision Support (CDS) System

**Version:** 1.0.0
**Compliance:** CDS Hooks 2.0, HL7 FHIR R4
**Last Updated:** December 2025

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Components](#components)
5. [API Endpoints](#api-endpoints)
6. [Clinical Rules](#clinical-rules)
7. [UI Components](#ui-components)
8. [Integration Guide](#integration-guide)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## Overview

The Holi Clinical Decision Support (CDS) System provides evidence-based, real-time clinical recommendations at the point of care. It is designed specifically for underserved populations and low-resource settings, integrating WHO PEN protocols and PAHO prevention guidelines.

### Key Features

- **Real-time Alerts**: Immediate notifications for critical clinical situations
- **Evidence-Based**: All recommendations backed by clinical guidelines with GRADE evidence strength
- **CDS Hooks 2.0 Compliant**: Standards-based integration with EHR systems
- **Customizable**: Doctors can enable/disable rules and customize their dashboard
- **Low-Resource Optimized**: Works with limited connectivity and basic infrastructure
- **Wearables Integration**: Supports Apple Watch, Oura Ring, and Ultrahuman devices

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     CDS Command Center                       │
│  (React UI - Modular Dashboard with 4 Panels)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  - /api/cds/evaluate (Main evaluation endpoint)             │
│  - /api/cds/hooks/* (CDS Hooks 2.0 endpoints)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CDS Engine                                │
│  - Rule evaluation engine                                    │
│  - Context enrichment                                        │
│  - Priority sorting                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
    ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
    │  WHO PEN      │ │  PAHO        │ │  Wearables   │
    │  Protocols    │ │  Prevention  │ │  Adapter     │
    │  (730 lines)  │ │  (670 lines) │ │  (680 lines) │
    └───────────────┘ └──────────────┘ └──────────────┘
```

### Data Flow

1. **Clinical Event** occurs (patient chart opened, medication prescribed, etc.)
2. **Hook Triggered** - CDS Hook invoked with patient context
3. **Context Enrichment** - System fetches additional patient data (medications, conditions, labs)
4. **Rule Evaluation** - All enabled rules evaluated against enriched context
5. **Alert Generation** - Alerts created for triggered rules
6. **Priority Sorting** - Alerts sorted by severity and priority
7. **Response Delivered** - Alerts returned to UI in CDS Hooks card format

---

## Features

### 1. Drug Safety

- **Drug-Drug Interactions**: ONCHigh and DrugBank database integration
- **Allergy Alerts**: Beta-lactam cross-reactivity detection
- **Duplicate Therapy**: Identifies medications in same class
- **Contraindications**: Condition-specific medication warnings
- **Dosing Guidance**: Age and renal function-adjusted recommendations

### 2. Chronic Disease Management (WHO PEN)

- **Hypertension**: BP monitoring with 140/90 mmHg threshold
- **Diabetes**: HbA1c target <7% with medication adjustment alerts
- **Cardiovascular Risk**: 10-year CVD risk stratification
- **Chronic Respiratory Disease**: COPD and asthma management
- **Mental Health**: Depression screening reminders

### 3. Preventive Care (PAHO)

- **Cancer Screening**:
  - Cervical cancer (ages 25-64, every 3 years)
  - Breast cancer (ages 50-74, every 2 years)
  - Colorectal cancer (ages 50-75)

- **Immunizations**:
  - Influenza (annual for ages 65+, high-risk groups)
  - Pneumococcal (ages 65+)
  - HPV (ages 9-26)

- **NCD Screening**:
  - Hypertension screening (every 2 years for adults)
  - Diabetes screening (every 3 years for high-risk)
  - Cholesterol screening (every 5 years for adults 40+)

### 4. IoT & Wearables

- **Apple Health Integration**: Heart rate, BP, glucose, activity
- **Oura Ring**: Sleep quality, HRV, temperature trends
- **Ultrahuman**: Continuous glucose monitoring, metabolic health

---

## Components

### Core Engine

**File**: `engines/cds-engine.ts`
**Purpose**: Main evaluation engine

```typescript
import { CDSEngine } from '@/lib/cds/engines/cds-engine';

const engine = new CDSEngine();

// Evaluate patient context
const result = await engine.evaluate(context, 'patient-view');

// Result contains:
// - alerts: CDSAlert[]
// - rulesEvaluated: number
// - evaluationTime: number (ms)
```

### Rule Modules

#### 1. WHO PEN Protocols
**File**: `rules/who-pen-protocols.ts` (730 lines)

- Hypertension management (Evidence Grade: A)
- Diabetes control protocols (Evidence Grade: A)
- CVD risk assessment (Framingham/WHO risk charts)
- Chronic respiratory disease management
- Mental health screening

#### 2. PAHO Prevention Guidelines
**File**: `rules/paho-prevention.ts` (670 lines)

- Cancer screening schedules
- Immunization protocols
- NCD risk factor screening
- Maternal and child health

#### 3. Wearables Adapter
**File**: `integrations/wearables-adapter.ts` (680 lines)

- Real-time vitals monitoring
- Trend analysis and anomaly detection
- Device-agnostic data normalization
- Supports: Apple Health, Oura, Ultrahuman

---

## API Endpoints

### 1. Main Evaluation Endpoint

**POST /api/cds/evaluate**

Evaluate clinical decision support rules for a patient.

```bash
curl -X POST http://localhost:3000/api/cds/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-123",
    "hookType": "patient-view",
    "context": {
      "patientId": "patient-123"
    }
  }'
```

**Response:**
```json
{
  "data": {
    "alerts": [
      {
        "id": "alert-1",
        "summary": "Hypertension: BP 165/95 - Review medication",
        "detail": "Blood pressure above target range...",
        "severity": "warning",
        "category": "guideline-recommendation",
        "source": {
          "label": "WHO PEN Protocol",
          "url": "https://www.who.int/..."
        },
        "evidenceStrength": "A",
        "priority": 50
      }
    ],
    "rulesEvaluated": 12
  },
  "evaluatedAt": "2025-12-02T10:30:00Z"
}
```

**GET /api/cds/evaluate**

Get list of available CDS rules.

```bash
curl http://localhost:3000/api/cds/evaluate
```

**Response:**
```json
{
  "currentRules": [
    {
      "id": "drug-interaction-check",
      "name": "Drug-Drug Interaction Screening",
      "description": "Checks for clinically significant drug interactions",
      "category": "drug-interaction",
      "severity": "critical",
      "enabled": true,
      "priority": 10,
      "evidenceStrength": "A",
      "source": "ONCHigh / DrugBank",
      "triggerHooks": ["medication-prescribe", "order-sign"]
    }
  ]
}
```

### 2. CDS Hooks Endpoints

#### Discovery Endpoint

**GET /api/cds/hooks/discovery**

Returns available CDS services per CDS Hooks 2.0 specification.

```bash
curl http://localhost:3000/api/cds/hooks/discovery
```

**Response:**
```json
{
  "services": [
    {
      "hook": "patient-view",
      "id": "holi-cds-patient-view",
      "title": "Holi CDS: Patient Chart View",
      "description": "Contextual CDS when viewing patient chart",
      "prefetch": {
        "patient": "Patient/{{context.patientId}}",
        "conditions": "Condition?patient={{context.patientId}}&clinical-status=active",
        "medications": "MedicationRequest?patient={{context.patientId}}&status=active"
      }
    },
    {
      "hook": "medication-prescribe",
      "id": "holi-cds-medication-prescribe",
      "title": "Holi CDS: Medication Safety Check",
      "description": "Real-time drug interaction and allergy checking"
    }
  ]
}
```

#### Patient View Hook

**POST /api/cds/hooks/patient-view**

```bash
curl -X POST http://localhost:3000/api/cds/hooks/patient-view \
  -H "Content-Type: application/json" \
  -d '{
    "hook": "patient-view",
    "hookInstance": "session-123",
    "context": {
      "patientId": "patient-456"
    }
  }'
```

#### Medication Prescribe Hook

**POST /api/cds/hooks/medication-prescribe**

```bash
curl -X POST http://localhost:3000/api/cds/hooks/medication-prescribe \
  -H "Content-Type: application/json" \
  -d '{
    "hook": "medication-prescribe",
    "hookInstance": "session-456",
    "context": {
      "patientId": "patient-789",
      "medications": [...]
    }
  }'
```

---

## Clinical Rules

### Active Rules (12 Total)

| Rule ID | Name | Category | Severity | Evidence | Hook Types |
|---------|------|----------|----------|----------|------------|
| `drug-interaction-check` | Drug-Drug Interactions | drug-interaction | critical | A | medication-prescribe, order-sign |
| `allergy-alert` | Allergy Contraindications | allergy | critical | A | medication-prescribe, order-sign |
| `duplicate-therapy` | Duplicate Therapy Detection | duplicate-therapy | warning | B | medication-prescribe |
| `who-pen-hypertension` | Hypertension Management | guideline-recommendation | warning | A | patient-view, encounter-start |
| `who-pen-diabetes` | Diabetes Control | guideline-recommendation | critical | A | patient-view, encounter-start |
| `who-pen-cvd-risk` | CVD Risk Assessment | guideline-recommendation | info | A | patient-view, encounter-start |
| `paho-cervical-cancer` | Cervical Cancer Screening | preventive-care | info | A | encounter-start |
| `paho-breast-cancer` | Breast Cancer Screening | preventive-care | info | A | encounter-start |
| `paho-influenza-vaccine` | Influenza Vaccination | preventive-care | info | A | encounter-start |
| `lab-abnormal-hba1c` | HbA1c Monitoring | lab-abnormal | critical | A | patient-view |
| `lab-abnormal-kidney` | Renal Function Monitoring | lab-abnormal | warning | A | patient-view |
| `wearables-vital-alert` | Vital Sign Anomalies (Wearables) | lab-abnormal | warning | C | patient-view |

### Evidence Strength Grading (GRADE)

- **A (High)**: Strong recommendation based on high-quality evidence
- **B (Moderate)**: Moderate recommendation based on moderate-quality evidence
- **C (Low)**: Weak recommendation based on low-quality evidence
- **D (Very Low)**: Very weak recommendation based on very low-quality evidence
- **Insufficient**: Insufficient evidence to make recommendation

---

## UI Components

### CDS Command Center

**File**: `components/clinical/cds/CDSCommandCenter.tsx`

Main dashboard with 4 customizable panels:

```tsx
import { CDSCommandCenter } from '@/components/clinical/cds';

<CDSCommandCenter
  patientId="patient-123"
  defaultView="standard"
/>
```

**View Modes:**
- **Compact**: 2-column layout, more panels visible
- **Standard**: Adaptive 2-3 column layout
- **Detailed**: Single column, maximum detail

**Panels:**

1. **Alert Monitor** - Real-time clinical alerts
2. **Rule Manager** - Enable/disable rules
3. **Alert History** - Audit trail of all actions
4. **Analytics Dashboard** - Performance metrics

### Individual Components

```tsx
// Alert Monitor
import { AlertMonitor } from '@/components/clinical/cds';

<AlertMonitor
  patientId="patient-123"
  hookType="patient-view"
  autoRefresh={true}
  refreshInterval={60000}
  enableSound={true}
/>

// Rule Manager
import { RuleManager } from '@/components/clinical/cds';

<RuleManager
  rules={rules}
  onRuleToggle={(ruleId, enabled) => {
    // Handle rule toggle
  }}
/>

// Alert History
import { AlertHistory } from '@/components/clinical/cds';

<AlertHistory patientId="patient-123" />

// Analytics Dashboard
import { AnalyticsDashboard } from '@/components/clinical/cds';

<AnalyticsDashboard timeRange="month" />
```

---

## Integration Guide

### 1. Integrate into Clinician Workflow

#### Option A: Full Command Center

```tsx
import { CDSCommandCenter } from '@/components/clinical/cds';

export default function PatientChart({ patientId }: { patientId: string }) {
  return (
    <div className="h-screen">
      <CDSCommandCenter patientId={patientId} />
    </div>
  );
}
```

#### Option B: Alert Monitor Only

```tsx
import { AlertMonitor } from '@/components/clinical/cds';

export default function PatientSidebar({ patientId }: { patientId: string }) {
  return (
    <AlertMonitor
      patientId={patientId}
      hookType="patient-view"
      autoRefresh={true}
    />
  );
}
```

### 2. Integrate with External EHR (CDS Hooks)

Configure your EHR to call the CDS Hooks discovery endpoint:

```
GET https://your-domain.com/api/cds/hooks/discovery
```

The EHR will automatically discover and integrate all available services.

### 3. Custom Rule Integration

Add custom institutional rules:

```typescript
// lib/cds/rules/custom-rules.ts

import type { CDSRule } from '../types';

export const customRules: CDSRule[] = [
  {
    id: 'custom-protocol-1',
    name: 'Local Antibiotic Protocol',
    description: 'Hospital-specific antibiotic stewardship',
    category: 'dosing-guidance',
    severity: 'warning',
    enabled: true,
    priority: 40,
    triggerHooks: ['medication-prescribe'],
    source: 'Hospital Formulary Committee',

    evaluate: async (context) => {
      // Your custom logic
      if (/* condition */) {
        return {
          triggered: true,
          alert: {
            summary: 'Custom protocol alert',
            detail: '...',
          },
        };
      }
      return { triggered: false };
    },
  },
];
```

Register in `engines/cds-engine.ts`:

```typescript
import { customRules } from '../rules/custom-rules';

// In CDSEngine constructor
this.rules = [
  ...this.rules,
  ...customRules,
];
```

---

## Testing

### Run All Tests

```bash
cd apps/web
pnpm test
```

### Test Suites

1. **CDS Engine Tests** (`lib/cds/__tests__/cds-engine.test.ts`)
   - 15 test cases covering all rule categories
   - Drug interactions, allergies, guidelines, preventive care
   - Rule enable/disable functionality
   - Evidence strength assignment

2. **API Integration Tests** (`app/api/cds/__tests__/evaluate.test.ts`)
   - Request validation
   - Context enrichment
   - Alert generation
   - Error handling
   - Rate limiting

3. **CDS Hooks Compliance** (`app/api/cds/hooks/__tests__/cds-hooks.test.ts`)
   - Discovery endpoint
   - Service endpoints
   - Card format compliance
   - Prefetch templates
   - Performance requirements

### Run Specific Test Suite

```bash
# Engine tests only
pnpm test cds-engine.test.ts

# API tests only
pnpm test evaluate.test.ts

# CDS Hooks tests only
pnpm test cds-hooks.test.ts
```

### Test Coverage

Current coverage: **85%+**

- Engine logic: 90%
- API endpoints: 85%
- Rule evaluation: 88%

---

## Deployment

### Environment Variables

```env
# Required
DATABASE_URL="postgresql://user:pass@host:5432/db"
NEXTAUTH_URL="https://your-domain.com"

# Optional - for enhanced features
OPENAI_API_KEY="sk-..."  # For AI-enhanced recommendations
UPSTASH_REDIS_REST_URL="https://..."  # For caching
UPSTASH_REDIS_REST_TOKEN="..."
```

### Production Deployment

1. **Build the application:**

```bash
cd apps/web
pnpm build
```

2. **Run database migrations:**

```bash
pnpm db:migrate
```

3. **Start production server:**

```bash
pnpm start
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health
```

### Monitoring

- **Sentry**: Error tracking configured
- **Uptime Monitoring**: Configure for `/api/health`
- **Performance**: Monitor CDS evaluation time (<2s target)

---

## Performance Optimization

### Caching Strategy

- **Rule Definitions**: Cached for 1 hour
- **Patient Context**: Cached for 5 minutes
- **Evaluation Results**: Cached for 1 minute

### Database Indexes

Ensure indexes on:
- `patients.id`
- `medications.patient_id, medications.status`
- `conditions.patient_id, conditions.clinical_status`
- `observations.patient_id, observations.code, observations.date`

### API Rate Limiting

- **Authenticated Users**: 100 requests/minute
- **CDS Hooks**: 10 requests/second per EHR instance

---

## Troubleshooting

### Common Issues

#### 1. No Alerts Appearing

**Check:**
- Rules are enabled in Rule Manager
- Patient data exists in database
- Hook type matches rule trigger hooks

**Debug:**
```typescript
const result = await engine.evaluate(context, 'patient-view');
console.log('Rules evaluated:', result.rulesEvaluated);
console.log('Alerts generated:', result.alerts.length);
```

#### 2. Slow Performance

**Check:**
- Database query performance
- Number of enabled rules (disable unused rules)
- Cache configuration

**Optimize:**
```typescript
// Enable caching in engine
const engine = new CDSEngine({ enableCache: true });
```

#### 3. CDS Hooks Not Working

**Verify:**
- Discovery endpoint accessible: `GET /api/cds/hooks/discovery`
- CORS headers configured correctly
- EHR authentication working

---

## Roadmap

### Phase 3 (Q1 2026)

- [ ] Machine learning-based alert prioritization
- [ ] Multi-language support (Spanish, Portuguese)
- [ ] Offline-first mobile app
- [ ] Advanced analytics with outcome tracking

### Phase 4 (Q2 2026)

- [ ] Telemedicine integration
- [ ] Community health worker interface
- [ ] Population health analytics
- [ ] Interoperability with national health systems

---

## Support

- **Documentation**: `/docs/cds`
- **Issues**: GitHub Issues
- **Email**: support@holilabs.com

---

## License

Copyright © 2025 Holi Labs. All rights reserved.

---

## References

1. **CDS Hooks 2.0 Specification**: https://cds-hooks.org/
2. **WHO PEN**: https://www.who.int/publications/i/item/9789241549493
3. **PAHO Prevention**: https://www.paho.org/en/enlace/prevention-control
4. **GRADE Evidence**: https://www.gradeworkinggroup.org/

---

**Last Updated**: December 2, 2025
**Version**: 1.0.0
**Maintainer**: Holi Labs Clinical Engineering Team
