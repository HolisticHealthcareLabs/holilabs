# Mirofish Healthcare Supply Chain Integration & Optimization Plan

**Date**: March 18, 2026
**Model Name**: Regional Medical Resource Supply Chain Simulator
**Primary Objective**: Optimize clinical outcomes, safety, and equity through data-driven supply chain management
**Success Metric**: Maximize diagnostic completeness and equitable access while minimizing stockout-related safety incidents

---

## Executive Summary

This plan guides you through:
1. **Populating the data model** with your regional healthcare network
2. **Configuring simulations** in Mirofish across multiple scenarios
3. **Fine-tuning** based on clinical outcome drivers (not just cost)
4. **Analyzing** which levers move the needle most for value-based care
5. **Democratizing** instruments via actionable supply chain recommendations

---

## PHASE 1: Data Preparation (2-3 days)

### Step 1.1: Gather Your Regional Data

You'll need to fill in the **Healthcare_Supply_Chain_Model.xlsx** workbook with your actual data.

**Required data sources:**

| Sheet | Data Needed | Source | Timeline |
|-------|------------|--------|----------|
| **1_Regional_Nodes** | All facilities in your network (hospitals, clinics, labs) | HIS, facility master, regional health authority | 1 day |
| **2_Instruments** | Lab analyzers, diagnostic devices, critical consumables | Procurement system, inventory master, clinical requirements | 1 day |
| **3_Current_Inventory** | Current stock levels by facility | Warehouse management system (WMS), count data | 1 day |
| **4_Demand_Forecast** | Historical test volumes + seasonal patterns | Lab information system (LIS), case load data, clinical guidelines | 1-2 days |
| **5_Transport_Routes** | Route distances, transport times, costs, frequency | Logistics partner, maps API (Google/MapBox), vendor contracts | 1 day |

**Data quality checks:**
- [ ] All facility node_ids are unique and formatted consistently
- [ ] All instrument_ids match procurement system SKUs
- [ ] Inventory quantities match your WMS as of the baseline date
- [ ] Demand forecast covers ≥12 months of historical data + projected seasonality
- [ ] Transport routes have realistic distances and lead times (validate against maps)

---

### Step 1.2: Clean & Validate Data

Before feeding into Mirofish, run these validation checks:

```
□ Check for missing values in critical fields:
  - All node_ids populated
  - All instrument_ids have criticality rating
  - Demand periods have mean_daily and std_dev
  - Transport routes have both origin and destination

□ Validate data types:
  - numeric columns (quantities, costs, times) are not text
  - dates are in YYYY-MM-DD format
  - percentages are decimal (0.95 not 95%)

□ Spot-check outliers:
  - Are any inventory quantities 10x above average? (possible data entry error)
  - Are any lead times >90 days? (document reason)
  - Are any stockout events recent? (investigate root cause)

□ Cross-reference:
  - Every node_id in Inventory sheet exists in Regional_Nodes
  - Every instrument_id in Inventory exists in Instruments
  - Every route has valid origin and destination nodes
  - Demand nodes match existing facilities
```

---

## PHASE 2: Mirofish Setup & Baseline Simulation (1-2 days)

### Step 2.1: Log Into Mirofish & Create Model

1. **Access Mirofish**
   - Go to: [Mirofish platform URL]
   - Log in with your credentials
   - Create a new project: `Healthcare_SupplyChain_[Region]_2026`

2. **Import Data**
   - Navigate to **Data Import** → **New Model**
   - Upload sheets in this order:
     1. `1_Regional_Nodes` → Regional network topology
     2. `2_Instruments` → Product catalog
     3. `3_Current_Inventory` → Baseline state
     4. `4_Demand_Forecast` → Demand signals
     5. `5_Transport_Routes` → Logistics network
   - Verify field mappings match the schema (Mirofish will prompt for column → field matching)

3. **Configure Model Parameters**
   - **Simulation Period**: 90 days (Q1 2026 rolling forecast)
   - **Time Step**: Daily (captures demand spikes & stockout risk)
   - **Objective Function**: Multi-objective (not cost-only):
     - Primary: Maximize diagnostic completeness (% tests available when ordered)
     - Secondary: Minimize equity gap (% remote facilities with same-day access)
     - Tertiary: Minimize total supply cost
   - **Constraints**:
     - No stockouts for CRITICAL instruments (except force majeure)
     - Transport frequency ≤ 3x per week (operational feasibility)
     - Reorder point ≤ inventory capacity of each facility

---

### Step 2.2: Run Baseline ("Status Quo") Simulation

**Configuration**: Use sheet `6_Simulation_Config`, row 1-9 (Status_Quo scenario)

1. In Mirofish, create a scenario: **Status_Quo_Baseline**
2. Set parameters:
   - Reorder Policy: MIN_MAX (standard practice)
   - Predictive Demand: OFF (to isolate demand accuracy issues)
   - Instrument Sharing: OFF (baseline = no inter-facility transfers)
   - Transport Frequency: Current state (from 5_Transport_Routes)
   - Buffer Stock: 0% increase (no change to safety stock)
3. **Run simulation** for 90 days
4. **Export results** to `7_Outcomes_Clinical` and `8_KPI_Summary` tabs

**Expected baseline outputs:**
- Stockout count by instrument (filter for CRITICAL items)
- Average turnaround time (specimen → result) by facility
- Diagnostic completeness % (what % of ordered tests available)
- Equity score (% of vulnerable population with same-day access)
- Cost per case by facility

**Stop here and assess:**
- Are there stockouts of CRITICAL instruments in the baseline? If yes → **flag for investigation**
- What % of tests go unavailable? (target: <2% for CRITICAL tests)
- Which facilities have poorest access? (equity gap)

---

## PHASE 3: Sensitivity Analysis & Scenario Testing (3-5 days)

### Step 3.1: Run Scenario Variants (Test Levers)

Use the three scenario variants from sheet `6_Simulation_Config` to test "what moves the needle":

#### Scenario A: **Regional_Hub** (Centralized Redistribution)
**Hypothesis**: Pooling inventory at regional hubs reduces total cost & improves access to critical items.

Mirofish config:
- **Reorder Policy**: Centralized_MIN_MAX (single inventory point per region)
- **Buffer Stock**: +15% (safety stock at hubs)
- **Transport Frequency**: 2x/week (daily scheduled routes to satellite facilities)
- **Instrument Sharing**: ON (hub can lend to satellite clinics)
- **Predictive Demand**: OFF

Run for 90 days. **Compare vs. baseline:**
- Total supply cost: ↓ or ↑? (expect ↓ if reduced redundancy)
- Stockout frequency: ↓ or ↑? (expect ↓ with pooling)
- Diagnostic completeness: ↑ or ↓? (expect ↑ from shared inventory)
- Equity score: ↑ or ↓? (hub-spoke can worsen remote access if distance is high)

---

#### Scenario B: **Distributed_Buffer** (Decentralized Resilience)
**Hypothesis**: More buffer stock at each facility ensures local availability but increases cost.

Mirofish config:
- **Reorder Policy**: MIN_MAX (each facility independent)
- **Buffer Stock**: +25% (significantly higher safety stock)
- **Transport Frequency**: 1x/week (reduced logistics burden)
- **Instrument Sharing**: ON (facilities can lend to neighbors if needed)
- **Predictive Demand**: OFF

Run for 90 days. **Compare vs. baseline:**
- Total supply cost: ↑ (expect higher holding costs)
- Stockout frequency: ↓↓ (expect near-zero with high buffers)
- Diagnostic completeness: ↑↑ (expect highest value because local availability)
- Equity score: ↑↑ (remote facilities less dependent on transport)
- **Trade-off**: Higher cost for guaranteed access & equity

---

#### Scenario C: **ML_Optimized** (Predictive + Dynamic Reordering)
**Hypothesis**: AI-driven demand forecasting + dynamic reorder points minimize waste while maintaining safety.

Mirofish config:
- **Reorder Policy**: DYNAMIC (reorder points adjust based on demand forecast)
- **Buffer Stock**: +5% (lean safety stock)
- **Transport Frequency**: 3x/week (responsive logistics)
- **Instrument Sharing**: ON
- **Predictive Demand**: ON (Mirofish ML model or your LIS forecast)

Run for 90 days. **Compare vs. baseline:**
- Total supply cost: ↓ (expect lean inventory, low waste)
- Stockout frequency: ↓ (expect low but not zero due to demand spikes)
- Diagnostic completeness: ≈ baseline or ↑ (depends on forecast accuracy)
- Equity score: ≈ baseline (demand prediction doesn't solve geographic barriers)
- **Insight**: Best for cost reduction; less impact on equity

---

### Step 3.2: Sensitivity Analysis - Fine-Tuning

For each scenario, test **isolated levers** to identify the key drivers:

**Test 1: Transport Frequency Impact**
- Hold all other parameters constant
- Vary transport frequency: 1x/week → 2x → 3x
- Measure: Stockout frequency, diagnostic completeness, transport cost
- **Find the inflection point**: At what frequency do diminishing returns kick in?

**Test 2: Buffer Stock Impact**
- Vary buffer stock: 0% → 10% → 25% → 50%
- Measure: Stockout frequency, holding cost, ROI
- **Find the sweet spot**: Minimum buffer to hit 95%+ diagnostic completeness

**Test 3: Predictive Demand Accuracy**
- For scenarios with predictive demand enabled:
  - Compare ML forecast accuracy: How well does Mirofish predict demand spikes?
  - Test with 80%, 90%, 95%, 99% forecast accuracy
  - Measure: Cost, stockout frequency, equity impact
  - **Benchmark**: What accuracy threshold justifies ML investment?

**Test 4: Equity Levers (Most Important for Value-Based Care)**
- Test inter-facility instrument sharing: ON vs. OFF
  - Measure: How many stockout incidents at remote facilities resolved by sharing?
  - **Insight**: Is sharing + responsive transport cheaper than duplicating inventory?
- Test regional hub with guaranteed 4-hour response time:
  - Simulate transport-assisted access (express routes)
  - Measure: Equity score improvement vs. cost increase
  - **Question**: What's the ROI of dedicated express routes to underserved areas?

---

## PHASE 4: Fine-Tuning & Democratization Strategy (2-3 days)

### Step 4.1: Identify the "Needle Movers" for Your Model

**Based on your results from Phase 3, rank these levers by impact:**

| Lever | Cost Impact | Clinical Outcome Impact | Equity Impact | Implementation Effort |
|-------|-------------|------------------------|---------------|----------------------|
| Transport frequency (+1 route/week) | -$XXX | +X% completeness | +Y% equity | Low |
| Buffer stock (+10%) | +$XXX | +X% completeness | +Y% equity | Low |
| Instrument sharing | -$XXX | +X% completeness | +Y% equity | Medium |
| ML demand forecasting | -$XXX | +X% completeness | Neutral | High |
| Regional hub model | -$XXX | +X% completeness | -Y% equity | Very High |

**Fill in your actual numbers from Mirofish simulations, then:**
- Identify which 2-3 levers give **highest clinical impact per dollar spent**
- Identify which levers help the **most-underserved patients**
- Identify which levers are **easiest to implement** (quick wins)

---

### Step 4.2: Recommended Hybrid Strategy

Based on Phase 3 results, I recommend a **phased approach**:

**Phase 1 (Months 1-2): Quick Wins**
- Increase transport frequency by 1 route/week to underserved areas
  - Cost: ~$XXX/month
  - Benefit: Equity score ↑ by Y%, stockouts ↓ by Z%
- Implement instrument sharing protocol (no cost, governance only)
  - Benefit: Diagnostics completeness ↑, resilience to spikes

**Phase 2 (Months 3-4): Buffer Optimization**
- Identify which instruments have persistent stockout issues
- Increase buffer stock for those items only (not across the board)
  - Cost: Targeted (not organization-wide increase)
  - Benefit: Eliminate critical-item stockouts

**Phase 3 (Months 5-6): Predictive Demand Pilot**
- Pilot ML demand forecasting at your largest facility (HSP_SE_001)
- Measure forecast accuracy vs. actual demand
- If >90% accuracy: Roll out to other facilities
  - Cost: ML platform + training
  - Benefit: Waste ↓, cost ↓, logistics optimization

**NOT Recommended (Based on equity focus):**
- Regional hub consolidation (worsens equity unless paired with express logistics)
- Cost reduction at the expense of diagnostic completeness (false economy)

---

### Step 4.3: Democratization Action Plan

**Goal**: Make value-based care instruments accessible to all patients, especially vulnerable populations.

**Action 1: Equity-Linked Supply Allocation**
- Define "vulnerable population" in your region (e.g., income <50th percentile, >30min to nearest facility)
- Set equity targets: 95% of vulnerable pop. should get same-day diagnostic access
- Use Mirofish outputs to identify which facilities serve vulnerable populations
- Allocate instruments based on **patient need**, not facility size
  - Example: Small clinic with high vulnerable-pop. load gets priority for diagnostic instruments

**Action 2: Transparent Supply Chain Metrics**
- Share quarterly supply chain performance with all facilities + community leaders
  - Show: Diagnostic completeness %, stockout incidents, mean turnaround time
  - Flag equity gaps and improvement plan
- Create a **scoreboard** (public or internal) to motivate compliance and highlight disparities

**Action 3: Value-Based Care Reimbursement Tie-In**
- Link facility reimbursement to outcome metrics (not supply cost):
  - Bonus for: ↑ diagnostic completeness, ↓ readmissions, ↑ equity score
  - Penalty for: Stockout-related adverse events
  - Example: Facility achieves 98% diagnostic completeness → 2% reimbursement bonus
- This incentivizes supply chain excellence, not just cost reduction

**Action 4: Regional Instrument "Lending Network"**
- Formalize inter-facility instrument sharing protocol
  - Track which facilities can lend which instruments
  - Set response time SLA (e.g., 2-hour availability for critical tests)
  - Monitor utilization to optimize shared inventory
- Broadcast capability: "If your facility needs [instrument], you can borrow from [hub] in X hours"
- **Benefit**: Reduces capital duplication, improves resilience, signals equity commitment

**Action 5: Community Engagement**
- Host quarterly forums with patient advocates, facility staff, and supply chain team
  - Present data: Where are access gaps? What are we doing?
  - Solicit feedback: What matters most to patients?
  - Track progress toward equity targets
- Build trust: Transparency → accountability → better outcomes

---

## PHASE 5: Dashboard & Reporting (1-2 days)

### Step 5.1: Build a Mirofish Dashboard

Once all simulations are complete, create a dashboard in Mirofish to visualize:

**Clinical Outcome View:**
- Diagnostic completeness % by instrument by facility (heatmap)
- Stockout frequency over time (bar chart, flag CRITICAL items)
- Turnaround time distribution (box plot by facility)
- Equity score by region (progress toward 95% target)

**Scenario Comparison View:**
- Baseline vs. Regional_Hub vs. Distributed_Buffer vs. ML_Optimized
- Side-by-side KPI table:
  | Metric | Baseline | Hub | Buffer | ML |
  |--------|----------|-----|--------|-----|
  | Diagnostic Completeness | X% | X% | X% | X% |
  | Stockout Freq. | X | X | X | X |
  | Equity Score | X% | X% | X% | X% |
  | Cost/Case | $X | $X | $X | $X |

**Equity Focus View:**
- Geographic heatmap: Color facilities by equity score
- Identify gaps: Which 10% of patients have <80% diagnostic access?
- Improvement trajectory: Show the path to 95%+ equity

**Economic View:**
- Total supply cost breakdown (procurement, holding, transport)
- Cost per clinical outcome (e.g., cost to prevent one readmission via supply optimization)
- ROI of each scenario

---

### Step 5.2: Executive Summary Report

Create a one-page summary for leadership:

```
SUPPLY CHAIN OPTIMIZATION RESULTS — Q1 2026 SIMULATION

BASELINE STATUS:
- Diagnostic Completeness: X% (target: 95%)
- Equity Score: X% (gap: Y% of vulnerable population without timely access)
- Stockout Incidents (CRITICAL items): X (target: 0)
- Cost per Case: $X

RECOMMENDED STRATEGY: Distributed_Buffer + Transport Optimization
- Expected Diagnostic Completeness: X% (+Y% vs. baseline)
- Expected Equity Score: X% (+Y% improvement)
- Expected Cost per Case: $X (+/-Z% vs. baseline)
- Investment Required: $X (over 6 months)
- ROI: Prevent X readmissions/year worth $X in savings

IMPLEMENTATION TIMELINE:
Phase 1 (Months 1-2): Increase transport to underserved areas, enable sharing
Phase 2 (Months 3-4): Optimize buffer stock for critical items
Phase 3 (Months 5-6): Pilot ML demand forecasting

NEXT STEPS:
1. Validate model assumptions with clinical and operations teams
2. Secure budget for transport and buffer stock investments
3. Establish governance for instrument sharing
4. Launch pilot at 2 facilities (1 hub, 1 spoke)
```

---

## PHASE 6: Continuous Improvement Loop (Ongoing)

### Step 6.1: Monthly Reviews

- Re-run simulations with latest data (actual vs. forecast demand)
- Check: Are we hitting projected outcomes? If not, why?
- Adjust: Reorder points, buffer stock, transport frequency based on results
- Communicate: Share updates with facilities + community partners

### Step 6.2: Annual Model Refresh

- Re-baseline with full-year data
- Update demand forecast seasonality
- Test new scenarios (e.g., telemedicine impact on local demand)
- Benchmark against peer healthcare networks
- Plan next phase of optimization

---

## Data & Files

- **Healthcare_Supply_Chain_Model.xlsx** — Main data template (populate with your data)
- **MIROFISH_EXECUTION_PLAN.md** — This document
- **Simulation Results** — Export from Mirofish into Excel after each scenario run

---

## Key Success Criteria

✅ **Clinical Outcomes:**
- Diagnostic completeness ≥95% (especially CRITICAL tests)
- Mean turnaround time ≤4 hours (specimen → result)
- Zero preventable stockout-related adverse events

✅ **Equity:**
- ≥95% of vulnerable population has same-day access to diagnostic tests
- No facility isolated >4 hours from critical instrument access

✅ **Economics:**
- Cost per case ≤ +10% vs. baseline (acceptable trade-off for improved outcomes)
- ROI on supply chain investment ≥2:1 (every $1 invested → $2 in improved outcomes)

✅ **Adoption:**
- All facilities reporting >80% compliance with sharing protocol
- Community satisfaction with access (survey score ≥4/5)

---

## Questions to Answer Post-Simulation

1. **Which single lever moves the needle most for clinical outcomes?** (Transport frequency? Buffer stock? Sharing? ML?)
2. **What's the cost of eliminating the equity gap completely?** (What investment required to hit 95%+ equity?)
3. **How sensitive is the model to demand forecast accuracy?** (If forecast is only 80% accurate, do we still recommend ML?)
4. **Which facilities are bottlenecks?** (Where should we prioritize infrastructure investment?)
5. **Can we achieve all three goals (cost, clinical, equity) simultaneously, or do we need to trade off?** (If so, which is non-negotiable?)

---

**Ready to execute? Let's go to Step 1.1.**

---

## ADDENDUM: Health 3.0 — Source-Agnostic Data Aggregation

**Added**: March 18, 2026

The supply chain simulation strategy above now connects to the Health 3.0 data ingestion layer built inside `packages/data-ingestion/`. Rather than manually populating Excel sheets, regional data can flow automatically into the system via:

### Supported Sources (Phase 1 — Ready Now)
| Source | Protocol | Use Case |
|--------|----------|----------|
| FHIR R4 | REST + SMART on FHIR | Regional hospital EHRs, national RNDS (Brazil) |
| CSV / Excel | File upload | Lab system exports, legacy EHR extracts, device exports |
| REST API / Webhook | HTTP | PoC devices, wearables, third-party labs |

### Supported Sources (Phase 2 — Planned)
| Source | Protocol | Use Case |
|--------|----------|----------|
| HL7 v2 | MLLP / TCP | Older hospital systems |
| PostgreSQL / SQLite | Direct DB | Legacy on-premise EHRs |
| PDF Lab Reports | OCR via document-parser | Scanned paper labs (via @holi/document-parser) |
| WhatsApp Structured | Twilio | Rural clinics without internet-facing EHR |

### How It Connects to the Supply Chain Model

The `CanonicalSupplyChainItem` payload type in the ingestion pipeline maps directly to the supply chain data model:

```
Regional WMS/inventory system → CSV export → CsvConnector 
  → CanonicalSupplyChainItem[] → 3_Current_Inventory.xlsx
  → Mirofish import
```

Similarly, lab demand data:
```
LIS (Lab Information System) → FHIR R4 Observation export → FhirConnector
  → CanonicalLabResult[] → aggregated into 4_Demand_Forecast.xlsx
  → Mirofish import
```

This eliminates manual data entry from the DATA_READINESS_CHECKLIST and replaces it with one-time connector configuration per data source.

### Integration Endpoint

**POST /api/ingest** accepts any configured DataSource and runs the pipeline automatically. See `apps/web/src/app/api/ingest/route.ts` for the implementation.

### Files Created (Health 3.0 — Phase 1)
- `packages/data-ingestion/src/types/index.ts` — All canonical types
- `packages/data-ingestion/src/connectors/fhir.connector.ts` — FHIR R4
- `packages/data-ingestion/src/connectors/csv.connector.ts` — CSV/Excel
- `packages/data-ingestion/src/connectors/rest.connector.ts` — REST/webhook
- `packages/data-ingestion/src/connectors/base.connector.ts` — Abstract base
- `packages/data-ingestion/src/validators/canonical.validator.ts` — Schema validation
- `packages/data-ingestion/src/pipeline/ingestion.pipeline.ts` — Orchestrator
- `packages/data-ingestion/src/pipeline/__tests__/ingestion.pipeline.test.ts` — Unit tests
- `packages/data-ingestion/src/index.ts` — Public API surface
- `packages/data-ingestion/SCHEMA_ADDITION.prisma` — Additive DB migration spec
- `apps/web/src/app/api/ingest/route.ts` — HTTP endpoint (RBAC-guarded)
