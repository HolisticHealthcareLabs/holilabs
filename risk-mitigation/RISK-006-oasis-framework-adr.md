# Architecture Decision Record: RISK-006
## Clinical Population Health Multi-Agent Simulation Engine Selection

**Status:** APPROVED FOR DECISION
**Date:** 2026-03-17
**Risk ID:** RISK-006
**Severity:** HIGH
**Domain:** System Architecture, Clinical Safety, Production Readiness

---

## Executive Summary

**DECISION: Do NOT use OASIS directly. Build abstraction layer + fallback to Mesa/AgentScope.**

OASIS (CAMEL-AI's social media simulation framework) is unsuitable for production clinical use without significant hardening. While it demonstrates scale (1M agents), it was designed for social media research, not clinical determinism or healthcare validation. This ADR charts a pragmatic fork strategy with abstraction layers to minimize vendor lock-in and maintain clinical integrity.

---

## 1. Problem Context

### Why We Need a Simulation Engine

The clinical population health prediction system requires:
- **Agent-based modeling** of patient cohorts (1,000–50,000 agents minimum)
- **Realistic behavioral modeling** of clinical decisions, disease progression, medication adherence
- **Deterministic replay capability** for FDA validation and audit trails (per RUTH veto invariants)
- **Fault tolerance** under model drift, missing data, and agent failure
- **Production-grade reliability**: sub-hour MTTR, rollback, audit-trail immutability

### RISK-006 Core Concern

Forking an immature research framework (OASIS) without production hardening creates:
1. **Loss of clinical determinism** — LLM non-determinism breaks validation replay
2. **Unbounded vendor lock-in** — tight coupling to CAMEL-AI dependency tree
3. **FDA/regulatory gap** — no provenance, uncertainty quantification, or credibility metadata
4. **Operational blindness** — no observability, error recovery, or circuit-breaker patterns

---

## 2. Detailed Technical Assessment

### 2.1 OASIS Framework Analysis

| Criterion | Finding | Risk Level |
|-----------|---------|-----------|
| **Purpose** | Social media simulation (Twitter/Reddit) | RED |
| **Test Coverage** | pytest required for contributions; no public metrics | YELLOW |
| **CI/CD** | GitHub Actions pipeline exists; stability unknown | YELLOW |
| **Production Deployments** | Research-only (academia, papers); no healthcare examples | RED |
| **Active Contributors** | ~5–10 core (CAMEL-AI team); community inactive | YELLOW |
| **Release Cadence** | Irregular; 0.2.78 in Dec 2025 | YELLOW |
| **Backward Compatibility** | Not documented; breaking changes possible | RED |
| **Dependency Tree** | Tight coupling to CAMEL-AI 0.2.78+, OpenAI API, SQLite | RED |
| **Determinism** | LLM outputs non-deterministic; deterministic action selection only | RED |
| **Error Handling** | Implicit; no documented recovery patterns | RED |
| **Scale @ 1K Agents** | Designed for 1M; likely over-engineered for clinical cohorts | GREEN |

### 2.2 OASIS Architecture Risks for Clinical Use

**Non-Deterministic LLM Outputs**
- OASIS delegates "textual realization" to LLMs (GPT-4O Mini default)
- LLM outputs are non-deterministic by design (temperature sampling, stochastic decoding)
- **Clinical Impact**: Replay audit trails will NOT produce identical outcomes → FDA validation breaks
- **Mitigation**: Deterministic rule engine overlay required; LLMs cannot be source of truth

**Social Media vs. Clinical Semantics**
- OASIS action space: follow, comment, repost, report
- Clinical action space: diagnose, prescribe, refer, monitor, de-escalate
- **Clinical Impact**: Framework semantic mismatch; extensive custom Layer required
- **Mitigation**: Abstract agent behavior into plugin interfaces

**Dependency Chain Fragility**
- Requires: CAMEL-AI 0.2.78, OpenAI API, SQLite, asyncio, PettingZoo
- CAMEL-AI is unfunded, bootstrapped (9-person UK team)
- No enterprise support contract available
- **Clinical Impact**: Single point of failure if CAMEL-AI project stalls
- **Mitigation**: Abstraction layer to swap backends

**Missing Clinical Metadata**
- No `sourceAuthority`, `citationUrl`, `legalBasis` fields (per ELENA/RUTH invariants)
- No uncertainty quantification (UQ) – required by FDA guidance on CM&S
- No audit-trail integrity validation
- **Clinical Impact**: Violates RUTH veto invariant (SaMD compliance gap)

---

### 2.3 OASIS Strengths (Why Consider It)

| Strength | Relevance | Mitigation |
|----------|-----------|-----------|
| **Proven 1M-agent scale** | Overkill for clinical (1K–50K), but demonstrates architecture | Use as reference design |
| **Async/await foundation** | Clean for concurrent patient simulators | Inherit patterns via abstraction |
| **Active research backing** | CAMEL-AI publishes; community traction | Monitor for clinical papers |
| **Apache 2.0 license** | Permits forking for modifications | Fork + abstract |

---

## 3. Alternative Frameworks Comparison

### 3.1 Evaluation Matrix

| Framework | Scale | Determinism | Clinical Fit | Prod Readiness | Enterprise Support | Risk |
|-----------|-------|-------------|--------------|-----------------|-------------------|------|
| **OASIS (CAMEL-AI)** | 1M agents | ⚠️ Non-det LLM | ❌ Research-only | 🟡 Beta | ❌ None | HIGH |
| **Mesa** | 100K agents | ✅ Full | ✅ Healthcare papers | ✅ Stable | 🟢 Community | LOW |
| **AgentScope (Alibaba)** | 1M agents | ⚠️ LLM-based | 🟡 Multi-domain | ✅ Production-ready | 🟢 Enterprise | MEDIUM |
| **AutoGen (Microsoft)** | 10K agents | ⚠️ LLM-based | 🟡 Multi-domain | ✅ Production-ready | 🟢 Enterprise | MEDIUM |
| **CrewAI** | 1K agents | ⚠️ LLM-based | 🟡 Task automation | 🟡 Production intent | ❌ Community | MEDIUM |
| **Custom Rule Engine** | 100K agents | ✅ Full | ✅ Full control | ❌ Build risk | N/A | HIGH (build) |

### 3.2 Short-listed Alternatives

#### **3.2.1 Mesa (Recommended Fallback)**

**Strengths:**
- Pure Python ABM framework; 350+ published papers, 790+ authors
- **Full determinism**: All behavior rule-based; no LLM dependency
- **Healthcare validation**: Used in ED simulation, learning health systems, epidemiology
- **Stable API**: 10+ years of development; backward compatible
- **Open governance**: Apache 2.0; strong community

**Weaknesses:**
- Scale: ~100K agents (insufficient for 1M social simulation, but adequate for clinical cohorts)
- No built-in LLM integration (requires custom bridge)
- No async foundation (potential bottleneck @ scale)

**Clinical Fit:** ⭐⭐⭐⭐⭐ (Best for deterministic compliance)

**Integration Path:**
```python
# Mesa + CAMEL agents as plugin (separate layer)
from mesa import Agent, Model
from camel.agents import RolePlayAgent

class PatientAgent(Agent):
    def step(self):
        # Deterministic clinical logic (rule-based)
        action = self.evaluate_clinical_rule()

        # Optional: LLM for text generation (not decision logic)
        explanation = RolePlayAgent.generate_narrative(action)
```

#### **3.2.2 AgentScope (Microsoft-backed Alternative)**

**Strengths:**
- **Production Runtime**: AgentScope-Runtime with Kubernetes, observability, sandboxing
- **Scale**: 1M agents in 12 minutes (4 devices, linear scaling)
- **Full-stack observability**: OpenTelemetry, audit logs
- **Enterprise support**: Alibaba backing, production deployments
- **Multi-protocol**: REST APIs, serverless, Kubernetes

**Weaknesses:**
- Optimized for LLM-agent orchestration (not deterministic rules)
- Relatively newer (1.0 release 2025); fewer healthcare papers than Mesa
- Potential vendor lock-in to Alibaba ecosystem

**Clinical Fit:** ⭐⭐⭐ (Better than OASIS; requires determinism overlay)

**Integration Path:**
```python
# AgentScope + deterministic wrapper
from agentscope.agents import Agent
from clinical_engine import ClinicalDecisionRule

class DeterministicClinicalAgent(Agent):
    async def act(self):
        decision = ClinicalDecisionRule.evaluate(self.state)
        return decision  # No LLM in critical path
```

---

## 4. Production Readiness Scorecard

### 4.1 FDA/Regulatory Readiness (Required for Clinical Validation)

| Criterion | OASIS | Mesa | AgentScope | Required Level |
|-----------|-------|------|-----------|----------------|
| **Deterministic Replay** | ❌ 0/5 | ✅ 5/5 | ⚠️ 2/5 | 5/5 (mandatory) |
| **Uncertainty Quantification (UQ)** | ❌ 0/5 | ⚠️ 2/5 | ⚠️ 1/5 | 4/5 (FDA CM&S) |
| **Audit Trail Immutability** | ❌ 1/5 | ⚠️ 2/5 | ✅ 4/5 | 5/5 (HIPAA/LGPD) |
| **Verification & Validation (V&V)** | ❌ 1/5 | ✅ 4/5 | ⚠️ 2/5 | 4/5 (FDA ASME) |
| **Model Credibility Metadata** | ❌ 0/5 | ⚠️ 2/5 | ⚠️ 1/5 | 4/5 (FDA) |
| **Error Handling & Recovery** | ❌ 0/5 | ⚠️ 2/5 | ✅ 4/5 | 4/5 (MTTR) |
| **API Stability** | ⚠️ 1/5 | ✅ 5/5 | ⚠️ 2/5 | 4/5 (backward-compat) |

**FDA Guidance Alignment** (per "Assessing the Credibility of Computational Modeling and Simulation"):
- OASIS: **1/10** (no credibility framework documented)
- Mesa: **6/10** (rule-based validates; missing UQ/metadata)
- AgentScope: **5/10** (production controls; requires determinism overlay)

### 4.2 Operational Readiness

| Criterion | OASIS | Mesa | AgentScope | Required |
|-----------|-------|------|-----------|----------|
| **MTTR (Mean Time To Recovery)** | ⚠️ Slow | ✅ Fast | ✅ Fast | <1 hour |
| **Observability** | ❌ None | ⚠️ Manual | ✅ Built-in | ✅ Required |
| **Circuit Breaker** | ❌ None | ❌ None | ✅ Optional | ⚠️ Recommended |
| **Rollback Capability** | ⚠️ Difficult | ✅ Easy | ✅ Easy | ✅ Required |
| **Horizontal Scale** | ✅ Yes | ⚠️ Manual | ✅ Native | ✅ Required |

---

## 5. Strategic Decision: Fork with Abstraction Layer

### 5.1 Recommended Architecture

```
┌──────────────────────────────────────────────────────────────┐
│         Clinical Population Health System (CDSS)             │
├──────────────────────────────────────────────────────────────┤
│  Clinical Logic Layer                                        │
│  - Patient cohort definitions                                │
│  - Disease progression rules (deterministic)                 │
│  - Treatment pathways (rule-based decision trees)            │
│  - Compliance monitoring                                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     v
┌──────────────────────────────────────────────────────────────┐
│  ABSTRACTION LAYER (Simulation Engine Interface)             │
│  - ISimulationEngine (interface)                             │
│  - SimulationOrchestrator (factory + routing)                │
│  - DeterminismValidator (replay verification)                │
│  - AuditTrailRecorder (HIPAA/LGPD compliance)                │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┐
        v            v            v              v
    ┌────────┐  ┌────────┐  ┌──────────┐  ┌───────────┐
    │ Mesa   │  │Forked  │  │AgentScope│  │ Custom    │
    │ Engine │  │OASIS   │  │ Runtime  │  │ Rule Eng. │
    │(Primary)│ │(Opt)   │  │(Fallback)│  │(Future)   │
    └────────┘  └────────┘  └──────────┘  └───────────┘
```

### 5.2 What to Keep from OASIS (If Forked)

If a customized OASIS fork is pursued:

**Keep:**
- Async/await concurrency patterns (asyncio best practices)
- Time Engine scheduling algorithm (efficient event simulation)
- Environment Server database schema (adapt for clinical data)

**Replace/Overlay:**
- LLM-based action selection → deterministic rule engine
- Social media semantics → clinical ontology (HL7 FHIR)
- Recommendation system → clinical decision support rules
- Agent communication → patient-clinician interaction events

**Add:**
- Determinism verification layer (seed-based replay validation)
- Credibility metadata store (sourceAuthority, citationUrl, UQ bounds)
- Audit trail enforcement (immutable AuditLog per CYRUS veto)
- Error recovery patterns (circuit breaker, exponential backoff)

### 5.3 Abstraction Layer Design

**Core Interfaces:**

```python
# /src/simulation/engine/interface.py
from abc import ABC, abstractmethod
from typing import Dict, List, Any
from dataclasses import dataclass

@dataclass
class SimulationConfig:
    seed: int  # For deterministic replay
    num_agents: int
    duration_steps: int
    clinical_rules_file: str
    uncertainty_bounds: Dict[str, float]  # UQ per FDA

@dataclass
class StepResult:
    step_id: int
    agent_decisions: Dict[str, Any]
    state_hash: str  # For determinism verification
    credibility_metadata: Dict[str, Any]

class ISimulationEngine(ABC):
    @abstractmethod
    async def initialize(self, config: SimulationConfig) -> None:
        """Setup simulation with seed for deterministic replay."""
        pass

    @abstractmethod
    async def step(self) -> StepResult:
        """Execute one simulation step with audit trail."""
        pass

    @abstractmethod
    async def rollback(self, target_step: int) -> None:
        """Rollback to prior state (FDA replay requirement)."""
        pass

    @abstractmethod
    def get_audit_trail(self) -> List[AuditLogEntry]:
        """Immutable audit trail for compliance."""
        pass

class SimulationOrchestrator:
    """Factory + router for engine selection."""

    def __init__(self, primary_engine: str = "mesa",
                 fallback_engines: List[str] = ["agentscope"]):
        self.primary_engine = primary_engine
        self.fallback_engines = fallback_engines
        self._engine: Optional[ISimulationEngine] = None

    async def run(self, config: SimulationConfig) -> SimulationResult:
        """Run simulation with automatic fallback on error."""
        for engine_name in [self.primary_engine] + self.fallback_engines:
            try:
                engine = self._instantiate_engine(engine_name)
                result = await engine.execute(config)
                return result
            except Exception as e:
                if engine_name == self.fallback_engines[-1]:
                    raise  # Final fallback failed
                logger.warning(f"Engine {engine_name} failed; trying {self.fallback_engines}")
```

**Implementation:**

```python
# /src/simulation/engine/mesa_adapter.py
from mesa import Agent, Model
from .interface import ISimulationEngine, SimulationConfig, StepResult

class MesaSimulationEngine(ISimulationEngine):
    async def initialize(self, config: SimulationConfig) -> None:
        np.random.seed(config.seed)  # Deterministic
        self.model = ClinicalPopulationModel(
            num_patients=config.num_agents,
            rules_file=config.clinical_rules_file,
            uncertainty_bounds=config.uncertainty_bounds
        )

    async def step(self) -> StepResult:
        self.model.step()
        result = StepResult(
            step_id=self.model.schedule.steps,
            agent_decisions=self._extract_decisions(),
            state_hash=self._compute_state_hash(),
            credibility_metadata={
                "engine": "mesa",
                "seed": self.seed,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        self._record_audit_trail(result)
        return result
```

---

## 6. Fork Strategy: OASIS + Abstraction Layer

### 6.1 Timeline & Effort (If Pursued)

| Phase | Duration | Effort | Owner |
|-------|----------|--------|-------|
| 1. Fork OASIS repo | 0.5 weeks | 1 eng | DevOps |
| 2. Build abstraction layer + Mesa adapter | 2 weeks | 2 eng | Simulation |
| 3. Implement determinism validator | 1.5 weeks | 1 eng | QA/Compliance |
| 4. Add audit trail + credibility metadata | 1.5 weeks | 1 eng | Security (CYRUS) |
| 5. Integration testing + FDA prep | 2 weeks | 2 eng | QA |
| **Total** | **7.5 weeks** | **7 eng-weeks** | - |

### 6.2 Maintenance Burden

- **OASIS upstream tracking**: Monthly check for security patches, breaking changes
- **CAMEL-AI dependency updates**: Version pinning + testing (weekly)
- **Clinical rule updates**: Cross-team review (Compliance → ELENA/RUTH)
- **Incident response**: On-call rotation for production failures

**Recommendation:** Maintenance cost justifiable only if:
1. Clinical decision logic highly specific to OASIS architecture, OR
2. Scale requirements demand OASIS's 1M-agent capability (unlikely @ 1K–50K cohorts)

Otherwise, **pure Mesa deployment recommended** (lower maintenance).

---

## 7. Recommended Path Forward

### DECISION: Primary Strategy = Mesa + Clinical Rule Engine

**Rationale:**
1. **Determinism guarantee** (FDA requirement): Mesa's rule-based architecture ensures reproducible outcomes
2. **Healthcare precedent**: 10+ published clinical simulations using Mesa
3. **Operational simplicity**: No LLM non-determinism, no OpenAI API dependency
4. **Lower fork/maintenance burden**: Stable API, community-maintained
5. **Regulatory clarity**: Easier V&V under FDA CM&S guidance (ASME V&V 40 compatible)

**Implementation Roadmap:**

```
PHASE 1: Mesa Baseline (8 weeks)
├─ Build ISimulationEngine interface (abstraction layer)
├─ Implement MesaSimulationEngine adapter
├─ Port clinical rules from existing system (or develop new)
├─ Add determinism validator (seed-based replay)
├─ Add audit trail (CYRUS veto compliance)
└─ Integration testing

PHASE 2: Fallback Integration (3 weeks)
├─ Build AgentScopeSimulationEngine adapter (optional)
├─ Add SimulationOrchestrator (primary → fallback routing)
├─ Test failover scenarios
└─ Document runbook

PHASE 3: Optional OASIS Fork (if clinical logic demands it)
├─ Fork camel-ai/oasis (if scale >50K agents)
├─ Apply abstraction layer + determinism overlay
├─ Run parallel perf benchmarks (Mesa vs. OASIS)
└─ Decide based on measured needs (NOT speculative)
```

### Fallback Decision Tree

```
IF (agent_count > 100K AND clinical_rules_complex):
  → Pursue AgentScope adapter (no LLM decisions)
ELIF (agent_count > 50K AND sim_time_critical):
  → Consider OASIS fork (with determinism layer)
ELSE:
  → Default to Mesa (lowest risk)
```

---

## 8. OASIS Fork Contingency Plan (If Needed)

**Trigger:** Clinical requirements demand 100K+ agents + complex behavioral dynamics

**Implementation Checklist:**

1. **Determinism Overlay**
   - Replace LLM decision logic with rule engine
   - Freeze CAMEL-AI version (0.2.78 exact pin, no auto-updates)
   - Implement seeded random state validation
   - Test replay: same seed → identical trajectories

2. **Regulatory Layering**
   - Add `SourceAuthority` + `CitationUrl` metadata to every rule
   - Implement `UncertaintyQuantification` fields (credibility bounds)
   - Enforce `LegalBasis` (consent, derived, synthetic) on patient data
   - Immutable audit trail via `createProtectedRoute` + CYRUS guards

3. **Operational Hardening**
   - Circuit breaker on OpenAI API failures (fallback to cached decisions)
   - Rate limiting + request queuing for model inference
   - Error recovery: exponential backoff, graceful degradation
   - Observability: OpenTelemetry spans for every agent step

4. **Vendor Lock-in Mitigation**
   - Abstract CAMEL-AI imports behind interface (ImportAdapter pattern)
   - Version pinning + tested upgrade path
   - Parallel Mesa import for feature parity testing
   - Documented migration plan (OASIS → Mesa) if CAMEL-AI project stalls

---

## 9. Risk Residuals After Mitigation

### Residual Risk Matrix

| Risk | Mitigation | Residual Level | Owner |
|------|-----------|-----------------|-------|
| OASIS instability | Use Mesa primary; OASIS optional fork | LOW | ARCHIE |
| LLM non-determinism | Determinism validator + audit log | LOW | QUINN |
| CAMEL-AI abandonment | Abstraction layer + fallback engines | MEDIUM | CYRUS |
| FDA validation gap | Add credibility metadata + V&V evidence | MEDIUM | ELENA/RUTH |
| Scale insufficiency | Benchmark Mesa @ 50K agents (Phase 0) | LOW | QUINN |
| OpenAI API outage | Cached decision fallback + circuit breaker | LOW | CYRUS |

### Residual Risk Scores

| Dimension | Before Mitigation | After Mitigation | Confidence |
|-----------|------------------|------------------|-----------|
| **Technical Risk** | 8/10 (OASIS unstable) | 3/10 (Mesa stable) | HIGH |
| **Regulatory Risk** | 9/10 (determinism gap) | 3/10 (rule-based) | HIGH |
| **Operational Risk** | 7/10 (no observability) | 2/10 (audit trail) | HIGH |
| **Vendor Lock-in** | 8/10 (CAMEL-AI only) | 4/10 (abstracted) | MEDIUM |
| **Overall Risk** | **8/10** | **3/10** | **HIGH** |

---

## 10. Approval Criteria

### RUTH Veto Criteria (Legal & Compliance)

✅ **PASS:**
- All clinical rules tagged with `sourceAuthority` + `citationUrl`
- Consent flows enforce granular consent (e.g., research vs. treatment simulation)
- Audit trail immutability verified (no deletion or modification post-creation)
- SaMD classification decision documented (if applicable)

**Action:** Comply with all RUTH invariants before Phase 2 starts.

### ELENA Veto Criteria (Clinical Safety)

✅ **PASS:**
- Clinical rules sourced from peer-reviewed literature (Tier 1) or clinical guidelines (Tier 2)
- No bro-science or unvalidated heuristics
- LLM used only for text generation, never for clinical decision logic
- Missing lab values return `INSUFFICIENT_DATA`, not imputation

**Action:** Clinical rules review board (ELENA + clinical advisors) before Phase 1 conclusion.

### CYRUS Veto Criteria (Security)

✅ **PASS:**
- All routes protected by `createProtectedRoute` RBAC guard
- Cross-tenant isolation verified via `verifyPatientAccess()` checks
- PII fields encrypted with `encryptPHIWithVersion` before DB write
- Audit trail hash-chain integrity validated in CI/CD

**Action:** Security review + penetration testing before Phase 2 starts.

---

## 11. Post-Implementation Verification

### Determinism Test

```bash
# Run same simulation twice with identical seed
./sim run --seed 42 --agents 1000 --steps 100 → output_v1.json
./sim run --seed 42 --agents 1000 --steps 100 → output_v2.json

# Diff trajectories
diff output_v1.json output_v2.json
# Expected: identical (zero diff)
```

### Audit Trail Verification

```bash
# Check immutability
SELECT COUNT(*) FROM AuditLog WHERE deleted_at IS NOT NULL;
# Expected: 0 (no deletions allowed)

# Verify hash chain
./verify-audit-chain --log-file audit.log
# Expected: "Hash chain valid. Tamper detection: PASS"
```

### FDA Credibility Checklist

- [ ] Every clinical rule has provenance metadata (ELENA review)
- [ ] Uncertainty bounds documented for all biomarkers (UQ per FDA)
- [ ] Verification & Validation evidence collected (test reports)
- [ ] Model qualification letter prepared (regulatory submission-ready)

---

## 12. References & Citations

### FDA Guidance
1. **"Assessing the Credibility of Computational Modeling and Simulation in Medical Device Submissions"** (2023)
   - Establishes V&V, UQ, and credibility assessment framework
   - Source: https://www.fda.gov/media/154985/download

2. **ASME V&V 40 Standard** – Verification and Validation in Computational Modeling
   - Peer-reviewed standard for computational model credibility
   - Source: ASME International

### Literature
3. **"Patients, Primary Care, and Policy: Agent-Based Simulation Modeling for Healthcare Decision Support"**
   - Demonstrates Mesa for clinical population health
   - Clinical Care Management, 2021; 24(4)

4. **"Very Large-Scale Multi-Agent Simulation in AgentScope"**
   - arxiv:2407.17789
   - Demonstrates AgentScope at scale (1M agents in 12 min)

5. **"OASIS: Open Agent Social Interaction Simulations with One Million Agents"**
   - arxiv:2411.11581
   - Original OASIS paper (social media focus)

### Frameworks Documented
- **Mesa**: https://mesa.readthedocs.io/ (350+ papers, healthcare apps)
- **AgentScope**: https://github.com/agentscope-ai/agentscope (Alibaba, production-ready runtime)
- **OASIS**: https://github.com/camel-ai/oasis (CAMEL-AI social simulator)
- **CrewAI**: https://docs.crewai.com/ (task automation, not population simulation)

---

## 13. Approval Sign-off

| Role | Status | Signature | Date |
|------|--------|-----------|------|
| ARCHIE (CTO) | APPROVED | [Signature] | 2026-03-17 |
| PAUL (CPO) | APPROVED | [Signature] | 2026-03-17 |
| RUTH (CLO) | CONDITIONAL | See veto criteria § 10 | 2026-03-17 |
| ELENA (CMO) | CONDITIONAL | See veto criteria § 10 | 2026-03-17 |
| CYRUS (CISO) | CONDITIONAL | See veto criteria § 10 | 2026-03-17 |
| GORDON (CFO) | APPROVED | [Signature] | 2026-03-17 |

**Final Status:** APPROVED FOR IMPLEMENTATION (Phase 1: Mesa Baseline)

---

## 14. Appendix: Production Readiness Checklist

### Pre-Launch Verification

- [ ] **Determinism validation** – Seed-based replay passes 100/100 trials
- [ ] **Audit trail immutability** – Hash chain verified, no tampering detected
- [ ] **Clinical rule review** – All rules approved by ELENA (clinical board)
- [ ] **FDA compliance** – V&V evidence package ready for submission
- [ ] **Performance baseline** – Mesa @ 50K agents meets <100ms step time
- [ ] **Failover testing** – Mesa → AgentScope switchover succeeds in <30s
- [ ] **Security audit** – CYRUS penetration testing passed
- [ ] **CI/CD gates** – 100% test coverage, zero flaky tests, SonarQube grade A

### Production Operations

- [ ] **Monitoring dashboards** – Step duration, agent failures, audit trail lag
- [ ] **Alerting rules** – Page on-call for >1s step duration, audit trail gaps
- [ ] **Runbook** – Incident response for common failures (OpenAI outage, OOM, data corruption)
- [ ] **Backup/restore** – Tested recovery from state snapshot (MTTR <30 min)
- [ ] **Change log** – Clinical rule updates tracked; rollback procedure documented

---

**Document Version:** 1.0
**Last Updated:** 2026-03-17
**Next Review:** 2026-06-17 (3-month post-launch)
