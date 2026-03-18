# RISK-002: ANVISA SaMD Classification Analysis
## Cortex Swarm Layer (CSL) — Population Health Simulation Engine

**Document Date:** March 17, 2026
**Classification:** Confidential – Regulatory Affairs
**Version:** 1.0

---

## Executive Summary

### Preliminary Classification Recommendation

| Product Surface | Preliminary Classification | Confidence | Regulatory Pathway | Timeline (Months) | Cost (USD) |
|---|---|---|---|---|---|
| **TLP (Triage Load Predictor)** | Class I / Unregulated | High | No registration required | 0–3* | $0–10K* |
| **CDRM (Cohort Deterioration Risk Map)** | Class II (likely) | Medium | Notification | 2–6 | $1K–5K |
| **DAS (Drug Adherence Simulation)** | Class II–III (risk) | Medium | Registration / Notification | 4–12 | $4K–20K |

**Legend:** *TLP may require initial clarification letter from ANVISA (3 months, ~$10K in consultant fees) if ambiguous; cost only if classification challenge.

### Key Findings

1. **ANVISA RDC 657/2022 applies Class I–IV framework** identical to international standards, with no explicit population analytics exemption.

2. **Individual patient tools trigger SaMD classification; population-level aggregates may not**, though ANVISA guidance is sparse on this distinction.

3. **TLP (population-level ED inflow prediction):** Likely exempt if framed as informational analytics without clinical recommendation to individual patients. **No individual patient identifier + no treatment/diagnosis intent = non-SaMD**. Risk: Class I if ANVISA disputes "intended use" framing.

4. **CDRM (n≥20 cohort risk visualization):** Likely Class II if cohort-level, but **migrates to Class III if intended for individual clinician referral**. Minimum cohort threshold (n=20) strengthens non-SaMD argument but is not explicit in ANVISA guidance.

5. **DAS (pharma adherence simulation):** **Class II–III depending on claims**. If presented as research/outcomes modeling for pharma contracts, Class II (notification). If positioned as treatment/compliance guidance to clinicians, Class III (registration). **High risk if used by health systems for patient intervention.**

6. **International precedent (FDA, EU MDR, Health Canada):** All frameworks converge: population aggregates ≤ individual patient analytics; prediction/prognosis triggers SaMD; no individual patient targeting = lower risk. **No comparable tool has precedent for population-only aggregate at scale.**

---

## Part 1: ANVISA RDC 657/2022 Classification Framework

### 1.1 Regulatory Authority & Scope

**RDC 657/2022** (published March 30, 2022; effective July 1, 2022) — ANVISA's foundational SaMD regulation.

**Definition of SaMD (per ANVISA):**
> "Software intended to be used for one or more medical purposes that perform these purposes without being part of a hardware medical device."

**Medical Purposes** (per RDC 657 & 751):
- Prevention
- Diagnosis
- Treatment
- Rehabilitation
- Contraception
- Prognostication
- Risk prediction (new under RDC 657)

**Key distinction:** If software "intends" to perform any of these purposes, it is SaMD and subject to registration or notification, even if used only for population-level aggregation.

### 1.2 Risk Classification Rules (RDC 751/2022, Annex I, Rule 11)

ANVISA adopted the IMDRF (International Medical Device Regulators Forum) classification algorithm for SaMD. Risk class determined by **two factors:**

1. **Healthcare situation criticality** (serious, critical, non-serious)
2. **Intended function** (diagnosis, treatment, risk prediction, monitoring, etc.)

#### Risk Category Matrix

| Criticality | Diagnosis | Treatment | Monitoring | Risk Prediction | Information Only |
|---|---|---|---|---|---|
| **Critical** | IV | IV | III | III | I–II |
| **Serious** | III | III | II | II | I–II |
| **Non-serious** | II | II | I | I | I |

**Application to CSL:**
- **TLP:** Non-serious (ED flow prediction) + Information Only → **Class I** (if population-level only)
- **CDRM:** Serious (chronic disease deterioration) + Risk Prediction (cohort) → **Class I–II** (cohort) or **Class III** (if escalated to individual referral)
- **DAS:** Serious (medication adherence) + Risk Prediction/Treatment Support → **Class II–III** (depends on claims and user profile)

### 1.3 Notification vs. Registration Pathways (RDC 751/2022)

**Class I & II:** Notification pathway
- Submit documentation to ANVISA
- Processing time: 30–45 days (nominal); 2–6 months (typical with queries)
- ANVISA fee: BRL 1,406 (~USD 260)
- No pre-market approval required; product enters market after notification

**Class III & IV:** Registration pathway
- Full pre-market review by ANVISA
- Processing time: 4–12 months
- ANVISA fee: BRL 8,510 (~USD 1,584)
- Requires BGMP (Brazilian Good Manufacturing Practice) certification if manufacturer outside Brazil: BRL 72,805 (~USD 13,552)
- Premarket approval mandatory

### 1.4 Population-Level vs. Individual Patient: ANVISA's Ambiguity

**Critical gap in ANVISA guidance:**
RDC 657/2022 does NOT explicitly state that population-level aggregates are exempt from SaMD classification.

**IMDRF rationale (adopted by ANVISA):**
Software that "directs or recommends" treatment to individual patients is higher-risk than software providing population-level information. However, ANVISA has not published specific guidance on population floor thresholds (e.g., n≥20 → not SaMD).

**FDA precedent (relevant for ANVISA's alignment considerations):**
- Population health analytics tools that do NOT acquire, process, or output individual patient recommendations are often exempt from medical device regulation.
- Tools that aggregate and visualize population trends without driving individual-patient decisions are lower-risk.

**ANVISA's likely interpretation:**
1. If software output remains at population level (e.g., "ED inflow will increase 15% tomorrow, cohort risk rank order") → **Class I / potentially exempt**.
2. If output is indexed to individual patients (e.g., "Patient X has high sepsis risk, recommend urgent triage") → **Class II–IV** depending on the clinical situation.

---

## Part 2: Surface-by-Surface Classification Analysis

### 2.1 TLP (Triage Load Predictor)

**Product Definition:**
- Predicts ED patient inflow by severity tier, 72-hour rolling window
- Population-level output only (no individual patient IDs)
- Intended use: Staffing, resource allocation, capacity planning

**Classification Assessment:**

| Criterion | Assessment | Impact |
|---|---|---|
| **Intended Use** | Resource planning, not diagnosis/treatment of individual | ✅ Lower risk |
| **Individual Patient Output** | No patient identifiers; output is facility-level aggregate | ✅ Lower risk |
| **Clinical Criticality** | Non-serious (informational) | ✅ Lower risk |
| **Healthcare Situation** | ED operations, not patient diagnosis | ✅ Lower risk |
| **Regulatory Precedent** | FDA classifies similar ED prediction tools as Class I–II | ✅ Supports low risk |

**Preliminary Classification: Class I (Informational Analytics)**

**Rationale:**
- No individual patient targeting or treatment/diagnosis recommendation
- Output is population aggregate (facility-level)
- Intended user: Operations/admin staff, not clinicians
- Non-serious clinical domain (resource planning vs. patient safety)
- FDA precedent: hospital capacity prediction tools are typically unregulated or Class I

**Design Strengths for Low Classification:**
1. Output explicitly labeled as "facility aggregate" (no patient-level drill-down)
2. 72-hour rolling window reduces direct treatment impact
3. Confidence intervals displayed; no deterministic triage assignment
4. User manual explicitly disclaims individual patient use
5. No integration with EHR; output to operations dashboard only

**Risk Factors:**
- If ANVISA determines "prediction for hospital resource allocation" = medical intervention → Class II
- If model includes individual patient data in internal calculations (even if output aggregated) → potential Class II escalation

**Recommendation:**
- **Submit optional pre-market consultation letter to ANVISA** (Consulta Prévia) to clarify non-SaMD or Class I status before full launch
- Cost: ~$5K–10K consulting + ANVISA processing (3–4 weeks)
- Outcome confidence: 85% (Class I confirmed) to 95% (exempt as non-SaMD)

---

### 2.2 CDRM (Cohort Deterioration Risk Map)

**Product Definition:**
- Visualizes risk clusters for chronic disease populations
- Minimum cohort n=20 (prevents individual-level interpretation)
- Intended use: Identify high-risk cohorts for preventive intervention
- Output: Risk heat maps, cohort-level recommendations (not individual patient directives)

**Classification Assessment:**

| Criterion | Assessment | Impact |
|---|---|---|
| **Intended Use** | Risk prediction for serious chronic diseases | ⚠️ Medium risk |
| **Individual Patient Output** | Cohort-level only; n≥20 threshold prevents individual re-identification | ✅ Mitigates risk |
| **Clinical Criticality** | Serious (chronic disease deterioration) | ⚠️ Higher risk |
| **Aggregation Floor** | n=20 provides statistical protection | ✅ Protective |
| **User Type** | Care managers, population health teams (not bedside clinicians) | ✅ Lower risk |
| **Regulatory Precedent** | Limited public precedent for cohort-only tools | ⚠️ Uncertainty |

**Preliminary Classification: Class II (likely) → Class I (if claims carefully framed)**

**Rationale:**
- Serious healthcare domain (chronic disease) triggers heightened scrutiny
- Risk prediction function = Class II per IMDRF matrix for serious conditions
- Cohort-level aggregation (n≥20) reduces individual-patient targeting risk
- User type (population health, not bedside) mitigates intervention risk
- No individual patient recommendation logic

**Conditional Escalation to Class III:**
- **If ANVISA interprets CDRM as "directing treatment to individual patients within flagged cohorts"** → Class III
- **If claims include language like "identifies patients requiring intervention"** → Class III
- **If integrated with individual patient workflows (e.g., automated referral)** → Class III–IV

**Design Strengths for Class I–II Status:**
1. **Cohort-only output:** UI displays aggregate risk distribution, not patient lists
2. **n≥20 floor:** Statistically prevents de-identification of individuals; displayed prominently in UI
3. **Disclaimer language:** "This tool is for population trend analysis and cohort identification. Clinicians must independently assess individual patients."
4. **No patient-level drill-down:** API does not expose individual scores
5. **Aggregation across domains:** Risk clusters computed from synthetic cohorts, not enumerated patient sets

**Risk Factors:**
- ANVISA may classify as Class III if it determines that identifying "high-risk cohorts" implicitly directs care to patients within those cohorts
- If marketing materials claim "identifies patients needing intervention" → escalation to Class III
- If integration with EHR enables automatic patient filtering → Class III–IV

**Recommendation:**
- **Submit Consulta Prévia to ANVISA** with explicit disclaimer strategy and UI mockups showing cohort-only output
- Cost: $8K–12K consulting + ANVISA response
- **Design contingency:** If ANVISA signals Class II, prepare notification dossier (simplified vs. registration)
- **Design contingency:** If ANVISA signals Class III, prepare full registration pathway (12–18 month timeline)

**Outcome confidence:** 60% (Class II or exempt), 35% (Class III risk), 5% (higher risk if misinterpreted)

---

### 2.3 DAS (Drug Adherence Simulation)

**Product Definition:**
- Simulates medication adherence curves for patient populations
- Intended use: Pharma outcomes-based contracting; health system intervention planning
- Output: Population-level adherence curves, intervention efficacy predictions
- Potential users: Pharma companies, health systems, payers

**Classification Assessment:**

| Criterion | Assessment | Impact |
|---|---|---|
| **Intended Use** | Prediction of treatment adherence + outcomes optimization | ⚠️ Higher risk |
| **Individual Patient Output** | Population curves, but easily translated to cohort targeting | ⚠️ Higher risk |
| **Clinical Criticality** | Serious (medication adherence for chronic disease) | ⚠️ Higher risk |
| **User Type** | Pharma (non-clinical) or health systems (clinical use) | ⚠️ Risk varies by context |
| **Treatment Direction** | If used by clinicians to direct intervention, Class III | ⚠️ Critical uncertainty |
| **Regulatory Precedent** | Limited (no well-known SaMD precedent for adherence simulation) | ⚠️ Uncertainty |

**Preliminary Classification: Class II–III (high uncertainty)**

**Rationale:**
- **Pharma use case (Class II likely):**
  - Intended for contract modeling and population health outcomes
  - Not directing individual patient treatment
  - Non-clinical end user (pharma outcomes analysts)
  - Similar to other health economics modeling tools
  - Claim framing: "Research and analytics tool for outcomes prediction"
  - ANVISA pathway: Notification (Class II)

- **Health system use case (Class III risk):**
  - If positioned as "identifies patients at risk of non-adherence" → triggers intervention pathway
  - Used by clinicians to drive adherence interventions (treatment)
  - Individual patient targeting possible
  - ANVISA pathway: Registration (Class III)

**Design Strengths for Class II Status (Pharma use case):**
1. **Population-only output:** Simulation curves, aggregate statistics, no patient lists
2. **Research framing:** "Modeling tool for outcomes-based contracting and research"
3. **No individual targeting:** Model does not enumerate or score individual patients
4. **Pharma user type:** Non-clinical; used for contract negotiation, not patient care
5. **Disclaimer:** "This tool is for research and health economic modeling. Clinical use requires independent medical judgment."

**Risk Factors for Escalation to Class III:**
- **Health system adoption:** If marketed to hospital systems and used to trigger adherence interventions → Class III
- **Individual patient claims:** If claims language includes "identify non-adherent patients" → Class III
- **EHR integration:** If connected to patient workflows for automated intervention → Class IV
- **Personalized predictions:** If model outputs patient-specific adherence curves → Class III

**Regulatory Pathway by Use Case:**

#### Use Case A: Pharma (Outcomes Modeling)
- **Claim:** "Simulates population adherence patterns for outcomes-based contract modeling and research"
- **User:** Pharma company, health economics team
- **Classification:** Class II (serious condition + risk prediction, but non-clinical user & no individual targeting)
- **Pathway:** Notification
- **Timeline:** 2–6 months
- **Cost:** $3K–6K (notification dossier) + ANVISA fees ($260)

#### Use Case B: Health System (Intervention Tool)
- **Claim:** "Identifies high-risk non-adherence cohorts for clinical intervention"
- **User:** Care managers, clinical teams
- **Classification:** Class III (serious condition + treatment/intervention)
- **Pathway:** Registration
- **Timeline:** 6–12 months
- **Cost:** $8K–15K (registration dossier + BGMP if manufacturer outside Brazil) + ANVISA fees ($1,584–13,552)

**Recommendation:**
- **Segregate DAS into two product configurations:**
  1. **DAS-Research:** Pharma/research use case (Notification, Class II, faster pathway)
  2. **DAS-Clinical:** Health system use case (Registration, Class III, slower pathway)
- **Or: Adopt pharma-only positioning** and explicitly restrict health system use in Terms of Service (accept lower market penetration for faster compliance)
- **Submit Consulta Prévia** focusing on intended use differentiation (pharma vs. clinical)
- Cost: $10K–15K consulting

**Outcome confidence:** 50% (Class II if pharma use only), 40% (Class III if health system adoption), 10% (higher risk if clinical targeting becomes primary use case)

---

## Part 3: International Precedent Analysis

### 3.1 FDA (United States)

**SaMD Classification Framework:**
- Four-class risk hierarchy (I–IV)
- Determined by healthcare situation (serious, critical, non-serious) + intended function (diagnosis, treatment, monitoring, risk prediction, info-only)

**Relevant FDA Precedents:**

| Product | Risk Class | Pathway | Intended Use | Outcome |
|---|---|---|---|---|
| **Lunit INSIGHT CXR Triage** (2021) | Class II | 510(k) | Detect emergent findings in chest X-rays; flag for radiologist review | Cleared for triage; population-level deployment |
| **Prenosis Sepsis ImmunoScore** (April 2024) | Class II | De Novo | Predict sepsis risk from labs/vitals/demographics; intended for risk stratification | De Novo grant (new classification pathway) |
| **Hospital ED Capacity Prediction** (representative) | Class I | Exempt or de minimis | Operational resource planning; no patient-level output | Not formally regulated |

**Key FDA Lessons for CSL:**
1. **Triage/prediction tools = Class II (typically)** if outcome is population aggregate; if individual patient decision-support, Class III–IV
2. **De Novo pathway available** for novel SaMD if 510(k) predicate unavailable
3. **Population-level informational tools trend toward Class I–II** provided no individual patient targeting
4. **Clinical claims drive risk:** Avoid language like "diagnoses" or "recommends treatment for patient X"

**FDA's Population Health Position:**
- Population analytics tools that do NOT drive individual patient decisions are lower-risk
- Tools providing aggregate trends, risk distributions without individual targeting = Class I or informational (exempt)
- Transition from population output to individual patient output = immediate escalation to Class II–III

**Applicability to ANVISA:**
ANVISA has not published explicit population analytics guidance, but FDA precedent suggests that **TLP (population-level ED inflow) would likely be Class I or exempt**, while **CDRM and DAS (risk prediction with cohort targeting) would trend toward Class II**, with escalation to Class III if individual patient targeting becomes the primary use case.

### 3.2 EU MDR (Europe)

**SaMD Classification Framework:**
- Four-class risk hierarchy (I, IIa, IIb, III)
- Key rule: **Annex VIII, Rule 11** (standalone software can fall into any risk class depending on intended use)
- **Notable: MDR explicitly includes "prediction" and "prognosis" as medical purposes** (expanded from prior directive)

**Relevant EU MDR Precedents:**

| Product Category | Risk Class | Examples |
|---|---|---|
| **Health risk calculator (population-level)** | I | Diabetes risk calculator for patient self-assessment; output remains with patient |
| **Clinical decision support (non-diagnostic)** | IIa–IIb | Suggests treatment options; does not diagnose |
| **AI/ML risk prediction (individual patient)** | II–III | Identifies individual at risk; drives clinical referral |

**Key EU MDR Lessons for CSL:**
1. **Population-level tools = Class I–IIa** if output remains at population level and not driven to individual patients
2. **Distinction: "inform" vs. "direct" clinical decisions** — informing is lower-risk than directing
3. **Population aggregates with minimum thresholds (e.g., n≥20) are recognized as protective** against individual targeting
4. **No explicit population floor threshold**, but regulatory practice suggests n≥20–50 provides statistical protection

**MDCG 2019-11 Guidance:**
EU's Medical Device Coordination Group issued guidance clarifying that software providing "general information" or "population-level statistics" is not a medical device. However, software that "drives or recommends" treatment to individual patients is.

**Applicability to ANVISA:**
EU MDR's recognition of population-level tools as lower-risk is most directly applicable to **CDRM**. The n≥20 threshold and cohort-only output design align with EU MDR precedent, suggesting **Class I–II** classification in EU context. ANVISA has not published equivalent guidance, but regulatory alignment suggests similar risk assessment.

### 3.3 Health Canada

**SaMD Classification Framework:**
- Four-class risk hierarchy (I–IV)
- Risk determined by healthcare condition (critical, serious, non-serious) + intended function (diagnosis, treatment, monitoring, etc.)
- **Notable: Guidance explicitly addresses "predictive" software** and risk assessment tools

**Relevant Health Canada Precedents:**

| Product | Risk Class | Intended Use | Outcome |
|---|---|---|---|
| **Diabetes risk calculator** | Class I | Population-level risk prediction; patient self-assessment | Not regulated or Class I |
| **Hospital readmission prediction** (population) | Class I–II | Identifies high-risk cohorts for intervention planning | Class I–II depending on claims |

**Health Canada Classification Examples (Official Guidance):**
- Software analyzing health information to predict diabetes risk (population-level) = **Class I** if output remains with patient; **Class II** if shared with healthcare provider for decision-making
- Software predicting hospital readmission risk for population cohorts = **Class I–II** depending on user type and claims

**Key Health Canada Lessons for CSL:**
1. **Population-level risk prediction = Class I–II** (lower end if no clinician involvement)
2. **User type matters:** Non-clinical users (admin, operations) → lower risk than clinicians
3. **Output routing matters:** If output remains aggregated, lower risk than if disaggregated to individual patients

**Applicability to ANVISA:**
Health Canada's guidance on population-level predictive tools is most relevant to **TLP and CDRM**. Both would likely be classified as **Class I–II** in Canada, with TLP trending lower (operational use) and CDRM trending higher (clinical user, serious disease). This precedent supports **ANVISA likely classifying TLP as Class I and CDRM as Class II**, though no formal guidance exists.

---

## Part 4: Design Choices to Strengthen Non-SaMD or Class I Classification

### 4.1 General Principles

1. **Population aggregation floor:** Display only aggregated data; prevent individual patient de-identification
2. **Disclaimer clarity:** Explicit language that tool is for informational/planning purposes, not clinical guidance
3. **User access control:** Restrict to non-clinical roles (operations, administration) if lower classification intended
4. **Output routing:** Keep output at population level; avoid individual patient targeting
5. **Claims management:** Carefully frame marketing/documentation to align with intended classification

### 4.2 TLP-Specific Design Recommendations

**Strengthen Class I / Informational Classification:**

| Design Element | Implementation | Impact |
|---|---|---|
| **Output granularity** | Display facility-level totals; no patient-level drill-down; no patient IDs in any downstream data | Prevents individual targeting |
| **Temporal window** | 72-hour rolling forecast; historical trends shown but not individual patient history | Reduced clinical immediacy |
| **Confidence intervals** | Show prediction ranges (e.g., "1,200–1,500 arrivals, 95% CI") rather than point estimates | Reduces false certainty |
| **User role** | Restrict access to ED operations staff, bed managers, not clinical triage personnel | Reduces clinical decision impact |
| **Documentation** | Explicitly state: "This tool predicts facility inflow for capacity planning. It does NOT assess individual patient risk or guide triage decisions." | Blocks Class II escalation |
| **API design** | No endpoint returns patient identifiers or individual-level predictions | Prevents misuse |
| **Dashboard label** | "ED Resource Forecast — Operational Use Only" | Clearly signals informational intent |

### 4.3 CDRM-Specific Design Recommendations

**Strengthen Class I / Class II (Population-Only) Classification:**

| Design Element | Implementation | Impact |
|---|---|---|
| **Cohort floor enforcement** | Minimum n=20 per displayed cluster; aggregation algorithm prevents cell sizes <20 from display | Prevents individual de-identification |
| **UI design** | Risk heat maps show cluster-level statistics only; no patient lists, no drill-down to individual scores | Cohort-level only |
| **Cohort labeling** | Display "n=47 patients, mean risk score 0.68, 95% CI [0.61–0.75]" — not individual names or IDs | Aggregation clarity |
| **Output format** | Export only population-level CSV (cluster statistics); no individual-level data export | Prevents downstream misuse |
| **Disclaimer** | "This tool visualizes population risk trends. Individual patient assessment requires independent clinical evaluation. This tool does not replace clinical judgment." | Blocks Class III escalation |
| **Integration restriction** | Do NOT integrate with EHR or patient workflow; output remains in separate analytics platform | Prevents clinical workflow embedding |
| **User type** | Primary users: population health coordinators, care managers (not bedside clinicians) | Lower clinical immediacy |
| **Audit logging** | Log all data access; restrict exports to approved roles | Compliance & governance |

### 4.4 DAS-Specific Design Recommendations

**Strengthen Class II (Research/Modeling) Classification if Pharma Use Case Chosen:**

| Design Element | Implementation | Impact |
|---|---|---|
| **Synthetic cohorts** | Model trained on de-identified population data; output does not reference individual patients | No individual targeting |
| **Output type** | Population adherence curves, intervention efficacy distributions, not patient-specific predictions | Population-only |
| **User type** | Pharma outcomes analysts, health economists (non-clinical) | Non-clinical user |
| **Claim framing** | "Simulates population adherence patterns for health economic outcomes modeling and research" — NOT "identifies non-adherent patients" | Claims management |
| **Documentation** | Emphasize research and health economics applications; avoid clinical decision-support language | Claim alignment |
| **No EHR integration** | Model output stays in analytics platform; no feed into patient workflows | Prevents clinical embedding |
| **Versioning & change management** | Document all algorithm updates; maintain clinical rationale for changes in technical documentation | Compliance |

**If Health System Use Case Adopted (Prepare for Class III Registration):**

| Design Element | Implementation | Impact |
|---|---|---|
| **Cohort targeting** | Identify high-risk non-adherence cohorts for intervention; provide clinical decision support | Anticipate Class III |
| **Disclaimer language** | "This tool informs clinical intervention planning. Clinical teams must independently assess adherence risk and appropriateness of intervention." | Mitigates liability |
| **Audit trail** | Log all predictions, recommendations, and clinical actions taken; support for regulatory review | Audit & compliance |
| **Algorithm transparency** | Provide explainability for model recommendations; support clinical understanding | Transparency & trust |

---

## Part 5: Contingency Plan If CDRM or DAS Classified Class II or Higher

### 5.1 CDRM Contingency (Class II or III)

**If ANVISA Classification Decision: Class II**

**Immediate Actions (Weeks 1–2):**
- Cease marketing CDRM as "informational only"; pivot to "population analytics for care coordination"
- Prepare notification dossier (Formulário de Notificação) per RDC 751/2022
- Engage clinical consultant to draft technical documentation supporting Class II designation

**Notification Dossier Contents:**
- Product description and intended use
- Risk analysis (IMDRF framework application)
- Clinical/technical documentation supporting classification
- Quality system summary
- Post-market surveillance plan

**Timeline & Costs:**
- Dossier preparation: 4–6 weeks ($5K–8K consulting)
- ANVISA processing: 2–6 months
- Total cost: $6K–10K
- Total timeline: 3–8 months to market

**If ANVISA Classification Decision: Class III**

**Immediate Actions (Weeks 1–2):**
- Trigger full registration pathway
- Engage regulatory affairs firm with ANVISA Class III expertise
- Establish BGMP certification if manufacturer outside Brazil

**Registration Dossier Contents:**
- Comprehensive technical documentation
- Clinical data and evidence supporting intended use
- Risk analysis and mitigation
- Quality assurance summary
- Post-market surveillance plan
- Biocompatibility (if applicable)
- Clinical evaluation report

**Timeline & Costs:**
- Dossier preparation: 2–3 months ($12K–18K consulting)
- ANVISA registration review: 6–12 months
- BGMP certification (if applicable): 2–4 months ($10K–15K)
- Total cost: $25K–50K
- Total timeline: 10–18 months to market

**Market Impact & Mitigation:**
- Delay to market: 8–18 months
- Consider pilot program with early-adopter health system during registration process (under research protocol)
- Maintain separate Class I/II product (TLP) for immediate revenue while CDRM registration pending

---

### 5.2 DAS Contingency (Class II or III)

**If ANVISA Classification Decision: Class II (Pharma Use)**

**Immediate Actions:**
- Confirm pharma-only positioning
- Prepare notification dossier
- Draft Terms of Service explicitly restricting health system clinical use

**Timeline & Costs:**
- Dossier preparation: 4–6 weeks ($5K–8K)
- ANVISA processing: 2–6 months
- Total: 3–8 months

**If ANVISA Classification Decision: Class III (Health System Use)**

**Immediate Actions:**
- Trigger registration pathway
- Engage Class III regulatory expertise
- Establish BGMP if manufacturer outside Brazil
- Plan 12–18 month delay to market

**Timeline & Costs:**
- Dossier preparation: 2–3 months ($15K–20K)
- ANVISA registration: 6–12 months
- BGMP (if applicable): 2–4 months ($10K–15K)
- Total: 10–18 months; $30K–60K

**Market Segmentation Strategy:**
- **Phase 1 (Months 1–12):** Launch DAS-Research (Class II) for pharma use case; generate revenue
- **Phase 2 (Months 12–24):** Complete DAS-Clinical registration (Class III); enter health system market

---

## Part 6: Recommended External Regulatory Counsel Firms

### 6.1 Brazilian SaMD Specialists

**Tier 1 (Large, Multi-Country Practices with Brazil ANVISA Depth)**

| Firm | Specialization | ANVISA Experience | Est. Cost (Consulting) | Notes |
|---|---|---|---|---|
| **Freyr Solutions** | SaMD registration, ANVISA | Extensive Class I–IV experience | $15K–30K per dossier | Founded ~2015; published ANVISA RDC 657 guidance |
| **Global Regulatory Partners (GRP)** | Medical devices, SaMD | Brazil local agent; full lifecycle | $12K–25K per dossier | Chambers-ranked; serves as local ANVISA representative |
| **Emergo by UL** | Medical devices, regulatory affairs | ANVISA Class I–IV | $10K–20K per dossier | Global firm; Brazil office; strong ANVISA relationships |
| **CGM Law (Consultoria Geral)** | Medical devices, healthcare law | ANVISA & SaMD expertise | $15K–28K per dossier | Law firm; good for legal + regulatory combined |

**Tier 2 (Specialized ANVISA Consultancies)**

| Firm | Specialization | Est. Cost | Notes |
|---|---|---|---|
| **Pure Global** | ANVISA classification, IVD | $8K–15K per classification | Classification-focused; good for Consulta Prévia |
| **QServe Group** | Medical device registration Brazil | $10K–18K per registration | Focused on RDC 751/2022 implementations |
| **Biomecânica Brasil** | Medical devices, ANVISA, SaMD | $12K–20K per project | Smaller firm; good for detailed technical work |

### 6.2 Selection Criteria for CSL

**For TLP (Class I/Exempt — Low Urgency):**
- Use **Consulta Prévia** with Pure Global or QServe ($5K–8K) to confirm classification
- No need for major firm

**For CDRM (Class II Risk — Medium Complexity):**
- Engage **Freyr Solutions** or **Global Regulatory Partners** for Consulta Prévia + notification pathway
- Expected investment: $10K–15K for pre-market consultation; $5K–8K additional for notification dossier

**For DAS (Class II–III Risk — Highest Complexity):**
- Engage **CGM Law** (for legal + regulatory advice on pharma vs. health system positioning) or **Freyr Solutions** (if regulatory only)
- Expected investment: $15K–25K for pre-market consultation; $8K–15K for final dossier

**Recommended Primary Engagement:**
1. **Consulta Prévia with Pure Global or Freyr** (Phase 1, $8K–12K) — immediate classification clarity
2. **Engagement with primary firm (Freyr or GRP)** (Phase 2, $20K–40K) — full dossier preparation and ANVISA submission

---

## Part 7: Timeline and Cost Estimates by Classification Pathway

### 7.1 Best-Case Scenario (All Products Class I–II)

| Product | Classification | Pathway | Timeline (Months) | Internal Cost | External Cost | Total |
|---|---|---|---|---|---|
| **TLP** | Class I | Exempt or no registration | 0–1 | $5K | $0 | $5K |
| **CDRM** | Class II | Notification | 3–6 | $10K | $8K | $18K |
| **DAS** | Class II | Notification (Pharma) | 3–6 | $10K | $8K | $18K |
| **TOTAL** | — | — | **6–12 months** | **$25K** | **$16K** | **$41K** |

**Activities:**
- Consulta Prévia for all three products (parallel, 4 weeks)
- Notification dossier prep for CDRM and DAS (parallel, 6 weeks)
- ANVISA processing (sequential, 2–6 months per product)
- Total time to market: 6–12 months; combined cost ~$40K

---

### 7.2 Medium-Risk Scenario (CDRM Class II, DAS Class III)

| Product | Classification | Pathway | Timeline (Months) | Internal Cost | External Cost | Total |
|---|---|---|---|---|---|
| **TLP** | Class I | Exempt | 0–1 | $5K | $0 | $5K |
| **CDRM** | Class II | Notification | 3–6 | $10K | $8K | $18K |
| **DAS** | Class III | Registration | 10–18 | $20K | $18K | $38K |
| **TOTAL** | — | — | **10–18 months** | **$35K** | **$26K** | **$61K** |

**Activities:**
- Consulta Prévia for all three (4 weeks, parallel)
- CDRM notification dossier (6 weeks, ANVISA processing 2–6 months)
- DAS registration dossier (8–10 weeks, ANVISA processing 6–12 months)
- Parallel processing where possible; DAS gates overall timeline
- Total time to market: 10–18 months; combined cost ~$60K

---

### 7.3 Worst-Case Scenario (CDRM Class III, DAS Class III)

| Product | Classification | Pathway | Timeline (Months) | Internal Cost | External Cost | Total |
|---|---|---|---|---|---|
| **TLP** | Class I | Exempt | 0–1 | $5K | $0 | $5K |
| **CDRM** | Class III | Registration | 12–20 | $20K | $20K | $40K |
| **DAS** | Class III | Registration | 12–20 | $20K | $20K | $40K |
| **BGMP** (if mfg outside Brazil) | — | — | 2–4 | $5K | $12K | $17K |
| **TOTAL** | — | — | **12–20 months** | **$50K** | **$52K** | **$102K** |

**Activities:**
- Consulta Prévia for all three (4 weeks)
- CDRM registration dossier (8–10 weeks, ANVISA processing 6–12 months)
- DAS registration dossier (8–10 weeks, ANVISA processing 6–12 months)
- BGMP certification for both (if manufacturer outside Brazil, 2–4 months)
- Parallel processing where possible; both Class III registrations gate timeline
- Total time to market: 12–20 months; combined cost ~$100K

---

### 7.4 Staged Launch Strategy (Recommended to Manage Risk)

**Phase 1: Immediate Launch (Months 1–6)**
- **TLP** (Class I) → No registration; immediate deployment
- **CDRM** (Class II) → Consulta Prévia + notification pathway; deployment in months 4–6
- **Cost Phase 1:** ~$30K (consulting + ANVISA fees)
- **Revenue Phase 1:** TLP + CDRM launched; DAS held pending ANVISA clarity

**Phase 2: DAS Deployment (Months 6–18)**
- **DAS** → Full registration pathway (Class II or III); deployment after ANVISA approval
- **Cost Phase 2:** $15K–25K (dossier prep + ANVISA fees)
- **Revenue Phase 2:** All three products live

**Total Program Cost:** $45K–55K
**Total Timeline:** 18 months to full product lineup; 6 months to initial market

---

## Part 8: Recommendations & Next Steps

### 8.1 Immediate Actions (Weeks 1–4)

1. **Engage regulatory counsel for Consulta Prévia** (recommend: Pure Global or Freyr Solutions)
   - Budget: $8K–12K
   - Deliverable: Written classification recommendation for all three products
   - Timeline: 4 weeks

2. **Prepare product documentation for Consulta Prévia submission**
   - TLP: Operational use case, no patient IDs, population-only output
   - CDRM: Cohort-level aggregation, n≥20 floor, risk visualization (not patient lists)
   - DAS: Pharma use case positioning, population curves, outcomes modeling (not patient targeting)
   - Timeline: 2 weeks

3. **Draft legal disclaimers and Terms of Service** aligned with intended classifications
   - TLP: "Operational tool for facility planning; not for clinical use"
   - CDRM: "Population analytics; not a clinical decision-support tool"
   - DAS: "Health economics research tool; not for clinical patient targeting"

4. **Design UI/UX to enforce classification intent**
   - TLP: No patient IDs; facility-level aggregate only
   - CDRM: Cohort-level heat maps; n≥20 display; no patient drill-down
   - DAS: Population curves only; no individual predictions visible

### 8.2 Phase 1 (Months 1–6): Market Entry for TLP + CDRM

- Submit Consulta Prévia to ANVISA (week 4)
- Receive ANVISA classification guidance (weeks 4–8)
- Prepare notification dossier for CDRM based on ANVISA feedback (weeks 8–14)
- Submit CDRM notification to ANVISA (week 14)
- Launch TLP to market (no registration required if Class I confirmed)
- Receive ANVISA notification approval for CDRM (weeks 14–26)
- Launch CDRM to market (months 4–6)

**Budget Phase 1:** $25K–35K
**Timeline Phase 1:** 6 months to dual-product launch

### 8.3 Phase 2 (Months 6–18): DAS Deployment

- Based on Consulta Prévia feedback (from Phase 1, week 8), determine whether Class II or III registration required
- **If Class II:** Prepare notification dossier (4–6 weeks); submit to ANVISA; receive approval in 2–6 months; deploy months 8–12
- **If Class III:** Prepare registration dossier (8–10 weeks); submit to ANVISA; receive approval in 6–12 months; deploy months 14–18
- Establish BGMP certification (if manufacturer outside Brazil, 2–4 months parallel)

**Budget Phase 2:** $15K–30K (Class II) or $30K–50K (Class III)
**Timeline Phase 2:** 8–12 months to DAS launch

### 8.4 Risk Mitigation Framework

**If ANVISA signals any product ≥ Class III:**
- Immediately establish registration dossier preparation timeline (8–10 weeks)
- Engage BGMP certification process (if applicable) in parallel
- Consider market pivot: launch Class I/II products first; pursue Class III registration in background
- Explore early-adopter research partnership (pilot use under research protocol, not commercial) while registration pending

**If ANVISA disputes population-level framing:**
- Pivot to individual patient disclaimers; document clinical independence requirement
- If CDRM escalates to Class III: accept extended timeline; market to health systems willing to wait
- If DAS escalates to Class III: segment into pharma (Class II, fast) and health system (Class III, slow) tracks

---

## Part 9: References & Source Materials

### ANVISA Regulatory Framework
- [ANVISA RDC 657/2022 (Official English Translation)](https://www.gov.br/anvisa/pt-br/assuntos/produtosparasaude/temas-em-destaque/arquivos/2024/rdc-657-2022-en.pdf)
- [ANVISA Legislation Registry — RDC 657 (Portuguese)](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&tipo=RDC&numeroAto=00000657&seqAto=000&valorAno=2022&orgao=RDC/DC/ANVISA/MS)
- [MedTech Innovate: ANVISA RDC 657/2022 Overview](https://www.medtechinnovate.io/post/anvisa-regulation-of-samd-in-brazil-rdc-657-2022)
- [Freyr Solutions: SaMD Regulation in Brazil](https://www.freyrsolutions.com/blog/resolution-for-regulation-of-software-as-medical-device-samd-in-brazil)
- [CGM Law: ANVISA RDC 657/2022 Analysis](https://cgmlaw.com.br/en/anvisa-resolution-no-657-2022-standard-for-registration-and-notification-of-software-as-a-medical-device/)

### FDA SaMD Classification & Precedents
- [FDA SaMD Center of Excellence](https://www.fda.gov/medical-devices/digital-health-center-excellence/software-medical-device-samd)
- [FDA AI/ML in SaMD Discussion Paper](https://www.fda.gov/files/medical%20devices/published/US-FDA-Artificial-Intelligence-and-Machine-Learning-Discussion-Paper.pdf)
- [IntuitionLabs: FDA SaMD Classification AI/ML Guide](https://intuitionlabs.ai/articles/fda-samd-classification-ai-machine-learning)
- [OpenRegulatory: FDA Risk Classification for SaMD](https://openregulatory.com/articles/fda-risk-classification-for-software-as-a-medical-device-samd)

### EU MDR Classification & Precedents
- [MDCG 2019-11: Guidance on Qualification and Classification of Medical Device Software](https://health.ec.europa.eu/system/files/2020-09/md_mdcg_2019_11_guidance_qualification_classification_software_en_0.pdf)
- [MDCG 2020-1: Guidance on Clinical Evaluation (MDR Medical Device Software)](https://health.ec.europa.eu/system/files/2020-09/md_mdcg_2020_1_guidance_clinic_eva_md_software_en_0.pdf)
- [Mantra Systems: EU MDR SaMD Compliance Guide](https://mantrasystems.com/eu-mdr-compliance/software-as-a-medical-device-samd)

### Health Canada Classification & Precedents
- [Health Canada: SaMD Definition and Classification Guidance](https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/application-information/guidance-documents/software-medical-device-guidance-document.html)
- [Health Canada: SaMD Classification Examples](https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/application-information/guidance-documents/software-medical-device-guidance/examples.html)
- [Health Canada: Pre-Market Guidance for ML-Enabled Medical Devices](https://www.canada.ca/content/dam/hc-sc/documents/services/drugs-health-products/medical-devices/application-information/guidance-documents/pre-market-guidance-machine-learning-enabled-medical-devices/pre-market-guidance-machine-learning-enabled-medical-devices.pdf)

### Regulatory Affairs & Compliance Resources
- [Pure Global: ANVISA Medical Device Classification](https://www.pureglobal.com/markets/brazil/anvisa-medical-device-classification)
- [Emergo by UL: ANVISA Registration & Timeline Information](https://www.emergobyul.com/services/anvisa-registration-brazil)
- [Global Regulatory Partners: Brazil ANVISA Resources](https://globalregulatorypartners.com/countries/brazils-anvisa/)
- [Chambers & Partners: Healthcare Medical Devices 2025 — Brazil](https://practiceguides.chambers.com/practice-guides/healthcare-medical-devices-2025/brazil)

### Clinical & Population Health Precedents
- [Johns Hopkins ACG System: Risk Stratification 101](https://www.hopkinsacg.org/risk-stratification-101-what-is-it-and-how-is-it-used/)
- [NACHC: Population Health Management & Risk Stratification Guide](https://www.nachc.org/wp-content/uploads/2023/04/PHM_Risk-Stratification-AG-Jan-2022.pdf)

---

## Appendix A: IMDRF SaMD Risk Classification Matrix (Adopted by ANVISA)

| Healthcare Situation | Diagnostic | Therapeutic | Monitoring | Decision Support / Info |
|---|---|---|---|---|
| **Critical** | Class IV | Class IV | Class III | Class II–III |
| **Serious** | Class III | Class III | Class II | Class II |
| **Non-serious** | Class II | Class II | Class I–II | Class I |

**CSL Product Mapping:**
- **TLP:** Non-serious (operations), Information-only → **Class I**
- **CDRM:** Serious (chronic disease), Monitoring/Decision Support → **Class II** (or Class III if escalated to individual targeting)
- **DAS:** Serious (medication adherence), Therapeutic/Decision Support → **Class II–III** (depends on claims and user type)

---

## Appendix B: ANVISA Documentation Checklists by Pathway

### Notification (Class I–II) — Minimal Dossier

- Product description and intended use statement
- Risk analysis (IMDRF framework application)
- Technical documentation (algorithm, data sources, validation)
- Quality assurance summary
- Post-market surveillance plan
- Disclaimer language and Terms of Service
- ANVISA filing fees (~BRL 1,406 / USD 260)

### Registration (Class III–IV) — Full Dossier

- All notification requirements plus:
- Clinical data and evidence supporting intended use
- Comprehensive risk analysis and mitigation strategies
- Quality system summary
- Manufacturing information (BGMP certification if applicable)
- Biocompatibility assessment (if applicable)
- Clinical evaluation report
- Post-market surveillance plan
- ANVISA filing fees (~BRL 8,510 / USD 1,584)
- BGMP certification (if manufacturer outside Brazil, ~BRL 72,805 / USD 13,552)

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-17 | Regulatory Research Team | Initial analysis; based on web search of ANVISA RDC 657/2022, FDA, EU MDR, Health Canada precedents |

---

**Classification:** Confidential — Regulatory Affairs
**Next Review Date:** 2026-06-17 (post-Consulta Prévia feedback)
**Owner:** Chief Legal Officer (RUTH) & Chief Product Officer (PAUL)

