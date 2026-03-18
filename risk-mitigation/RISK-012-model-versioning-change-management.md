# RISK-012: LLM Model Versioning & Change Management Protocol

**Risk Statement:** LLM model version changes could alter agent behavioral logic, invalidating historical validation data and undermining determinism guarantees.

**Owner:** ARCHIE (CTO) + CYRUS (Security Architect — audit trail) + ELENA (Clinical Safety — behavioral invariants)

**Last Updated:** 2026-03-17

---

## 1. Model Pinning Policy

### 1.1 Exact Version Pinning

Every production simulation run must pin to an explicit LLM model version and quantization checkpoint. No runtime version negotiation or fallback logic is permitted.

#### 1.1.1 Model Version Format

```
<provider>:<model_name>:<version>:<quantization>:<checkpoint_hash>

Examples:
  openai:gpt-4-turbo:2024-04-09:fp32:abc123def456
  anthropic:claude-3-opus:2024-03:int8:xyz789abc123
  together:llama-2-70b-chat:2024-01:int4:pqr456stu789
```

**Fields:**
- `provider`: LLM vendor (openai, anthropic, together, etc.).
- `model_name`: Model identifier from vendor.
- `version`: Release date or version tag from vendor.
- `quantization`: Numeric precision (fp32, fp16, int8, int4).
- `checkpoint_hash`: SHA-256 hash of model weights/checkpoint (for reproducibility).

#### 1.1.2 Configuration Storage

**Primary location:** `.env.production`
```
LLM_MODEL_VERSION=openai:gpt-4-turbo:2024-04-09:fp32:abc123def456
LLM_TEMPERATURE_AGENT=0.0
LLM_TEMPERATURE_NARRATIVE=0.6
LLM_TOP_P=1.0
LLM_FREQUENCY_PENALTY=0.0
LLM_SEED_MODE=deterministic
```

**Secondary location:** `config/model-versions.json` (version-controlled)
```json
{
  "current_production": {
    "model_version": "openai:gpt-4-turbo:2024-04-09:fp32:abc123def456",
    "pinned_date": "2026-03-17T00:00:00Z",
    "approved_by": "ARCHIE",
    "deployed_at": "2026-03-17T14:30:00Z"
  },
  "previous_versions": [
    {
      "model_version": "openai:gpt-4-turbo:2024-02-15:fp32:xyz789def123",
      "pinned_date": "2026-01-15T00:00:00Z",
      "deprecated_at": "2026-03-17T00:00:00Z"
    }
  ]
}
```

#### 1.1.3 Initialization & Validation

**Startup validation (required):**
```typescript
// config/llm.ts
import dotenv from 'dotenv';

interface ModelVersion {
  provider: string;
  modelName: string;
  version: string;
  quantization: string;
  checkpointHash: string;
}

function parseModelVersion(versionString: string): ModelVersion {
  const parts = versionString.split(':');
  if (parts.length !== 5) {
    throw new Error(
      `Invalid model version format: ${versionString}. Expected: provider:model_name:version:quantization:checkpoint_hash`
    );
  }
  return {
    provider: parts[0],
    modelName: parts[1],
    version: parts[2],
    quantization: parts[3],
    checkpointHash: parts[4],
  };
}

export const llmConfig = (() => {
  const versionString = process.env.LLM_MODEL_VERSION;
  if (!versionString) {
    throw new Error('LLM_MODEL_VERSION env var is required and must be pinned.');
  }

  const parsedVersion = parseModelVersion(versionString);

  // Validate against approved registry
  const approvedVersions = require('./model-versions.json');
  const isApproved = approvedVersions.current_production.model_version === versionString ||
                     approvedVersions.previous_versions.some(v => v.model_version === versionString);

  if (!isApproved) {
    throw new Error(
      `Model version ${versionString} not in approved registry. ` +
      `Approved: ${approvedVersions.current_production.model_version}`
    );
  }

  return {
    ...parsedVersion,
    temperature: {
      agent_decisions: parseFloat(process.env.LLM_TEMPERATURE_AGENT ?? '0.0'),
      narrative: parseFloat(process.env.LLM_TEMPERATURE_NARRATIVE ?? '0.6'),
    },
    topP: parseFloat(process.env.LLM_TOP_P ?? '1.0'),
    frequencyPenalty: parseFloat(process.env.LLM_FREQUENCY_PENALTY ?? '0.0'),
    seedMode: (process.env.LLM_SEED_MODE ?? 'deterministic') as 'deterministic' | 'experimental',
  };
})();
```

---

## 2. Model Update Protocol

### 2.1 Update Request & Approval Process

#### 2.1.1 Proposal Phase

**Initiation:**
1. ARCHIE (CTO) or ELENA (Clinical Safety) identifies new model version.
2. Create GitHub issue: `[MODEL_UPGRADE] <provider>:<model_name>:<version>`
3. Include in issue body:
   - Vendor release notes link.
   - Breaking changes or behavioral differences.
   - Rationale for upgrade (e.g., cost reduction, performance improvement, safety enhancement).

**Example issue:**
```
[MODEL_UPGRADE] openai:gpt-4-turbo:2024-06-01

## Release Notes
https://openai.com/blog/gpt-4-turbo-2024-06

## Breaking Changes
- Context window increased from 128K to 256K (non-breaking for us)
- JSON mode syntax changed (may affect decision parsing)

## Behavioral Changes
- Improved instruction following on complex biomarker logic
- Reduced hallucination rate on medication interactions

## Rationale
Upgrade improves clinical safety on biomarker logic (ELENA approval required).

## Re-validation Timeline
Est. 2 weeks for full re-validation study.
```

#### 2.1.2 Review & Approval Gates

**ARCHIE approval criteria:**
- ✅ Vendor release notes reviewed for breaking changes.
- ✅ Deployment timeline feasible (re-validation window identified).
- ✅ Rollback procedure documented.
- ✅ No cost/quota implications that exceed budget.

**ELENA (Clinical Safety) approval criteria:**
- ✅ No documented behavioral regressions in clinical logic.
- ✅ Biomarker scoring logic stable or improved.
- ✅ Drug interaction rules unchanged or enhanced.
- ✅ New model does not introduce "bro-science" sources (Tier 3).

**CYRUS (Security) approval criteria:**
- ✅ No security vulnerabilities in model release.
- ✅ Checkpoint hash verified against vendor signature.
- ✅ No new data privacy concerns.

**Approval flow:**
```
1. ARCHIE reviews issue, approves architecturally.
2. ELENA reviews issue, approves clinically (veto if safety concerns).
3. CYRUS reviews issue, approves from security standpoint (veto if critical issues).
4. Once all 3 approve, issue labeled [APPROVED_FOR_REVALIDATION].
5. QUINN (QA) schedules re-validation study.
```

#### 2.1.3 Timeline

| Phase | Duration | Owner | Gate |
|-------|----------|-------|------|
| **Proposal & Review** | 3–5 days | ARCHIE + ELENA + CYRUS | Approval from all 3 |
| **Re-validation Study** | 10–14 days | QUINN + test infrastructure | Pass all determinism + fidelity tests |
| **Deployment Planning** | 2–3 days | ARCHIE + DevOps | Blue-green strategy confirmed |
| **Staged Rollout** | 5–7 days | DevOps + monitoring | Canary → 10% → 50% → 100% |
| **Stabilization & Monitoring** | 7 days | ARCHIE + observability team | No critical incidents |

**Total:** 27–39 days from proposal to full production rollout.

---

## 3. AuditLog Schema for Model Version Tracking

### 3.1 Extended AuditLog Events

**New event types for model tracking:**

#### 3.1.1 MODEL_VERSION_PINNED

Logged at startup for every simulation run.

```json
{
  "event_id": "evt-20260317-001",
  "event_type": "MODEL_VERSION_PINNED",
  "simulation_run_id": "sim-abc123xyz",
  "timestamp": "2026-03-17T14:30:00Z",
  "severity": "INFO",
  "metadata": {
    "model_version": "openai:gpt-4-turbo:2024-04-09:fp32:abc123def456",
    "provider": "openai",
    "model_name": "gpt-4-turbo",
    "vendor_version": "2024-04-09",
    "quantization": "fp32",
    "checkpoint_hash": "abc123def456",
    "temperature_agent": 0.0,
    "temperature_narrative": 0.6,
    "seed_mode": "deterministic",
    "engine_version": "1.2.3",
    "deployed_via_tag": "prod-release-v1.2.3"
  }
}
```

#### 3.1.2 MODEL_VERSION_CHANGED

Logged when a model upgrade is promoted to production.

```json
{
  "event_id": "evt-20260410-001",
  "event_type": "MODEL_VERSION_CHANGED",
  "timestamp": "2026-04-10T00:00:00Z",
  "severity": "WARN",
  "metadata": {
    "previous_model_version": "openai:gpt-4-turbo:2024-04-09:fp32:abc123def456",
    "new_model_version": "openai:gpt-4-turbo:2024-06-01:fp32:def456ghi789",
    "change_type": "MINOR_VERSION",
    "approval_issue": "https://github.com/org/repo/issues/1234",
    "revalidation_study_id": "study-gpt4-20260410",
    "revalidation_status": "PASSED",
    "revalidation_variance_mape": 0.08,
    "deployed_by": "devops-automation",
    "deployment_strategy": "blue_green_canary",
    "rollout_timeline": "2026-04-10 to 2026-04-17"
  }
}
```

#### 3.1.3 MODEL_DETERMINISM_REGRESSION

Logged if determinism test fails post-model-change.

```json
{
  "event_id": "evt-20260415-001",
  "event_type": "MODEL_DETERMINISM_REGRESSION",
  "simulation_run_id": "sim-xyz789abc",
  "timestamp": "2026-04-15T10:30:00Z",
  "severity": "ERROR",
  "metadata": {
    "model_version": "openai:gpt-4-turbo:2024-06-01:fp32:def456ghi789",
    "baseline_simulation_id": "sim-abc123xyz",
    "baseline_model_version": "openai:gpt-4-turbo:2024-04-09:fp32:abc123def456",
    "variance_mape": 0.22,
    "variance_threshold": 0.15,
    "exceeds_threshold": true,
    "failing_metrics": {
      "critical_tier_variance": 0.20,
      "high_tier_variance": 0.18,
      "admission_event_variance": 0.25
    },
    "recommended_action": "ROLLBACK",
    "rollback_triggered_by": "automated_circuit_breaker"
  }
}
```

### 3.2 AuditLog Query Interface

**Query all simulations using a specific model version:**
```typescript
async function getSimulationsForModelVersion(modelVersion: string): Promise<SimulationRun[]> {
  const auditLogs = await db.auditLog.findMany({
    where: {
      event_type: 'MODEL_VERSION_PINNED',
      metadata: {
        model_version: modelVersion,
      },
    },
  });

  const simulationIds = auditLogs.map(log => log.simulation_run_id);
  return db.simulationRun.findMany({
    where: {
      id: { in: simulationIds },
    },
  });
}
```

**Query model upgrade history:**
```typescript
async function getModelUpgradeHistory(): Promise<ModelVersionChangeEvent[]> {
  return db.auditLog.findMany({
    where: {
      event_type: 'MODEL_VERSION_CHANGED',
    },
    orderBy: { timestamp: 'desc' },
  });
}
```

---

## 4. Re-validation Study Requirements

When a new model version is approved, a full re-validation study must be completed before production deployment.

### 4.1 Study Design

**Objective:** Confirm new model maintains determinism (±15%) and population fidelity (χ² p > 0.05) compared to previous version.

#### 4.1.1 Cohorts & Fixtures

| Cohort | Size | Purpose |
|--------|------|---------|
| **Baseline Cohort** | 1,000 | 3-run determinism check with old model |
| **Cross-Model Cohort** | 5,000 | Compare old vs. new model on identical seed |
| **Edge Case Cohort** | 500 | Boundary testing for any behavioral shifts |
| **Population Fidelity Cohort** | 10,000 | Large-scale population fidelity test |

#### 4.1.2 Study Protocol

**Phase 1: Baseline with Previous Model (Day 1)**
```
1. Initialize test environment with previous model version (pinned).
2. Run simulation 3 times on Baseline Cohort (1,000 patients) with seed 42.
3. Record baseline distributions:
   - Tier counts (Critical, High, Medium, Low)
   - Event counts (admissions, ED visits, mortality)
   - Event timing distribution
4. Record AuditLog snapshot for baseline.
```

**Phase 2: Cross-Model Comparison (Days 2–3)**
```
1. Initialize test environment with NEW model version.
2. Run simulation 3 times on Cross-Model Cohort (5,000 patients) with seed 42.
3. Compare distributions:
   - MAPE of tier counts vs. baseline (target: ≤ 15%)
   - Chi-squared GOF test (target: p > 0.05)
   - Event timing MAE (target: ≤ 3 days)
4. If any metric fails, escalate to ELENA for clinical review.
5. If clinical review passes, increase tolerance to ±18% and continue.
```

**Phase 3: Edge Case Testing (Days 4–5)**
```
1. Run Edge Case Cohort (500 patients) with new model.
2. Validate boundary conditions:
   - Severe patients (APACHE ≥ 25) receive expected severity tier.
   - Medication selection logic unchanged.
   - Referral logic unchanged.
3. Any schema violations → escalate to QUINN.
```

**Phase 4: Population Fidelity (Days 6–8)**
```
1. Run Population Fidelity Cohort (10,000 patients) with new model.
2. Validate tier distribution matches reference:
   - Chi-squared p > 0.05
   - Tier proportions within 95% CI
3. Validate event rates within reference 95% CI.
4. If fidelity fails, investigate clinical rule changes.
```

**Phase 5: Determinism Validation (Days 9–10)**
```
1. Run Baseline Cohort (1,000 patients) 5 times with new model, seed 42.
2. Confirm intra-model determinism (same seed → ±15% variance).
3. Coefficient of variation ≤ 0.15 for all tiers.
```

#### 4.1.3 Pass/Fail Criteria

**All of the following must pass:**
1. ✅ Cross-model MAPE ≤ 15% (or ≤ 18% with clinical review).
2. ✅ Cross-model chi-squared p > 0.05.
3. ✅ Cross-model event timing MAE ≤ 3 days.
4. ✅ New model intra-determinism: CV ≤ 0.15 across 5 runs.
5. ✅ Population fidelity chi-squared p > 0.05.
6. ✅ No new schema violations.
7. ✅ ELENA clinical review passed (no behavioral regressions).

**Any failure → FAILED, do not proceed to deployment.**

### 4.2 Study Execution & Reporting

**Execution responsibility:** QUINN (QA) with ARCHIE oversight.

**Report structure:**
```
Revalidation Study Report
Model Upgrade: openai:gpt-4-turbo:2024-04-09 → openai:gpt-4-turbo:2024-06-01
Study ID: study-gpt4-20260410
Conducted: 2026-04-10 to 2026-04-18
Report Date: 2026-04-19

### Executive Summary
- Status: PASSED / FAILED
- Cross-model variance: 8.2% (target: ≤15%)
- Determinism within new model: 3.1% (target: ≤15%)
- Population fidelity: χ² p=0.18 (target: >0.05)

### Phase 1: Baseline Results
[Table of 3-run baseline with previous model]

### Phase 2: Cross-Model Comparison
[Detailed metrics comparing old vs. new]

### Phase 3: Edge Case Results
[Schema validation results]

### Phase 4: Population Fidelity
[Chi-squared and CI results]

### Phase 5: Determinism Validation
[CV and intra-model determinism]

### Clinical Review (ELENA)
- Status: Approved / Concerns Noted
- Summary: [Clinical findings]

### Recommendation
APPROVED FOR DEPLOYMENT / REJECTED DUE TO [REASON]

Approver: QUINN
Date: 2026-04-19
```

**Report storage:** `/revalidation-studies/study-gpt4-20260410.md` (version-controlled).

---

## 5. Rollback Procedure

### 5.1 Automatic Rollback Trigger

If production deployment encounters any of the following, automatic rollback is initiated:

1. **Determinism violation:** Ongoing simulations show variance > 20% vs. previous model.
2. **Clinical safety concern:** ELENA or medical reviewer flags clinical logic regression.
3. **Circuit breaker trip:** 3+ consecutive LLM failures attributable to model change.

### 5.2 Manual Rollback Initiation

ARCHIE or on-call engineer may initiate manual rollback if:
- Critical bug discovered in new model version.
- User-facing behavioral regression reported.
- Significant latency degradation (>50% vs. previous).

### 5.3 Rollback Workflow

```
DETECT rollback trigger (auto or manual)

1. Log event:
   AuditLog(
     event_type: "MODEL_ROLLBACK_INITIATED",
     trigger: "auto_determinism_violation | manual_by_archie | clinical_concern",
     previous_model_version: <version>,
     current_failing_model_version: <version>
   )

2. Stop all new simulations:
   - Mark all pending requests as "PAUSED_FOR_ROLLBACK"
   - Allow in-flight simulations to complete (do not kill)

3. Re-pin to previous model:
   - Update .env.production: LLM_MODEL_VERSION = <previous>
   - Deploy via blue-green swap (immediate, no canary)

4. Restart paused simulations:
   - Requeue all paused requests with previous model version
   - Do NOT re-run completed simulations

5. Post-rollback validation (30 minutes):
   - Run 10 simulations on Baseline Cohort with previous model
   - Confirm determinism within ±15%
   - If validation fails, escalate to on-call engineer (manual intervention)

6. Publish incident:
   Slack to #incidents:
   ":warning: Model Rollback Completed
    Previous: <version>
    Reverted from: <version>
    Trigger: {trigger}
    Status: Validation {PASSED|FAILED}
    Root Cause Analysis: [TBD]"

7. Schedule RCA meeting:
   - ARCHIE + ELENA + CYRUS + QUINN
   - Publish findings within 24 hours
```

### 5.4 Rollback Timeline

| Step | Duration | Notes |
|------|----------|-------|
| Detect + Alert | < 2 min | Automated monitoring |
| Pause new requests | < 1 min | Immediate |
| Re-pin + Deploy | 2–3 min | Blue-green swap (no downtime) |
| Restart paused reqs | 1–2 min | Queued operations |
| Validation | 5–10 min | 10 simulations × 30–60 sec each |
| **Total** | **11–19 min** | Near-instantaneous from user perspective |

---

## 6. Model Registry Design

### 6.1 Lightweight Registry (Custom JSON + Git)

Rather than deploying MLflow, maintain a simple version-controlled registry in Git.

#### 6.1.1 Registry Structure

```
config/
├── model-versions.json          # Current and historical model versions
├── model-metadata/
│   ├── gpt-4-turbo-2024-04-09.json
│   ├── gpt-4-turbo-2024-06-01.json
│   └── ...
└── model-approvals/
    ├── approval-gpt4-20260410.md    # Approval record for 2024-06-01 upgrade
    └── ...
```

#### 6.1.2 model-versions.json Schema

```json
{
  "schema_version": "1.0",
  "registry_updated_at": "2026-04-10T00:00:00Z",
  "current_production": {
    "model_version": "openai:gpt-4-turbo:2024-06-01:fp32:def456ghi789",
    "pinned_date": "2026-04-10T00:00:00Z",
    "approved_by": ["ARCHIE", "ELENA", "CYRUS"],
    "revalidation_study_id": "study-gpt4-20260410",
    "deployment_status": "STABLE",
    "deployed_at": "2026-04-17T14:30:00Z",
    "total_simulations_run": 45230,
    "incident_count": 0
  },
  "previous_versions": [
    {
      "model_version": "openai:gpt-4-turbo:2024-04-09:fp32:abc123def456",
      "pinned_date": "2026-03-17T00:00:00Z",
      "deprecated_at": "2026-04-10T00:00:00Z",
      "total_simulations_run": 123450,
      "deprecation_reason": "New version 2024-06-01 approved",
      "rollback_available": true
    }
  ],
  "experimental_versions": [
    {
      "model_version": "anthropic:claude-3-opus:2024-03:fp32:xyz789abc123",
      "status": "TESTING",
      "testing_phase": "re_validation_study",
      "revalidation_study_id": "study-claude-20260415",
      "estimated_completion": "2026-04-25"
    }
  ],
  "deprecated_versions": [
    {
      "model_version": "openai:gpt-4:2023-03-15:fp32:old000hash",
      "deprecated_at": "2026-03-01T00:00:00Z",
      "reason": "Replaced by gpt-4-turbo",
      "support_ends_at": "2026-06-01T00:00:00Z"
    }
  ]
}
```

#### 6.1.3 model-metadata JSON Example

```json
{
  "model_version": "openai:gpt-4-turbo:2024-06-01:fp32:def456ghi789",
  "vendor": "openai",
  "model_name": "gpt-4-turbo",
  "vendor_release_date": "2024-06-01",
  "vendor_release_notes": "https://openai.com/blog/gpt-4-turbo-2024-06",
  "quantization": "fp32",
  "checkpoint_hash": "def456ghi789",
  "checkpoint_source": "https://huggingface.co/openai/gpt-4-turbo-2024-06",
  "checkpoint_hash_algorithm": "SHA-256",
  "checkpoint_signature": "verified_openai_cert",
  "context_window_tokens": 128000,
  "cost_per_1m_input_tokens": 15.0,
  "cost_per_1m_output_tokens": 45.0,
  "estimated_cost_per_simulation": 0.32,
  "known_issues": [
    {
      "issue": "JSON mode parsing edge case with nested arrays",
      "severity": "LOW",
      "workaround": "Use top-level object wrapper"
    }
  ],
  "performance_characteristics": {
    "latency_p99_ms": 1200,
    "throughput_rps": 3500,
    "hallucination_rate": 0.012
  },
  "behavioral_changes_vs_previous": [
    {
      "change": "Improved biomarker scoring consistency",
      "impact": "POSITIVE"
    },
    {
      "change": "Reduced medication interaction false positives",
      "impact": "POSITIVE"
    }
  ]
}
```

#### 6.1.4 Model Registry Query Functions

```typescript
// lib/model-registry.ts

import * as fs from 'fs';
import * as path from 'path';

interface ModelVersion {
  version: string;
  status: 'CURRENT' | 'PREVIOUS' | 'EXPERIMENTAL' | 'DEPRECATED';
  pinnedDate: Date;
  revalidationStudyId?: string;
}

class ModelRegistry {
  private registry: any;

  constructor() {
    this.loadRegistry();
  }

  private loadRegistry() {
    const registryPath = path.join(process.cwd(), 'config', 'model-versions.json');
    const data = fs.readFileSync(registryPath, 'utf-8');
    this.registry = JSON.parse(data);
  }

  getCurrentProduction(): string {
    return this.registry.current_production.model_version;
  }

  getPreviousVersion(): string | null {
    if (this.registry.previous_versions.length === 0) return null;
    return this.registry.previous_versions[0].model_version;
  }

  getModelMetadata(modelVersion: string): any {
    const vendor = modelVersion.split(':')[0];
    const modelName = modelVersion.split(':')[1];
    const version = modelVersion.split(':')[2];
    const metadataPath = path.join(
      process.cwd(),
      'config',
      'model-metadata',
      `${modelName}-${version}.json`
    );
    const data = fs.readFileSync(metadataPath, 'utf-8');
    return JSON.parse(data);
  }

  isApproved(modelVersion: string): boolean {
    return (
      this.registry.current_production.model_version === modelVersion ||
      this.registry.previous_versions.some((v: any) => v.model_version === modelVersion)
    );
  }

  getAllVersions(): ModelVersion[] {
    const versions: ModelVersion[] = [];

    versions.push({
      version: this.registry.current_production.model_version,
      status: 'CURRENT',
      pinnedDate: new Date(this.registry.current_production.pinned_date),
    });

    this.registry.previous_versions.forEach((v: any) => {
      versions.push({
        version: v.model_version,
        status: 'PREVIOUS',
        pinnedDate: new Date(v.pinned_date),
      });
    });

    return versions;
  }
}

export default new ModelRegistry();
```

### 6.2 Registry Sync with Git

**Update process:**
1. ARCHIE or DevOps updates `model-versions.json` and `model-metadata/*.json`.
2. Create Git commit: `chore(model-registry): Pin gpt-4-turbo:2024-06-01`.
3. Commit includes link to revalidation study and approval issue.
4. Tag commit: `model-v2024-06-01`.
5. Trigger deployment CI on tag push.

---

## 7. Evaluation Criteria: Purpose-Built Models vs. General LLMs

### 7.1 Decision Framework

When considering a model upgrade or alternative provider, evaluate using this matrix:

| Criterion | General LLM (e.g., GPT-4, Claude-3) | Purpose-Built (e.g., BioMed-BERT, MedPaLM) |
|-----------|-----|------|
| **Clinical Logic Accuracy** | Moderate (general knowledge) | High (fine-tuned on medical data) |
| **Hallucination Rate** | 1–2% on medical queries | 0.1–0.5% (specialized corpus) |
| **Determinism** | Difficult (large parameter space) | Easier (smaller, quantized models) |
| **Cost** | High (~$0.30–0.45 per sim) | Low (~$0.05–0.10 per sim) |
| **Latency** | Moderate (1–2 sec) | Low (200–500 ms, smaller models) |
| **Biomarker Integration** | Manual prompt engineering | Native medical ontology support |
| **Re-training Cost** | Prohibitive | Feasible (transfer learning) |
| **Regulatory Compliance** | General AI compliance | Medical-grade certifications (CE, FDA) |

### 7.2 Model Selection Scorecard

**Scoring:** 1 (poor) to 5 (excellent).

```
Medical General LLM (GPT-4 Turbo):
  Clinical Accuracy: 4/5
  Hallucination: 2/5
  Determinism: 2/5
  Cost: 2/5
  Latency: 3/5
  Biomarker: 3/5
  Regulatory: 3/5
  TOTAL: 19/35 (54%)

Purpose-Built (BioMed-BERT + LoRA):
  Clinical Accuracy: 5/5
  Hallucination: 4/5
  Determinism: 4/5
  Cost: 5/5
  Latency: 5/5
  Biomarker: 5/5
  Regulatory: 4/5
  TOTAL: 32/35 (91%)
```

### 7.3 Adoption Criteria

**Adopt purpose-built model if:**
1. ✅ Scorecard ≥ 28/35 (80%).
2. ✅ Clinical accuracy on biomarker logic ≥ 4.5/5.
3. ✅ Hallucination rate < 0.5%.
4. ✅ Determinism (intra-model CV) ≤ 0.10.
5. ✅ Cost savings ≥ 50% vs. current.
6. ✅ Regulatory pathway clear (no FDA submission blocker).

**Evaluation ownership:** ARCHIE + ELENA + GORDON.

---

## 8. Quarterly Model Review Cadence

### 8.1 Scheduled Review

**Every quarter (Jan 15, Apr 15, Jul 15, Oct 15):**

1. **ARCHIE reviews:**
   - New model releases from major vendors (OpenAI, Anthropic, Together, Meta).
   - Cost trends and API pricing changes.
   - Performance benchmarks (latency, throughput).
   - Any vendor deprecations or EOL notices.

2. **ELENA reviews:**
   - Clinical safety incident history for current model.
   - Any hallucinations or biomarker scoring regressions.
   - New clinical validation datasets (MIMIC-IV, eICU-CRD updates).

3. **GORDON reviews:**
   - Cost-benefit analysis: upgrade investment vs. savings.
   - API quota burn trends.
   - Multi-model cost comparison.

4. **CYRUS reviews:**
   - Security advisories or vulnerability patches.
   - Data privacy changes in vendor SLAs.
   - Checkpoint integrity verification.

### 8.2 Review Outcomes

**Decision tree:**
```
IF highest-scoring alternative_model scores ≥ 5 points higher:
  → INITIATE upgrade process (see Section 2)
ELSE IF cost reduction ≥ 30% with no safety regression:
  → INITIATE upgrade process
ELSE IF current model has critical security issue:
  → EMERGENCY upgrade process (accelerated timeline)
ELSE:
  → DEFER upgrade; schedule next review in 3 months
```

### 8.3 Review Output

**Quarterly report template:**
```
Q2 2026 Model Review (Jan–Mar)

Current Production: openai:gpt-4-turbo:2024-06-01
Total Simulations: 45,230
Incident Count: 0
Cost: $14,504

## New Releases Evaluated
- OpenAI GPT-4o (May 2024): Scorecard 22/35 (not recommended; no clinical improvement)
- Anthropic Claude-3-Opus: Scorecard 25/35 (watch list)
- Meta Llama-3-70B-Instruct: Scorecard 18/35 (not recommended; poor hallucination control)

## Current Model Health
- Determinism: STABLE (avg MAPE 8.2%)
- Population Fidelity: STABLE (avg χ² p = 0.22)
- Clinical Incidents: 0
- Latency: STABLE (p99 = 1180 ms)

## Recommendation
DEFER UPGRADE. Current model meets all safety and performance SLOs.
Next review: Q3 2026 (Apr 15).

Reviewed by: ARCHIE, ELENA, GORDON, CYRUS
Date: 2026-03-15
```

---

## 9. Rollback & Incident Response Integration

### 9.1 Incident Classification

| Incident Type | Response Time | Escalation | Example |
|----------------|---|---|---|
| **Model Hallucination** | 30 min | ELENA | "Medication interaction rule returns false positive" |
| **Determinism Regression** | 15 min | ARCHIE + QUINN | "Variance > 20% in cross-model comparison" |
| **Clinical Safety Issue** | 5 min (STAT) | ELENA + RUTH (legal) | "Biomarker scoring contradicts clinical guideline" |
| **Performance Degradation** | 30 min | ARCHIE | "Latency increased 50% vs. baseline" |

### 9.2 Incident Response Protocol

**For model-related incidents:**
1. Determine if incident is model-specific or infrastructure-wide.
2. If model-specific and severity ≥ P2, initiate rollback (Section 5).
3. Run post-rollback validation (30 min).
4. If validation passes, schedule RCA within 24 hours.
5. RCA must identify root cause and prevention strategy.

---

## 10. Model Version Governance Board

### 10.1 Decision Authority

**Model upgrade approval requires unanimous consent from:**
- **ARCHIE** (CTO — architecture, cost, deployment feasibility)
- **ELENA** (Clinical Safety — clinical accuracy, hallucination rate)
- **RUTH** (Legal — regulatory implications for SaMD classification)
- **CYRUS** (Security — data privacy, checkpoint integrity)

**Veto authority:** Any single member may veto an upgrade proposal; veto must be documented in GitHub issue with specific technical rationale.

### 10.2 Meeting Cadence

- **Quarterly reviews:** Every Q (Jan 15, Apr 15, Jul 15, Oct 15) — 1 hour.
- **Ad-hoc upgrade discussions:** Called by ARCHIE as needed (typically 2–3 times per quarter).
- **RCA meetings (post-incident):** Called within 24 hours of rollback (typically 1–2 times per year).

---

## 11. Documentation & Knowledge Base

### 11.1 Model Documentation

Every model version must have a dedicated documentation page:

`docs/models/<model_name>_<version>.md`

**Template:**
```markdown
# Model Documentation: gpt-4-turbo:2024-06-01

## Overview
- Vendor: OpenAI
- Release Date: 2024-06-01
- Pinned Date: 2026-04-10
- Status: PRODUCTION

## Specifications
- Context Window: 128K tokens
- Cost: $0.30 per simulation (avg)
- Latency (p99): 1.2 sec

## Clinical Validation
- Biomarker accuracy: 98.7%
- Hallucination rate: 1.2%
- Drug interaction detection: 99.1%

## Re-validation Study
- Study ID: study-gpt4-20260410
- Status: PASSED
- Report: /revalidation-studies/study-gpt4-20260410.md

## Known Limitations
- [List any known issues or edge cases]

## Rollback Info
- Previous Model: openai:gpt-4-turbo:2024-04-09
- Rollback Procedure: See RISK-012 Section 5

## Support & Contact
- POC: ARCHIE (CTO)
- Last Updated: 2026-04-10
```

### 11.2 Runbook: Model Upgrade

See `runbooks/model-upgrade.md` for step-by-step upgrade procedure.

### 11.3 Runbook: Emergency Rollback

See `runbooks/model-emergency-rollback.md` for emergency rollback procedure.

---

## 12. Success Metrics & SLOs

### 12.1 Model Stability SLOs

| Metric | SLO | Measurement |
|--------|-----|-------------|
| Determinism (MAPE) | ≤ 15% | Weekly aggregate across all simulations |
| Population Fidelity (χ² p) | > 0.05 | 95% of weekly batches |
| Clinical Incident Rate | ≤ 0.1 per 1000 simulations | Monthly; escalate if exceeded |
| Hallucination Detection | < 0.5% of decisions | Quarterly audit |
| Model Deployment Frequency | ≤ 1 per quarter | Avoid churn |
| Time to Rollback | ≤ 20 min | From incident detection |

### 12.2 Reporting

- **Weekly:** Dashboards updated automatically (Grafana/DataDog).
- **Monthly:** Report to board with SLO compliance status.
- **Quarterly:** Full model review (Section 8).

---

## 13. Migration Path: Manual Rules → LLM → Purpose-Built

### 13.1 Recommended Evolution

```
Phase 1 (Current): LLM-based agent decisions with manual clinical rule validation
  ↓
Phase 2 (2026 Q4): Hybrid model with purpose-built biomarker classifier
  ↓
Phase 3 (2027 Q2): Full purpose-built stack (BioMed-BERT + LoRA tuning)
```

**Phase 2 Trigger:** Achieve <0.3% hallucination rate and reduce costs by 40%+.

**Phase 3 Trigger:** Full regulatory approval for custom model, <0.1% hallucination rate, determinism CV < 0.05.

---

## 14. Review & Iteration

This protocol is reviewed annually by ARCHIE + ELENA + CYRUS.

**Next Full Review:** 2027-03-17

---

## Appendix A: Model Registry Commands

```bash
# Query current production model
jq '.current_production.model_version' config/model-versions.json

# Query all versions
jq '.current_production, .previous_versions[] | .model_version' config/model-versions.json

# Validate registry format
jq '.' config/model-versions.json > /dev/null && echo "Valid"

# List model metadata files
ls -la config/model-metadata/*.json
```

---

## Appendix B: Rollback Checklist

Use this checklist during emergency rollback:

- [ ] Incident detected and logged in AuditLog.
- [ ] ARCHIE and on-call engineer notified.
- [ ] Decision to rollback confirmed by ARCHIE.
- [ ] Previous model version identified and verified in registry.
- [ ] .env.production updated with previous model version.
- [ ] Blue-green deployment initiated.
- [ ] New simulations paused (queued).
- [ ] Re-pin complete; new requests using previous model.
- [ ] 10 validation simulations run on Baseline Cohort.
- [ ] Determinism confirmed (MAPE ≤ 15%).
- [ ] Paused requests restarted.
- [ ] Incident summary posted to #incidents.
- [ ] RCA meeting scheduled within 24 hours.

---

## Appendix C: Model Upgrade Timeline (Example)

```
Mar 17 (Mon):  New model release announced (gpt-4-turbo:2024-06-01)
Mar 17-22:     ARCHIE + ELENA + CYRUS review; issue created
Mar 25 (Mon):  Approval received; re-validation study begins
Apr 10 (Wed):  Re-validation study complete; PASSED
Apr 10-11:     Blue-green infrastructure prepared
Apr 12 (Fri):  Canary deployment (1% traffic)
Apr 13-14 (Sat-Sun): Monitor canary; determinism checks pass
Apr 15 (Mon):  Rollout to 10% traffic; 2-day monitoring
Apr 17 (Wed):  Rollout to 50% traffic; 2-day monitoring
Apr 19 (Fri):  Full rollout (100%)
Apr 20 (Sat):  Stabilization monitoring (24 hours)
Apr 27 (Fri):  Deploy automation to mark as STABLE

Total: ~4 weeks from release to full production.
```
