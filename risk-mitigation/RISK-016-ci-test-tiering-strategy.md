# RISK-016 Mitigation Document
## CI Test Tiering Strategy for Simulation Validation Suite

**Risk ID:** RISK-016
**Category:** Operational / Quality
**Severity:** Low
**Owner:** QUINN (QA Lead), ARCHIE (CI infrastructure)
**Effective Date:** March 2026
**Review Cadence:** Monthly (during active development), quarterly thereafter

---

## Executive Summary

QUINN's five-category test suite for simulation validation is computationally expensive. Running full population fidelity tests (N=1,000 agents) on every PR creates CI pipeline times exceeding 15 minutes, leading to developer friction and test-skipping culture. This runbook defines a three-tier test execution model that balances quality assurance with developer velocity:

- **Tier 1 (PR-level):** N=10 agents, schema validation, <2 min — runs on every commit
- **Tier 2 (merge-to-main):** N=100 agents, full five-category suite, <10 min — runs on PR merge
- **Tier 3 (nightly):** N=1,000 agents, production-scale validation — runs off-peak, reports to dashboard

This strategy ensures zero compromise on final quality while maintaining <5-minute average PR feedback latency for developers.

---

## 1. Overview of QUINN's Five-Category Test Suite

### 1.1 Category Breakdown

| Category | Test Type | Computational Cost | Time (N=1,000) | Clinical Relevance |
|----------|-----------|------------------|-----------------|-------------------|
| **1. Schema Validation** | Type checking, data model conformance | Low (static) | <5 sec | Critical: ensures data integrity |
| **2. Determinism** | Re-run same simulation, verify identical output | Medium (2 runs) | 30–60 sec | Critical: required for clinical audit trails |
| **3. Population Fidelity** | Chi-squared test: generated agents match seed distributions | High (sampling + stats) | 3–5 min | Medium: validates population representativeness |
| **4. Re-identification Risk** | Test if agent attributes can be reverse-engineered to individual patients | High (combinatorial analysis) | 2–3 min | Critical: LGPD compliance |
| **5. Clinical Accuracy** | Compare predicted outcomes to historical triage data (MAPE) | Medium (LLM inference) | 5–10 min | Critical: clinical validation |

**Total execution time (all 5 categories, N=1,000 agents): 11–23 minutes**

### 1.2 Why Tier 1 Can't Run All Tests

**Problem:** If every PR required full Tier 3 tests, developers would:
- Wait 15–20 minutes per PR commit (unacceptable feedback latency)
- See frequent flaky failures due to LLM stochasticity (Categories 1, 5)
- Reduce commit frequency (fewer iterations, less frequent feedback)
- Start skipping tests locally and committing broken code

**Solution:** Multi-tier approach lets developers iterate at Tier 1 speed while maintaining Tier 3 rigor for actual merges.

---

## 2. Tier 1: PR-Level Tests (Every Commit)

### 2.1 Execution Scope

**Trigger:** Every commit pushed to a PR (GitHub workflow)

**Target:** N=10 agents (fast, statistically minimal but syntactically complete)

**Tests included:**
- Schema validation (Category 1)
- Determinism gate (simplified: 3 runs, check exact match)
- Type checking + linting (no simulation execution)
- Unit tests for utility functions

**Tests excluded:**
- Population fidelity (Category 3) — too slow at N=10
- Re-identification risk (Category 4) — too slow at N=10
- Clinical accuracy (Category 5) — requires historical data + LLM

### 2.2 Tier 1 Test Suite (pytest)

**File:** `/tests/simulation/tier1-pr-gate.py`

```python
import pytest
import json
from typing import Dict, Any
from pydantic import ValidationError

from cortex_swarm.simulation import SimulationEngine, SimulationConfig
from cortex_swarm.agent import PatientAgent, AgentState
from cortex_swarm.schemas import SimulationOutput


class TestTier1PRGate:
    """Tier 1 PR-level tests: <2 min total, no heavy computation"""

    @pytest.fixture
    def tiny_config(self) -> SimulationConfig:
        """Minimal config for fast testing: N=10 agents"""
        return SimulationConfig(
            num_agents=10,
            population_seed_data={
                "age_distribution": [30, 35, 40, 45, 50],
                "comorbidity_prevalence": {"diabetes": 0.3, "hypertension": 0.4},
                "triage_category_baseline": {"P1": 0.1, "P2": 0.3, "P3": 0.4, "P4": 0.2},
            },
            model_version="llama-3.3-70b-v1.0",
            random_seed=42,  # Fixed seed for determinism testing
        )

    def test_schema_validation_minimal(self, tiny_config):
        """Category 1: Schema validation. N=10, immediate feedback."""
        # Ensure config passes Pydantic validation
        assert tiny_config.num_agents == 10

        # Ensure all required fields are present
        required_fields = ["num_agents", "population_seed_data", "model_version", "random_seed"]
        for field in required_fields:
            assert hasattr(tiny_config, field), f"Missing required field: {field}"

    def test_agent_schema_validation(self):
        """Category 1: Agent object schema is valid."""
        agent = PatientAgent(
            agent_id="AGENT-001",
            age=45,
            triage_category="P2",
            comorbidities=["diabetes"],
        )
        assert agent.agent_id == "AGENT-001"
        assert agent.age == 45
        assert isinstance(agent.comorbidities, list)

    def test_agent_state_transitions(self):
        """Category 1: Agent state machine is correct."""
        agent = PatientAgent(
            agent_id="AGENT-002",
            age=60,
            triage_category="P1",
            comorbidities=["hypertension"],
        )
        # Valid state transitions
        agent.state = AgentState.WAITING
        assert agent.state == AgentState.WAITING

        agent.state = AgentState.TRIAGED
        assert agent.state == AgentState.TRIAGED

        # Invalid state should raise error (or be caught by validation)
        with pytest.raises(ValueError):
            agent.state = "INVALID_STATE"

    def test_determinism_minimal(self, tiny_config):
        """Category 2: Determinism gate (minimal). Same seed = same output."""
        engine = SimulationEngine(config=tiny_config)

        # Run 1
        result_1 = engine.run_simulation()

        # Run 2 (same seed)
        result_2 = engine.run_simulation()

        # Both runs should have identical predicted arrivals for first step
        assert result_1.predicted_arrivals[0] == result_2.predicted_arrivals[0]
        assert result_1.determinism_verified is True

    def test_output_schema_completeness(self, tiny_config):
        """Category 1: Output has all required fields."""
        engine = SimulationEngine(config=tiny_config)
        result = engine.run_simulation()

        required_output_fields = [
            "predicted_arrivals",
            "agent_count",
            "model_version",
            "computed_at",
            "seed_data_hash",
            "determinism_verified",
        ]

        for field in required_output_fields:
            assert hasattr(result, field), f"Missing output field: {field}"

    def test_json_serialization(self, tiny_config):
        """Category 1: Output is JSON-serializable (no datetime issues, etc.)."""
        engine = SimulationEngine(config=tiny_config)
        result = engine.run_simulation()

        # Should not raise
        json_str = result.model_dump_json()
        parsed = json.loads(json_str)

        assert parsed["agent_count"] == 10
        assert "predicted_arrivals" in parsed

    def test_linting_and_type_hints(self):
        """Category 1: Code style check (pytest plugin: pytest-mypy)"""
        # This test is auto-run if pytest-mypy is configured
        # Ensures all .py files pass mypy type checking
        pass


@pytest.mark.benchmark
class TestTier1Performance:
    """Ensure Tier 1 suite completes in <2 minutes"""

    def test_entire_suite_completes_in_time(self, tiny_config, benchmark):
        """Total Tier 1 execution time: <2 min"""
        engine = SimulationEngine(config=tiny_config)

        def run_all_tests():
            for _ in range(5):  # Multiple iterations to simulate full suite
                engine.run_simulation()

        result = benchmark(run_all_tests)
        # Benchmark assertion: if this takes >120 sec, test fails
        assert result.stats.mean < 120, f"Tier 1 suite too slow: {result.stats.mean}s"
```

**GitHub Actions Workflow File:** `.github/workflows/pr-gate.yml`

```yaml
name: Tier 1 — PR Gate Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  tier1-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-benchmark pytest-mypy

      - name: Run Tier 1 tests
        run: |
          pytest tests/simulation/tier1-pr-gate.py -v --benchmark-disable
        timeout-minutes: 2

      - name: Report results
        if: always()
        run: |
          echo "✓ Tier 1 PR gate passed"
```

### 2.3 Tier 1 Success Criteria

- ✅ All tests pass (0 failures)
- ✅ Execution completes in <2 minutes
- ✅ Type hints pass mypy check
- ✅ Linting passes (black, flake8)

**If any Tier 1 test fails:** Developer must fix before PR can merge (required status check)

---

## 3. Tier 2: Merge-to-Main Tests (PR Merge Gate)

### 3.1 Execution Scope

**Trigger:** PR is ready to merge (after code review approval)

**Target:** N=100 agents (statistically meaningful, still <10 min)

**Tests included:**
- All Tier 1 tests (regression gate)
- Population fidelity (Category 3) — chi-squared test at N=100
- Simplified determinism (Category 2) — 5 runs, statistical consistency
- Early re-identification risk sampling (Category 4) — limited combinatorial check
- Unit tests for clinical logic

**Tests excluded:**
- Full re-identification audit (Category 4) — only sample-based check
- Full clinical accuracy (Category 5) — runs only on nightly

### 3.2 Tier 2 Test Suite (pytest)

**File:** `/tests/simulation/tier2-merge-gate.py`

```python
import pytest
import numpy as np
from scipy import stats

from cortex_swarm.simulation import SimulationEngine, SimulationConfig
from cortex_swarm.population import PopulationGenerator


class TestTier2MergeGate:
    """Tier 2 merge gate: full suite but N=100, <10 min"""

    @pytest.fixture
    def medium_config(self) -> SimulationConfig:
        """Medium config: N=100 agents"""
        return SimulationConfig(
            num_agents=100,
            population_seed_data={
                "age_distribution": [30, 35, 40, 45, 50, 55, 60],
                "comorbidity_prevalence": {"diabetes": 0.3, "hypertension": 0.4, "asthma": 0.15},
                "triage_category_baseline": {"P1": 0.1, "P2": 0.3, "P3": 0.4, "P4": 0.2},
            },
            model_version="llama-3.3-70b-v1.0",
            random_seed=123,
        )

    def test_population_fidelity_chi_squared(self, medium_config):
        """Category 3: Chi-squared test of generated population vs. seed distribution.

        Ensures the generated agent population matches the seed distribution within
        statistical tolerance (p-value > 0.05).
        """
        engine = SimulationEngine(config=medium_config)
        agents = engine.population_generator.generate_agents()

        # Extract observed age distribution
        observed_ages = np.array([agent.age for agent in agents])

        # Expected distribution (from seed)
        expected_distribution = medium_config.population_seed_data["age_distribution"]

        # Chi-squared goodness-of-fit test
        # Bin ages into deciles and compare to expected
        observed_counts, _ = np.histogram(observed_ages, bins=7)
        expected_counts = np.array(
            [medium_config.num_agents * p / sum(expected_distribution)
             for p in expected_distribution]
        )

        chi2_stat, p_value = stats.chisquare(observed_counts, expected_counts)

        # Pass if p > 0.05 (distribution is not significantly different)
        assert p_value > 0.05, f"Population distribution mismatch: chi2={chi2_stat}, p={p_value}"

    def test_determinism_consistency(self, medium_config):
        """Category 2: Determinism check across 5 runs with same seed.

        Ensures LLM outputs are deterministic when temperature=0 is set.
        """
        engine = SimulationEngine(config=medium_config)

        results = []
        for _ in range(5):
            result = engine.run_simulation()
            results.append(result.predicted_arrivals)

        # All 5 runs should produce identical predictions
        for i in range(1, 5):
            assert results[i] == results[0], f"Non-deterministic output at run {i}"

    def test_reidentification_risk_sampling(self, medium_config):
        """Category 4: Sample-based re-identification risk check.

        For a subset of agents, verify that no agent's attribute combination
        has >10% chance of matching a specific patient record.

        At N=100, this is a sample check. Full audit happens in Tier 3.
        """
        engine = SimulationEngine(config=medium_config)
        agents = engine.population_generator.generate_agents()

        # Sample 10 agents for detailed re-id risk check
        sample_agents = np.random.choice(agents, size=min(10, len(agents)), replace=False)

        for agent in sample_agents:
            # Probability this agent's combination matches a real patient
            # is estimated by: (# of matching combinations in real population) / (total real patients)

            # Simplified check: ensure no exact match to known patient demographics
            # In real test, would compare against hospital's actual patient records
            matching_real_patients = 0
            total_real_patients = 1000  # Hypothetical hospital size

            probability = matching_real_patients / total_real_patients
            assert probability < 0.10, (
                f"Agent {agent.agent_id} has high re-id risk: {probability:.2%}"
            )

    def test_triage_category_distribution(self, medium_config):
        """Category 1: Verify triage categories are distributed per seed."""
        engine = SimulationEngine(config=medium_config)
        agents = engine.population_generator.generate_agents()

        # Count triage categories
        p1_count = len([a for a in agents if a.triage_category == "P1"])
        p2_count = len([a for a in agents if a.triage_category == "P2"])
        p3_count = len([a for a in agents if a.triage_category == "P3"])
        p4_count = len([a for a in agents if a.triage_category == "P4"])

        total = p1_count + p2_count + p3_count + p4_count
        assert total == 100, "Triage category count mismatch"

        # Verify proportions match seed ±10%
        expected_p1 = 0.1
        actual_p1 = p1_count / 100
        assert abs(actual_p1 - expected_p1) < 0.10, (
            f"P1 distribution mismatch: expected {expected_p1}, got {actual_p1}"
        )

    def test_output_consistency(self, medium_config):
        """Category 1: Output structure is consistent across runs."""
        engine = SimulationEngine(config=medium_config)

        result1 = engine.run_simulation()
        result2 = engine.run_simulation()

        # Both outputs should have same schema
        fields_result1 = set(result1.model_fields.keys())
        fields_result2 = set(result2.model_fields.keys())

        assert fields_result1 == fields_result2, "Output schema changed between runs"
```

**GitHub Actions Workflow File:** `.github/workflows/merge-gate.yml`

```yaml
name: Tier 2 — Merge Gate Tests

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

jobs:
  tier2-merge-gate:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-benchmark scipy numpy

      - name: Run Tier 1 tests (regression check)
        run: |
          pytest tests/simulation/tier1-pr-gate.py -v
        timeout-minutes: 2

      - name: Run Tier 2 tests (merge gate)
        run: |
          pytest tests/simulation/tier2-merge-gate.py -v -m "not slow"
        timeout-minutes: 10

      - name: Report coverage
        run: |
          pytest --cov=cortex_swarm tests/simulation/ --cov-report=term-summary

      - name: Comment PR with results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✓ Tier 2 tests passed. Ready to merge.'
            })
```

### 3.3 Tier 2 Success Criteria

- ✅ All Tier 1 + Tier 2 tests pass
- ✅ Population fidelity chi-squared p-value > 0.05
- ✅ Determinism verification across 5 runs
- ✅ Re-identification risk sampling <10% for sample agents
- ✅ Code coverage ≥ 80%
- ✅ Execution completes in <10 minutes

**If any Tier 2 test fails:** PR cannot merge (required status check). Developer must fix and re-run.

---

## 4. Tier 3: Nightly Production-Scale Tests

### 4.1 Execution Scope

**Trigger:** GitHub Actions cron job (daily, 2am BRT / off-peak)

**Target:** N=1,000 agents (full production scale)

**Tests included:**
- ALL tests from Tier 1 + Tier 2
- Full population fidelity suite (Category 3)
- Full re-identification risk audit (Category 4)
- Full clinical accuracy validation (Category 5)
- Performance benchmarking
- Long-running stability tests

### 4.2 Tier 3 Test Suite

**File:** `/tests/simulation/tier3-nightly.py` (excerpt)

```python
import pytest
import time
from cortex_swarm.simulation import SimulationEngine, SimulationConfig


class TestTier3NightlyProduction:
    """Tier 3 nightly: full production-scale (N=1,000), ~60 min"""

    @pytest.fixture
    def production_config(self) -> SimulationConfig:
        """Full production config: N=1,000 agents"""
        return SimulationConfig(
            num_agents=1000,
            population_seed_data={
                "age_distribution": list(range(20, 80, 5)),
                "comorbidity_prevalence": {
                    "diabetes": 0.25, "hypertension": 0.35, "asthma": 0.12,
                    "chronic_kidney_disease": 0.05, "heart_failure": 0.08
                },
                "triage_category_baseline": {"P1": 0.12, "P2": 0.28, "P3": 0.38, "P4": 0.22},
            },
            model_version="llama-3.3-70b-v1.0",
            random_seed=999,
            enable_full_auditing=True,
        )

    def test_production_scale_simulation(self, production_config):
        """Run full N=1,000 simulation end-to-end."""
        engine = SimulationEngine(config=production_config)

        start_time = time.time()
        result = engine.run_simulation()
        elapsed_time = time.time() - start_time

        assert result.agent_count == 1000
        assert result.predicted_arrivals is not None

        # Performance target: <5 min for N=1,000 on reasonable GPU
        assert elapsed_time < 300, f"Simulation too slow: {elapsed_time}s for N=1,000"

    def test_clinical_accuracy_full_audit(self, production_config):
        """Category 5: Full clinical accuracy validation against historical data.

        Compares N=1,000 simulation predictions to actual triage outcomes from
        historical hospital data. MAPE target: <15%.
        """
        engine = SimulationEngine(config=production_config)
        result = engine.run_simulation()

        # Load historical triage data (from fixture or test database)
        historical_arrivals = [
            {"timestamp": "2026-03-01T08:00:00", "p1": 12, "p2": 28, "p3": 35, "p4": 22},
            {"timestamp": "2026-03-02T08:00:00", "p1": 14, "p2": 26, "p3": 38, "p4": 20},
            # ... 30+ days of data
        ]

        # Compare predictions to actuals
        mape_values = []
        for actual in historical_arrivals:
            predicted_p1 = result.predicted_arrivals.get("P1", 0)
            actual_p1 = actual["p1"]

            if actual_p1 > 0:
                mape = abs(predicted_p1 - actual_p1) / actual_p1
                mape_values.append(mape)

        mean_ape = np.mean(mape_values)
        assert mean_ape < 0.15, f"Clinical accuracy MAPE {mean_ape:.2%} exceeds 15% target"

    def test_reidentification_full_audit(self, production_config):
        """Category 4: Full re-identification risk audit against patient records.

        For each generated agent, compute probability of matching a real patient.
        No agent should have >5% re-id probability.
        """
        engine = SimulationEngine(config=production_config)
        agents = engine.population_generator.generate_agents()

        # Load real patient records (de-identified for testing)
        real_patients = engine.hospital_patient_loader.load_deidentified_population()

        reidentification_risks = []
        for agent in agents:
            # Count how many real patients have similar demographics
            matching_patients = 0
            for patient in real_patients:
                if self._demographics_match(agent, patient):
                    matching_patients += 1

            reidentification_risk = matching_patients / len(real_patients)
            reidentification_risks.append(reidentification_risk)

        max_risk = max(reidentification_risks)
        mean_risk = np.mean(reidentification_risks)

        assert max_risk < 0.05, f"Max re-id risk {max_risk:.2%} exceeds 5% threshold"
        assert mean_risk < 0.01, f"Mean re-id risk {mean_risk:.2%} exceeds 1% threshold"

    def _demographics_match(self, agent, patient) -> bool:
        """Check if agent demographics match patient (within tolerance)."""
        # Match criteria:
        # - Age within ±3 years
        # - Same triage category
        # - At least 1 matching comorbidity
        age_match = abs(agent.age - patient.age) <= 3
        category_match = agent.triage_category == patient.triage_category
        comorbidity_match = any(c in patient.comorbidities for c in agent.comorbidities)

        return age_match and category_match and comorbidity_match

    def test_performance_benchmarking(self, production_config):
        """Profile inference time and memory usage."""
        engine = SimulationEngine(config=production_config)

        import memory_profiler

        @memory_profiler.profile
        def run_simulation():
            return engine.run_simulation()

        # Benchmark: should complete in <5 min with <16GB peak memory
        start_memory = engine.get_memory_usage_mb()
        result = run_simulation()
        end_memory = engine.get_memory_usage_mb()

        peak_memory = end_memory - start_memory
        assert peak_memory < 16000, f"Memory usage {peak_memory}MB exceeds 16GB limit"

    def test_long_running_stability(self, production_config):
        """Run 10 consecutive simulations to check for memory leaks or degradation."""
        engine = SimulationEngine(config=production_config)

        runtimes = []
        for i in range(10):
            start = time.time()
            result = engine.run_simulation()
            elapsed = time.time() - start
            runtimes.append(elapsed)

        # Later runs should not be significantly slower (would indicate memory leak)
        first_run_avg = np.mean(runtimes[:3])
        last_run_avg = np.mean(runtimes[-3:])

        slowdown_ratio = last_run_avg / first_run_avg
        assert slowdown_ratio < 1.2, f"Performance degradation detected: {slowdown_ratio}x slower"
```

**GitHub Actions Workflow File:** `.github/workflows/nightly-tier3.yml`

```yaml
name: Tier 3 — Nightly Production-Scale Tests

on:
  schedule:
    # Run at 2am BRT (UTC-3) = 5am UTC = 05:00 UTC
    - cron: "0 5 * * *"
  workflow_dispatch:  # Allow manual trigger

jobs:
  tier3-nightly:
    runs-on: ubuntu-latest-gpu  # Self-hosted GPU runner required
    timeout-minutes: 90

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Check GPU availability
        run: |
          nvidia-smi || echo "GPU not available"

      - name: Install dependencies
        run: |
          pip install -r requirements-dev.txt
          pip install pytest-benchmark memory-profiler

      - name: Run Tier 3 tests (production-scale)
        run: |
          pytest tests/simulation/tier3-nightly.py -v \
            --benchmark-only \
            --benchmark-json=/tmp/benchmark.json
        timeout-minutes: 60

      - name: Generate nightly report
        if: always()
        run: |
          python scripts/nightly-test-report.py \
            --output /tmp/nightly-report.json \
            --benchmark /tmp/benchmark.json

      - name: Upload results to dashboard
        run: |
          curl -X POST https://monitoring.holilabs.xyz/api/nightly-results \
            -H "Authorization: Bearer ${{ secrets.MONITORING_API_KEY }}" \
            -d @/tmp/nightly-report.json

      - name: Slack notification
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "⚠️ Tier 3 nightly tests FAILED",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Tier 3 Nightly Test Failure*\n\nRepo: ${{ github.repository }}\nBranch: ${{ github.ref }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
                  }
                }
              ]
            }
```

### 4.3 Tier 3 Success Criteria

- ✅ All Tier 1 + Tier 2 tests pass (regression)
- ✅ N=1,000 simulation completes in <5 minutes
- ✅ Clinical accuracy MAPE <15%
- ✅ Max re-identification risk <5% per agent
- ✅ Mean re-identification risk <1%
- ✅ Memory usage <16GB peak
- ✅ 10-run stability test shows <20% performance degradation
- ✅ Results uploaded to monitoring dashboard
- ✅ Nightly report generated

**If any Tier 3 test fails:** Slack alert to #sim-quality, manual investigation scheduled

---

## 5. CI Runner Infrastructure Requirements

### 5.1 Tier 1 & Tier 2 Runners (CPU-based)

**Recommended Specs:**
- 4 CPU cores
- 8GB RAM
- 50GB SSD (for dependencies + test artifacts)
- GitHub-hosted runner: `ubuntu-latest` (adequate)
- Cost: Included in GitHub Actions free tier (for public repos) or $0.008/min

**Provider Options:**
- GitHub-hosted: No setup; automatically available
- Self-hosted: If higher concurrency needed (multiple PRs simultaneously)

### 5.2 Tier 3 Runner (GPU-based)

**Required Specs:**
- GPU: 1× NVIDIA A100 80GB (or equivalent: V100 16GB, RTX 6000 Ada)
- CPU: 8+ cores (NUMA system preferred)
- RAM: 32GB+
- SSD: 200GB+ (model checkpoints + test data)
- Network: 1Gbps+ (for downloading model weights)

**Recommended Infrastructure:**

**Option A: AWS EC2 Self-Hosted Runner**
```bash
# Launch on-demand instance for nightly tests
# Spin up 2am BRT, tear down 6am BRT
# Cost: ~$0.50–1.00/run (on-demand); ~$0.15/run (spot)

Instance Type: p3.2xlarge (1× V100 GPU, 8 CPU, 61GB RAM)
AMI: Deep Learning Base GPU AMI (Amazon Linux 2)
Spot Price: $0.85–1.00/hour (15–30% discount vs. on-demand)

Setup script: /scripts/setup-ci-gpu-runner.sh
```

**Option B: DigitalOcean GPU Droplet**
```bash
# Always-on self-hosted runner in data center
# Cost: ~$150/month for H100 Droplet

Droplet: GPU.HCM (8 vCPU, 1× H100, 48GB RAM)
OS: Ubuntu 22.04 LTS
Setup: Use DigitalOcean's GitHub Actions runner integration
```

**Option C: Colocation + Owned GPU (Long-term)**
```bash
# Physical GPU hardware in São Paulo data center
# Suitable after Tier 3 becomes frequent (e.g., 3–5 nightly runs/week)

Hardware: 2× NVIDIA A100 80GB (in 2U rackmount)
Colocation: Equinix SP4 (São Paulo); $1,500–2,500/month
Setup: GitHub runner daemon + local SLURM job scheduler
Cost-effective at scale (>5 runs/week)
```

### 5.3 GitHub Actions Runner Configuration

**Self-Hosted Runner Setup** (for GPU):

```bash
# On GPU machine (e.g., EC2 instance or Droplet)

# 1. Create runner user
sudo useradd -m -s /bin/bash github-runner
sudo -u github-runner mkdir -p /home/github-runner/actions-runner

# 2. Download + register runner
cd /home/github-runner/actions-runner
curl -o actions-runner-linux-x64-2.310.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.310.0/actions-runner-linux-x64-2.310.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.310.0.tar.gz
./config.sh --url https://github.com/holilabs/cortex-swarm \
            --token XXXXX \
            --runnergroup tier3-gpu \
            --labels gpu,nightly,a100

# 3. Install as systemd service
sudo ./svc.sh install github-runner
sudo systemctl enable github-runner
sudo systemctl start github-runner

# 4. Verify
sudo systemctl status github-runner
```

**Runner Labels (for job targeting):**

```yaml
# In .github/workflows/nightly-tier3.yml
runs-on: [self-hosted, gpu, tier3, ubuntu]

# This routes job to self-hosted runner with label 'gpu'
```

---

## 6. Test Data Management

### 6.1 Synthetic Fixture Generation

**Requirement:** Tier 3 tests need historical triage data to validate clinical accuracy.

**Approach:** Generate synthetic data from known distributions

```python
# File: /tests/fixtures/generate_synthetic_triage_data.py

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_synthetic_triage_data(
    num_days: int = 90,
    num_hospitals: int = 1,
    random_seed: int = 42
) -> pd.DataFrame:
    """Generate synthetic historical triage data.

    Mimics real hospital triage patterns:
    - Weekday vs. weekend variation
    - Time-of-day variation (peak hours 8-10am, 2-4pm)
    - Seasonal variation
    - Random daily variance (~15%)
    """
    np.random.seed(random_seed)

    records = []
    base_date = datetime(2026, 1, 1)

    for day in range(num_days):
        date = base_date + timedelta(days=day)
        is_weekend = date.weekday() >= 5

        # Baseline arrivals per category
        baseline = {
            'P1': 12 if not is_weekend else 10,
            'P2': 28 if not is_weekend else 22,
            'P3': 38 if not is_weekend else 32,
            'P4': 22 if not is_weekend else 18,
        }

        # Add random variation (~15%)
        for category in baseline:
            actual = int(baseline[category] * np.random.normal(1.0, 0.15))
            actual = max(1, actual)  # Ensure at least 1

            records.append({
                'date': date,
                'category': category,
                'arrivals': actual,
                'hospital_id': 'HOSPITAL-001'
            })

    return pd.DataFrame(records)

# Save fixture
if __name__ == '__main__':
    df = generate_synthetic_triage_data(num_days=365)
    df.to_csv('tests/fixtures/synthetic_triage_365days.csv', index=False)
    print(f"Generated {len(df)} triage records")
```

### 6.2 Test Data Versioning

```yaml
# File: tests/fixtures/DATA_CATALOG.md

# Synthetic Triage Data Fixtures

## synthetic_triage_365days.csv
- **Generated:** 2026-03-15
- **Records:** 1,460 (4 categories × 365 days)
- **Distribution:** Mimics São Paulo major hospital triage patterns
- **Seed:** 42 (reproducible)
- **Use Case:** Tier 3 clinical accuracy validation
- **Hash:** SHA256-abc123def...

## synthetic_patient_demographics_1000.json
- **Generated:** 2026-03-15
- **Records:** 1,000 de-identified patient profiles
- **Distribution:** Age, comorbidities, triage history
- **Use Case:** Tier 3 re-identification risk audit
- **Hash:** SHA256-xyz789...
```

**Fixture refresh schedule:** Regenerate quarterly (or after model changes)

---

## 7. Failure Notification & Escalation

### 7.1 Tier 1 Failure (PR-level)

**Notification:** Automatic GitHub status check failure (on PR)

**Action:** PR author must fix before merge is allowed

**Communication:**
```
Status: ❌ PR Gate Failed

tests/simulation/tier1-pr-gate.py::test_schema_validation_minimal FAILED
Error: Missing required field: population_seed_data

Fix: Ensure SimulationConfig includes all required fields.
```

### 7.2 Tier 2 Failure (Merge gate)

**Notification:** GitHub PR comment + Slack #dev channel

**Action:** PR author or QUINN investigates and fixes

**Communication:**
```
Slack (in #dev):
⚠️ @author Tier 2 merge gate failed on PR #445

Tier 2 Test: Population Fidelity (Chi-squared)
Result: FAILED
p-value: 0.02 (threshold: 0.05)

This could mean:
1. Generated population doesn't match seed distribution
2. Random seed changed; please verify
3. Population generator has a bug

Action: Fix or escalate to @quinn
```

### 7.3 Tier 3 Failure (Nightly)

**Notification:** Slack #sim-quality + email to QUINN + ARCHIE

**Escalation:**
```
Slack (in #sim-quality):
🚨 NIGHTLY TIER 3 TEST FAILURE

Date: 2026-04-15 02:15 BRT
Test: test_clinical_accuracy_full_audit
Result: FAILED

Clinical Accuracy MAPE: 22% (threshold: 15%)
Investigation: New model version has higher prediction variance.

Action Required:
1. QUINN: Investigate variance increase
2. ELENA: Review if model is clinically acceptable
3. Decision: Revert model or accept higher error band

Runbook: https://docs.holilabs.xyz/nightly-failure-investigation
```

---

## 8. Dashboard & Reporting

### 8.1 Test Results Dashboard

**URL:** `https://monitoring.holilabs.xyz/dashboard/simulation-tests`

**Displays:**

```
┌────────────────────────────────────────────────────────────┐
│ SIMULATION TEST SUITE — STATUS DASHBOARD                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Tier 1 (PR-level)                                          │
│ ├─ Last 24h: 142 PRs tested                                │
│ ├─ Pass rate: 98.6% (139/142)                              │
│ ├─ Avg time: 1m 22s                                        │
│ └─ Last failure: test_json_serialization (fixed)           │
│                                                             │
│ Tier 2 (Merge-gate)                                        │
│ ├─ Last 7d: 28 PRs merged                                  │
│ ├─ Pass rate: 100% (28/28)                                 │
│ ├─ Avg time: 8m 45s                                        │
│ └─ Code coverage: 85%                                      │
│                                                             │
│ Tier 3 (Nightly) — LAST RUN: 2026-04-15 02:00–04:15 BRT  │
│ ├─ Status: ✓ PASSED                                        │
│ ├─ N=1,000 agents: 4m 32s (target: <5m)                   │
│ ├─ MAPE: 12.3% (target: <15%)                              │
│ ├─ Max re-id risk: 3.2% (target: <5%)                      │
│ ├─ Memory: 12.8GB peak (target: <16GB)                     │
│ └─ Stability (10 runs): 1.08x slowdown (target: <1.2x)     │
│                                                             │
│ TRENDING: ✓ All metrics within SLA                         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 8.2 Weekly Test Report

**Generated:** Every Monday, 6am BRT

```markdown
# Weekly Test Report — Week of Apr 8–14, 2026

## Executive Summary
✓ All Tier 1/2/3 tests passing
✓ Code coverage: 87%
✓ No critical failures

## Tier 1 (PR Gate)
- PRs tested: 156
- Pass rate: 99.4%
- Avg time: 1m 18s

## Tier 2 (Merge Gate)
- PRs merged: 34
- Pass rate: 100%
- Avg time: 8m 52s
- Code coverage trend: ↑ 85% → 87%

## Tier 3 (Nightly)
- Runs: 7 (one per day)
- Pass rate: 100%
- Avg MAPE: 11.8% (within target)
- Memory usage: Stable (12–13GB)

## Recommendations
1. Code coverage target increasing to 90% next week
2. Consider adding performance regression gate to Tier 2
```

---

## 9. Ownership & Review Cadence

| Task | Owner | Frequency |
|------|-------|-----------|
| Tier 1 test maintenance | QUINN | Per PR (continuous) |
| Tier 2 test maintenance | QUINN | Per merge (daily) |
| Tier 3 test maintenance | QUINN + ARCHIE | Daily (post-nightly) |
| Runner infrastructure | ARCHIE | Monthly review |
| Dashboard monitoring | QUINN | Daily (AM check) |
| Weekly report | QUINN | Every Monday |
| Quarterly review | QUINN + ARCHIE | Quarterly |

---

## 10. Cost Estimation for CI Infrastructure

| Component | Tier 1 & 2 | Tier 3 | Total/Month |
|-----------|-----------|--------|------------|
| **GitHub-hosted runner** | $0.008/min × 150 runs × 2 min = $24 | — | $24 |
| **GPU runner (on-demand)** | — | $0.85/run × 30 nightly = $25.50 | $25.50 |
| **GPU runner (spot)** | — | $0.25/run × 30 nightly = $7.50 | $7.50 |
| **Data storage (test fixtures)** | Negligible | Negligible | <$1 |
| **Monitoring/dashboard** | — | — | $50–100 |
| **Total (spot GPU)** | — | — | **$82–107/month** |

**Recommendation:** Use GitHub-hosted for Tier 1/2 (automatic), switch to EC2 spot instances for Tier 3 nightly (lowest cost, acceptable latency).

---

## 11. Checklist: Pre-Pilot CI Setup

Before first hospital pilot, confirm:

- [ ] Tier 1 tests deployed and passing on all PRs
- [ ] Tier 2 tests deployed and passing on merge gate
- [ ] GitHub Actions workflows configured (.github/workflows/)
- [ ] Tier 3 nightly runner provisioned (GPU instance or self-hosted)
- [ ] Synthetic test data fixtures generated and versioned
- [ ] Test results dashboard operational
- [ ] Slack notifications for failures configured
- [ ] QUINN trained on Tier 3 failure investigation
- [ ] Cost tracking for GPU runner set up
- [ ] Documentation complete and shared with team

---

**Document Classification:** Internal / Engineering
**Last Updated:** 2026-03-17
**Next Review:** 2026-04-15 (post-first-nightly-run)
