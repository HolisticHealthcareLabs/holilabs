# Operations Management for Cortex Health

**Course Code:** BU.680.620.31 | **Term:** SP24
**Institution:** JHU Carey Business School
**Framework Version:** 2.0 (Enriched for Healthcare CDSS)
**Target Audience:** ARCHIE (CTO) & Operations Leadership

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [Core OM Concepts & Process Analysis](#core-om-concepts--process-analysis)
3. [Lean Operations & Continuous Improvement](#lean-operations--continuous-improvement)
4. [Quality Management & Six Sigma](#quality-management--six-sigma)
5. [Capacity Planning & Process Design](#capacity-planning--process-design)
6. [Queuing Theory & Service Operations](#queuing-theory--service-operations)
7. [Inventory Management & Supply Chain](#inventory-management--supply-chain)
8. [Project Management Fundamentals](#project-management-fundamentals)
9. [Healthcare Operations Optimization](#healthcare-operations-optimization)
10. [SaaS & Tech Operations](#saas--tech-operations)
11. [Strategic Operations Decisions](#strategic-operations-decisions)
12. [Wriston Manufacturing Case Study](#wriston-manufacturing-case-study)
13. [Cortex Health Operations Framework](#cortex-health-operations-framework)

---

## Executive Overview

Operations management (OM) is the organization and control of business activities that produce goods and services. For Cortex Health, OM spans three critical dimensions:

- **Clinical Implementation Ops:** Deploying CDSS into healthcare facilities, managing workflows, training clinicians
- **Engineering Ops:** Shipping features, maintaining system reliability, managing technical debt
- **Customer Success Ops:** Onboarding hospitals, managing SLAs, clinical support

The strategic importance of operations lies in competitive differentiation across four dimensions:

1. **Cost:** Lower operational overhead improves unit economics
2. **Quality:** Clinical accuracy, system reliability, compliance
3. **Time:** Fast deployment, rapid response to market needs
4. **Flexibility:** Ability to customize for different healthcare markets (especially critical in Brazil's fragmented healthcare landscape)

All corporate strategy must express itself through operational processes. Poor operations execution undermines even the strongest product strategy.

---

## Core OM Concepts & Process Analysis

### 1.1 Business Process Definition

A business process is a structured collection of activities and buffers that transform inputs (data, materials, customers) into outputs (services, decisions, insights). In Cortex Health:

- **Flow units:** Patient cases, imaging studies, clinical decisions
- **Transformations:** Clinical analysis, recommendation generation, decision support
- **Resources:** GPU compute, clinician time, platform infrastructure
- **Activities:** Model inference, confidence scoring, guideline matching, alert generation
- **Buffers:** Case queues, decision backlogs, prioritization lists

Processes can be modeled as directed graphs showing the flow of work and the dependencies between activities.

### 1.2 Process Capacity & Flow Analysis

Process capacity is the maximum flow rate (throughput) a process can produce. For a CDSS:

**Key Metrics:**

- **Arrival Rate (λ):** Cases/hour entering the analysis pipeline
- **Cycle Time (T):** Time from case arrival to decision recommendation
- **Flow Rate (R):** Cases/hour exiting the process
- **Inventory (I):** Cases in process (queued or being analyzed)
- **Utilization (ρ):** Demand rate ÷ processing capacity (should stay <85-90% for stable systems)

**Little's Law (fundamental process relationship):**
```
I = λ × T
(Inventory = Arrival Rate × Cycle Time)
```

**Implied Utilization at Activity i:**
```
ρᵢ = λᵢ ÷ μᵢ
```
Where λᵢ = flow into activity, μᵢ = processing rate of activity

### 1.3 Bottleneck Analysis

The bottleneck is the activity with the highest implied utilization. Process capacity equals bottleneck capacity:

```
Process Capacity = max{μᵢ for all activities i}
```

**Theory of Constraints (Goldratt):** Focus improvement efforts on the constraint (bottleneck). Improving non-bottleneck activities does not increase process capacity.

For Cortex Health clinical workflows:
- If imaging ingestion (OCR/preprocessing) is bottleneck → invest in parallel processing
- If model inference is bottleneck → optimize inference pipeline, use model distillation
- If clinician review/decision-making is bottleneck → improve UI/UX, reduce cognitive load

**Variability Principle:** High variance in processing times increases average waiting time at bottleneck. Standardization and process control reduce variability.

### 1.4 Process Selection & Design

Process types in manufacturing/service operations:

1. **Continuous Flow:** High volume, low variety (manufacturing assembly lines)
2. **Batch:** Moderate volume/variety, periodic processing
3. **Job Shop:** Low volume, high customization (custom manufacturing, consulting projects)
4. **Project:** Unique, one-time deliverables (EHR implementation, infrastructure buildout)

For Cortex Health:
- **Imaging analysis:** Batch/continuous (high volume, standardized workflows)
- **Clinical implementation:** Project-based (unique per hospital, high customization)
- **Incident response:** Job shop/continuous (varies by urgency, customer impact)

---

## Lean Operations & Continuous Improvement

### 2.1 Lean Principles & TPS (Toyota Production System)

The Toyota Production System (TPS) evolved from post-WWII Japan's resource scarcity. Five core principles:

1. **Define Value:** From the customer's perspective (what would a hospital customer pay for?)
2. **Map Value Stream:** Visualize all steps (value-adding and waste) from raw input to final output
3. **Create Flow:** Eliminate batching and queues; enable continuous movement
4. **Establish Pull:** Demand-driven work (don't push supply; wait for demand)
5. **Pursue Perfection:** Continuous improvement (kaizen) toward zero waste

### 2.2 The Eight Wastes (TIMWOODS)

Identify and eliminate waste in operations:

1. **Transportation:** Moving data, cases, or patients unnecessarily (e.g., case sent to wrong queue)
2. **Inventory:** Excess cases queued, backlogs of decisions waiting review
3. **Motion:** Unnecessary steps in workflows, UI friction, manual data entry
4. **Waiting:** Cases waiting for compute resources, clinicians waiting for recommendations
5. **Overprocessing:** Generating analysis customer doesn't need; over-engineering features
6. **Overproduction:** Building features ahead of demand; maintaining capacity for peak that rarely occurs
7. **Defects:** Incorrect recommendations, failed model inferences, system downtime
8. **Skills:** Not utilizing team's full potential; misallocating talent

For Cortex Health:
- Waste in case routing (transportation) → automate case triage
- Inventory waste (decision backlogs) → improve inference throughput
- Motion waste (manual data entry) → integrate with EHR APIs
- Defects → improve model validation, add guardrails
- Skills → use AI/ML expertise in model improvement, not manual tasks

### 2.3 Value Stream Mapping (VSM)

VSM visualizes the current state and designs a future state free of waste.

**Current State Elements:**
- Process boxes (activities)
- Inventory symbols (queues between activities)
- Timeline showing cycle time and value-add time
- Bottlenecks highlighted
- Data flow (synchronous vs. asynchronous)

**Future State Design:**
- Shorter cycle times
- Lower inventory
- Pull-based scheduling
- Continuous flow where possible

**Healthcare Example (Cortex-relevant):**
- **Current:** Hospital orders study → Manual QA check → Case waits in queue → AI analysis → Human review → Clinician decision
- **Future:** Hospital orders study → Automated ingestion → Parallel AI analysis + QA → Immediate alert to clinician → Decision

### 2.4 Just-In-Time (JIT) & Kanban

**JIT Principles:**
- Produce/deliver only what is needed, when it is needed, in the quantity needed
- Minimizes inventory carrying costs
- Requires tight supplier coordination and high quality (defects stop production)

For Cortex Health:
- Compute resources allocated JIT (don't pre-allocate idle GPU capacity; scale on demand)
- Clinical support resources deployed JIT (don't pre-assign if not needed)
- Feature development on demand (don't build roadmap 12 months ahead; iterate rapidly)

**Kanban System:**
- Visual signals of demand (tickets, case backlog)
- Limit WIP (work-in-process) per stage
- Pull work only when capacity available
- Continuous flow; no batching

Cortex Kanban example:
```
New Cases → [Queue: ≤50] → Processing → [Queue: ≤30] → Review → [Queue: ≤20] → Delivered
```

### 2.5 Kaizen (Continuous Improvement)

Kaizen: Small, incremental improvements in processes. Engage all staff, not just management.

**Kaizen Cycle (PDCA):**
1. **Plan:** Identify process problem, propose hypothesis for improvement
2. **Do:** Test the change on small scale
3. **Check:** Measure results against hypothesis
4. **Act:** Standardize if successful; return to Plan if not

For Cortex Health team:
- Weekly case review: Do our recommendations match outcomes? Where do errors cluster?
- Monthly engineering retro: Which deployments had incidents? How can we prevent next time?
- Continuous monitoring: Track key metrics (inference latency, clinician adoption, accuracy)

---

## Quality Management & Six Sigma

### 3.1 Six Sigma Methodology (DMAIC)

Six Sigma is a data-driven approach to process improvement targeting 3.4 defects per million opportunities.

**DMAIC Framework:**

1. **Define:** Define the problem, customer requirements, project scope, and success metrics
2. **Measure:** Establish current baseline, collect data, validate measurement system
3. **Analyze:** Root cause analysis, identify vital few factors driving variation
4. **Improve:** Design and test solutions; optimize parameters
5. **Control:** Standardize improvements; establish control mechanisms; monitor ongoing

**DMAIC Example for Cortex:**
- **Define:** Reduce false-negative recommendations in pneumonia detection to <2%
- **Measure:** Audit 1000 historical cases; current FN rate = 4.2%
- **Analyze:** Cases with FN have subtle imaging features; model doesn't learn these patterns
- **Improve:** Augment training data, tune decision threshold, add confidence calibration
- **Control:** Monitor FN rate weekly; if >2.5%, trigger retraining

### 3.2 Process Capability Analysis

**Capability Index (Cpk):** Measures whether process can meet specification limits.

```
Cpk = min[ (USL - μ) / (3σ), (μ - LSL) / (3σ) ]
```

Where:
- USL = Upper Specification Limit (max acceptable value)
- LSL = Lower Specification Limit (min acceptable value)
- μ = Process mean
- σ = Process standard deviation

**Interpretation:**
- Cpk ≥ 1.67 → Excellent (very few defects)
- Cpk ≥ 1.33 → Good (acceptable)
- Cpk ≥ 1.0 → Capable (but marginal)
- Cpk < 1.0 → Incapable (process needs improvement)

For Cortex Health:
- **Specification:** Recommendation latency <500ms with 99% uptime
- If mean = 350ms, σ = 50ms, USL = 500ms
- Cpk = (500 - 350) / (3×50) = 150/150 = 1.0 → Barely capable; need improvement
- Action: Reduce σ (standardize inference) or increase mean target

### 3.3 Statistical Process Control (SPC)

SPC uses control charts to monitor process stability and detect special causes of variation.

**Control Chart Types:**

1. **X-bar & R Chart:** Track mean (X-bar) and range (R) of samples
2. **p-Chart:** Track proportion of defects
3. **c-Chart:** Track count of defects per unit

**UCL/LCL Calculation (X-bar chart):**
```
Center Line = X̄ (average of sample means)
UCL = X̄ + 3σ / √n
LCL = X̄ - 3σ / √n
```

**Control Chart Rules (detect special causes):**
- Point outside 3-sigma limits → Out of control
- 8 consecutive points on one side of center → Shift in process
- 6 increasing/decreasing points → Trend

For Cortex Health dashboard:
- Track recommendation accuracy by day/week
- Track inference latency percentile (p95, p99)
- Track clinician acceptance rate
- If any metric violates control limits → investigate root cause

### 3.4 Total Quality Management (TQM)

TQM integrates quality throughout the organization:
- Management commitment to quality
- Cross-functional quality teams
- Customer/stakeholder focus
- Continuous process improvement
- Employee engagement and training

For Cortex Health:
- Quality reviews in sprint planning
- Customer feedback loops from hospitals
- Post-incident reviews (blameless culture)
- Training clinicians on system limitations & appropriate use

---

## Capacity Planning & Process Design

### 4.1 Capacity Concepts

**Design Capacity:** Theoretical maximum output under ideal conditions
**Effective Capacity:** Realistic maximum accounting for maintenance, downtime, normal losses
**Actual Capacity:** Real-world output achieved

For a Cortex inference engine:
- **Design Capacity:** 10,000 cases/day (GPU specs + parallelization)
- **Effective Capacity:** 8,500 cases/day (accounting for 15% downtime: maintenance, redeployment, model updates)
- **Actual Capacity:** 7,200 cases/day (realistic throughput including batching inefficiencies)

**Utilization:**
```
Utilization = Actual Output / Design Capacity
Efficiency = Actual Output / Effective Capacity
```

### 4.2 Capacity Strategies

How to match capacity to demand:

1. **Lead Strategy:** Build capacity ahead of demand (excess capacity available for peaks)
   - Pros: Never stock out; can absorb shocks
   - Cons: High idle capacity cost
   - When to use: Capacity expensive to add quickly (infrastructure); customer waiting unacceptable (emergency imaging)

2. **Lag Strategy:** Add capacity only after demand appears
   - Pros: Minimize idle capacity
   - Cons: Lost sales/service delays during ramp-up
   - When to use: Demand predictable; capacity quick to add (cloud auto-scaling); customer wait acceptable

3. **Match Strategy:** Adjust capacity frequently to match demand
   - Pros: Balance between lead/lag
   - Cons: More complex management
   - When to use: Some predictability; hybrid capacity flexibility

For Cortex Health:
- **Match strategy** for compute: Use auto-scaling cloud infrastructure; adjust replica count based on queue depth
- **Lead strategy** for clinical staff: Maintain buffer capacity for urgencies; can't hire/train overnight
- **Lag strategy** for feature development: Don't build ahead of adoption; wait for hospital feedback

### 4.3 Economies & Diseconomies of Scale

**Economies of Scale:** As volume increases, average cost per unit decreases
- Fixed costs (platform, infrastructure) spread across more cases
- Bulk purchasing discounts
- Specialization improves efficiency

For Cortex Health:
- First 5 hospitals → High setup cost per hospital
- Hospitals 50-100 → Fixed infrastructure amortized; lower marginal cost

**Diseconomies of Scale:** Beyond optimal scale, average costs increase
- Complexity of managing larger system
- Coordination overhead
- Customization costs

---

## Queuing Theory & Service Operations

### 5.1 Why Lines Form

Lines form when arrivals are uncertain or service times are variable. Three conditions:

1. **Random Arrivals:** λ varies; not perfectly regular
2. **Variable Service Times:** μ varies; some cases take longer
3. **Insufficient Capacity:** λ ≈ μ; little buffer

**Psychology of Waiting:**
- Customers feel longer than actual wait; explain what happens → feels shorter
- Uncertain wait feels longer than known wait
- Occupied waiting (progress visible) feels shorter
- Unfair waits feel longer

For Cortex Health:
- Display progress to clinicians (% of analysis complete)
- Clear ETA for recommendation
- Fair prioritization (urgent cases jump queue)

### 5.2 Queuing Models: M/M/1, M/M/k, M/D/1

**Notation: A/B/C**
- A = Arrival process (M=exponential/Poisson, D=deterministic, G=general)
- B = Service process (M=exponential, D=deterministic, G=general)
- C = Number of servers

**M/M/1 (Single Server, Random Arrivals, Exponential Service):**

Key metrics:
```
ρ = λ / μ (utilization; must be <1 for stability)

Lq = λ² / [μ(μ - λ)]  (average queue length)

Wq = λ / [μ(μ - λ)]  (average wait time in queue)

W = Wq + 1/μ = 1 / (μ - λ)  (total time in system)

L = λ × W = λ / (μ - λ)  (average # in system)
```

**Critical Insight:** As ρ → 1, wait times explode exponentially. Small improvements near bottleneck have huge impact.

Example: Cortex inference engine (M/M/1)
- λ = 40 cases/hour
- μ = 50 cases/hour (can process case in 1.2 min)
- ρ = 40/50 = 0.8 (80% utilized)
- Wq = 40 / [50(50-40)] = 40/500 = 0.08 hours = 4.8 minutes average wait
- W = 1/(50-40) = 0.1 hours = 6 minutes total time in system

If load increases to 45 cases/hour:
- ρ = 45/50 = 0.9
- Wq = 45 / [50(50-45)] = 45/250 = 0.18 hours = 10.8 minutes (2.25x increase!)

**M/M/k (Multiple Servers):**

Adding servers (parallel processing) dramatically reduces wait times and is often cost-effective.

```
P₀ = 1 / [Σᵢ₌₀^(k-1) (λ/μ)ⁱ/i! + (λ/μ)ᵏ / (k!(1-ρ))]

Lq = [(λ/μ)ᵏ × ρ / (k!(1-ρ)²)] × P₀
```

**M/D/1 (Constant Service Time):**

Less variability → fewer delays. Deterministic service (fixed time) better than exponential.

```
Lq = λ² / [2μ(μ - λ)]  (half the M/M/1 queue!)
```

**For Cortex Health:**
- If case analysis takes exactly 1.2 min (deterministic) vs. variable → queues half as long
- Action: Standardize preprocessing, batch operations for consistent throughput

### 5.3 Four Takeaways from Queuing Theory

1. **Utilization Matters:** Avoid driving utilization above 85-90%; exponential cost in waiting time
2. **Variability Hurts:** Reduce variance in service times; standardize processes
3. **Pooling Helps:** Combine queues instead of separate queues per server; reduces average wait
4. **Psychology Matters:** Make waiting visible, fair, and explicable; reduces perceived wait

---

## Inventory Management & Supply Chain

### 6.1 Inventory Decisions

Inventory serves multiple purposes:
- **Safety Stock:** Buffer against demand/supply uncertainty
- **Cycle Stock:** Working inventory to support regular demand
- **Seasonal Stock:** Anticipate predictable spikes
- **Decoupling Stock:** Separate dependent processes (reduce variability propagation)

Inventory costs:
- **Holding Cost (h):** Cost to hold one unit one year (storage, insurance, obsolescence, capital tied up)
- **Ordering Cost (S):** Fixed cost per order (processing, shipping, receiving)
- **Stockout Cost:** Lost sales or expedited shipping

### 6.2 Economic Order Quantity (EOQ)

Balances holding costs vs. ordering costs. Optimal order quantity:

```
EOQ = √(2DS / h)
```

Where:
- D = Annual demand
- S = Ordering cost per order
- h = Holding cost per unit per year

**Total Annual Cost:**
```
TC = (D/Q) × S + (Q/2) × h
```

Minimized when (D/Q)×S = (Q/2)×h, giving Q = EOQ.

**Example (Medical Supplies for Cortex Integration):**
- D = 100,000 units/year (e.g., hardware tokens, calibration materials)
- S = $200 per order (processing, shipping)
- h = $2 per unit per year (storage, insurance)
- EOQ = √(2 × 100,000 × 200 / 2) = √(20,000,000) = 4,472 units
- Order frequency = 100,000 / 4,472 = 22.4 times/year (roughly every 2 weeks)

### 6.3 Safety Stock & Reorder Point

**Reorder Point (ROP):**
```
ROP = d × L + SS
```

Where:
- d = Average daily demand
- L = Lead time (days to receive new shipment)
- SS = Safety stock

**Safety Stock Calculation (assuming normal demand distribution):**
```
SS = z × σ_d × √L
```

Where:
- z = Service level factor (z=1.65 for 95% fill rate, z=2.33 for 99%)
- σ_d = Standard deviation of daily demand
- L = Lead time

For Cortex Health cloud infrastructure:
- d = 40 cases/hour average
- L = 2 hours (time to provision new instance)
- σ_d = 8 cases/hour (demand variability)
- z = 2.33 (99% service level)
- SS = 2.33 × 8 × √2 = 26.4 cases
- ROP = (40 × 2) + 26.4 = 106.4 cases (provision new capacity at 106 queued cases)

### 6.4 ABC Inventory Analysis

Classify inventory items by importance (Pareto principle: 80% of value from 20% of items):

- **A Items:** 70-80% of value, ~15-20% of units → Tight control, frequent monitoring
- **B Items:** 15-25% of value, ~30-40% of units → Moderate control
- **C Items:** 5-10% of value, ~40-50% of units → Loose control

For Cortex Health operations:
- **A Items:** GPU compute capacity (high cost, critical), core algorithms (high value)
- **B Items:** Support infrastructure, cloud storage
- **C Items:** Miscellaneous tools, documentation systems

### 6.5 Demand Forecasting

Accurate forecasts reduce safety stock and improve capacity planning.

**Methods:**
1. **Time Series:** Historical data patterns (trend, seasonality)
2. **Regression:** Relate demand to leading indicators (hospital volume, seasonal factors)
3. **Judgmental:** Expert opinion combined with data
4. **Collaborative:** Integrate supplier/customer input

For Cortex Health:
- Forecast hospital case volume based on contract size, seasonal patterns, market adoption
- Use exponential smoothing to forecast near-term demand
- Adjust for planned marketing/sales campaigns

### 6.6 Supply Chain Management

**Bullwhip Effect:** Small demand fluctuations cause large upstream swings in orders.

Example:
- Retailer sees 10% demand spike → Orders 20% more stock
- Distributor sees 20% spike → Orders 40% more stock
- Manufacturer sees 40% spike → Builds 80% more capacity
- Result: Massive overproduction; cascading inventory and cost increases

**Mitigation:**
- Share demand data downstream (retailers → distributors → manufacturers)
- Reduce lead times (faster adjustment possible)
- Standardize order quantities
- Implement pull-based (Kanban) rather than push-based supply

---

## Project Management Fundamentals

### 7.1 Gantt Charts & Critical Path

**Gantt Chart:** Timeline showing tasks, dependencies, and durations.

```
Task          |--[Jan]--[Feb]--[Mar]--[Apr]--|
Design        |████|
Development   |     |████████████|
Testing       |                  |███|
Deployment    |                      |█|
```

**Critical Path:** Longest sequence of dependent tasks. Delays on critical path delay entire project.

For Cortex Health implementation:
- Critical Path: Regulatory clearance → EHR integration → Pilot testing → Commercial launch
- Delay in any of these delays market launch
- Non-critical: Marketing collateral, training module development (can be done in parallel)

### 7.2 PERT (Program Evaluation & Review Technique)

Incorporates uncertainty. Three estimates per task:
- O = Optimistic time
- M = Most likely time
- P = Pessimistic time

Expected time: E = (O + 4M + P) / 6
Variance: σ² = [(P - O) / 6]²

Allows calculating project completion probability.

### 7.3 Resource Leveling & Crashing

**Resource Leveling:** Adjust task timing to smooth resource demand (avoid peak/valleys)
**Crashing:** Add resources to compress timeline (costly; only on critical path)

For Cortex:
- Instead of 5 engineers for 10 weeks → 2 engineers for 25 weeks (same effort, smoother load)
- To accelerate critical path: Add dev resources to EHR integration (critical task)

### 7.4 Risk Management

- **Identify:** What could go wrong? (Regulatory delays, technical challenges, key person departure)
- **Assess:** Probability × Impact score
- **Mitigate:** Reduce probability or impact (contingency plans, buffer time)
- **Monitor:** Track risk indicators during execution

---

## Healthcare Operations Optimization

### 8.1 Hospital Operations Management

Healthcare operations differ from manufacturing:

**Characteristics:**
- Demand unpredictable (emergencies, randomness)
- Service cannot be inventoried (bed available now or lost)
- High variability in patient acuity/complexity
- Multiple stakeholders (clinicians, patients, administrators)
- Highly regulated
- Life-critical quality

**Key Metrics:**
- **Patient Length of Stay (LOS):** Days in hospital (lower = less cost, higher throughput)
- **Operating Room (OR) Utilization:** % of scheduled time in use (target 80-85%; higher → conflicts/delays)
- **Patient Throughput:** Patients discharged per unit time
- **Readmission Rate:** % re-admitted within 30 days (lower = better quality)
- **Mortality Rate:** Deaths per 1000 patients (quality indicator)
- **Door-to-Intervention Time:** Critical for acute conditions (MI, stroke)

### 8.2 Clinical Workflow Optimization

**Imaging Workflow Example (where Cortex fits):**

```
Current State:
1. Patient → ER Arrival (variable wait)
2. Physician order imaging (variable processing time)
3. Imaging technician schedules (queue if backlog)
4. Patient transported & imaged (variable duration)
5. Radiologist reads study (variable time; often backlog)
6. Report generated (1-24 hours)
7. Clinician reviews & decides (variable)
8. Action taken (treatment, discharge, admit)

Bottleneck: Often radiologist review (high volume, expert scarcity)
Variability: Severity of cases varies; complex cases take longer
```

**Cortex Intervention:**

```
Improved State:
1-4. [Same]
5. AI analysis generates recommendations in parallel with radiologist review
6. Recommendations flag to radiologist immediately
7. Radiologist decision accelerated (accepts/rejects AI suggestion)
8. Action triggered automatically
```

**Impact:**
- Reduce radiologist cognitive load
- Catch critical findings faster (door-to-notification time reduced)
- Improve throughput (same number of radiologists serve more patients)
- Improve quality (AI catches patterns human might miss)

### 8.3 Staff Scheduling

Balancing:
- **Coverage:** Enough staff for demand (never understaffed)
- **Utilization:** Minimize idle time (cost)
- **Work Rules:** Shift hours, breaks, fatigue limits (regulatory, union)
- **Fairness:** Equitable scheduling across staff

**Queuing-inspired insight:** For emergency departments with variable arrival:
- Estimate arrival rate λ by time of day
- Schedule staff to maintain utilization 80-85% (avoid overload but not wasteful)
- Add float staff for peaks

### 8.4 Patient Flow & ED Optimization

**Emergency Department Metrics:**
- **Door-to-Triage:** <10 minutes (process patients quickly)
- **Triage-to-Room:** <30 minutes (move from waiting area to bed)
- **Bed-to-Disposition:** Decision to admit/discharge/transfer (target <4 hours)
- **Left-Without-Being-Seen (LWBS) Rate:** % leaving before treatment (target <2%; high rate indicates overcrowding)

**Process Improvements:**
- Fast Track: Low-acuity patients in separate area (reduces mix in main ED)
- Rapid Diagnostics: Stat labs, bedside imaging (reduce decision cycle time)
- Physician-in-Triage: Early assessment, immediate action for critical patients
- Dashboard Visibility: Display wait times, capacity status; set expectations

---

## SaaS & Tech Operations

### 9.1 Engineering Team Operations

Translating demand into shipped features efficiently.

**Key Metrics:**
- **Deployment Frequency:** How often can you release? (Daily = highly effective; quarterly = risky)
- **Lead Time for Changes:** Idea to production (shorter = more responsive)
- **Mean Time to Recovery (MTTR):** Time to restore service after incident (target <15 min)
- **Change Failure Rate:** % of deployments causing incidents (target <15%)

**Deployment Pipeline:**
```
Code Commit → Automated Tests → Build → Staging Deploy → Production Deploy → Monitor
```

Each stage has quality gates. Automate everything to enable frequent, safe deployments.

### 9.2 Sprint Velocity & Capacity Planning

**Sprint:** Fixed time-box (1-4 weeks) of work. Team commits to specific stories/tasks.

**Velocity:** Average story points completed per sprint (indicator of team capacity).

Example: Team velocity = 40 story points/sprint

If backlog = 120 story points, estimate 3 sprints (6 weeks) to complete.

**Burndown Chart:** Shows work remaining vs. time. Helps detect if sprint is on track.

### 9.3 Incident Management & SLA Management

**SLA (Service Level Agreement):** Commitment to uptime and performance.

Example: "99.9% uptime" = 43 minutes downtime/month

**Incident Response:**
1. **Detect:** Monitoring/alerts catch issue immediately
2. **Triage:** Severity assessment (Critical: customer impact; Major: degradation; Minor: cosmetic)
3. **Response:** Team pages on-call engineer
4. **Mitigation:** Quick fix or workaround deployed (target: <15 min)
5. **Resolution:** Root cause fix deployed (may take hours)
6. **Postmortem:** Blameless review; preventive measures

For Cortex Health:
- SLA: 99.95% uptime (21 minutes/month); <500ms recommendation latency p95
- Incident: If inference latency >2 seconds for 5+ minutes → Page on-call
- Recovery: Scale up compute (5 min); if that doesn't work, degrade model accuracy temporarily
- Postmortem: Why did latency spike? (Unusual case distribution? Cache miss? Resource competition?)

### 9.4 Technical Debt Management

Accumulation of shortcuts/suboptimal decisions made to ship faster. Debt increases over time:
- Code harder to understand
- Tests become flaky
- Deployment risk increases
- Team velocity slows (adding features takes longer)

**Debt Service:** Dedicate sprint capacity to debt paydown (refactoring, test improvements, infrastructure upgrades).

Recommended: 20-30% of sprint capacity for debt; prevents compounding.

---

## Strategic Operations Decisions

### 10.1 Make vs. Buy vs. Partner

**Make (Build In-House):**
- Pros: Full control, deep integration, potential competitive advantage
- Cons: High cost, long timelines, need internal expertise
- When: Core competency, unique requirements, high-volume internal need

**Buy (Purchase/License):**
- Pros: Fast time-to-market, leverage vendor expertise, lower initial cost
- Cons: Less customization, ongoing licensing cost, vendor lock-in risk
- When: Non-core, standardized solution exists, rapid deployment needed

**Partner (Joint Development/Revenue Share):**
- Pros: Share cost/risk, leverage partner expertise, integrated solution
- Cons: Dependency on partner, complexity of governance, profit sharing
- When: Complementary expertise, mutual customer benefit

For Cortex Health:
- **Make:** Core CDSS algorithms, model training, clinical validation (core competency)
- **Buy:** Cloud infrastructure (AWS/Azure), EHR connectivity (vendor solutions), NLP libraries (open-source)
- **Partner:** Regional distributors in Brazil (local market knowledge), hospital implementation services

### 10.2 Outsourcing & Offshoring

**Outsourcing:** Contract non-core work to external provider (onshore or offshore)

Pros:
- Focus on core business
- Flexible cost scaling
- Access specialized expertise

Cons:
- Loss of control over quality/timeline
- Communication overhead
- Knowledge loss (if outsourcing to competitor)

For Cortex Health:
- **Candidates for Outsourcing:** Customer support tier-1, data labeling for training, routine server maintenance
- **Keep In-House:** Algorithm development, clinical validation, customer relationships

**Offshoring:** Outsource to lower-cost country (e.g., development team in India, Brazil)

Pros: 30-50% cost savings
Cons:
- Time zone coordination challenges
- Quality variability
- Infrastructure may be less mature
- Regulatory/data sovereignty concerns (critical for healthcare!)

For healthcare SaaS in Brazil: Be cautious of offshoring data handling due to LGPD (Brazilian data protection law) and clinical regulations.

### 10.3 Vertical Integration

**Make:** Raw materials/components yourself
- Pros: Control cost, quality, supply reliability
- Cons: Capital intensive, less flexible, may not be best-in-class at each stage

**Buy:** Outsource to specialists
- Pros: Cost efficiency, flexibility, specialization
- Cons: Less control, coordination complexity, potential supply disruption

**Hybrid (Cortex Example):**
- Integrate with EHR vendors (buy/partner) for data access
- Build your own AI models (make) for differentiation
- Use cloud providers (buy) for infrastructure

---

## Wriston Manufacturing Case Study

### 11.1 Case Overview & Analysis

**Situation:** Wriston Manufacturing Corporation, a U.S. axle and transmission parts manufacturer, must decide the fate of its underperforming Detroit plant.

**Detroit Plant Performance Issues:**
- Negative ROA: -7% (losing money)
- Highest overhead burden rate: 6.0 (vs. Lancaster 0.71, Lima 1.56)
- Outdated machines, inadequate plant conditions
- High product complexity: 3 product groups, 20 product families, 120 product models (high variability)
- Poor labor metrics: High absenteeism, high turnover
- High maintenance costs, low productivity

**Three Strategic Options:**
1. **Close Immediately:** Massive termination costs ($6 million), employee disruption
2. **Close Gradually (5 years):** Transfer products to other plants, redeploy staff, maintain morale
3. **Invest/Modernize:** Update equipment, improve processes (high capital requirement, uncertain ROI)

### 11.2 Nico's Recommendation & Analysis

**Recommendation:** Gradual closure over 5 years with product transfers.

**Rationale from OM Perspective:**

**1. Capacity & Product Allocation:**

Using capacity utilization analysis:
- Lancaster, OH: Modern facilities, high capacity, state-of-the-art equipment → Ideal for high-volume products (Group 1: on-highway axles)
- Lima, OH: Compatible operations, available spare capacity of $48 million, lower overhead rate (1.56 vs. Detroit 6.0) → Ideal for Group 2 products
- Discontinue Group 3: Low margin, high complexity; better to exit than transfer

**2. Overhead Cost Reduction:**

Detroit manufacturing overhead rate = 2.13 (variable overhead per unit)
Lancaster manufacturing overhead = 0.71
Lima manufacturing overhead = 1.56

By transferring identical products to lower-overhead plants, expect significant cost reduction. Example:
- If Detroit makes 10,000 units @ $2.13 overhead = $21,300
- Same units in Lancaster @ $0.71 overhead = $7,100
- Savings: $14,200 per 10k units (67% reduction)

**3. Variability & Bottleneck Reduction:**

High product complexity (120 models) creates:
- Scheduling complexity (can't batch efficiently)
- Learning curve effects (workers switch between very different products)
- Inventory management complexity

Consolidating to fewer, larger-volume products in specialized plants:
- Reduces changeover time (fewer product variants per plant)
- Increases economies of scale
- Improves learning and productivity

**4. People & Organizational Capability:**

Detroit issues:
- Outdated equipment requires different skill set than modern plants
- High absenteeism/turnover (culture/morale problem)
- Seniority wages (union contract)

Gradual 5-year transition:
- Senior staff transfer to modern plants (retain institutional knowledge)
- Retrain on new equipment (not a surprise in month 1)
- New hiring in modern plants absorbs growth needs
- Avoids massive termination severance (6M risk reduced)

**5. Financial NPV Analysis (implicit):**

Gradual closure preserves more value than immediate closure:
- Avoids immediate $6M termination cost
- Allows time to sell equipment piecemeal (vs. fire-sale liquidation)
- Maintains relationships with customers (gradual transition vs. abrupt cutoff)
- Allows optimization of transfer logistics

### 11.3 Operations Lessons from Wriston

**Lesson 1: Complexity Costs**
- High product variety (120 models) forces high utilization, high inventory, high labor cost
- Consolidation to fewer variants is powerful cost lever

**Lesson 2: Facility Fit Matters**
- Don't try to force high-volume products through job-shop equipment
- Match product characteristics to facility capabilities
- Modern equipment pays for itself through lower overhead

**Lesson 3: People Transition Strategy**
- Don't underestimate talent retention/culture impact
- Gradual transition better than sudden shutdown
- Retrain and redeploy senior staff (expensive but valuable)

**Lesson 4: Theory of Constraints Applied**
- Detroit plant is the constraint (bottleneck) in Wriston's network
- Wriston should specialize other plants to higher-margin products
- Don't waste good capacity on poor-performing products

**For Cortex Health:**
- Monitor utilization of inference pipeline; ensure not running at >90% (will cause delays, quality issues)
- If customer hospital is underutilizing Cortex recommendations (<30% adoption), investigate fit vs. force-fit
- Gradual sunset support, don't abruptly cut off

---

## Cortex Health Operations Framework

### 12.1 Cortex's Three Operations Domains

Cortex Health's competitive advantage and operational excellence depends on three integrated domains:

#### **Domain 1: Clinical Implementation Operations**

Deploying AI-guided decision support into hospital workflows.

**Process:**
1. Pre-contract: Feasibility study, integration assessment, clinical workflow mapping
2. Technical integration: EHR API connection, data pipeline validation, security testing
3. Clinical validation: Test AI recommendations against historical cases, adjust thresholds
4. Staff training: Radiologists/clinicians learn system, build trust, define alert protocols
5. Go-live: Parallel run with existing workflow, monitoring for safety
6. Optimization: Gather feedback, refine alert criteria, identify edge cases

**Key Metrics:**
- Time-to-deployment (target: <12 weeks from contract to go-live)
- Clinical adoption rate (% of eligible cases using AI, target: >60% by month 3)
- Recommendation acceptance rate (% clinicians acting on AI suggestions)
- Time-to-value (reduction in decision time, improvement in throughput)
- Safety events (false negatives, clinical overrides not explained)

**OM Techniques Applied:**
- **Lean VSM:** Map current hospital workflow; identify bottlenecks where Cortex adds most value
- **Kaizen:** Monthly reviews with hospital partners; iterate alert thresholds, UI, training
- **Project Management:** Gantt chart for each deployment; critical path = clinical validation + staff training
- **Capacity Planning:** Balance implementation team workload across portfolio of hospitals

#### **Domain 2: Engineering Operations**

Shipping reliable, accurate, performant CDSS features.

**Process (DevOps Pipeline):**
```
Design → Development → Code Review → Testing → Staging → Production → Monitor/Alert
```

Each stage has quality gates; automate to enable rapid, safe deployment.

**Key Metrics:**
- Deployment frequency (target: daily)
- Lead time (code → production, target: <24 hours)
- Inference latency (target: <500ms p95)
- Uptime (target: 99.95%, ~21 min/month downtime)
- Model accuracy on test set (baseline for all deployments)
- Change failure rate (incidents from deployments, target: <10%)
- MTTR (mean time to recover from incident, target: <15 min)

**OM Techniques Applied:**
- **SPC:** Daily monitoring of latency, uptime, error rate; alert on anomalies
- **Queuing Theory:** If recommendation queue exceeds 50 cases, auto-scale compute
- **Six Sigma DMAIC:** If incident rate exceeds 10%, enter improve cycle (root cause, test solution, standardize)
- **Kanban:** Limit work-in-process per sprint; avoid task switching, focus on velocity

**Example Incident Response (Cortex):**

Scenario: P95 recommendation latency spikes from 200ms to 1200ms
1. **Detect (T+2min):** Alert fires; dashboard shows queue backing up
2. **Triage (T+5min):** On-call engineer pages; determines cause (unusual case distribution hitting edge case in preprocessing)
3. **Mitigate (T+10min):** Scale compute replicas from 5 → 10; queue drains; latency recovers
4. **Root Cause (T+30min):** Review logs; found that cases with nested structures triggered full re-scan (not efficient batching)
5. **Fix (T+4hours):** Deploy optimized preprocessing; test against historical data
6. **Postmortem (T+24hours):** Blameless review; action items: improve monitoring for queue depth anomalies, add regression test for nested cases

#### **Domain 3: Customer Success Operations**

Maximizing customer value, adoption, and retention.

**Process:**
1. Onboarding: Project plan, stakeholder alignment, success metrics definition
2. Training: System training, clinical protocol definition, troubleshooting
3. Support: Tier-1 (chatbot/docs), Tier-2 (technical support), Tier-3 (clinical review board)
4. Adoption Monitoring: Track usage metrics; flag at-risk accounts
5. Value Realization: Measure agreed KPIs (throughput, time-to-decision, accuracy); document value
6. Renewal: Annual contracts; add new imaging modalities or hospitals; expand use cases

**Key Metrics:**
- Time-to-productivity (days until customer sees value)
- Adoption curve (% recommendations acted upon over time)
- Net Promoter Score (NPS, target: >50)
- Customer churn (target: <5% annual)
- Revenue retention (including expansions and upsells)
- Customer lifetime value (LTV) vs. customer acquisition cost (CAC); target LTV/CAC > 3

**OM Techniques Applied:**
- **Demand Forecasting:** Predict churn risk using adoption curves, feature requests, support tickets
- **Kanban:** Customer support queue; limit concurrent cases per support engineer
- **SPC:** Monitor NPS and adoption rate; alert if trend negative (process out of control)
- **Value Stream Mapping:** For at-risk customer, map their workflow to identify where Cortex could add more value (upsell opportunity)

### 12.2 Integration Across Domains

The three domains must coordinate:

**Clinical Implementation ↔ Engineering:**
- Implementation team identifies clinical needs from hospitals → Engineering backlog input
- Engineering deploys new model → Implementation team trains hospitals on new capability
- SLA alignment: If uptime drops below 99.95%, customers affected → Customer success must proactively communicate

**Engineering ↔ Customer Success:**
- New features deployed → Customer success trains customers and monitors adoption
- Customer feedback loop → Engineering prioritizes bug fixes over new features if adoption blocked

**Clinical Implementation ↔ Customer Success:**
- Implementation team hands off to CS team at go-live
- CS team monitors adoption metrics; if <30%, escalates to implementation team for retraining or clinical adjustment
- CS team gathers customer feedback → Implementation team uses for next deployment cycle

**Example: New Chest X-Ray Model Deployment**

1. **Engineering:** Develops new model for pneumonia detection (monthly accuracy check passed)
2. **Implementation:** Works with pilot hospital to validate new model on 500 historical cases; clinicians review false negatives/positives; recommend alert threshold adjustment
3. **Engineering:** Retrains model with feedback; passes testing; deploys to production
4. **Customer Success:** Notifies all hospitals of new capability; trains radiologists on new alert logic; monitors adoption (% of cases using new model); tracks clinical outcomes
5. **Feedback Loop:** If adoption low, CS escalates to Implementation; if clinical outcomes different from expected, escalates to Engineering

### 12.3 Key OM Initiatives for Cortex Health

**Initiative 1: Standardize Clinical Workflows**

**Objective:** Reduce implementation time and risk by standardizing how we integrate with hospital workflows.

**Approach:**
- Define three standard integration patterns (patterns for common workflows)
- Pre-build integration templates for each pattern
- Validate with 5 pilot hospitals

**Expected Impact:**
- Reduce deployment time from 12 weeks to 8 weeks (33% faster)
- Reduce implementation team size per deployment (more leverage)
- Increase new customer velocity

**OM Concepts:** Process standardization (continuous flow reduces variability)

**Initiative 2: Implement DevOps Pipeline Excellence**

**Objective:** Enable daily deployments without increasing incident rate.

**Approach:**
- Automate testing (unit, integration, model accuracy regression)
- Implement feature flags (deploy to subset before full rollout)
- Establish SLOs (Service Level Objectives) with alerts for SLO misses
- Weekly postmortems (blameless culture)

**Expected Impact:**
- Increase deployment frequency from 2x/week to daily (5x improvement)
- Maintain incident rate at <10% of deployments
- Reduce lead time from idea to production from 1 week to <24 hours

**OM Concepts:** Statistical process control (SPC), incident management (rapid MTTR)

**Initiative 3: Build Adoption Prediction & Intervention Model**

**Objective:** Identify at-risk customers early; intervene before churn.

**Approach:**
- Develop leading indicators of adoption success (early-stage metrics to watch)
- Build predictive model: recommendation acceptance rate, clinician feedback, engagement metrics → churn risk
- Define intervention playbook (what to do when risk detected)

**Expected Impact:**
- Reduce customer churn from 8% to <5% annually
- Increase NPS from 45 to 55+
- Increase revenue retention (including expansions)

**OM Concepts:** Demand forecasting, kaizen (continuous improvement based on customer data)

**Initiative 4: Optimize Inference Pipeline**

**Objective:** Reduce recommendation latency and cost.

**Approach:**
- Profile current bottleneck (likely preprocessing or model inference)
- Implement model distillation (smaller, faster model with 95% accuracy of full model)
- Parallel process preprocessing + inference
- Implement caching layer for common case types

**Expected Impact:**
- Reduce p95 latency from 500ms to 200ms (2.5x improvement)
- Reduce compute cost per case by 25%
- Improve customer experience (faster recommendations)

**OM Concepts:** Bottleneck analysis, Theory of Constraints, process optimization

**Initiative 5: Establish Clinical Validation SOP**

**Objective:** Ensure all model updates meet safety/quality standards before production.

**Approach:**
- Define clinical validation checklist (accuracy thresholds, edge case testing, clinician review)
- Implement automated regression testing (model doesn't degrade on historical cases)
- Establish clinical review board (rotating radiologists validate model quarterly)

**Expected Impact:**
- Reduce false negative rate to <1% (safety)
- Build customer trust (transparency in model quality)
- Reduce regulatory/compliance risk

**OM Concepts:** Quality management (Six Sigma DMAIC), process control

### 12.4 Measurement & Governance

**Operations Dashboard (Real-Time Monitoring):**

| Domain | Metric | Target | Frequency | Owner |
|--------|--------|--------|-----------|-------|
| Clinical Implementation | Average deployment time | <8 weeks | Monthly | VP Ops |
| Clinical Implementation | New hospital adoption rate | >60% @ 12 weeks | Monthly | Head of CS |
| Engineering | Deployment frequency | Daily | Real-time | VP Eng |
| Engineering | Incident rate | <10% of deployments | Weekly | On-call |
| Engineering | Uptime | 99.95% | Real-time | Infra Lead |
| Engineering | Model accuracy | >95% on test set | Weekly | ML Lead |
| Customer Success | Net Promoter Score | >50 | Quarterly | Head of CS |
| Customer Success | Revenue retention | >100% (net expansion) | Quarterly | CFO |
| Customer Success | Churn rate | <5% annually | Monthly | Head of CS |

**Quarterly Operations Review:**
- Present metrics against targets
- Discuss root causes of any variances
- Prioritize process improvement initiatives for next quarter
- Forecast headcount/budget needs

---

## Conclusion: Operations as Competitive Moat

For Cortex Health to succeed in the Brazilian healthcare market and globally, operational excellence is non-negotiable:

1. **Clinical Implementation Speed** → Faster path to value, lower customer acquisition cost
2. **Engineering Reliability** → SLAs met = customer trust; uptime breaches = churn
3. **Customer Success Velocity** → High adoption, expansion revenue, retention (LTV critical in SaaS)
4. **Cost Efficiency** → Lower infrastructure cost + efficient customer delivery = margin and competitive pricing

The OM frameworks presented (lean, queuing theory, Six Sigma, capacity planning, project management) are tools to drive these outcomes. Success requires:

- **Measurement:** Define metrics for each domain; track obsessively
- **Discipline:** Root-cause analysis after problems; implement fixes; verify effectiveness
- **Culture:** Kaizen mindset (continuous improvement); blameless postmortems; empower all staff to identify waste
- **Integration:** Clinical → Engineering → Customer Success must coordinate seamlessly

Cortex's technology is powerful, but operations excellence determines whether that power translates to customer value and business success.

---

## References

- Warren, G. (2023). Business Process Analysis. Carey Business School.
- Hammond, J. (1997). Wriston Manufacturing Corp. Harvard Business Publishing, Product #698049-PDF-ENG.
- Goldratt, E. (1984). The Goal. North River Press.
- Hayes, R. & Wheelwright, S. (1984). Restoring Our Competitive Edge: Competing Through Manufacturing. John Wiley & Sons.
- Toyota Production System: Lean Manufacturing & Kaizen Principles.
- Davis, M. & Heineke, J. (2003). Operations Management: Integrating Manufacturing and Services. McGraw-Hill.

---

**Document Version:** 2.0
**Last Updated:** March 2026
**Maintained By:** ARCHIE Operations Framework
**Classification:** Internal Use - Cortex Health Leadership
