# MBA Digital Transformation & Healthcare Systems — Active Framework Library

**Sources:**
- JHU Carey Business School — BU350620 Digital Transformation of Business (Spring 2026)
- JHU Carey Business School — BU.881.710 Fundamentals of Health Care Systems (Spring 2025)

**Full syntheses:**
- `docs/strategy/MBA_DT_SYNTHESIS_2026.md` (Digital Transformation frameworks)
- `docs/knowledge/SP25_Fundamentals_of_Health_Care_Systems.md` (Healthcare Systems frameworks)

When any Boardroom agent encounters a decision involving **strategy, partnerships, pricing, product direction, competitive positioning, market entry, or healthcare policy**, evaluate it against these frameworks before responding. Cite the relevant framework by name.

---

## Framework 1: Porter & Heppelmann — Data Loop Primacy

**Core rule:** Cortex is the product cloud, not an EHR feature. Value accrues to whoever controls the data architecture and feedback loop.

**Apply when:** Evaluating integrations, partnership agreements, or competitive positioning.

**Decision test:** Does this decision protect or erode our control of the Clinical Ground Truth data loop?
- If it protects the data loop → proceed.
- If it cedes data architecture control to a partner → reject or restructure.

**Key metric:** Override data volume, Safety Firewall improvement rate, switching cost depth.

---

## Framework 2: Shapiro & Varian — Cognitive Lock-in and Value Pricing

**Core rule:** "Technology changes. Economic laws do not." Price on value, not cost. Competition occurs at the system level. Switching costs in AI are cognitive and workflow-based.

**Apply when:** Pricing decisions, feature prioritization, or evaluating moat depth.

**Decision tests:**
- Does this feature deepen cognitive lock-in (personalized alert calibration, clinician-specific workflow memory, institutional protocol libraries)?
- Are we pricing based on value delivered to the buyer, or based on our COGS?
- Does this partnership welcome complementors while retaining architectural control?

**Key metrics:** LTV:CAC ratio, gross margin, network effect indicators (hospitals enrolled, total overrides, Safety Firewall false-positive rate trend).

---

## Framework 3: McAfee & Brynjolfsson — Management Revolution Framing

**Core rule:** Big data is a management revolution, not a tech upgrade. Competitive advantage goes to who acts on information fastest. Lead with organizational outcomes, not feature lists.

**Apply when:** Crafting Track B sales narratives, designing Governance Console dashboards, or evaluating enterprise buyer personas.

**Decision tests:**
- Are we framing this as a management transformation or a software purchase?
- Does the Governance Console surface actionable insights for non-clinical buyers (CFOs, quality directors)?
- Are we measuring analytical speed (how fast the Safety Firewall incorporates new feedback)?

**Pitch language:** "We are selling the management revolution for clinical decision-making. We move your hospital from the Highest Paid Doctor's Opinion to governed, auditable, evidence-based workflows."

---

## Framework 4: Aron & Singh — Partnership Risk Matrix

**Core rule:** Every build-vs-partner decision is a process design and risk decision, not a cost decision. Evaluate on two axes: codifiability (can we measure output quality?) and structural risk (will this create long-term dependency?).

**Apply when:** Any new partnership proposal, vendor selection, or outsourcing decision.

**Evaluation sequence (unconditional):**
1. **Codifiability first.** Can we clearly specify what good output looks like and measure it? If no → build internally.
2. **Structural risk second.** Will this partner accumulate institutional knowledge or architectural control we cannot replicate? If yes → limit scope, maintain alternatives.
3. **Cost savings third.** Only after (1) and (2) are acceptable does cost enter the equation.

**Scoring thresholds** (see `docs/strategy/MBA_DT_SYNTHESIS_2026.md` Section 9):
- Score 4-8: GREEN — proceed with standard protections
- Score 9-14: YELLOW — proceed with enhanced monitoring and multi-provider strategy
- Score 15-20: RED — do not proceed or restructure first

**Standing RED decisions:** Clinical content authorship must never be outsourced.

---

## Framework 6: Porter's Healthcare Value Formula (Healthcare Systems)

**Core rule:** Value = Patient Outcomes / Cost of Delivering Those Outcomes. Every Cortex initiative must increase the numerator, decrease the denominator, or both.

**Apply when:** Evaluating market entry strategy, partnership evaluation, pricing decisions, or feature prioritization that touches healthcare payers or providers.

**Decision test:**
- Does this feature/product/partnership **increase patient outcomes** (prevent adverse events, improve protocol adherence, enable appropriate escalation)? → Adds to numerator.
- Does this feature/product/partnership **reduce the cost of delivering those outcomes** (fewer readmissions, fewer unnecessary procedures, lower administrative burden)? → Reduces denominator.
- Does this partnership **cede outcome measurement** to the partner? → Destroys the value formula by separating Cortex from its measurement mechanism.

**Threshold:** Any initiative that neither improves outcomes NOR reduces cost is not a Cortex investment. Any partnership that cedes outcome measurement to the partner fails the data loop primacy test (Framework 1).

**Key metrics:** Adverse event rate (before/after), protocol adherence rate, hospital readmission rate, cost per patient episode, cost-per-QALY.

**Payer-specific application:**
- Operadoras de saúde: Frame as sinistralidade reduction (cost reduction first).
- SUS: Frame as protocol standardization and outcome improvement (outcomes first).
- Bismarck/NHI markets: Frame as cost-per-QALY for HTA submission.

---

## Framework 7: Healthcare Market Entry Decision Sequence (Healthcare Systems)

**Core rule:** Before committing resources to any health system market entry, answer all five questions in sequence. If any is unknown, stop and research first.

**Apply when:** GORDON, VICTOR, or any agent evaluates international expansion, new domestic segment entry, or partnership with a healthcare system actor.

**Unconditional decision sequence:**
1. **System type classified?** (Beveridge / Bismarck / NHI / OOP / Multimodel) — Determines the entire buyer structure and reimbursement logic.
2. **Payer identified and reimbursement pathway mapped?** (Government / sickness funds / private insurers / OOP patient / employer) — Determines who writes the check and what evidence they require.
3. **System's primary performance pressure identified?** (Cost / Access / Quality / Equity) — Determines the buyer's pain and therefore Cortex's value proposition.
4. **Value proposition matched to the pressure?** (Does Cortex's capability solve the payer's acute problem?) — Determines whether the pitch will resonate.
5. **Structural risks assessed?** (Political change, single-payer concentration, regulatory volatility, budget silo fragmentation) — Determines long-term viability.

**Threshold:** All five must be answered before first sales conversation. If any is unknown, the first task is to research it.

**Timeline expectations:**
- Bismarck/NHI markets: 18–36 months to reimbursement decision (HTA process required).
- OOP markets: 3–6 months to first institutional pilot.
- Beveridge/SUS markets: Politically variable, 12–24 months typical; requires stakeholder education.

**Brazil application (example):**
- Step 1: Multimodel (SUS + operadoras + OOP).
- Step 2: ANS-regulated operadoras de saúde (primary), SUS state secretariats (secondary).
- Step 3: Cost pressure is primary (sinistralidade management); access pressure is secondary (SUS capacity gaps).
- Step 4: ELENA's value = sinistralidade reduction (operadoras) and protocol standardization (SUS).
- Step 5: Regulatory risks = ANS reimbursement rule changes, SUS budgetary volatility, competing CDSS entrants.

---

## Framework 8: The Four Strategic Bets

These are unconditional commitments derived from all frameworks combined. No agent may recommend actions that violate these bets without escalating to a Board Meeting.

1. **Own the data loop, not the app.** The moat is Clinical Ground Truth, not the UI. Protect data ownership in every agreement.
2. **Price on value, not cost.** 83.8% gross margin confirms information-goods economics. Track B ACV should reflect value delivered (sinistralidade reduction math), not cost to serve.
3. **Sell management transformation, not software.** Lead Track B pitches with organizational outcomes. The Governance Console is a management revolution toolkit.
4. **Evaluate every partnership on structural risk.** Codifiability first, structural risk second, cost third. A partnership that saves money but creates dependency is not a win.

---

## Buyer-Specific Framework Selection

| Buyer Persona | Lead Framework | One-Line Pitch |
|---|---|---|
| Hospital CMO | Porter & Heppelmann | "The product cloud for your clinical system." |
| Hospital CFO | McAfee & Brynjolfsson | "The management revolution for clinical decisions." |
| Insurance Medical Director | Aron & Singh + McAfee | "Codify what was previously ungovernable." |
| Quality Director | McKinsey Analytics | "The analytics translator you don't need to hire." |
| Hospital IT Director | Shapiro & Varian | "FHIR-native, deploys in weeks, no lock-in." |
| Investor / Advisor | All combined | "Cross-sided network effect. Data moat. 9:1 LTV:CAC." |
