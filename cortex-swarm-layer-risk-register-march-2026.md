# CORTEX SWARM LAYER — OPERATIONAL RISK REGISTER
## Risk Assessment: March 2026
### Scope: Cortex Swarm Layer (CSL) Build, Launch & GTM — Q2 2026 through Q4 2026
### Owners: Cortex Boardroom (ARCHIE, PAUL, VICTOR, GORDON, RUTH, ELENA, CYRUS, QUINN)

---

> **Assessment basis:** Decisions and commitments made at the Cortex Boardroom 3-Day Summit (March 17–19, 2026). Risks are anchored to the specific architectural, product, regulatory, and commercial choices confirmed at that summit. This is a living document — review cadence is monthly for Critical/High risks, quarterly for Medium/Low.

---

## RISK MATRIX (Reference)

|  | Low Impact | Medium Impact | High Impact |
|---|---|---|---|
| **High Likelihood** | Medium | High | **Critical** |
| **Medium Likelihood** | Low | Medium | **High** |
| **Low Likelihood** | Low | Low | Medium |

---

## PRIORITIZED RISK REGISTER

---

### CRITICAL RISKS

---

**RISK-001**
**Category:** Compliance
**Description:** Self-hosted LLM inference fails to achieve LGPD Art. 33 residency compliance before first pilot data is processed. If any patient-derived seed data (even anonymized distributions) touches an inference endpoint outside Brazilian jurisdiction, we trigger a reportable LGPD violation — potentially before commercial launch.
**Likelihood:** High — LGPD residency for GPU-class inference is a technically complex and commercially constrained requirement. Brazilian cloud providers with the necessary GPU capacity are limited (mainly AWS São Paulo, Azure Brazil South, Google Cloud São Paulo). Availability for A100/H100 class GPUs is constrained and pricing is 35–50% above US regions.
**Impact:** High — An LGPD violation at pilot stage would trigger ANPD investigation, force suspension of the pilot, and create a reputational risk with hospital partners that is almost impossible to recover from in a trust-sensitive clinical context.
**Risk Level:** Critical
**Mitigation:**
- Week 1: RUTH + ARCHIE conduct a formal Brazilian cloud provider capability audit across AWS São Paulo, Azure Brazil South, and GCP São Paulo. Document GPU availability, pricing, data residency certifications, and DPA terms for each.
- Week 2: Confirm that no patient-derived statistical distribution — even fully anonymized — leaves Brazilian jurisdiction during seed data extraction or simulation initialization. If required GPU capacity is unavailable domestically, evaluate owned hardware in a Brazilian data center (colocation in São Paulo or Campinas) as a fallback.
- Week 1: RUTH completes review of the OASIS framework's default LLM routing to confirm it does not forward inference to Alibaba Qwen-Plus cloud endpoints by default. Patch before any patient-adjacent data enters the system.
- Ongoing: Every inference endpoint call includes jurisdiction metadata in the AuditLog. CYRUS sets up automated alerting if any inference call resolves to a non-BR IP range.
**Owner:** RUTH (primary), ARCHIE (technical execution), CYRUS (monitoring)
**Status:** Open — Week 1 action due March 24, 2026

---

**RISK-002**
**Category:** Compliance / Strategic
**Description:** ANVISA classification memo (due Week 6) concludes that the Cohort Deterioration Risk Map (CDRM) or Drug Adherence Simulation (DAS) surfaces qualify as SaMD Class II or III, requiring formal registration before commercial deployment. This would add 12–24 months and R$500K–R$2M to the compliance pathway for those surfaces.
**Likelihood:** High — CDRM and DAS both influence clinical workflow planning in ways that are not categorically excluded from RDC 657/2022 SaMD scope. The "population analytics only" framing is legally defensible for TLP; it is less clear-cut for CDRM when medical directors use cohort risk scores to prioritize care interventions.
**Impact:** High — If CDRM is SaMD, Phase 2 of the GTM (health plan launch, Month 7) cannot proceed on schedule. The entire revenue ramp from health plan contracts is delayed by 12–24 months. This may have runway implications (GORDON's escalation threshold).
**Risk Level:** Critical
**Mitigation:**
- Week 4: Engage a specialized Brazilian health regulatory counsel (not just internal legal) to co-author the ANVISA classification memo. RUTH does not complete this memo solo — external SaMD regulatory expertise is required.
- In parallel with memo: Design CDRM with a "hard population floor" (minimum n=20 cohort for any display) and mandatory disclaimer on every screen ("This tool provides population-level analytics for planning purposes only. It does not constitute clinical advice for any individual patient."). These design choices strengthen the non-SaMD argument.
- Contingency plan if CDRM is classified SaMD: Pivot CDRM Phase 2 to operate as a research analytics module under a research data use agreement (RDUA) with health plan partners, not as a commercial SaaS product. Revenue model shifts from subscription to research partnership — lower, but legally defensible while ANVISA registration proceeds.
- For DAS: assume SaMD Class I registration is required. Begin Class I documentation process in Month 4 regardless of memo outcome. Class I registration is a 3–6 month process and can proceed in parallel with pharma GTM preparation.
**Owner:** RUTH (lead), VICTOR (GTM contingency), ELENA (clinical scope definition)
**Status:** Open — External regulatory counsel engagement due Week 2

---

**RISK-003**
**Category:** Security
**Description:** The synthetic patient agent generator produces agents that are effectively re-identifiable — either because the statistical distributions are thin (rare disease combinations unique to one or two patients in the underlying population) or because an adversarial actor crafts a simulation with seed parameters that reverse-engineer individual patient records from the output.
**Likelihood:** Medium — Re-identification from aggregate statistics is a known and documented privacy attack vector, particularly for rare conditions. Small hospital pilots (n=200–500 active patients) dramatically increase this risk. The attack surface exists by design in any simulation system.
**Impact:** High — Re-identification constitutes a LGPD breach regardless of intent. It also violates CYRUS's hard requirement that "PHI never enters the simulation runtime." Discovery by ANPD or a hospital partner would be catastrophic for trust and legal standing.
**Risk Level:** Critical
**Mitigation:**
- Before any pilot: Implement differential privacy mechanisms on the distribution extraction layer. Specifically: add calibrated Laplace noise to all statistical outputs before they seed agent generation. The privacy budget (epsilon) is set conservatively (ε ≤ 1.0) for small populations.
- Enforce a **minimum population threshold of n=50** for any statistical distribution used in agent generation. If a hospital's patient population for a given condition is below 50, that condition is excluded from the simulation seed entirely and returned as `INSUFFICIENT_POPULATION_DATA`.
- Run an independent re-identification audit before pilot launch. Engage an external privacy engineer to attempt re-identification attacks against generated agent populations. Must pass with zero successful re-identifications before pilot go/no-go.
- CYRUS implements output sanitization scanning for CPF/CNS/RG patterns on all simulation report outputs (already planned; confirm implementation is in Tier 1 scope).
- QUINN adds a re-identification risk test to the automated test suite: for any generated population, verify that no individual agent's attribute combination matches a specific patient record with >5% probability above random chance.
**Owner:** CYRUS (primary), ARCHIE (differential privacy implementation), QUINN (test suite)
**Status:** Open — Re-identification audit must complete before pilot launch

---

### HIGH RISKS

---

**RISK-004**
**Category:** Operational / Technical
**Description:** Brazilian cloud GPU capacity is insufficient or prohibitively expensive for production simulation at the required scale (N=1,000 agents per simulation run, multiple concurrent hospital tenants). The summit committed to cloud-first until 10 paying customers, but cloud GPU pricing in Brazil may make per-simulation COGS exceed GORDON's 93% gross margin target before scale is reached.
**Likelihood:** Medium — AWS São Paulo and Azure Brazil South have limited A100/H100 availability. Spot instance pricing fluctuates. A production workload requiring guaranteed capacity may require reserved instances, increasing fixed costs significantly.
**Impact:** High — If COGS per simulation run is R$50 (API pricing equivalent) rather than R$5 (self-hosted equivalent), at 50 simulation runs/day across 3 pilot hospitals, monthly compute costs reach R$75,000 rather than R$7,500. This changes GORDON's runway model materially.
**Risk Level:** High
**Mitigation:**
- Week 2: ARCHIE benchmarks Llama 3.3 70B vs Qwen 2.5 72B on a Brazilian cloud instance. Target: 200-token inference in <500ms at 1,000 concurrent agent context windows. If benchmark fails, escalate to GORDON immediately.
- Evaluate quantized models (AWQ 4-bit) as a cost reduction measure. At 4-bit quantization, a 70B model fits on 2× A100 80GB rather than 4×, halving compute cost. ELENA reviews whether quantization introduces unacceptable clinical reasoning quality degradation for population simulation.
- Explore co-location alternative: Colocation in Equinix SP4 (São Paulo) with owned GPU hardware may be cost-effective at 6-month horizon if cloud capacity is constrained. GORDON models breakeven point.
- Design simulation pipeline with configurable agent count: default N=1,000 for production, N=100 for pilot phase. This reduces pilot compute cost by 90% while still providing statistically meaningful population distributions.
**Owner:** GORDON (cost monitoring), ARCHIE (technical optimization)
**Status:** Open — Benchmark due Week 2

---

**RISK-005**
**Category:** Strategic / Competitive
**Description:** A well-funded US or European healthtech competitor (Hippocratic AI, Microsoft/Nuance, or an Abridge spin-off) recognizes the LATAM population prediction opportunity and enters aggressively — either by acquiring a Brazilian healthtech company or by partnering with a local EHR provider — within the 12-month window VICTOR identified.
**Likelihood:** Medium — VICTOR's competitive analysis shows current competitors are focused on documentation, imaging, and administrative AI. However, the MiroFish signal is public. Any competitor watching GitHub trends can see the swarm simulation opportunity simultaneously.
**Impact:** High — A well-funded entrant (e.g., Microsoft backed by Azure Brazil South infrastructure already in place) could compress our first-mover window from 12 months to 6, erode our pricing power, and make it harder to sign anchor pilot hospitals if they are already in conversation with a bigger brand.
**Risk Level:** High
**Mitigation:**
- Accelerate pilot hospital engagement: VICTOR must have signed LOIs with 3 pilot hospitals within 30 days. Exclusivity clauses in pilot agreements (even soft ones — "preferred partner" language) create stickiness before a competitor can engage those same hospitals.
- File IP protection on our clinical action model and GraphRAG ontology structure. The disease ontology + drug interaction + biomarker knowledge graph that seeds our simulation is protectable as a trade secret and potentially as a software patent in Brazil (INPI registration).
- Deepen LATAM regulatory expertise as an explicit competitive barrier. Publish a public white paper on "LGPD-Compliant Population Health AI" authored by RUTH. This positions us as the regulatory-native choice and makes it expensive for a US competitor to credibly claim the same expertise without 12+ months of local legal investment.
- Build clinical validation data as quickly as possible. Every week of pilot data is validation data a competitor cannot replicate without their own pilots. ELENA's 90-day validation protocol is not just a quality gate — it is a competitive moat-building mechanism.
**Owner:** VICTOR (GTM acceleration), RUTH (white paper, IP protection), ELENA (validation velocity)
**Status:** Open — LOI target: April 16, 2026

---

**RISK-006**
**Category:** Operational / Technical
**Description:** The OASIS framework (CAMEL-AI) is MIT-licensed open source maintained by a research team. It may not be production-grade for clinical use — lacking performance guarantees, long-term maintenance commitments, or the ability to handle the specific clinical interaction model we need without substantial fork divergence.
**Likelihood:** Medium — Open source simulation frameworks are built for research environments. Production clinical systems have different reliability requirements: zero-downtime maintenance, deterministic output under identical inputs, and a support escalation path when bugs appear.
**Impact:** High — If the OASIS fork diverges significantly from upstream, we own a bespoke simulation engine that we must maintain entirely. If the framework has an architectural limitation that blocks a required feature, we face either a major rewrite or a product capability gap.
**Risk Level:** High
**Mitigation:**
- Week 1: ARCHIE conducts a formal technical due diligence on OASIS. Assess: test coverage, code quality, issue velocity on the GitHub repo, contributor activity, and whether the maintainers are open to enterprise collaboration. Document findings.
- Architect our fork with a strict interface abstraction layer between our clinical logic and the OASIS simulation engine. This means: our clinical action model, agent schema, and reporting layer are fully decoupled from OASIS internals. If we need to swap simulation engines, we swap the engine, not the product.
- Evaluate CAMEL-AI's commercial engagement model. CAMEL-AI has a commercial track and has raised funding. Explore whether a commercial support agreement or co-development partnership is available.
- Contingency: If OASIS is deemed non-production-grade, evaluate building a lighter bespoke simulation runtime from scratch using Python asyncio and a simple message-passing agent model. For clinical population simulation at N=1,000 agents, this may be architecturally simpler than a full social simulation framework anyway.
**Owner:** ARCHIE (technical evaluation), QUINN (production readiness assessment)
**Status:** Open — OASIS due diligence due Week 1, March 24, 2026

---

**RISK-007**
**Category:** Financial
**Description:** The 90-day free pilot commitment (3 hospitals) consumes R$150,000 in compute costs before any revenue. If pilot hospitals do not convert to paying customers, or if the pilot period extends beyond 90 days due to validation requirements, runway is consumed without a corresponding revenue event.
**Likelihood:** Medium — Pilot-to-paid conversion in Brazilian hospital systems is notoriously slow due to procurement cycles, budget authority delegation, and IT committee review requirements. A 90-day pilot may surface a 6–12 month conversion timeline.
**Impact:** Medium — R$150,000 is manageable at current runway. However, if all 3 pilots extend to 180 days (common in hospital procurement), total unrecovered compute spend reaches R$300,000. Combined with the R$50,000/month baseline infrastructure cost, this represents a meaningful runway event if revenue is delayed.
**Risk Level:** High
**Mitigation:**
- Implement GORDON's recommendation: nominal pilot fee of R$1,500/month from day one. Frame it as "infrastructure cost recovery" rather than a product fee. This filters uncommitted hospitals while covering bare compute.
- Require a signed Letter of Intent (LOI) with a clearly defined conversion decision date (90 days from pilot start) before pilot initiation. The LOI is not a contract, but it creates a decision deadline and signals internal budget commitment.
- VICTOR identifies the internal clinical champion at each pilot hospital before engagement. A medical director or CMO sponsor dramatically accelerates procurement versus starting with IT procurement.
- GORDON sets a hard runway trigger: if no pilot converts to a paying contract within 120 days of pilot start, convene an emergency board session to evaluate burn rate and GTM approach.
**Owner:** GORDON (financial monitoring), VICTOR (conversion management)
**Status:** Open — Pilot pricing model decision due Week 2

---

**RISK-008**
**Category:** Security
**Description:** Simulation abuse vector: a malicious hospital admin user crafts seed parameters designed to encode real patient information into agent profiles and extract it via simulation outputs, effectively using the CSL as a PHI exfiltration tool.
**Likelihood:** Low — Requires a sophisticated, intentional insider threat with hospital admin credentials and knowledge of our simulation seed API. However, CYRUS flagged this explicitly in Day 2 and it has no current mitigation beyond planned architecture.
**Impact:** High — Successful exploitation results in a LGPD PHI breach, potential criminal liability for the operator, and loss of hospital partner trust. This is the most damaging class of security incident possible for the platform.
**Risk Level:** High
**Mitigation:**
- Implement schema enforcement on agent profiles with zero free-text fields. Every agent attribute is a typed, bounded value (age: integer 0–120, comorbidity: enum from approved list, etc.). No field accepts arbitrary string input.
- Anomaly detection on simulation initialization requests: flag any seed parameters that deviate >3 standard deviations from the expected distribution for that hospital's historical population. Auto-reject and alert CYRUS.
- Rate-limit simulation initiation: maximum 10 simulation runs per tenant per 24-hour period. Bulk exfiltration via repeated simulation runs is computationally expensive and time-limited.
- CYRUS implements output sanitization: all simulation report outputs pass through a pattern scanner for CPF (000.000.000-00 format), CNS (15-digit), RG, and email address patterns before delivery to the dashboard.
- Pen testing: engage an external red team to attempt simulation abuse before pilot launch. Specifically test the seed data injection attack vector.
**Owner:** CYRUS (primary), ARCHIE (schema enforcement), QUINN (pen test coordination)
**Status:** Open — Architecture implementation in Tier 1; pen test before pilot launch

---

### MEDIUM RISKS

---

**RISK-009**
**Category:** Operational
**Description:** Clinical trust miscalibration — clinicians and hospital administrators either over-trust the simulation outputs (treating population predictions as individual patient diagnoses) or under-trust them (dismissing the tool entirely as "just a simulation"), in both cases failing to derive value.
**Likelihood:** Medium — PAUL identified this in Day 2 and proposed a user trust research sprint. Without it, UI design is guesswork on one of the most critical UX variables in clinical software.
**Impact:** Medium — Over-trust creates clinical risk (ELENA veto territory if it results in clinical harm). Under-trust creates churn and a failed product. Either outcome prevents the validation flywheel from starting.
**Risk Level:** Medium
**Mitigation:**
- Execute PAUL's user trust research sprint in Weeks 1–3 (parallel to Tier 1 infrastructure). Recruit 10–15 clinical informatics users from existing customer base. Test three different explanatory framings of the TLP widget.
- Mandate the "SIMULATION — Population Level" badge on every output as a non-optional UI element (not a setting, not toggleable by hospital admins).
- Implement the "Explain this prediction" affordance before launch, not as a post-launch feature. Clinicians trust what they can interrogate.
- Monitor trust proxy metrics post-launch: ratio of "explain" clicks to total prediction views (low ratio = potential over-trust), time-to-dismiss on TLP widget (very short = under-trust).
**Owner:** PAUL (UX research and design), ELENA (clinical trust review)
**Status:** Open — User research sprint starts Week 1

---

**RISK-010**
**Category:** Compliance
**Description:** Granular consent architecture (three distinct consent types: treatment, population research, prediction service) creates friction in clinical onboarding that causes hospital partners to resist the consent requirements and request simplified consent flows. Pressure from hospital ops teams to collapse consent types into a single checkbox.
**Likelihood:** Medium — Hospital onboarding teams routinely push back on complex consent flows. This is a near-universal friction point in clinical software deployment. The pressure will be real and persistent.
**Impact:** Medium — Collapsing consent types is a RUTH veto-level invariant. Any implementation that simplifies consent at the cost of granularity violates LGPD requirements and triggers a hard stop. The risk is not that we comply — we will — but that the consent friction delays pilot deployments and creates relationship tension with hospital partners.
**Risk Level:** Medium
**Mitigation:**
- PAUL designs the consent flow for maximum cognitive ease while maintaining full granularity. The three consent types can be presented in a single session with clear plain-language explanations and progressive disclosure — the key requirement is individual toggleability and revocability, not that they must be on separate screens.
- Prepare a "LGPD Compliance Briefing" document for hospital legal and ops teams explaining why granular consent is required and what the liability protection it provides them (hospitals benefit from clear consent documentation too — it protects them against patient complaints).
- VICTOR trains the sales team to pre-emptively address consent architecture in the pilot negotiation, framing it as a feature ("our consent architecture protects your hospital from ANPD risk") rather than a burden.
**Owner:** PAUL (UX design), RUTH (legal framing), VICTOR (sales enablement)
**Status:** Open — Consent UX design due Week 4

---

**RISK-011**
**Category:** Technical / Quality
**Description:** Simulation output variance exceeds QUINN's ±15% determinism threshold under production conditions — caused by LLM non-determinism (temperature > 0), agent interaction order randomness, or infrastructure variability (GPU clock throttling). Clinicians see materially different predictions for identical inputs on different days.
**Likelihood:** Medium — LLM inference is inherently stochastic. At scale (N=1,000 agents), variance compounds. Achieving ±15% determinism with temperature > 0 may require architectural controls that add latency.
**Impact:** Medium — Clinicians who observe inconsistent predictions lose trust rapidly. A hospital ED chief who sees "120 expected P2 patients at 18:00" one day and "40" the next — with no change in inputs — will stop using the tool.
**Risk Level:** Medium
**Mitigation:**
- Set LLM inference temperature to 0.0 for agent decision logic calls. Reserve temperature > 0 only for report narrative generation (where some variation is acceptable).
- Implement per-simulation random seed control: each simulation run is initialized with a deterministic seed stored in the AuditLog. For "re-run this prediction" scenarios, the same seed produces identical results.
- QUINN's determinism test (Category 1) must pass before any simulation code merges. The ±15% threshold applies to predicted count distributions, not individual agent decisions.
- Run simulation output comparisons against historical triage data during pilot. If MAPE > 25% after 30 days, trigger a simulation calibration review before expanding to additional hospital tenants.
**Owner:** QUINN (test enforcement), ARCHIE (temperature and seed control)
**Status:** Open — Determinism gate in CI from first simulation code commit

---

**RISK-012**
**Category:** Strategic
**Description:** The MiroFish/OASIS approach to swarm simulation relies on LLM calls for agent reasoning. As the LLM market evolves rapidly (new models, new capabilities, new pricing), our simulation quality and cost profile may shift significantly within 12 months — potentially in our favor (cheaper, better models) but also potentially creating instability (model behavior changes between versions break clinical validation).
**Likelihood:** Medium — The LLM market is evolving at 6-month cycles. A model version change could alter agent behavioral logic in ways that invalidate our historical validation data and require re-validation.
**Impact:** Medium — Model version drift that breaks clinical validation requires a re-validation study before commercial deployment can continue. This introduces delays and costs that are hard to predict.
**Risk Level:** Medium
**Mitigation:**
- Pin simulation LLM to a specific model version (e.g., Llama 3.3-70B-Instruct at a specific quantization checkpoint). Do not allow automatic model updates in production.
- Define a formal model update protocol: any model version change requires ELENA to approve a re-validation study, QUINN to run the full test suite against new model, and ARCHIE to document the change in the AuditLog.
- Store model version identifier in every SimulationRun AuditLog record. This ensures every historical prediction is traceable to the exact model that produced it.
- ARCHIE evaluates lighter, purpose-built behavioral models for agent decision logic (rather than general-purpose LLMs) as a medium-term architecture option. A 7B model fine-tuned for population health behavioral simulation may be more stable, cheaper, and clinically more appropriate than a 70B general model.
**Owner:** ARCHIE (model versioning), ELENA (re-validation protocol), QUINN (test coverage)
**Status:** Open — Model pinning policy due before pilot launch

---

**RISK-013**
**Category:** Reputational
**Description:** A simulation prediction that is materially wrong during the pilot phase — for example, TLP predicts 30 expected P1 arrivals and the ED actually receives 90 — generates negative clinical word-of-mouth that propagates through Brazil's medical director network before we have validation data to contextualize the error.
**Likelihood:** Low — During the 90-day validation-only period (before any clinical workflow integration), predictions are advisory and should not influence staffing decisions. However, if a medical director is enthusiastic and acts on an early prediction without waiting for validation, this scenario is possible.
**Impact:** High — Clinical reputation damage in a small, relationship-driven market (Brazil's major hospital network is a tight community of approximately 200 decision-makers) can be near-permanent. One viral "the AI said 30 and we got 90" story circulates at a medical congress and poisons the well for 18 months.
**Risk Level:** Medium
**Mitigation:**
- Pilot agreement language explicitly states: "TLP predictions are research-phase outputs for validation purposes only and should not be used as the basis for staffing, resource allocation, or clinical decisions during the pilot period." RUTH and VICTOR co-author this language.
- Physical UI affordance: during the pilot validation period, all TLP outputs include a prominent amber banner: "PILOT VALIDATION MODE — Do not use for operational decisions." This banner is removed only after ELENA approves validation results.
- Brief hospital medical directors directly (VICTOR + ELENA joint meeting) on appropriate interpretation of pilot-phase predictions before the pilot goes live. Set explicit expectations: early predictions will have wider error bands as the model calibrates to this hospital's population.
- Establish a "prediction post-mortem" process: every week of the pilot, ELENA reviews the previous week's predictions against actual outcomes. If a major miss occurs, we contact the medical director proactively with context before they surface it independently.
**Owner:** VICTOR (relationship management), ELENA (prediction monitoring), RUTH (contract language)
**Status:** Open — Pilot agreement language due Week 1

---

**RISK-014**
**Category:** Financial / Operational
**Description:** Self-hosted GPU infrastructure suffers an unplanned outage during hospital pilot operations, causing simulation unavailability. In a clinical context, a dashboard that intermittently fails has disproportionate trust damage relative to the actual downtime.
**Likelihood:** Low — Self-hosted GPU infrastructure has higher maintenance burden than managed cloud services, especially for teams without dedicated MLOps experience.
**Impact:** Medium — Downtime during a critical pilot period (e.g., the first week a medical director is actively monitoring the TLP widget) can permanently damage the pilot relationship and delay conversion.
**Risk Level:** Low
**Mitigation:**
- Design the CSL as an async, non-blocking service. The CDSS clinical dashboard functions fully without the simulation layer — TLP/CDRM/DAS widgets gracefully degrade to "Simulation unavailable — last updated [timestamp]" rather than causing any clinical function failure.
- Implement health monitoring and alerting on the simulation service (standard uptime monitoring — PagerDuty or equivalent). ARCHIE defines an SLA of 99.5% availability for simulation service during pilot operating hours (6am–10pm São Paulo time).
- During cloud-first phase (pre-10 customers), use managed cloud GPU instances with auto-restart capabilities. ARCHIE evaluates whether AWS SageMaker or Azure ML managed inference endpoints provide better availability guarantees than raw EC2 GPU instances.
**Owner:** ARCHIE (infrastructure reliability), CYRUS (monitoring)
**Status:** Open — Graceful degradation design due Week 3

---

### LOW RISKS

---

**RISK-015**
**Category:** Legal
**Description:** OASIS framework's MIT license is incompatible with our commercial deployment model, or our fork creates an inadvertent open-source obligation that exposes proprietary clinical logic.
**Likelihood:** Low — MIT license is highly permissive and explicitly allows commercial use and private forking without open-source obligation.
**Impact:** Low — MIT license review is straightforward. No GPL copyleft contamination risk in the OASIS dependency chain.
**Risk Level:** Low
**Mitigation:** RUTH completes OASIS license review in Week 1. Confirm dependency chain is free of GPL/LGPL components that could trigger copyleft obligations on our clinical logic layer. Document in legal file.
**Owner:** RUTH
**Status:** Open — Due Week 1

---

**RISK-016**
**Category:** Operational
**Description:** QUINN's five-category test suite for simulation validation is too computationally expensive to run in standard CI, causing CI pipeline times to exceed developer tolerance (>15 minutes per PR) and leading to test skipping behavior.
**Likelihood:** Low — Simulation tests with N=100 agents (QUINN's CI-optimized population) should complete in reasonable time. However, chi-squared population fidelity tests and re-identification risk tests may be slower than expected.
**Impact:** Low — Slow CI leads to developer friction and test skipping culture, which is a quality regression over time. Not an immediate risk but a compounding one.
**Risk Level:** Low
**Mitigation:** QUINN designs a tiered test execution model: fast unit tests (N=10 agents, schema validation only, <2 minutes) run on every PR; full five-category suite (N=100 agents, <10 minutes) runs on merge to main; full production-scale suite (N=1,000 agents) runs nightly. ARCHIE provisions a dedicated CI runner with GPU access for the nightly suite.
**Owner:** QUINN (test design), ARCHIE (CI infrastructure)
**Status:** Open — Test tiering design due Week 3

---

## RISK HEATMAP SUMMARY

| Risk ID | Category | Level | Owner | Due Date |
|---------|----------|-------|-------|----------|
| RISK-001 | Compliance | **Critical** | RUTH + ARCHIE + CYRUS | March 24, 2026 |
| RISK-002 | Compliance / Strategic | **Critical** | RUTH + VICTOR + ELENA | Week 2 (engage counsel) |
| RISK-003 | Security | **Critical** | CYRUS + ARCHIE + QUINN | Before pilot launch |
| RISK-004 | Operational / Technical | **High** | GORDON + ARCHIE | Week 2 benchmark |
| RISK-005 | Strategic / Competitive | **High** | VICTOR + RUTH + ELENA | April 16, 2026 (LOI) |
| RISK-006 | Operational / Technical | **High** | ARCHIE + QUINN | March 24, 2026 |
| RISK-007 | Financial | **High** | GORDON + VICTOR | Week 2 (pricing decision) |
| RISK-008 | Security | **High** | CYRUS + ARCHIE + QUINN | Before pilot launch |
| RISK-009 | Operational | **Medium** | PAUL + ELENA | Week 1 (research sprint) |
| RISK-010 | Compliance | **Medium** | PAUL + RUTH + VICTOR | Week 4 |
| RISK-011 | Technical / Quality | **Medium** | QUINN + ARCHIE | From first simulation commit |
| RISK-012 | Strategic | **Medium** | ARCHIE + ELENA + QUINN | Before pilot launch |
| RISK-013 | Reputational | **Medium** | VICTOR + ELENA + RUTH | Week 1 (contract language) |
| RISK-014 | Financial / Operational | **Low** | ARCHIE + CYRUS | Week 3 |
| RISK-015 | Legal | **Low** | RUTH | March 24, 2026 |
| RISK-016 | Operational | **Low** | QUINN + ARCHIE | Week 3 |

---

## IMMEDIATE ACTION ITEMS (Next 7 Days)

| Priority | Action | Owner | Due |
|----------|--------|-------|-----|
| 1 | Brazilian cloud GPU capacity audit (AWS/Azure/GCP São Paulo) | RUTH + ARCHIE | March 24 |
| 2 | Engage external ANVISA SaMD regulatory counsel | RUTH | March 24 |
| 3 | OASIS framework technical due diligence | ARCHIE | March 24 |
| 4 | OASIS license + dependency chain review | RUTH | March 24 |
| 5 | OASIS default LLM routing audit (confirm no Alibaba cloud calls) | CYRUS | March 24 |
| 6 | Pilot agreement template with validation-only language | RUTH + VICTOR | March 21 |
| 7 | User trust research sprint kickoff | PAUL | March 18 |
| 8 | Sign first pilot hospital LOI | VICTOR | April 16 |

---

## REVIEW CADENCE

- **Critical risks:** Reviewed weekly at ARCHIE-led architecture sync. Any Critical risk that is not mitigated within 2 weeks of due date triggers an emergency board session.
- **High risks:** Reviewed bi-weekly. GORDON monitors RISK-007 financial exposure against runway model in real time.
- **Medium risks:** Reviewed monthly at standard board check-in.
- **Low risks:** Reviewed quarterly.
- **Risk register owner:** ARCHIE (orchestrator). Any persona may escalate a new risk at any time using the standard veto block format for Critical/High risks.

---

*Risk Register version 1.0 — March 17, 2026*
*Next scheduled review: March 24, 2026 (Critical risk owners)*
*Classification: Board Eyes Only*
