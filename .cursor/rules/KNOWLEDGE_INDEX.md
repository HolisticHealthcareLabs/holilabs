# MBA Knowledge Library — Domain Index

**Architecture:** Tier 2 Knowledge Library
**Source:** JHU Carey Business School — MBA Program (2023–2026)
**Location:** `docs/knowledge/`
**Protocol:** When any Boardroom agent requires deep context beyond Tier 1 decision tests, load the relevant document(s) from this index. Do not load more than 2 documents per reasoning step.

---

## Domain Map

### Strategy & Competitive Intelligence
**Lead agent:** VICTOR (CSO) | **Secondary:** ARCHIE (CTO)
- `docs/knowledge/SP24_Strategic_Management.md` — **[ENRICHED — 1,506 lines]** AFI framework, PESTEL, Porter's Five Forces (healthcare CDSS application), VRIO analysis (Cortex-specific), Blue Ocean, business vs corporate strategy, innovation strategy, global strategy (CAGE), M&A, competitive dynamics (AMC), Balanced Scorecard, Cortex Five Forces + VRIO + strategic options
- `docs/knowledge/SP26_Digital_Transformation_of_Business.md` — **[ENRICHED — 1,574 lines]** Network effects (direct/indirect, Metcalfe's Law), platform economics (two-sided, chicken-and-egg, tipping), lock-in/switching costs, price discrimination, data loops and moats, AI prediction machines (Agrawal/Gans/Goldfarb), digital business models, winner-take-all dynamics, ONC information blocking rules, CDSS network effects, Cortex platform strategy and lock-in levers

### Finance & Unit Economics
**Lead agent:** GORDON (CFO)
- `docs/knowledge/SP25_Corporate_Finance.md` — Valuation, DCF, WACC, capital structure, M&A, risk
- `docs/knowledge/FA23_Business_Microeconomics.md` — **[ENRICHED — 1,278 lines]** Supply/demand/elasticity, cost theory (ATC/MC/AVC economies of scale), market structures (perfect competition/monopoly/oligopoly), game theory (payoff matrices, Nash equilibrium, Prisoner's Dilemma), pricing strategies (1st/2nd/3rd-degree price discrimination, two-part tariffs, bundling), auction theory, information economics (adverse selection, moral hazard, signaling), Nico's M4-M6 problem sets (price discrimination, pollution game, Boeing/Airbus entry game, auctions), Cortex tiered pricing model for Brazil (R$25K large chains → R$3-5K SUS)
- `docs/knowledge/SP25_Health_Financing_and_Financial_Management.md` — **[NEW — 862 lines]** Healthcare financing models (Bismarck/Beveridge/NHI), operadora de saúde business model, sinistralidade management, ANS regulation, value-based care finance, Medicare/Medicaid, ACA, decision trees for healthcare investment, Cortex ROI framework

### Marketing & Growth
**Lead agent:** PAUL (CPO) | **Secondary:** VICTOR (CSO)
- `docs/knowledge/FA24_Marketing_Management.md` — STP, brand equity, pricing strategy, consumer behavior, B2B vs B2C, go-to-market
- `docs/knowledge/FA23_Negotiation.md` — **[ENRICHED — 1,369 lines]** BATNA/ZOPA/reservation price, distributive vs integrative bargaining, anchoring, concession patterns, multi-party negotiation, cross-cultural (Brazil "jeitinho brasileiro"), Nico's case analyses (Les Florets, Moms.com, Bullard Houses, Holi Labs one-pager), healthcare B2B negotiation, startup term sheet + enterprise SaaS + operadora contract playbooks
- `docs/knowledge/SP25_New_Product_Development.md` — **[NEW — 1,213 lines]** Crossing the Chasm (Moore), disruptive innovation (Christensen), Lean Startup (Ries), R-W-W portfolio framework (Day), market demand forecasting, pricing new products, healthcare NPD cases (Metabical, TrueEarth), beachhead market selection for Cortex

### Operations & Project Management
**Lead agent:** ARCHIE (CTO)
- `docs/knowledge/SP24_Operations_Management.md` — **[ENRICHED — 1,207 lines]** Process analysis, lean (8 wastes, VSM, kaizen), Six Sigma/DMAIC, capacity planning, queuing theory (M/M/1, M/M/c), inventory (EOQ, safety stock), project management (CPM/PERT), healthcare operations (OR, ED, patient flow), SaaS/DevOps ops, Wriston Manufacturing case, Cortex clinical implementation + engineering + customer success ops framework
- `docs/knowledge/SU23_Managing_Complex_Projects.md` — **[ENRICHED — 1,382 lines]** Triple constraint, WBS, CPM/float/crashing, EVM (PV/EV/AC/SPI/CPI/EAC), risk register (probability×impact, response strategies), Cynefin framework, Agile/Scrum/SAFe, healthcare IT implementation (EHR failure lessons, clinical stakeholder management), Cortex 6-phase CDSS implementation playbook (Discovery→Design→Build→Pilot→Rollout→Optimization), 12-month budget model

### Data, Analytics & AI
**Lead agent:** ARCHIE (CTO) | **Secondary:** ELENA (CMO/Clinical)
- `docs/knowledge/SP24_Business_Analytics.md` — **[ENRICHED — 1,396 lines]** Descriptive/inferential stats, regression (OLS, multiple, logistic), decision analysis (decision trees, EVPI, EVSI, sensitivity/tornado), Monte Carlo simulation, optimization/LP (shadow price, sensitivity report), A/B testing (power, sample size, multiple testing correction), healthcare analytics (sensitivity/specificity/PPV/NPV/ROC), Nico's M5 (Prehistoric Toy decision analysis) + Assignment 6 (insurance simulation), Cortex CDSS KPIs + A/B testing protocol
- `docs/knowledge/SU24_Data_Visualization.md` — Dashboard design, visual communication, Tableau principles, data storytelling
- `docs/knowledge/FA25_Machine_Learning_for_Management.md` — Supervised/unsupervised ML, neural nets, NLP, model evaluation, managerial applications
- `docs/knowledge/SU25_AI_Essentials_for_Business.md` — **[ENRICHED — 886 lines]** Deep learning fundamentals, CNN architecture, model evaluation (confusion matrix, ROC/AUC, precision-recall), FDA SaMD classification, ANVISA regulatory pathway, AI governance (open-source vs proprietary), class imbalance strategies, Nico's written analyses (M1–M4), Safety Firewall validation frameworks
- `docs/knowledge/FA25_Cryptos_and_Blockchain.md` — Distributed ledgers, smart contracts, tokenomics, DeFi *(content in course files)*

### Healthcare Systems & Markets
**Lead agent:** ELENA (CMO) | **Secondary:** RUTH (CLO)
- `docs/knowledge/SP25_Fundamentals_of_Health_Care_Systems.md` — US healthcare structure, payers, providers, ACOs, value-based care
- `docs/knowledge/SP25_Frameworks_for_Analyzing_Health_Care_Markets.md` — **[ENRICHED — 1,146 lines]** Arrow's healthcare market failure (information asymmetry, adverse selection, moral hazard), RAND experiment, supplier-induced demand, risk adjustment, Hatch-Waxman generic entry, hospital consolidation (HHI), ACO economics, value-based payment models (bundled/shared savings/global budgets), EHR monopoly dynamics (Epic/Cerner switching costs), Brazilian operadora market structure (ANS, consolidation), CONITEC HTA, CDSS market competitive analysis, Cortex TAM/SAM/SOM ($100-200M TAM; $5-10M SOM)
- `docs/knowledge/FA25_Health_Analytics.md` — Population health, claims data, quality metrics, HEDIS, clinical analytics

### Medical Devices, Diagnostics & SaMD
**Lead agent:** RUTH (CLO) | **Secondary:** ARCHIE (CTO), PAUL (CPO), ELENA (CMO/Clinical)
- `docs/knowledge/SP25_Medical_Devices_and_Diagnostics.md` — **[NEW — 1,100+ lines]** MedTech industry overview, FDA regulatory pathways (510k/PMA/De Novo/IDE), SaMD IMDRF framework + FDA AI/ML Action Plan + predetermined change control, diagnostics (IVD, sensitivity/specificity/PPV/NPV/ROC), design controls (ISO 13485, ISO 14971, IEC 62366), commercialization (CPT/NCD/LCD/NTAP/GPOs), global access (EU MDR, ANVISA RDC 657/2022, PMDA), MedTech business models, FDA CDS 4-part exemption test, Cortex regulatory classification + ANVISA pathway + commercialization roadmap

### Health Law, Regulation & Compliance
**Lead agent:** RUTH (CLO) | **Secondary:** CYRUS (CISO)
- `docs/knowledge/SU24_Health_Care_Law_and_Regulation.md` — **[ENRICHED — 2,187 lines]** HIPAA Privacy/Security/Breach, HITECH, ACA, FDA SaMD classification (Class I-III, 510k, De Novo, PMA), FDA AI/ML guidance, CDS exemption analysis, ANVISA RDC 657/2022, LGPD (lawful bases, DPO, patient rights, GDPR comparison), CFM telemedicine + AI physician liability, Anti-Kickback/Stark, CPOM, AI liability (standard of care, learned intermediary), healthcare contracts (BAA, DPA), Cortex 12-risk legal register
- `docs/knowledge/SP25_Health_Information_Technology.md` — **[ENRICHED — 915 lines]** EHR systems, HL7/FHIR interoperability, ONC regulations, CDSS State of the Art (AHRQ full synthesis), alert fatigue tiering framework, Five Rights of CDSS delivery, e-iatrogenesis risk, HIPAA/HITECH/LGPD security, evaluation frameworks (METRIC), Cortex Safety Firewall architecture implications

### Leadership & Organizational Behavior
**Lead agent:** ARCHIE (CTO) — default for team/culture decisions
- `docs/knowledge/SP24_Leadership_and_Organizational_Behavior.md` — **[ENRICHED — 800+ lines]** Motivation (Maslow, Herzberg, SDT, Expectancy), authentic leadership (Bill George), decision-making biases + Carter Racing case (Challenger analogy), groupthink prevention (Sunstein "Making Dumb Groups Smarter"), Tushman convergence/upheaval, Kotter change management, Schein culture levels + Smile Factory case, Mount Everest 1996 (leadership under pressure), Cynthia Carroll safety culture transformation, healthcare leadership (physician culture, CMIO role), Cortex team design + scaling blueprint (10→50 people)
- `docs/knowledge/FA24_Effective_Teaming.md` — Team dynamics, psychological safety, cross-functional collaboration, conflict resolution

### Social Impact & Innovation
**Lead agent:** PAUL (CPO)
- `docs/knowledge/FA24_CityLab_Catalyst.md` — Social enterprise, impact measurement, stakeholder capitalism, B2B innovation for public good
- `docs/knowledge/FA24_City_Lab_Practicum.md` — Applied social innovation, civic partnerships, implementation in public sector

---

## Loading Protocol

```
KNOWLEDGE_LOAD triggered when:
- Agent activates and decision involves strategic depth beyond Tier 1 tests
- Board Meeting format is invoked (3+ agents)
- A domain mismatch is detected (agent asks: "what does the literature say about X?")

Load sequence:
1. Check this index for domain → file mapping
2. Read the relevant .md file(s) from docs/knowledge/
3. Surface key frameworks, readings, and concepts to the current reasoning step
4. Cite the document: "(MBA Knowledge Library: [Course Name], JHU Carey)"

Never load more than 2 knowledge files in a single reasoning step.
Always prefer the Tier 1 decision test (MBA_FRAMEWORKS.md) before escalating to Tier 2.
```

---

## Courses with File-Based Content (Not Text-Extractable)
These courses store content in PDFs and slides rather than Canvas pages. Load by topic context only; no text content available in the knowledge library.
- `FA25_Cryptos_and_Blockchain.md` — Reading list and module structure only

## Document Quality Reference
| File | Lines | Status | Last Updated |
|---|---|---|---|
| `SU24_Health_Care_Law_and_Regulation.md` | 2,187 | ✅ Gold standard | Mar 2026 |
| `SP26_Digital_Transformation_of_Business.md` | 1,574 | ✅ Gold standard | Mar 2026 |
| `SP24_Strategic_Management.md` | 1,506 | ✅ Gold standard | Mar 2026 |
| `SP25_Corporate_Finance.md` | 1,422 | ✅ Gold standard | Mar 2026 |
| `SP24_Business_Analytics.md` | 1,396 | ✅ Gold standard | Mar 2026 |
| `SU23_Managing_Complex_Projects.md` | 1,382 | ✅ Gold standard | Mar 2026 |
| `FA23_Negotiation.md` | 1,369 | ✅ Gold standard | Mar 2026 |
| `FA25_Machine_Learning_for_Management.md` | 1,347 | ✅ Gold standard | Mar 2026 |
| `FA24_Marketing_Management.md` | 1,263 | ✅ Gold standard | Mar 2026 |
| `FA23_Business_Microeconomics.md` | 1,278 | ✅ Gold standard | Mar 2026 |
| `SP25_New_Product_Development.md` | 1,213 | ✅ Gold standard | Mar 2026 |
| `SP24_Operations_Management.md` | 1,207 | ✅ Gold standard | Mar 2026 |
| `SP25_Medical_Devices_and_Diagnostics.md` | 1,100+ | ✅ Gold standard | Mar 2026 |
| `SP25_Frameworks_for_Analyzing_Health_Care_Markets.md` | 1,146 | ✅ Gold standard | Mar 2026 |
| `FA25_Health_Analytics.md` | 994 | ✅ Gold standard | Mar 2026 |
| `SP25_Health_Information_Technology.md` | 915 | ✅ Gold standard | Mar 2026 |
| `SP24_Leadership_and_Organizational_Behavior.md` | 800+ | ✅ Gold standard | Mar 2026 |
| `SU25_AI_Essentials_for_Business.md` | 886 | ✅ Gold standard | Mar 2026 |
| `SP25_Health_Financing_and_Financial_Management.md` | 862 | ✅ Gold standard | Mar 2026 |
| `SP25_Fundamentals_of_Health_Care_Systems.md` | 476 | ✅ Gold standard | Mar 2026 |
| `FA24_Effective_Teaming.md` | 204 | ⚠️ Low priority (generic team dynamics) | — |
| `FA24_CityLab_Catalyst.md` | 260 | ⚠️ Low priority (social innovation, limited Cortex relevance) | — |
| `FA24_City_Lab_Practicum.md` | 108 | ⚠️ Low priority (civic partnerships) | — |
| `FA25_Cryptos_and_Blockchain.md` | ~3 | ❌ Stub (not relevant to Cortex) | — |
