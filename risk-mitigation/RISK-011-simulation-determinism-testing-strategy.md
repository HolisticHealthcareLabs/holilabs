# RISK-011: Simulation Output Determinism Testing Strategy

**Risk Statement:** Simulation output variance may exceed ±15% determinism threshold due to LLM non-determinism, agent interaction order randomness, or infrastructure variability.

**Owner:** QUINN (QA Lead) + CYRUS (Security Architect — audit trail integrity)

**Last Updated:** 2026-03-17

---

## 1. Determinism Requirements Specification

### 1.1 Precise Definition of ±15% Threshold

The ±15% variance tolerance applies to **aggregate population-level distributions**, not individual patient trajectories. Determinism compliance is measured across three dimensions:

#### 1.1.1 Count Distributions (Primary)

- **Severe State Count:** Count of patients in each clinical severity tier (Critical, High, Medium, Low) at simulation end.
  - Tolerance: ±15% of each tier count.
  - Example: If seed S produces 120 Critical patients, replays with S must yield 102–138 Critical patients.
  - Measured via: `abs(rerun_count - baseline_count) / baseline_count ≤ 0.15`

- **Outcome Event Count:** Cumulative hospital admissions, ED visits, mortality events, medication switches.
  - Tolerance: ±15% per event type.
  - Example: If baseline = 45 admissions, rerun must yield 38–52.

#### 1.1.2 Severity Tier Allocation (Secondary)

- **Tier Distribution:** Percentage of population in each tier (as fraction of total).
  - Tolerance: ±15 percentage points deviation in tier proportions.
  - Example: Baseline Critical = 8% → rerun must be 6.8%–9.2%.
  - Measured via chi-squared GOF with α = 0.05 on binomial proportions.

#### 1.1.3 Temporal Distribution (Tertiary)

- **Event Timing Skew:** Mean absolute error (MAE) of event day-of-simulation across 3+ runs.
  - Tolerance: MAE ≤ 3 days for 95th-percentile events.
  - Example: If baseline admission happens on Day 14±2, reruns must cluster Day 12–16.
  - Measured via: `median(abs(event_day_baseline - event_day_rerun)) ≤ 3`

### 1.2 Severity Tier Allocation

| Tier | Clinical Criteria | Target % (Baseline) | Tolerance (±15%) |
|------|------------------|-------------------|-----------------|
| Critical | APACHE ≥ 25, or organ support | 5–10% | 4.25–11.5% |
| High | APACHE 20–24, or ≥2 comorbidities + active med change | 15–25% | 12.75–28.75% |
| Medium | APACHE 15–19, or single active condition | 30–45% | 25.5–51.75% |
| Low | APACHE < 15, stable, preventive-only | 20–35% | 17–40.25% |

**Total population:** 1,000–10,000 patients per simulation run (fixture-dependent).

### 1.3 Variance Measurement Gates

**Pass criteria (all must hold):**
1. ✅ Each tier count within ±15% of baseline.
2. ✅ Event counts within ±15% of baseline.
3. ✅ Chi-squared GOF test (binomial model) p-value > 0.05 for tier distribution.
4. ✅ Event timing MAE ≤ 3 days for 95th-percentile events.

**Fail criteria (any triggers escalation):**
1. ❌ Any tier count exceeds ±15%.
2. ❌ Any event count exceeds ±15%.
3. ❌ Chi-squared p-value < 0.05.
4. ❌ Event timing MAE > 3 days.

---

## 2. Temperature Control Policy

LLM model temperature is the primary lever for controlling non-determinism. This policy enforces strict separation between deterministic agent decisions and stochastic narrative generation.

### 2.1 Temperature Tiers

| Component | Temperature | Rationale | Examples |
|-----------|-------------|-----------|----------|
| **Agent Decisions** | 0.0 | Medical decisions must be deterministic and reproducible. | Clinical rule evaluation, medication selection, referral logic, severity scoring |
| **Probabilities (Stochastic Sampling)** | 0.0 | Random events (complications, adverse reactions) are sampled via seeded RNG, not LLM temperature. | Infection probability, adverse event monte carlo |
| **Narrative/Documentation** | 0.5–0.7 | Patient notes, case summaries can vary stylistically without affecting clinical outcomes. | Clinical narrative, progress note generation (if applicable) |
| **Exploration (A/B Testing)** | 1.2–1.5 | Used only in research/sandbox contexts, never production simulations. | Novel treatment discovery, experimental cohort modeling |

### 2.2 Enforcement Mechanism

**Pre-simulation validation:**
```
FOR each agent call:
  IF decision_type IN [severity_score, medication_select, referral_logic]:
    REQUIRE temperature == 0.0
    FREEZE top-k and frequency_penalty to defaults (no overrides)
  ELSE IF component IN [narrative_gen]:
    ALLOW temperature IN [0.5, 0.7]
  ELSE:
    REJECT call, log invariant violation
```

**Config validation at startup:**
```json
{
  "llm_config": {
    "model": "gpt-4-turbo-2024-04",
    "temperature_agent_decisions": 0.0,
    "temperature_narrative": 0.6,
    "top_p": 1.0,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0,
    "seed": "<user-provided or auto-generated>",
    "audit_log_enabled": true
  }
}
```

### 2.3 Validation Failure Protocol

If any agent call violates temperature policy:
1. Log to `AuditLog` with `event_type: "TEMPERATURE_POLICY_VIOLATION"`.
2. Halt simulation with error code `ERR_TEMP_POLICY`.
3. Return error: `"Agent decision call used temperature > 0 (non-deterministic). Simulation invalidated."`
4. Notify platform operator via Slack webhook (configured in CI).

---

## 3. Random Seed Management Specification

All pseudo-random events in the simulation engine are driven by a single master seed, with deterministic splitting for independent RNG streams.

### 3.1 Seed Initialization

**Master Seed Generation:**
```
- User-supplied seed (optional): seed_input = str (must be valid uint64)
- Auto-generated seed: seed_input = hash(timestamp + simulation_id + user_tenant_id)[0:16]
- Storage: record seed_input in SimulationRun.metadata.master_seed
```

**Seed Splitting (SFC64 or xorshift-based splitting):**
```
master_seed = seed_input

FOR each agent (n = 0..N):
  agent_seed[n] = hash(master_seed || agent_id || n)

FOR each event type (m = 0..M):
  event_seed[m] = hash(master_seed || event_type_id || m)
```

### 3.2 Seed Lifecycle

| Phase | Seed Role | Storage | Immutability |
|-------|-----------|---------|-------------|
| **Initialization** | Master seed provided or generated | `SimulationRun.metadata.master_seed` (DB) | Read-only after creation |
| **Agent Setup** | Each agent initialized with derived seed | In-memory Agent object, not persisted | Deterministic function of master seed |
| **Event Generation** | Event RNG streams use event_seed | In-memory RNG state, not persisted | Deterministic function of master seed |
| **Replay/Validation** | Same master seed → same sequence | Read from DB, used in CI tests | Enforced by test harness |

### 3.3 Seed Documentation in AuditLog

Every simulation run must log seed metadata in `AuditLog`:
```json
{
  "event_type": "SIMULATION_INITIALIZED",
  "simulation_run_id": "sim-abc123",
  "timestamp": "2026-03-17T14:30:00Z",
  "metadata": {
    "master_seed": 9872654321,
    "engine_version": "1.2.3",
    "model_version": "gpt-4-turbo-2024-04",
    "seed_strategy": "user_supplied | auto_generated",
    "determinism_target": 0.15,
    "temperature_policy": {
      "agent_decisions": 0.0,
      "narrative": 0.6
    }
  }
}
```

### 3.4 Replay Validation Workflow

**Replay Test (CI-triggered):**
```
INPUT: baseline_simulation_id (original run with known seed)
OUTPUT: Pass/Fail against ±15% threshold

1. Fetch SimulationRun(baseline_simulation_id)
2. Extract master_seed from metadata
3. Re-run simulation with identical seed, config, input population
4. Compare output distributions vs. baseline
5. Measure variance (see Section 1.3)
6. Log results to AuditLog with event_type = "REPLAY_VALIDATION"
7. If variance ≤ ±15%: PASS, mark as "DETERMINISTIC"
8. If variance > ±15%: FAIL, escalate (see Section 7)
```

---

## 4. Five-Category Test Suite Design

### 4.1 Category 1: Determinism Tests

**Objective:** Verify that identical seeds produce output within ±15% threshold.

#### Test 4.1.1: Seed Replay — Three-Run Baseline

```
test_name: "determinism_three_run_baseline"
population_fixture: "synthetic_1000_patients_cohort_A"
seed: 12345
runs: 3

FOR run in [1, 2, 3]:
  output[run] = simulate(fixture, seed=12345, config=deterministic_config)

assert abs(output[1].critical_count - output[2].critical_count) / output[1].critical_count ≤ 0.15
assert abs(output[2].critical_count - output[3].critical_count) / output[2].critical_count ≤ 0.15
assert chi_squared(output[1].tier_dist, output[2].tier_dist) > 0.05  # p-value
assert chi_squared(output[2].tier_dist, output[3].tier_dist) > 0.05
```

**Acceptance Criteria:**
- ✅ All tier counts within ±15% across all 3 runs.
- ✅ Event counts within ±15% across all 3 runs.
- ✅ Chi-squared GOF p-value > 0.05 (no significant distribution shift).
- ✅ No LLM API call variability detected (confirmed via mock or deterministic LLM).

#### Test 4.1.2: Temperature Policy Enforcement

```
test_name: "temperature_policy_violation_rejection"

FOR each agent_call in simulation:
  IF agent_call.function_name IN [score_severity, select_medication]:
    assert agent_call.temperature == 0.0, "Decision agent must use T=0.0"
    assert agent_call.top_k is not set or top_k == None
    assert agent_call.frequency_penalty == 0.0

IF temperature_violation detected:
  assert simulation.status == "HALTED"
  assert error_code == "ERR_TEMP_POLICY"
  assert event_type == "TEMPERATURE_POLICY_VIOLATION" in AuditLog
```

**Acceptance Criteria:**
- ✅ All decision agents use T = 0.0.
- ✅ Narrative agents use T ∈ [0.5, 0.7].
- ✅ Temperature violation halts simulation with appropriate error.

#### Test 4.1.3: Cross-Seed Variance Bounds

```
test_name: "cross_seed_variance_analysis"
seeds: [42, 1234, 9999, 55555, 777777]
population_fixture: "synthetic_5000_patients_cohort_B"

FOR each seed in seeds:
  output[seed] = simulate(fixture, seed=seed, config=deterministic_config)

tier_counts_critical = [output[s].critical_count for s in seeds]
tier_counts_high = [output[s].high_count for s in seeds]
tier_counts_medium = [output[s].medium_count for s in seeds]
tier_counts_low = [output[s].low_count for s in seeds]

coefficient_of_variation = std(tier_counts_critical) / mean(tier_counts_critical)
assert coefficient_of_variation ≤ 0.15, "Variance across seeds must be ≤ ±15%"

FOR each pair of adjacent seeds:
  assert chi_squared(output[seed_i].tier_dist, output[seed_j].tier_dist) > 0.05
```

**Acceptance Criteria:**
- ✅ Coefficient of variation (CV) for each tier ≤ 0.15.
- ✅ Chi-squared GOF p-value > 0.05 across all pairs.
- ✅ No systematic drift with seed variation.

---

### 4.2 Category 2: Boundary Tests (Agent Schema Validation)

**Objective:** Verify agent decision logic respects clinical rules and schema constraints under deterministic conditions.

#### Test 4.2.1: Severity Tier Boundaries

```
test_name: "severity_tier_scoring_boundaries"
seed: 42
population_fixture: "synthetic_500_edge_case_patients"

FOR each patient in population:
  apache_score = patient.clinical_data.apache_ii_score
  organ_support = patient.clinical_data.organ_support_count
  comorbidities = len(patient.clinical_data.active_conditions)

  computed_tier = engine.score_severity(patient, seed_deterministic=True)

  # Boundary checks per tier definition (Section 1.2)
  if apache_score >= 25 or organ_support > 0:
    assert computed_tier == "CRITICAL", f"Apache ≥ 25 or organ support must map to CRITICAL"
  elif apache_score >= 20 and comorbidities >= 2:
    assert computed_tier in ["CRITICAL", "HIGH"], f"Apache 20-24 + 2+ comorbidities must map to HIGH or CRITICAL"
  elif apache_score >= 15:
    assert computed_tier in ["HIGH", "MEDIUM"], f"Apache 15-19 must map to MEDIUM or HIGH"
  else:
    assert computed_tier in ["MEDIUM", "LOW"], f"Apache < 15 must map to LOW or MEDIUM"

  # Schema validation
  assert computed_tier in ["CRITICAL", "HIGH", "MEDIUM", "LOW"], "Invalid tier"
  assert isinstance(computed_tier, str), "Tier must be string"
```

**Acceptance Criteria:**
- ✅ All patients assigned valid tier (one of 4).
- ✅ Tier assignments align with clinical rules from Section 1.2.
- ✅ No patients outside clinical criteria mapped to unexpected tiers.

#### Test 4.2.2: Medication Selection Determinism

```
test_name: "medication_selection_deterministic"
seed: 42
population_fixture: "synthetic_300_patients_with_active_meds"

FOR each patient in population:
  baseline_med = engine.select_medication(patient, seed_deterministic=True)

  FOR run in [1, 2, 3]:
    rerun_med = engine.select_medication(patient, seed_deterministic=True)
    assert baseline_med == rerun_med, f"Med selection must be deterministic for patient {patient.id}"

  # Schema validation
  assert baseline_med in APPROVED_MEDICATION_LIST, f"Med {baseline_med} not in approved list"
  assert validate_med_schema(baseline_med), "Medication object schema invalid"
```

**Acceptance Criteria:**
- ✅ Identical seed → identical medication selection.
- ✅ All medications in approved list.
- ✅ Medication objects pass schema validation.

#### Test 4.2.3: Referral Logic Consistency

```
test_name: "referral_logic_consistency"
seed: 42
population_fixture: "synthetic_400_patients_various_states"

FOR each patient in population:
  baseline_referral = engine.evaluate_referral(patient, seed_deterministic=True)

  FOR run in [1, 2, 3]:
    rerun_referral = engine.evaluate_referral(patient, seed_deterministic=True)
    assert baseline_referral == rerun_referral, f"Referral must be deterministic for patient {patient.id}"

  # Boundary validation
  if patient.tier == "CRITICAL":
    assert baseline_referral.urgent == True, "CRITICAL tier must have urgent referral"
  elif patient.tier == "LOW":
    assert baseline_referral.urgent == False, "LOW tier should not have urgent referral"
```

**Acceptance Criteria:**
- ✅ Identical seed → identical referral decision.
- ✅ Referral decisions align with clinical tier.
- ✅ No schema violations.

---

### 4.3 Category 3: Population Fidelity Tests

**Objective:** Verify simulation output distributions match real-world population statistics via chi-squared goodness-of-fit testing.

#### Test 4.3.1: Tier Distribution Chi-Squared GOF

```
test_name: "population_tier_distribution_fidelity"
seed: 42
population_fixture: "synthetic_5000_real_distribution_cohort"
reference_distribution: {
  "CRITICAL": 0.07,
  "HIGH": 0.20,
  "MEDIUM": 0.38,
  "LOW": 0.35
}

output = simulate(fixture, seed=42, config=deterministic_config)

observed_counts = {
  "CRITICAL": output.tier_distribution["CRITICAL"],
  "HIGH": output.tier_distribution["HIGH"],
  "MEDIUM": output.tier_distribution["MEDIUM"],
  "LOW": output.tier_distribution["LOW"]
}

expected_counts = {
  tier: reference_distribution[tier] * len(output.patients)
  for tier in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
}

chi2_stat, p_value = chi_squared_gof(observed_counts, expected_counts)

assert p_value > 0.05, f"Chi-squared GOF failed (p={p_value}). Tier distribution does not match real-world distribution."
assert chi2_stat < chi2_critical_value(df=3, alpha=0.05), "Chi-squared statistic exceeds critical value"
```

**Acceptance Criteria:**
- ✅ Chi-squared p-value > 0.05 (no significant deviation from expected distribution).
- ✅ Observed counts within expected binomial confidence intervals (95%).

#### Test 4.3.2: Event Rate Fidelity

```
test_name: "event_rate_fidelity_hospital_admissions"
seed: 42
population_fixture: "synthetic_5000_real_distribution_cohort"
reference_event_rate: 0.15  # 15% of population admits to hospital over simulation period

output = simulate(fixture, seed=42, config=deterministic_config)

observed_admissions = len([p for p in output.events if p.event_type == "HOSPITAL_ADMISSION"])
observed_rate = observed_admissions / len(output.patients)

# Binomial confidence interval (95%)
ci_lower = binom_ci(observed_admissions, len(output.patients), alpha=0.05)[0]
ci_upper = binom_ci(observed_admissions, len(output.patients), alpha=0.05)[1]

assert ci_lower <= reference_event_rate <= ci_upper, f"Event rate {observed_rate} outside reference range [{ci_lower}, {ci_upper}]"
```

**Acceptance Criteria:**
- ✅ Observed event rate within 95% CI of reference rate.
- ✅ No systematic over/under-representation of events.

#### Test 4.3.3: Comorbidity Co-occurrence Fidelity

```
test_name: "comorbidity_cooccurrence_fidelity"
seed: 42
population_fixture: "synthetic_5000_real_distribution_cohort"

output = simulate(fixture, seed=42, config=deterministic_config)

# Reference: real comorbidity co-occurrence from MIMIC-III or similar
reference_diabetes_hypertension_cooccurrence = 0.35

observed_both = len([p for p in output.patients
                     if "DIABETES" in p.conditions
                     and "HYPERTENSION" in p.conditions])
observed_with_diabetes = len([p for p in output.patients if "DIABETES" in p.conditions])

if observed_with_diabetes > 0:
  observed_cooccurrence = observed_both / observed_with_diabetes
  assert abs(observed_cooccurrence - reference_diabetes_hypertension_cooccurrence) <= 0.10, \
    f"Comorbidity co-occurrence {observed_cooccurrence} deviates >10% from reference {reference_diabetes_hypertension_cooccurrence}"
```

**Acceptance Criteria:**
- ✅ Major comorbidity co-occurrence rates within ±10% of reference.
- ✅ No implausible clinical combinations.

---

### 4.4 Category 4: Output Provenance Tests

**Objective:** Verify metadata completeness and audit trail integrity for every simulation run.

#### Test 4.4.1: AuditLog Completeness

```
test_name: "auditlog_metadata_completeness"
seed: 42
population_fixture: "synthetic_1000_patients_cohort"

output = simulate(fixture, seed=42, config=deterministic_config)

# Fetch all AuditLog entries for this simulation_run_id
audit_logs = db.query(AuditLog,
                      filter={"simulation_run_id": output.simulation_run_id})

required_events = {
  "SIMULATION_INITIALIZED": 1,
  "AGENT_DECISION_MADE": "> 100",  # Heuristic: at least 100 agent decisions
  "EVENT_GENERATED": "> 50",        # Heuristic: at least 50 events
  "SIMULATION_COMPLETED": 1
}

event_counts = {}
FOR log in audit_logs:
  event_type = log.event_type
  event_counts[event_type] = event_counts.get(event_type, 0) + 1

FOR event_type, required_count in required_events.items():
  assert event_type in event_counts, f"Missing required event type: {event_type}"
  if isinstance(required_count, int):
    assert event_counts[event_type] == required_count, f"Expected {required_count} {event_type} events, got {event_counts[event_type]}"
  elif required_count.startswith(">"):
    min_count = int(required_count.split(">")[1].strip())
    assert event_counts[event_type] >= min_count, f"Expected ≥{min_count} {event_type} events, got {event_counts[event_type]}"
```

**Acceptance Criteria:**
- ✅ `SIMULATION_INITIALIZED` logged exactly once.
- ✅ `AGENT_DECISION_MADE` events ≥ 100.
- ✅ `EVENT_GENERATED` events ≥ 50.
- ✅ `SIMULATION_COMPLETED` logged exactly once.

#### Test 4.4.2: Seed Metadata Tracking

```
test_name: "seed_metadata_in_auditlog"
seed: 42
population_fixture: "synthetic_1000_patients_cohort"

output = simulate(fixture, seed=42, config=deterministic_config)

init_log = db.query(AuditLog,
                    filter={"simulation_run_id": output.simulation_run_id,
                            "event_type": "SIMULATION_INITIALIZED"})

assert len(init_log) == 1, "Must have exactly one SIMULATION_INITIALIZED event"

metadata = init_log[0].metadata
assert "master_seed" in metadata, "master_seed missing from metadata"
assert "model_version" in metadata, "model_version missing from metadata"
assert "engine_version" in metadata, "engine_version missing from metadata"
assert "seed_strategy" in metadata, "seed_strategy missing from metadata"
assert metadata["master_seed"] == 42, f"master_seed should be 42, got {metadata['master_seed']}"
assert metadata["seed_strategy"] in ["user_supplied", "auto_generated"], "Invalid seed_strategy"
```

**Acceptance Criteria:**
- ✅ `master_seed` recorded in `SIMULATION_INITIALIZED` metadata.
- ✅ `model_version` recorded.
- ✅ `engine_version` recorded.
- ✅ `seed_strategy` recorded and valid.

#### Test 4.4.3: Agent Decision Traceability

```
test_name: "agent_decision_auditlog_traceability"
seed: 42
population_fixture: "synthetic_500_patients_cohort"

output = simulate(fixture, seed=42, config=deterministic_config)

agent_decision_logs = db.query(AuditLog,
                               filter={"simulation_run_id": output.simulation_run_id,
                                       "event_type": "AGENT_DECISION_MADE"})

FOR log in agent_decision_logs:
  assert "patient_id" in log.metadata, "patient_id missing from decision log"
  assert "decision_type" in log.metadata, "decision_type missing from decision log"
  assert "decision_value" in log.metadata, "decision_value missing from decision log"
  assert "agent_id" in log.metadata, "agent_id missing from decision log"
  assert "temperature" in log.metadata, "temperature missing from decision log"
  assert log.metadata["temperature"] == 0.0, f"Agent decision must use T=0.0, got {log.metadata['temperature']}"
  assert log.metadata["decision_type"] in ["SEVERITY_SCORE", "MEDICATION_SELECT", "REFERRAL_LOGIC"], \
    f"Invalid decision_type: {log.metadata['decision_type']}"
```

**Acceptance Criteria:**
- ✅ Every agent decision logged with required metadata.
- ✅ `temperature` field present and equals 0.0.
- ✅ `decision_type` valid.
- ✅ `patient_id`, `agent_id` traceable.

---

### 4.5 Category 5: Latency & Circuit-Breaker Tests

**Objective:** Verify simulation latency remains acceptable and circuit-breaker logic prevents cascade failures.

#### Test 4.5.1: Simulation Latency SLO

```
test_name: "simulation_latency_slo"
seed: 42
population_fixture: "synthetic_5000_patients_cohort"
slo_target_ms: 180000  # 3 minutes per 5k patient cohort

start_time = time.time()
output = simulate(fixture, seed=42, config=deterministic_config)
elapsed_ms = (time.time() - start_time) * 1000

assert elapsed_ms <= slo_target_ms, f"Simulation exceeded SLO: {elapsed_ms}ms > {slo_target_ms}ms"

# Log performance metrics to AuditLog
db.insert(AuditLog, {
  "simulation_run_id": output.simulation_run_id,
  "event_type": "PERFORMANCE_METRIC",
  "metadata": {
    "elapsed_ms": elapsed_ms,
    "patients_count": len(output.patients),
    "ms_per_patient": elapsed_ms / len(output.patients),
    "slo_target_ms": slo_target_ms,
    "slo_met": elapsed_ms <= slo_target_ms
  }
})
```

**Acceptance Criteria:**
- ✅ Total simulation time ≤ 3 minutes for 5k-patient cohort.
- ✅ Per-patient latency ≤ 40 ms.
- ✅ Performance metrics logged for trend analysis.

#### Test 4.5.2: Circuit-Breaker Activation

```
test_name: "circuit_breaker_consecutive_failures"
seed: 42
population_fixture: "synthetic_1000_patients_cohort"

failure_count = 0
MAX_RETRIES = 3

FOR attempt in range(1, MAX_RETRIES + 2):
  try:
    output = simulate(fixture, seed=42, config=deterministic_config)
    # Inject fault: force failure
    raise Exception("Simulated LLM API failure")
  except Exception as e:
    failure_count += 1

    if failure_count >= MAX_RETRIES:
      # Circuit breaker should trip
      circuit_status = engine.get_circuit_breaker_status()
      assert circuit_status == "OPEN", f"Circuit breaker should be OPEN after {MAX_RETRIES} failures"

      # Next attempt should fail immediately without retry
      start_time = time.time()
      try:
        output = simulate(fixture, seed=42, config=deterministic_config)
      except Exception as circuit_error:
        elapsed_ms = (time.time() - start_time) * 1000
        assert "CIRCUIT_BREAKER_OPEN" in str(circuit_error), "Circuit breaker error not raised"
        assert elapsed_ms < 100, f"Circuit breaker should fail fast, took {elapsed_ms}ms"
```

**Acceptance Criteria:**
- ✅ After 3 consecutive failures, circuit breaker opens.
- ✅ Circuit breaker fails fast (< 100 ms) without retrying.
- ✅ Circuit breaker status queryable via API.

#### Test 4.5.3: Partial Failure Recovery

```
test_name: "circuit_breaker_partial_failure_recovery"
seed: 42
population_fixture: "synthetic_1000_patients_cohort"

# Trigger 3 failures to open circuit
FOR attempt in range(1, 4):
  try:
    output = simulate(fixture, seed=42, config=deterministic_config, force_fail=True)
  except Exception as e:
    pass  # Expected

# Circuit now OPEN
circuit_status = engine.get_circuit_breaker_status()
assert circuit_status == "OPEN", "Circuit breaker should be OPEN"

# Wait for half-open timeout
time.sleep(31)  # Default half-open timeout = 30s

# Next attempt should transition to HALF_OPEN and attempt reset
start_time = time.time()
try:
  output = simulate(fixture, seed=42, config=deterministic_config, force_fail=False)
  elapsed_ms = (time.time() - start_time) * 1000

  # If successful, circuit should close
  circuit_status = engine.get_circuit_breaker_status()
  assert circuit_status == "CLOSED", "Circuit breaker should CLOSE after successful reset attempt"
except Exception as e:
  # If still fails in HALF_OPEN, should remain OPEN
  circuit_status = engine.get_circuit_breaker_status()
  assert circuit_status == "OPEN", "Circuit breaker should remain OPEN if reset attempt fails"
```

**Acceptance Criteria:**
- ✅ Circuit transitions CLOSED → OPEN after 3 failures.
- ✅ Circuit transitions OPEN → HALF_OPEN after timeout (30s).
- ✅ Circuit transitions HALF_OPEN → CLOSED after successful attempt.
- ✅ Circuit transitions HALF_OPEN → OPEN if reset attempt fails.

---

## 5. Test Data Fixtures Specification

All test fixtures are immutable, version-controlled JSON files stored in `/tests/fixtures/`.

### 5.1 Fixture Catalog

| Fixture ID | Size | Purpose | Generators/Notes |
|-----------|------|---------|------------------|
| `synthetic_100_patients_minimal` | 100 | Unit tests, fast iteration | Random APACHE 10–20, 0–2 comorbidities |
| `synthetic_500_edge_case_patients` | 500 | Boundary testing | Edge cases: APACHE 0, 30+, 5+ comorbidities, no meds |
| `synthetic_1000_patients_cohort_A` | 1,000 | Determinism baseline | Fixed seed = 42, stable for 3-run checks |
| `synthetic_5000_real_distribution_cohort` | 5,000 | Population fidelity | Realistic APACHE, comorbidity distributions from MIMIC-III |
| `synthetic_5000_patients_cohort_B` | 5,000 | Cross-seed variance | Alternative distribution for seed independence |
| `synthetic_300_patients_with_active_meds` | 300 | Medication logic | All patients on ≥ 1 medication |
| `synthetic_400_patients_various_states` | 400 | Referral logic | Mix of tiers and urgency levels |
| `synthetic_10000_large_scale` | 10,000 | Nightly/production scale | Full-fidelity data for end-to-end tests |

### 5.2 Fixture JSON Schema

```json
{
  "fixture_id": "synthetic_1000_patients_cohort_A",
  "version": "1.0",
  "generated_at": "2026-03-17T12:00:00Z",
  "seed_used": 42,
  "patient_count": 1000,
  "patients": [
    {
      "patient_id": "pat-001",
      "age": 65,
      "gender": "M",
      "clinical_data": {
        "apache_ii_score": 18,
        "organ_support_count": 0,
        "active_conditions": ["HYPERTENSION", "DIABETES_TYPE_2"],
        "current_medications": ["LISINOPRIL", "METFORMIN"]
      },
      "expected_tier": "MEDIUM"
    }
  ],
  "distribution_summary": {
    "tier_CRITICAL": 0.07,
    "tier_HIGH": 0.20,
    "tier_MEDIUM": 0.38,
    "tier_LOW": 0.35
  }
}
```

### 5.3 Fixture Versioning

- **Major version** (X.0): Schema change (e.g., new clinical field).
- **Minor version** (0.Y): Data update (e.g., refined APACHE distribution).
- **Immutability:** Once committed, fixtures never change. Create new version for updates.
- **Git tracking:** Fixtures stored in repository; large fixtures (>50MB) may be compressed or accessed via CI artifact cache.

---

## 6. CI Integration Design

### 6.1 Tiered Testing Strategy

| Tier | Trigger | Duration | Test Categories | Pass Gate |
|------|---------|----------|-----------------|-----------|
| **PR-Level (Fast)** | Every PR commit | < 5 min | Determinism (3-run), Temperature, Boundary | Blocks merge if fails |
| **Merge-Level** | Pre-merge to main | < 15 min | Determinism, Boundary, Population Fidelity (5k cohort) | Blocks merge if fails |
| **Nightly Production Scale** | 02:00 UTC daily | < 45 min | All 5 categories, 10k cohort, latency SLO | Alerts Slack; does not block PRs |

### 6.2 PR-Level CI (GitHub Actions)

```yaml
name: PR Determinism Gate
on: [pull_request]

jobs:
  determinism_fast_gate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install

      # Run determinism 3-run test with fixed seed
      - name: Test Determinism (3-run Baseline)
        run: |
          pnpm test:determinism:3run \
            --fixture synthetic_1000_patients_cohort_A \
            --seed 42 \
            --tolerance 0.15

      # Temperature policy validation
      - name: Test Temperature Policy
        run: pnpm test:temperature:policy

      # Boundary tests (Severity, Meds, Referral)
      - name: Test Agent Boundaries
        run: pnpm test:boundaries:agents

      # Failure escalation
      - name: Report Results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./test-results.json');
            if (results.failed > 0) {
              core.setFailed(`Determinism gate failed: ${results.failed} test(s)`);
            }
```

### 6.3 Merge-Level CI (GitHub Actions)

```yaml
name: Merge Determinism + Fidelity Gate
on:
  pull_request:
    branches: [main]

jobs:
  merge_gate_determinism_fidelity:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install

      # Determinism across 3 runs (5k cohort)
      - name: Test Determinism (5k Cohort)
        run: |
          pnpm test:determinism:3run \
            --fixture synthetic_5000_real_distribution_cohort \
            --seed 42 \
            --tolerance 0.15

      # Population fidelity (chi-squared)
      - name: Test Population Fidelity
        run: |
          pnpm test:fidelity:population \
            --fixture synthetic_5000_real_distribution_cohort \
            --alpha 0.05

      # Boundary + Provenance
      - name: Test Boundaries + Provenance
        run: |
          pnpm test:boundaries:agents && \
          pnpm test:provenance:auditlog

      # Report & block if failed
      - name: Merge Gate Decision
        run: |
          if [ $? -ne 0 ]; then
            echo "::error::Merge gate failed"
            exit 1
          fi
```

### 6.4 Nightly Production-Scale CI (GitHub Actions Scheduled)

```yaml
name: Nightly Production Scale Tests
on:
  schedule:
    - cron: '0 2 * * *'  # 02:00 UTC daily

jobs:
  nightly_production_scale:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install

      # All 5 test categories with 10k cohort
      - name: Run Full Test Suite (10k Cohort)
        run: pnpm test:full:nightly --fixture synthetic_10000_large_scale

      # Parse results
      - name: Parse Results
        id: parse
        run: |
          RESULTS=$(cat test-results-nightly.json)
          echo "results=$RESULTS" >> $GITHUB_OUTPUT

      # Slack notification
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_NIGHTLY_WEBHOOK }}
          payload: |
            {
              "text": "Nightly Determinism Tests Complete",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Determinism: ${{ steps.parse.outputs.determinism_status }}\nFidelity: ${{ steps.parse.outputs.fidelity_status }}\nLatency SLO: ${{ steps.parse.outputs.latency_status }}"
                  }
                }
              ]
            }

      # Archive results for trend analysis
      - name: Archive Results
        uses: actions/upload-artifact@v3
        with:
          name: nightly-results-${{ github.run_id }}
          path: test-results-nightly.json
          retention-days: 90
```

---

## 7. Statistical Methods for Simulation Variance

### 7.1 Mean Absolute Percentage Error (MAPE)

Used to measure deviation between baseline and rerun distributions.

```
MAPE = (1/n) * Σ |( Baseline_i - Rerun_i ) / Baseline_i| * 100

Interpretation:
  MAPE ≤ 15% → PASS (within ±15% threshold)
  MAPE > 15% → FAIL (exceeds tolerance)
```

**Example:**
```
Baseline critical count = 120
Rerun critical count = 130
MAPE = |120 - 130| / 120 * 100 = 8.33% → PASS
```

### 7.2 Coefficient of Variation (CV)

Used to measure relative variability across multiple runs with different seeds.

```
CV = (σ / μ) * 100

Where:
  σ = standard deviation of tier counts across seeds
  μ = mean tier count across seeds

Interpretation:
  CV ≤ 15% → PASS (low variability)
  CV > 15% → FAIL (high variability)
```

**Example:**
```
Seeds: [42, 1234, 9999, 55555, 777777]
Critical counts: [120, 118, 125, 119, 121]
μ = 120.6, σ = 2.61
CV = (2.61 / 120.6) * 100 = 2.16% → PASS
```

### 7.3 Chi-Squared Goodness-of-Fit (GOF) Test

Used to test if observed tier distribution matches expected (baseline or reference) distribution.

```
χ² = Σ ((Observed_i - Expected_i)² / Expected_i)

Degrees of freedom: k - 1 (k = number of categories = 4 tiers)
Significance level: α = 0.05
Critical value (df=3, α=0.05): 7.815

Interpretation:
  χ² < 7.815 and p-value > 0.05 → PASS (distributions not significantly different)
  χ² ≥ 7.815 or p-value ≤ 0.05 → FAIL (significant distribution shift)
```

**Example:**
```
Baseline distribution: Critical=120, High=250, Medium=380, Low=250 (total=1000)
Rerun distribution:    Critical=118, High=255, Medium=378, Low=249 (total=1000)

χ² = (120-120)²/120 + (250-255)²/250 + (380-378)²/380 + (250-249)²/250
   = 0 + 0.1 + 0.011 + 0.004 = 0.115

p-value = 0.99 > 0.05 → PASS
```

### 7.4 Binomial Confidence Intervals

Used to establish acceptable ranges for event rates and tier proportions.

```
CI = [p ± z * sqrt(p * (1 - p) / n)]

Where:
  p = observed proportion
  z = 1.96 (for 95% CI)
  n = sample size

Interpretation:
  If reference rate falls within CI → PASS
  If reference rate outside CI → FAIL
```

**Example:**
```
Event: Hospital admissions
n = 5000 patients
Observed admissions = 750 (rate = 0.15)
Reference rate = 0.145

CI_lower = 0.15 - 1.96 * sqrt(0.15 * 0.85 / 5000) = 0.1425
CI_upper = 0.15 + 1.96 * sqrt(0.15 * 0.85 / 5000) = 0.1575

Reference 0.145 ∈ [0.1425, 0.1575] → PASS
```

---

## 8. Failure Escalation Protocol

### 8.1 Failure Classification

| Severity | Category | Example | Action |
|----------|----------|---------|--------|
| **P1 (Critical)** | Temperature policy violation | Agent decision with T > 0 | Halt simulation immediately; escalate to on-call engineer |
| **P1** | CIRCUIT_BREAKER_TRIPPED | 3+ consecutive LLM failures | Page on-call; block all simulations until resolved |
| **P2 (High)** | Determinism variance > ±15% | Rerun with same seed shows ±20% drift | Trigger re-validation; may block merge depending on root cause |
| **P2** | Schema validation failure | Invalid tier assignment | Block merge; require code review |
| **P3 (Medium)** | Population fidelity < 95% CI | Chi-squared p-value = 0.04 | Log incident; investigate root cause; may require fixture update |
| **P3** | Latency SLO exceeded | Simulation took 5 minutes for 5k cohort | Investigate performance; add to backlog |
| **P4 (Low)** | AuditLog missing optional metadata | `timestamp` not recorded | Log incident; fix in next sprint |

### 8.2 Escalation Workflows

#### 8.2.1 Temperature Policy Violation (P1)

```
DETECT: temperature > 0.0 on agent decision call

1. Log event:
   AuditLog(
     event_type: "TEMPERATURE_POLICY_VIOLATION",
     severity: "P1",
     simulation_run_id: <id>,
     metadata: { agent_id, temperature, decision_type }
   )

2. Halt simulation:
   simulation.status = "HALTED"
   simulation.error_code = "ERR_TEMP_POLICY"

3. Alert on-call engineer:
   Slack message:
   ":rotating_light: P1 Temperature Policy Violation
    Simulation: {id}
    Agent: {agent_id}
    Temperature: {temperature} (expected 0.0)
    Immediate action required."

4. Await manual investigation.
```

#### 8.2.2 CIRCUIT_BREAKER_TRIPPED (P1)

```
DETECT: 3+ consecutive simulation failures due to LLM API outage

1. Log event:
   AuditLog(
     event_type: "CIRCUIT_BREAKER_TRIPPED",
     severity: "P1",
     metadata: { attempt_count, last_error, half_open_timeout_sec }
   )

2. Emit block:
   ```
   CIRCUIT_BREAKER_TRIPPED
   attempt: 3/3
   last_error: <LLM error message>
   recommended_action: Check LLM API health; may require manual intervention
   ```

3. Page on-call:
   PagerDuty event with severity=CRITICAL

4. Auto-recovery:
   Transition to HALF_OPEN after 30 seconds; attempt single test simulation.
   If successful, close circuit. If fails, remain OPEN and re-page.
```

#### 8.2.3 Determinism Variance > ±15% (P2)

```
DETECT: MAPE > 0.15 on replay validation

1. Log event:
   AuditLog(
     event_type: "DETERMINISM_VARIANCE_EXCEEDED",
     severity: "P2",
     baseline_simulation_id: <id>,
     variance_percent: <mape>,
     failing_metrics: { tier_counts, event_counts }
   )

2. Trigger investigation:
   - Run 5 additional seeds to isolate issue
   - Check for model version changes, config drift
   - Verify seed splitting logic

3. Decision tree:
   IF variance caused by new model version:
     → Requires re-validation study (see RISK-012)
   ELSE IF variance due to code change:
     → Block merge; require code review
   ELSE IF variance due to infrastructure (LLM rate limits, API jitter):
     → Increase tolerance to ±18% temporarily; add SLO buffer

4. Slack notification to #simulation-alerts:
   ":warning: P2 Determinism Variance Exceeded
    Baseline: {id}
    Variance: {mape}%
    Investigation: {link_to_debug_logs}"
```

#### 8.2.4 Schema Validation Failure (P2)

```
DETECT: Invalid tier assignment, missing required field, etc.

1. Log event:
   AuditLog(
     event_type: "SCHEMA_VALIDATION_FAILED",
     severity: "P2",
     patient_id: <id>,
     invalid_field: <name>,
     expected_type: <type>,
     received_value: <value>
   )

2. Halt agent chain:
   Simulation continues but logs validation error; does not progress to next tier.

3. Block merge:
   CI gate fails with error message and link to failing test.

4. Notify author:
   GitHub PR comment: "@author Schema validation failed on {patient_id}. See test logs for details."
```

#### 8.2.5 Population Fidelity < 95% CI (P3)

```
DETECT: Chi-squared p-value < 0.05 or observed rate outside binomial CI

1. Log event:
   AuditLog(
     event_type: "POPULATION_FIDELITY_DEGRADED",
     severity: "P3",
     test_name: <name>,
     chi_squared_pvalue: <p>,
     observed_vs_expected: <metrics>
   )

2. Investigate root cause:
   - Check if fixture distribution drifted
   - Verify clinical rules have not changed
   - Look for systematic over/under-representation

3. Decision tree:
   IF fixture distribution outdated:
     → Regenerate fixture; update reference distribution
   ELSE IF clinical rules changed:
     → Re-calibrate reference distributions
   ELSE IF systematic bias detected:
     → Add bias correction to simulation logic

4. Post to #simulation-analytics:
   ":chart_with_upwards_trend: P3 Population Fidelity Degraded
    Test: {name}
    Chi-squared p-value: {p}
    Next steps: {action}"
```

---

## 9. Monitoring & Observability

### 9.1 Key Metrics Dashboard

| Metric | Target | SLO | Tracking |
|--------|--------|-----|----------|
| Determinism MAPE | ≤ 15% | 99% of runs | AuditLog + Grafana |
| Population fidelity (Chi-squared p) | > 0.05 | 95% of runs | AuditLog + Grafana |
| Simulation latency (5k cohort) | ≤ 3 min | 99% | AuditLog + CloudWatch |
| Temperature policy violations | 0 | 100% | AuditLog alerts |
| Circuit breaker trip rate | < 1/day | N/A | Datadog/PagerDuty |

### 9.2 Alerting Rules

**High Priority (PagerDuty):**
- Temperature policy violation detected.
- Circuit breaker tripped.
- Latency SLO exceeded by >50%.

**Medium Priority (Slack #simulation-alerts):**
- Determinism variance > ±15%.
- Population fidelity chi-squared p-value < 0.05.
- Schema validation failures.

**Low Priority (Weekly digest):**
- Fixture versioning changes.
- Test coverage reports.

---

## 10. Review & Iteration

This strategy is reviewed quarterly by QUINN (QA) and ARCHIE (CTO). Updates required if:

1. Clinical rules or agent decision logic changes significantly.
2. LLM model provider changes (e.g., OpenAI → Claude).
3. Determinism threshold adjusted by stakeholders.
4. New test categories identified (e.g., fairness, bias).

**Next Review Date:** 2026-06-17

---

## Appendix: Example CI Configuration

See `/tests/ci-config/determinism-gate.yaml` for full GitHub Actions workflow.
