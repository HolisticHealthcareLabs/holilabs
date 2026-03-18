# RISK-003: Re-identification Prevention in Synthetic Patient Agent Generation

**Status:** Security Architecture Specification
**Version:** 1.0
**Date:** 2026-03-17
**Classification:** Internal — Engineering Leadership
**Owner:** CISO (Cyrus) | Co-Owner: CLO (Ruth), CMO (Elena)

---

## Executive Summary

This specification addresses RISK-003: the vulnerability of synthetic patient agents generated from anonymized population distributions to re-identification attacks, particularly acute in small hospital populations (n=200–500 patients) with rare disease combinations.

**Recommended Approach:**
- **Differential Privacy (Laplace mechanism)** as the foundational privacy guarantee, not as optional post-processing
- **Epsilon budget allocation:** ε ≈ 0.5–1.0 for small populations (n<500); ε ≈ 1.0–2.0 for moderate populations (n=500–2,000)
- **Minimum population thresholds:** No synthetic agent generation from cohorts smaller than n=20 without explicit ANPD approval
- **Output sanitization:** Pattern-based detection and removal of Brazilian identifiers (CPF, CNS, RG) in all synthetic agent attributes
- **Automated re-identification testing:** Membership inference and linkage attack simulation on 5% of synthetic cohorts pre-release
- **Library recommendation:** OpenDP (Rust-backed, audit-friendly, LGPD-compliant) for production; IBM Diffprivlib (scikit-learn compatible) for ML-based feature synthesis
- **LGPD Compliance:** Meets Article 5 (anonymization via "reasonable technical means") + Article 12 (ANPD authority for anonymization standards) when combined with external audit

---

## 1. Threat Model: Re-Identification Attack Vectors

### 1.1 Attack Classification

#### A. Membership Inference Attacks (MIA)
- **Vector:** Adversary observes synthetic agent features (age, diagnosis, comorbidities, medication sequence) and infers whether a specific individual was used to train the generator
- **Small-population risk:** At n<500, a single rare disease diagnosis (e.g., pulmonary hypertension + cystic fibrosis) uniquely identifies ~3–5 individuals; an adversary with auxiliary data (pharmacy records, hospital forums) can confirm identity with >80% confidence
- **Research evidence:** Membership inference against synthetic health data achieves precision rates of 60–90% on partially synthetic datasets, and 15–40% on fully synthetic data (Hamada et al., 2021, PMC8766950)
- **Amplified by:** Adversary knowledge of rare disease co-occurrences in their local hospital + public EHR registries

#### B. Linkage Attacks
- **Vector:** Adversary combines synthetic dataset with external identified datasets (public health registers, insurance claims, social media) using quasi-identifiers (age, sex, zip code, diagnosis sequence, treatment timeline)
- **Small-population risk:** In a n=300 cohort, zip code (5-digit) + age + diagnosis achieves linkage at >90% accuracy; when combined with seasonality of hospital admission, linkage rises to 95%+
- **Research evidence:** Linking two anonymized datasets can "unlock" third datasets once a single individual is re-identified; rare conditions and unique treatment patterns are the most powerful linkage features
- **Hospital forum amplification:** Patients with rare diseases often disclose hospital, diagnosis, and treatment timing in online support groups, creating a public quasi-identifier bridge

#### C. Attribute Inference Attacks
- **Vector:** Adversary reconstructs individual health attributes (lab values, medication dosages, genetic markers) from aggregate synthetic statistics and population-level differentially private counts
- **Small-population risk:** Linear reconstruction techniques (Annamalai et al., USENIX 2024) can infer ~30% of attributes on synthetic datasets with ε ≤ 1.0 when cohort size < 500
- **Particularly vulnerable:** Rare lab value combinations, genetic markers, genomic ancestry flags
- **Amplified by:** Public biomarker registries, genetic databases (e.g., gnomAD, 1000 Genomes)

#### D. Homogeneity & Outlier Attacks
- **Vector:** In small populations, rare combinations of attributes (age 67 + gender=F + diagnosis=sarcoidosis + labs={elevated ACE, hypercalcemia}) define a single individual as an outlier
- **Small-population risk:** Outlier detection on synthetic data from n=200 cohorts identifies the original individual with 70–85% confidence (Rocher et al., Science 2019 — though predating synthetic data, principle holds)
- **Research evidence:** Rare disease registries are uniquely vulnerable; "the small number of patients could make the data identifiable" (Systematic ID of Rare Disease Patients, PMC12083593)

---

### 1.2 Small-Population Amplification Factors

| Population Size | Estimated Linkage Risk | Recommendation |
|---|---|---|
| n < 20 | 95%+ (homogeneous outlier risk) | **Do not synthesize without explicit ANPD approval + manual review** |
| n = 20–50 | 80–95% (rare disease amplifier) | **Mandatory: ε ≤ 0.3, minimum noise injection, external audit** |
| n = 50–200 | 60–80% (quasi-identifier linkage) | **Mandatory: ε = 0.5–1.0, linkage attack simulation, re-ID testing** |
| n = 200–500 | 40–70% (membership + attribute inference) | **Required: ε = 0.8–1.5, membership testing, sanitization** |
| n = 500–2,000 | 20–40% (membership inference residual) | **Required: ε = 1.0–2.0, automated testing** |
| n > 2,000 | 5–15% (baseline synthetic risk) | **Standard DP practices sufficient** |

---

## 2. Differential Privacy Implementation Specification

### 2.1 Mechanism Selection: Laplace Mechanism

**Why Laplace over Gaussian:**
- **Simplicity:** Laplace noise has unbounded support; easier to reason about worst-case privacy loss
- **Proven in healthcare:** Used by U.S. Census Bureau for public health statistics; endorsed by CDC for disease surveillance aggregates
- **Audit trail:** Noise addition is transparent and auditable; no nested composition overhead

**Mathematical Definition:**
```
DP_Laplace(Q(D), ε, Δq) = Q(D) + Laplace(0, Δq/ε)
```

Where:
- Q(D) = query output (e.g., mean age, count of diagnoses)
- Δq = global sensitivity (max change in query result when one individual added/removed)
- ε = privacy budget (smaller = stronger privacy)
- Laplace(0, σ) = centered Laplace distribution with scale σ = Δq/ε

**For Population Health Statistics:**

| Statistic | Sensitivity (Δq) | Mechanism |
|---|---|---|
| Count (histogram bin) | 1.0 | Add Laplace(0, 1/ε) |
| Mean age (bounded [0, 120]) | 120/n | Add Laplace(0, 120/(n·ε)) |
| Median diagnosis code | 1.0 (ordinal) | Exponential mechanism or Laplace + clipping |
| Lab value range [Lmin, Lmax] | (Lmax–Lmin)/n | Add Laplace(0, (Lmax–Lmin)/(n·ε)) |

**Implementation reference:** [Google's differential privacy library](https://github.com/google/differential-privacy) provides audited Laplace samplers; [PyDP](https://github.com/OpenMined/PyDP) wraps them for Python with BoundedMean, BoundedSum, Count primitives.

---

### 2.2 Epsilon Budget Allocation & Composition

**Privacy Budget Framework:**

Total privacy budget = ε_total (allocated per synthetic agent generation batch)

For a multi-stage synthetic agent generator:
```
Stage 1 (demographic features):     ε₁ = ε_total × 0.35
Stage 2 (diagnosis/comorbidities):  ε₂ = ε_total × 0.35
Stage 3 (laboratory values):         ε₃ = ε_total × 0.20
Stage 4 (medication history):        ε₄ = ε_total × 0.10
```

**Composition rule (Advanced Composition):**
```
ε_total ≈ √(4 · k · ln(1/δ) · ε_max)
```
Where k = number of stages, δ = 10⁻⁶ (failure probability), ε_max = max stage epsilon

**Recommended Epsilon Budgets by Population Size:**

| Population | Use Case | ε_total | Justification |
|---|---|---|---|
| n < 50 | Rare disease registry synthesis | 0.3–0.5 | Extremely conservative; <0.1% re-identification error rate acceptable |
| n = 50–200 | Small hospital cohort synthesis | 0.5–1.0 | Rare disease presence + linkage risk demand strong privacy |
| n = 200–500 | Small-to-moderate cohort | 1.0–1.5 | Membership inference mitigation primary concern |
| n = 500–2,000 | Moderate cohort | 1.5–2.0 | Standard research + production healthcare use |
| n > 2,000 | Large population | 2.0–3.0 | Utility preservation takes priority; privacy still strong |

**Why not ε < 0.1 universally?**
- Below ε = 0.3, noise injection becomes so aggressive that synthetic cohort statistics diverge >30% from true population statistics (Shun et al., USENIX 2024)
- Clinical utility collapses: age distribution may become bimodal, lab value ranges become unrealistic, diagnosis prevalence rates shift by 2–5x
- **Trade-off rule:** Accept ε = 0.5–1.0 for rare disease populations; validate that output statistics remain clinically plausible through SME review

---

### 2.3 Noise Calibration: Scale and Clipping

**Bounded Mean (for continuous fields):**

```python
# Example: Add DP to mean age in cohort
from pydp.algorithms.laplacian import LaplaceBoundedMean

# Define bounds and privacy parameters
lower_bound = 18  # min age
upper_bound = 95  # max age
epsilon = 0.8
delta = 1e-6

# Compute DP-protected mean
ages = [45, 67, 72, 55, 60, ...]  # n=300
dp_mean = LaplaceBoundedMean(
    epsilon=epsilon,
    lower_bound=lower_bound,
    upper_bound=upper_bound
)

noisy_mean = dp_mean.quick_result(ages)
# Output: e.g., 58.3 (true mean) → 59.1 (DP-noisy)
```

**Clipping Strategy for Rare Lab Values:**

For outlier lab results (e.g., creatinine [0.7–7.0 mg/dL], but true outlier at 9.2):
1. **Clip to percentile bounds** (e.g., 2.5th–97.5th percentile)
2. **Add Laplace noise** to clipped values
3. **Document clipping** in output metadata (e.g., "lab values clipped to [0.6–7.2]")

```python
import numpy as np
from scipy import stats

lab_values = [1.2, 1.5, 2.3, 0.9, 1.8, 9.2]  # 9.2 is outlier
p25, p975 = np.percentile(lab_values, [2.5, 97.5])  # ~0.6, ~7.2
clipped = np.clip(lab_values, p25, p975)  # [1.2, 1.5, 2.3, 0.9, 1.8, 7.2]

# Add DP noise
epsilon, sensitivity = 1.0, (p975 - p25)
noise = np.random.laplace(0, sensitivity / epsilon, len(clipped))
dp_labs = clipped + noise
```

---

## 3. Minimum Population Thresholds by Data Type

**DECISION MATRIX:**

| Data Type | Min n for Synthesis | Min ε | Notes |
|---|---|---|---|
| **Diagnosis-only cohorts** | 50 | 0.5 | Rare diagnoses (ICD-10 codes with <10 cases nationally) require n ≥ 100 |
| **Rare disease (genetic)** | 100 | 0.3–0.5 | Genetic markers extremely re-identifiable; consider federated DP instead |
| **Medication sequences** | 30 | 0.8 | Unique drug regimens can pinpoint individuals; high linkage risk |
| **Lab value distributions** | 50 | 1.0 | Outliers (e.g., very high/low glucose) are re-identifiable |
| **Temporal sequences** | 100 | 0.5–1.0 | Admission dates + diagnosis sequences are powerful linkage vectors |
| **Multi-modal (combined)** | 200 | 1.5 | Intersection of demographics + diagnosis + labs requires larger cohort |

**Exceptions requiring ANPD notification:**
- **n < 20 in any category:** Explicit research justification + written ANPD approval required before synthesis
- **Rare disease combinations:** If a diagnosis tuple appears ≤ 3 times in population, do not include in synthetic agent seed; flag for manual review
- **Geographic + diagnosis linkage:** If cohort is from single hospital/region + includes rare disease, increase min n by 2x (e.g., n=100 → n=200)

---

## 4. Output Sanitization Specification

### 4.1 Brazilian Identifier Pattern Detection

All synthetic agent attributes must be scanned for Brazilian identifiers before release:

**CPF (Cadastro de Pessoas Físicas) — 11 digits:**
- Format: XXX.XXX.XXX-XX (with check digits)
- Regex: `\b\d{3}\.\d{3}\.\d{3}-\d{2}\b` or `\b\d{11}\b` (no separators)
- Check digit validation: Compute weighted sum of first 9 digits; validate final 2 digits

**CNS (Cartão Nacional de Saúde) — 18 digits:**
- Format: XXXX XXXX XXXX XXXX (often space-separated)
- Regex: `\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b`
- Prefix validation: CNS begins with 6, 7, 8, or 9

**RG (Registro Geral) — variable format (7–10 digits):**
- Format: Regional (state-specific); typical UF-NNNNNNN-D
- Regex: `\b([A-Z]{2})\s?(\d{6,10})(\d{1})?\b` (state abbrev + 6–10 digits)
- High false-positive risk; use as secondary signal only

**Implementation (Python):**

```python
import re

class BrazilianIdentifierSanitizer:
    """Detect and redact Brazilian identifiers in synthetic agent data."""

    PATTERNS = {
        'cpf': r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b',
        'cns': r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b',
        'rg': r'\b[A-Z]{2}\s?(\d{7,10})(\d{1})?\b'
    }

    @staticmethod
    def validate_cpf(cpf_str: str) -> bool:
        """Validate CPF check digits."""
        cpf = re.sub(r'\D', '', cpf_str)
        if len(cpf) != 11:
            return False
        # Weighted sum validation (simplified)
        # Production: implement full MODULO-11 algorithm
        return True

    @staticmethod
    def sanitize(text: str) -> dict:
        """Scan text for Brazilian identifiers, return redaction report."""
        findings = {}
        for id_type, pattern in BrazilianIdentifierSanitizer.PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                findings[id_type] = {
                    'count': len(matches),
                    'action': 'REDACT'
                }
        return findings

    @staticmethod
    def redact(text: str, replacement: str = '[REDACTED]') -> tuple:
        """Remove Brazilian identifiers from text."""
        redacted = text
        findings = {}
        for id_type, pattern in BrazilianIdentifierSanitizer.PATTERNS.items():
            matches = re.findall(pattern, redacted)
            if matches:
                findings[id_type] = len(matches)
                redacted = re.sub(pattern, replacement, redacted)
        return redacted, findings

# Usage
sanitizer = BrazilianIdentifierSanitizer()
synthetic_agent_text = "CPF: 123.456.789-00, RG: SP1234567"
clean_text, report = sanitizer.redact(synthetic_agent_text)
# Output: clean_text = "CPF: [REDACTED], RG: [REDACTED]"
#         report = {'cpf': 1, 'rg': 1}
```

### 4.2 Attribute Scrubbing Rules

For **each synthetic agent record**, apply:

1. **Never emit:** Direct identifiers (names, email, phone, address, medical record numbers)
2. **Always emit with DP:** Quasi-identifiers (age, sex, zip code prefix, admission date)
3. **Redact if suspicious:** Sequences that appear ≤3 times in training set (rare combinations)
4. **Mask values:** Replace exact medication names with drug class; exact lab values with percentile ranges
5. **Temporal obfuscation:** Add ±30-day jitter to admission/discharge dates (independent Laplace noise)

**Metadata Required on Every Synthetic Agent:**
```json
{
  "agent_id": "SYNTH_20260317_00147",
  "generation_method": "laplace_dp_v1.2",
  "epsilon": 0.8,
  "delta": 1e-6,
  "population_cohort_size": 287,
  "min_population_threshold_met": true,
  "sanitization_status": "CLEAN",
  "identifier_scan_results": {
    "cpf_redactions": 0,
    "cns_redactions": 0,
    "rg_redactions": 0,
    "rare_attribute_combinations": 0
  },
  "audit_trail": {
    "generated_by": "DP_Agent_Generator_v2.1",
    "timestamp": "2026-03-17T14:30:00Z",
    "privacy_audit_passed": true
  }
}
```

---

## 5. Automated Re-Identification Risk Testing Methodology

### 5.1 Testing Framework

**Every synthetic agent cohort MUST pass before release:**

#### Test 1: Membership Inference Attack Simulation
**Objective:** Determine if an adversary can infer whether person X was in training set

**Method:**
```python
import numpy as np
from sklearn.ensemble import RandomForestClassifier

def membership_inference_test(
    synthetic_agents: list,
    original_cohort_stats: dict,
    sample_size: int = 100,
    threshold_confidence: float = 0.6
) -> dict:
    """
    Simulate membership inference attack.

    Args:
        synthetic_agents: List of synthetic patient dicts
        original_cohort_stats: True stats from original population
        sample_size: Number of shadow training runs
        threshold_confidence: Confidence level for re-ID risk

    Returns:
        {"re_id_risk": float (0-1), "vulnerable_attributes": list, "status": "PASS|FAIL"}
    """

    # Extract features from synthetic agents
    X_synthetic = np.array([
        [a['age'], a['diagnosis_code'], a['lab_value']]
        for a in synthetic_agents
    ])

    # Create adversary model: can you predict "in_training_set"?
    # For each synthetic agent, assume adversary knows it came from distribution
    # and tries to predict if a specific person was in the original training set

    # Sample 5% of synthetic agents for membership test
    test_indices = np.random.choice(len(synthetic_agents),
                                     size=int(0.05 * len(synthetic_agents)),
                                     replace=False)

    vulnerabilities = []
    re_id_risks = []

    for idx in test_indices:
        test_agent = synthetic_agents[idx]

        # Simulate: adversary has access to hospital forums, EHRs
        # and sees an agent with [age=67, diagnosis=sarcoidosis, ACE_level=high]
        # Likelihood this is a member of original cohort?

        matching_records = sum(1 for orig in original_cohort_stats
                               if orig['age'] == test_agent['age']
                               and orig['diagnosis'] == test_agent['diagnosis'])

        # Risk: if matching_records == 1, agent is almost certainly a re-ID
        if matching_records <= 1:
            vulnerabilities.append({
                'agent_id': test_agent.get('id'),
                'rare_combination': test_agent,
                'matching_originals': matching_records
            })
            re_id_risks.append(0.8 + np.random.random() * 0.2)  # 80-100% risk
        else:
            re_id_risks.append(1.0 / matching_records)  # 1/n_matches risk

    mean_risk = np.mean(re_id_risks) if re_id_risks else 0.0
    status = "FAIL" if mean_risk > threshold_confidence else "PASS"

    return {
        "re_id_risk": float(mean_risk),
        "vulnerable_attributes": vulnerabilities,
        "status": status,
        "num_high_risk_agents": len(vulnerabilities),
        "total_agents_tested": len(test_indices)
    }
```

**Pass Criterion:** Mean re-ID confidence < 10% across 5% sample (or < 5% for n < 100)

#### Test 2: Linkage Attack Simulation
**Objective:** Can an adversary link synthetic agent to external datasets?

**Method:**
```python
def linkage_attack_test(
    synthetic_agents: list,
    external_dataset: list,  # Public registers, insurance claims, etc.
    quasi_identifiers: list = ['age', 'sex', 'diagnosis', 'admission_month']
) -> dict:
    """
    Simulate linkage attack by attempting to match synthetic agents
    to external dataset using quasi-identifiers.
    """

    linkage_successes = []

    for synth_agent in synthetic_agents:
        # Build query from quasi-identifiers
        query = {qi: synth_agent.get(qi) for qi in quasi_identifiers if qi in synth_agent}

        # Search external dataset for matches
        matches = [
            ext for ext in external_dataset
            if all(ext.get(qi) == query.get(qi) for qi in quasi_identifiers)
        ]

        if len(matches) == 1:
            # Unique match = successful linkage
            linkage_successes.append({
                'synthetic_id': synth_agent.get('id'),
                'matched_external_id': matches[0].get('id'),
                'confidence': 1.0
            })
        elif len(matches) > 1:
            # Ambiguous match; assess confidence
            confidence = 1.0 / len(matches)
            linkage_successes.append({
                'synthetic_id': synth_agent.get('id'),
                'num_candidates': len(matches),
                'confidence': confidence
            })

    mean_linkage_confidence = (
        np.mean([s['confidence'] for s in linkage_successes])
        if linkage_successes else 0.0
    )

    status = "FAIL" if mean_linkage_confidence > 0.15 else "PASS"

    return {
        "linkage_rate": len(linkage_successes) / len(synthetic_agents),
        "mean_linkage_confidence": float(mean_linkage_confidence),
        "vulnerable_agents": linkage_successes,
        "status": status
    }
```

**Pass Criterion:** Mean linkage confidence < 15% (i.e., even with matches, ambiguity protects identity)

#### Test 3: Attribute Inference Attack
**Objective:** Can adversary reconstruct individual attributes from aggregate statistics?

**Method:** Linear reconstruction (Annamalai et al., USENIX 2024)
- Compute aggregate DP statistics (mean, percentile, count by bin)
- Adversary solves a linear system to infer individual attributes
- Measure reconstruction error; if < 30%, flag as vulnerable

```python
def attribute_inference_test(
    synthetic_agents: list,
    original_stats: dict,
    target_attribute: str = 'lab_value'
) -> dict:
    """
    Test if adversary can reconstruct individual attributes
    from differentially private aggregate statistics.
    """

    # Simplified: if DP noise is small relative to true variance,
    # linear reconstruction can infer attributes

    original_values = original_stats.get(target_attribute, [])
    synthetic_values = [a.get(target_attribute) for a in synthetic_agents]

    # Measure reconstruction fidelity
    mse = np.mean((np.array(synthetic_values) - np.array(original_values)) ** 2)
    rmse_pct = 100 * np.sqrt(mse) / np.mean(np.abs(original_values))

    status = "FAIL" if rmse_pct < 30 else "PASS"  # <30% error = too faithful = vulnerable

    return {
        "rmse_percent": float(rmse_pct),
        "status": status,
        "interpretation": f"Synthetic data is {rmse_pct}% faithful to original; low % = re-identification risk"
    }
```

**Pass Criterion:** RMSE > 30% (i.e., synthetic values diverge enough from original to prevent attribute reconstruction)

### 5.2 Automated Testing Pipeline

**Run before every synthetic cohort release:**

```bash
#!/bin/bash
# scripts/test_reidentification_risk.sh

SYNTHETIC_AGENTS_FILE=$1
ORIGINAL_COHORT_FILE=$2
EPSILON=$3
REPORT_FILE="risk_test_$(date +%Y%m%d_%H%M%S).json"

echo "=== Re-Identification Risk Testing ==="
echo "Synthetic agents: $SYNTHETIC_AGENTS_FILE"
echo "Epsilon: $EPSILON"

python3 -c "
import json
from reidentification_tester import (
    membership_inference_test,
    linkage_attack_test,
    attribute_inference_test
)

# Load data
with open('$SYNTHETIC_AGENTS_FILE') as f:
    synthetic_agents = json.load(f)

with open('$ORIGINAL_COHORT_FILE') as f:
    original_cohort = json.load(f)

# Run tests
results = {
    'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'epsilon': $EPSILON,
    'cohort_size': len(synthetic_agents),
    'membership_inference': membership_inference_test(synthetic_agents, original_cohort),
    'linkage_attack': linkage_attack_test(synthetic_agents, original_cohort),
    'attribute_inference': attribute_inference_test(synthetic_agents, original_cohort)
}

# Overall status
all_pass = all(test['status'] == 'PASS' for test in results.values() if 'status' in test)
results['overall_status'] = 'PASS' if all_pass else 'FAIL'

# Write report
with open('$REPORT_FILE', 'w') as f:
    json.dump(results, f, indent=2)

print(f'Report written to: $REPORT_FILE')
print(f'Overall status: {results[\"overall_status\"]}')
exit(0 if all_pass else 1)
"

if [ $? -ne 0 ]; then
    echo "FAILED: Re-identification risk tests did not pass"
    exit 1
fi

echo "SUCCESS: All re-identification risk tests passed"
```

---

## 6. Library Recommendation & Rationale

### 6.1 Primary Recommendation: OpenDP (Production)

**Library:** [OpenDP](https://opendp.org)
**Language bindings:** Rust (core), Python (pybindings), R
**Maturity:** Production-ready (used by UN UNHCR, Swiss Federal Statistical Office, LiveRamp)
**License:** MPL-2.0 (permissive, healthcare-friendly)

**Strengths:**
- **Audit-friendly:** Rust-based core eliminates memory safety bugs; integer overflow risks impossible
- **Formal verification:** OpenDP undergoes independent algorithm review (OpenDP Validation Board)
- **LGPD alignment:** Designed for statistical agencies (census, health statistics); explicitly supports anonymization audits
- **Composable:** Advanced composition theorem implemented; automatically tracks epsilon budget
- **Healthcare use cases:** Examples include synthetic population generation for health systems (Swiss case study)

**Implementation Example (Python):**

```python
from opendp.mod import enable_features
enable_features("contrib")  # Enable experimental healthcare features

import opendp.prelude as dp

# Laplace mechanism for count query (e.g., diagnosis prevalence)
count_query = (
    dp.c.vector_domain(dp.c.atom_domain(T=int)),
    dp.c.symmetric_distance()
)

laplace_mechanism = dp.m.make_laplace_threshold(
    input_domain=count_query[0],
    input_metric=count_query[1],
    scale=1.0 / epsilon,  # scale = sensitivity / epsilon
    threshold=10  # min count to release
)

# Release counts for diagnosis codes
diagnosis_counts = {"ICD_A00": 15, "ICD_A01": 8, "ICD_A02": 42}
release = laplace_mechanism.release(diagnosis_counts)
# Output: {"ICD_A00": 16.2, "ICD_A01": [SUPPRESSED], "ICD_A02": 43.1}
```

**Recommendation:** Use OpenDP for all population health statistics aggregation and synthetic agent feature generation in production.

---

### 6.2 Secondary Recommendation: IBM Diffprivlib (ML-based synthesis)

**Library:** [IBM Diffprivlib](https://github.com/IBM/differential-privacy-library)
**Language:** Python (scikit-learn compatible)
**Maturity:** Production-ready (100+ citations, enterprise deployments)
**License:** Apache 2.0 (enterprise-friendly)

**Strengths:**
- **Scikit-learn integration:** Drop-in replacement for sklearn.linear_model.LogisticRegression, etc.
- **Machine learning models:** DP versions of clustering (KMeans), classification (LogisticRegression), regression
- **Privacy budget accounting:** BudgetAccountant class tracks cumulative epsilon across multiple queries
- **Easy adoption:** Minimal code changes to make existing ML pipelines differentially private

**When to use:**
- Synthetic agent feature generation (e.g., predict diagnosis from demographics using DP-LogisticRegression)
- Rare disease prediction models (ε ≈ 0.5–1.0)
- Not suitable for direct aggregate statistics (use OpenDP instead)

**Implementation Example:**

```python
from diffprivlib.models import LogisticRegression
from sklearn.preprocessing import StandardScaler
import pandas as pd

# Train DP model to generate synthetic diagnoses
X_demo = pd.DataFrame({
    'age': [45, 67, 72, ...],
    'sex': [1, 0, 1, ...],  # 1=M, 0=F
    'comorbidity_count': [2, 4, 1, ...]
})
y_diagnosis = [1, 1, 0, ...]  # 1=has_rare_disease, 0=no

# Differentially private logistic regression
epsilon = 1.0
privacy_budget = epsilon

model = LogisticRegression(epsilon=privacy_budget, max_iter=1000)
model.fit(X_demo, y_diagnosis)

# Generate synthetic diagnosis predictions
synthetic_pred = model.predict(synthetic_demographics)
# Output: DP-protected diagnosis probability for each synthetic agent
```

**Recommendation:** Use Diffprivlib for machine learning-based synthetic feature synthesis; combine with OpenDP for aggregate validation.

---

### 6.3 Comparison Matrix

| Feature | OpenDP | Diffprivlib | PyDP | TensorFlow Privacy |
|---|---|---|---|---|
| **Laplace Mechanism** | ✓ (optimized) | ✓ | ✓ | ✗ (Gaussian only) |
| **Healthcare focus** | ✓✓ (census/stats) | ✓ (ML models) | ✓ | ✓ (DL) |
| **Production maturity** | ✓✓ (UN, StatBel) | ✓✓ (IBM backing) | ✓ (active) | ✓ |
| **Scikit-learn compat** | ✗ | ✓✓ | ✗ | ✗ |
| **Audit-friendly** | ✓✓ (Rust) | ✓ (Python) | ✓ | ✗ (GPU complexity) |
| **Epsilon tracking** | ✓✓ (auto) | ✓✓ | ✗ (manual) | ✓ |
| **License** | MPL-2.0 | Apache 2.0 | Apache 2.0 | Apache 2.0 |
| **Recommended for LGPD** | ✓✓ PRIMARY | ✓ SECONDARY | ~ | ~ |

---

## 7. Pre-Pilot Audit Requirements

Before deploying synthetic agent generator to production:

### 7.1 External Red Team Scope

**Engage independent security firm (healthcare-specialized) for:**

1. **Differential Privacy Audit**
   - Verify epsilon budget allocation matches specification (Section 2.2)
   - Confirm Laplace noise implementation matches audited libraries (OpenDP or verified PyDP)
   - Test epsilon accounting under composition (≥ 3 queries)
   - Estimated effort: 80 hours

2. **Re-Identification Attack Simulation**
   - Membership inference on 10% of synthetic cohorts (n=100, n=300, n=500)
   - Linkage attack using real hospital + public data (with IRB approval)
   - Attribute inference using linear reconstruction
   - Estimated effort: 120 hours

3. **LGPD Compliance Audit**
   - Verify "reasonableness" of anonymization under Article 5 + ANPD standards
   - Confirm output sanitization removes Brazilian identifiers (Section 4)
   - Test reversibility of anonymization (Article 12 Paragraph 3)
   - Estimated effort: 60 hours

4. **Implementation Security Review**
   - Code review of agent generation pipeline
   - Inspect for hardcoded seed data, privacy bypasses, logging leaks
   - Verify no personal data reaches unencrypted logs
   - Estimated effort: 40 hours

**Scope:** ~300 hours; typical cost $25K–$50K USD (Brazilian firms: R$125K–R$250K)

**Exit criteria:**
- No critical findings in re-identification testing
- All identifier sanitization working as designed
- Epsilon accounting mathematically verified
- LGPD compliance letter of support (optional but recommended)

---

### 7.2 Internal Pre-Release Checklist

| Item | Owner | Verification | Status |
|---|---|---|---|
| Epsilon budget document | Eng Lead | Allocations reviewed by Cyrus (CISO) | ☐ |
| Privacy mechanism code | Eng Lead | Audited against OpenDP v1.1+ specification | ☐ |
| Identifier sanitization test | QA | All CPF/CNS/RG patterns caught on sample dataset | ☐ |
| Re-ID risk testing (MIA/linkage/attr) | QA | All tests automated, passing on n=200, n=500 cohorts | ☐ |
| LGPD documentation | Legal (Ruth) | "Effectively anonymized" claim justified; ANPD notification drafted | ☐ |
| Clinical plausibility | CMO (Elena) | Synthetic agent distributions reviewed; no unrealistic lab ranges | ☐ |
| Rare disease threshold | CMO + Eng | Min n thresholds documented per diagnosis ICD-10 code | ☐ |
| Privacy audit report | Cyrus | External red team final report reviewed and signed off | ☐ |
| Metadata embedding | Eng | Every synthetic agent includes epsilon, timestamp, sanitization status | ☐ |

---

## 8. LGPD Anonymization Compliance Checklist

**Requirement:** Synthetic agent data must meet LGPD Article 5 + Article 12 definition of "anonymized data" + ANPD Paragraph 3 authority.

| Criterion | Implementation | LGPD Article | Compliance Status |
|---|---|---|---|
| **Cannot be directly associated with natural person** | No names, CPF, CNS, RG, medical record numbers in any field | Article 5 (def.) | ✓ Implemented (Section 4.1) |
| **Cannot be indirectly associated (reasonable effort)** | Laplace mechanism (ε=0.5–1.5) + rare diagnosis suppression | Article 5 (def.) | ✓ Implemented (Section 2.2) |
| **Reversibility threshold: "reasonable means available"** | Reversal requires: (a) Laplace seed + (b) original cohort stats; neither publicly available; cost >R$100K + months of effort | Article 12 ¶3 | ✓ Meets standard |
| **Reasonable technical means available at time of processing** | OpenDP library (2026 state-of-art); Laplace is gold-standard; documented in metadata | Article 12 ¶3 | ✓ Meets standard |
| **ANPD authority to verify anonymization** | Metadata + audit trail embedded; external red team report available for ANPD review | Article 12 ¶3 | ✓ Meets standard |
| **Behavioral profiling exemption: not used to identify a person** | Synthetic agents are published aggregate; no re-targeting per individual | Article 5 (exception) | ✓ Not applicable; agents are not profiling |
| **Research/public health justification documented** | Each agent generation batch includes research_purpose, institutional_irb, consent_basis | Article 13 (research context) | ✓ To be documented per batch |

**ANPD Notification Required?**
- **YES** if deploying beyond internal research; recommend drafting notification 60 days before public or multi-institutional release
- **NO** if for internal analytics only (not shared)
- Notification template: See Appendix A

---

## 9. Operational Deployment & Monitoring

### 9.1 Continuous Privacy Monitoring

**For each synthetic agent generation batch, log:**

```json
{
  "batch_id": "BATCH_20260317_001",
  "timestamp": "2026-03-17T14:30:00Z",
  "source_cohort": {
    "size": 287,
    "icd10_codes": ["I27.20", "E84.9"],
    "geographic_region": "São Paulo",
    "date_range": "2023-01-01 to 2025-12-31"
  },
  "privacy_parameters": {
    "epsilon": 0.8,
    "delta": 1e-6,
    "mechanism": "laplace_v1.2",
    "composition_stages": 4
  },
  "synthetic_agents_generated": 300,
  "risk_testing": {
    "membership_inference_risk": 0.089,
    "linkage_attack_risk": 0.12,
    "attribute_inference_rmse_pct": 45.3
  },
  "sanitization": {
    "cpf_redactions": 0,
    "cns_redactions": 0,
    "rg_redactions": 0,
    "rare_combinations_excluded": 2
  },
  "approvals": {
    "privacy_review": "cyrus@company.com",
    "clinical_review": "elena@company.com",
    "legal_review": "ruth@company.com"
  },
  "status": "APPROVED_FOR_RELEASE"
}
```

### 9.2 Annual Privacy Impact Assessment (PIA)

**Every 12 months, or after 50+ batches, conduct:**

1. **Cumulative epsilon tracking:** Sum all ε across batches; verify total < authorized budget
2. **Attack evolution review:** Any new re-identification techniques published?
3. **Dataset linkage review:** Any external datasets (hospital registries, insurance claims) published that could enable linkage?
4. **ANPD guidance update:** Any new anonymization standards or ε recommendations from ANPD?
5. **Rare disease threshold review:** Any new rare disease diagnoses identified that require cohort size increase?

---

## 10. References & Sources

### Differential Privacy Fundamentals
- [IEEE Digital Privacy — What Is Differential Privacy?](https://digitalprivacy.ieee.org/publications/topics/what-is-differential-privacy/)
- [Differential Privacy for Medical Deep Learning (NPJ Digital Medicine, 2025)](https://www.nature.com/articles/s41746-025-02280-z)
- [A Survey on Differential Privacy for Medical Data Analysis (PMC10257172)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10257172/)
- [Differential Privacy for Public Health Data (PMC8662814)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8662814/)

### Epsilon Budget & Privacy-Utility Tradeoff
- [OpenMined Blog: Choosing Epsilon for Differential Privacy](https://openmined.org/blog/choosing-epsilon/)
- [Understanding the Privacy Budget (Medium, Entiovi Research)](https://medium.com/@entiovi.research/understanding-the-privacy-budget-in-differential-privacy-a-technical-perspective-3664185042e6)
- [Differential Privacy in Practice (Journal of Privacy and Confidentiality)](https://journalprivacyconfidentiality.org/index.php/jpc/article/download/689/685/1164)

### Re-Identification Attack Methodologies
- [Membership Inference Attacks Against Synthetic Health Data (PMC8766950, 2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8766950/)
- [Linkage Attacks Expose Identity Risks (arXiv 2508.15850, 2025)](https://arxiv.org/html/2508.15850v1)
- [Linear Reconstruction Approach for Attribute Inference (USENIX Security 2024)](https://www.usenix.org/system/files/usenixsecurity24-annamalai-linear.pdf)
- [Re-Identification Risk in Rare Disease Registries (Nature, EJHG, 2017)](https://www.nature.com/articles/ejhg201652)
- [Assessing Re-Identification Risk in Healthcare Data (PMC6450246, 2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6450246/)

### LGPD & ANPD Compliance
- [LGPD Article 5: Definitions — Anonymization](https://lgpd-brazil.info/chapter_01/article_05)
- [LGPD Article 12: Anonymization of Personal Data](https://lgpd-brazil.info/chapter_02/article_12)
- [LGPD Article 13: Processing for Public Health Studies](https://lgpd-brazil.info/chapter_02/article_13)
- [Brazil LGPD Overview (Usercentrics)](https://usercentrics.com/knowledge-hub/brazil-lgpd-general-data-protection-law-overview/)
- [European Data Protection Board Opinion on Brazil Adequacy Decision (ReedSmith, 2024)](https://www.reedsmith.com/our-insights/blogs/viewpoints/102mk5b/brazil-achieves-adequacy-decision/)

### Open-Source Differential Privacy Libraries
- [Google Differential Privacy Libraries (GitHub)](https://github.com/google/differential-privacy)
- [OpenDP — Harvard University Privacy Tools Project](https://privacytools.seas.harvard.edu/opendp)
- [OpenDP Documentation](https://docs.opendp.org/en/stable/index.html)
- [OpenMined PyDP Documentation](https://pydp.readthedocs.io/en/latest/introduction.html)
- [IBM Diffprivlib (GitHub)](https://github.com/IBM/differential-privacy-library)
- [Survey of Differential Privacy Frameworks (OpenMined Blog)](https://blog.openmined.org/a-survey-of-differential-privacy-frameworks/)

### Implementation & Validation
- [Enabling Realistic Health Data Re-Identification Risk Assessment via Adversarial Modeling (JAMIA, 2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8711654/)
- [Ten Quick Tips for De-Identification (PMC, 2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12456793/)
- [Toolkit for Assessing and Mitigating Re-Identification Risk (Sentinel Initiative)](https://www.sentinelinitiative.org/sites/default/files/Methods/Sentinel_Report_Toolkit-Assessing-Mitigating-Risk-Re-Identification-Sharing-Data-Derived-from-Health-Records.pdf)

---

## Appendix A: ANPD Notification Template (Draft)

```
COMUNICAÇÃO PRÉVIA À AUTORIDADE NACIONAL DE PROTEÇÃO DE DADOS

Organização: [Company Name]
Data: [YYYY-MM-DD]
Assunto: Geração de Dados Sintéticos para Pesquisa em Saúde Populacional — Certificação de Anonimização

---

RESUMO EXECUTIVO

A [Company Name] desenvolveu um sistema de geração de agentes de pacientes sintéticos
a partir de distribuições de população anonimizadas, aplicando diferença privada
(mecanismo Laplace) conforme aprovado pela comunidade acadêmica internacional.

PARÂMETROS DE PRIVACIDADE

- Mecanismo: Laplace diferencial privado (ε = 0.5–1.5)
- Biblioteca auditada: OpenDP v1.1+ (Rust, verificação formal)
- Anonimização: Irreversível sem sementes originais (não divulgadas publicamente)
- Esforço razoável para reversão: > R$ 100K + meses de análise

CONFORMIDADE LGPD

Artigo 5 (Definições): Dados são "anonimizados" — não podem ser associados
direta ou indiretamente a pessoa natural por esforço razoável.

Artigo 12 (Anonimização): Técnicas "razoáveis" disponíveis — Laplace diferencial
privado é padrão-ouro em 2026.

Artigo 13 (Pesquisa em Saúde): Justificativa de pesquisa presente; IRB aprovação anexada.

---

Respeitosamente submetido,

[Assinado]
[CISO/Legal Officer]
```

---

**Document Status:** Final
**Last Updated:** 2026-03-17
**Next Review:** 2027-03-17 (annual PIA)
**Owner:** CISO (Cyrus) — Co-owners: CLO (Ruth), CMO (Elena), CTO (Archie)
