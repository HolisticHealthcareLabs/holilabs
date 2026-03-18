# Health Analytics

**Course Code:** 101097 | **Term:** FA25
**Institution:** JHU Carey Business School
**Instructor:** Maqbool Dada (dada@jhu.edu)

---

## Course Overview

### Welcome to Health Analytics

Health Analytics is a comprehensive course designed to equip healthcare leaders, clinicians, and operations professionals with quantitative tools to measure, analyze, and improve clinical and operational performance. This course builds analytical competency in process design, capacity planning, cost accounting, efficiency benchmarking, and workflow optimization—all critical to demonstrating value in value-based care models.

### Course Structure and Grading

The course is organized into eight modules, each building on prior concepts:
- **Problem Sets (42% of grade):** Practical exercises applied to realistic healthcare scenarios
- **Group Projects (14% of grade):** Two collaborative assignments (Module 4 and Module 7) requiring synthesis of multiple analytical approaches
- **Final Exam (44% of grade):** Cumulative assessment of all course objectives

### Learning Objectives

By the end of this course, students will be able to:

1. **Define, map, and measure characteristics of a care delivery process** — create visual representations of workflows, identifying inputs, throughputs, work-in-process inventory, and cycle times across care pathways
2. **Recognize and articulate linkages between jobs in process, cycle times, and processing rates via Little's Law** — apply the fundamental equation relating inventory, throughput, and flow time to predict system behavior
3. **Define and measure the rate of workflow, identify bottleneck resources, and explain how to manage bottleneck and system capacity** — recognize constraint resources and design strategies for throughput optimization
4. **Use performance and/or outcome data to define a systemic issue, convey the issue to stakeholders, and rationalize a response** — translate analytics into actionable business cases
5. **Measure resource utilization and assess its impact on system congestion and service delivery** — model queueing behavior and staffing requirements
6. **Measure cost of service delivery in a healthcare setting** — apply time-driven activity-based costing (TDABC) to clinical pathways
7. **Compare units that deliver care in a way that can encompass financial, medical, and strategic elements** — use data envelopment analysis (DEA) for multi-dimensional efficiency benchmarking

---

## Module 1: Process Analysis I — Foundations

### Process Fundamentals

**Definition of a Process:**
A process is a set of interrelated work activities characterized by specific inputs, value-added tasks, and measurable outputs. Processes may be confined within a single functional unit (e.g., a radiology department) or span multiple organizations (e.g., a patient's journey across an emergency department, surgical suite, and recovery).

**Why Care About Processes in Healthcare?**
- Identify constraints limiting performance
- Allocate scarce resources effectively
- Quantify improvement opportunities
- Justify operational investments to leadership
- Standardize care delivery and reduce variation

### Key Process Metrics

**Throughput (Flow Rate):** The average rate of output from a process per unit time, measured in units/hour or patients/day. In healthcare, this might be surgeries per operating room per shift or patients evaluated per clinic hour.

**Cycle Time (Flow Time):** The total elapsed time a job (patient) spends in a system from entry to exit, including all processing time, setup time, waiting time, and transportation time. For a surgical patient, this includes preop prep, OR time, recovery, and discharge activities.

**Capacity:** The maximum sustainable rate of output for a process per unit time. For an ED with 25 beds and average LOS of 4 hours, capacity = 25 beds ÷ 4 hours = 6.25 patients/hour.

**Bottleneck Resource:** The process step with the lowest capacity, which determines system throughput. If a single cardiac catheterization lab can process 8 patients/day but surrounding pre-procedure and recovery areas can handle 12, the cath lab is the bottleneck.

**Utilization:** The ratio of capacity actually used to total available capacity. Calculated as: Utilization = (Demand / Capacity) or (Active Processing Time / Total Available Time). A surgical suite with 10 ORs operating 9 hours/day with actual cases averaging 7.5 hours/day has utilization = 7.5/10 = 75%.

**Set-up Time:** Fixed time required to initiate a process step, independent of job size. In OR: time to position patient, drape, and begin procedure regardless of case complexity.

**Run Time:** Processing time per unit, independent of setup. The actual surgical procedure time per case.

**Takt Time:** Average time between completion of successive units. Takt Time = 1 / Capacity. If a phlebotomy station can draw 12 patients/hour, takt time = 5 minutes.

### Process Flow Diagrams

A process flow diagram is a graphical representation of all activities, decision points, parallel paths, and resources in a process. Visual mapping is essential because:
- It forces explicit understanding of actual (not assumed) workflows
- It reveals redundancies, bottlenecks, and rework loops
- It communicates process logic to stakeholders
- It enables cycle time decomposition

**Elements of a Process Flow Diagram:**
- **Activities (boxes):** Named tasks with estimated processing time
- **Decision points (diamonds):** Clinical or operational branch points
- **Sequences (arrows):** Show dependencies and flow direction
- **Parallel paths:** Activities that can occur simultaneously
- **Rework loops:** Activities triggered by failures or exceptions

### Cycle Time Decomposition

Total cycle time = Processing Time + Setup Time + Waiting Time + Transportation Time + Rework Time

In healthcare operations, the non-value-added components (waiting, transportation, rework) often dominate. A patient with 45 minutes of actual clinical contact time might have a 4-hour ED cycle time due to registration, triage, waiting, and transport delays.

---

## Module 2: Little's Law and System Dynamics

### Little's Law: The Fundamental Equation

Little's Law states that the average number of jobs in a system (I) is equal to the arrival rate (λ) times the average cycle time (CT):

**I = λ × CT**

Or rearranged: **CT = I / λ**

This deceptively simple formula reveals profound truths about process behavior:

1. **Reducing cycle time** without changing arrival rate reduces WIP inventory (fewer patients in the system at once)
2. **Increasing throughput** (reducing bottleneck cycle time) requires proportional increases in capacity or acceptance of longer queues
3. **System stability** requires arrival rate < service capacity; if λ ≥ μ, queues grow unbounded

### Practical Application in Healthcare

**Example: Inpatient Hospital Floor**
- 40-bed surgical unit
- Average daily admissions (λ) = 8 patients/day
- Average length of stay (CT) = 5 days
- Predicted average census (I) = 8 × 5 = 40 patients

This matches capacity exactly at 100% utilization (high risk). To absorb demand variability and reduce wait times, the unit should operate at 85% utilization:
- Target census = 40 × 0.85 = 34 patients
- Required beds = 40 beds

**Example: ED Triage**
- Arrival rate λ = 120 patients/shift
- Average triage + registration time CT = 20 minutes = 0.33 hours
- Expected patients in triage queue (I) = 120 × 0.33 = 40 patient-hours
- With 3 triage nurses averaging 0.5 patients/minute: throughput = 90/shift
- Queue builds: inventory (I) grows over the shift, increasing cycle times

### Bottleneck Analysis

The bottleneck is the process step with minimum capacity (maximum cycle time). For a multi-step process:
1. Calculate cycle time at each step
2. Identify the step with longest cycle time
3. System throughput = 1 / (bottleneck cycle time)
4. All non-bottleneck steps have excess capacity

**Strategy for Bottleneck Management:**
- **Invest in bottleneck resources** — adding staff, equipment, or parallel capacity at the constraint yields maximum ROI
- **Avoid adding non-bottleneck resources** — investment is wasted (excess capacity already exists)
- **Consider resource pooling** — shared resources between steps can reduce bottleneck load (e.g., cross-trained phlebotomists vs. dedicated Lab draw team)
- **Redirect work** — offload non-essential tasks from the bottleneck to other resources

### Capacity and Throughput Planning

**Capacity Utilization Formula:**
ρ = λ / μ
where λ = arrival rate, μ = service capacity per resource

**Rule of thumb for service systems:** Safe operating utilization = 70-80%. Operating above 85% creates queues and variability.

**Multi-resource System:**
System Capacity = minimum(μ₁, μ₂, μ₃, ..., μₙ)
System Throughput = limited by bottleneck capacity

---

## Module 3: Managing Shared Resources in Healthcare

### Challenge of Shared Resources

In healthcare settings, clinical and operational resources are often shared across multiple concurrent processes or patients. This creates scheduling complexity absent in purely sequential manufacturing.

**Example: Surgical Suite with Shared Resources**

Dr. Twofer performs bogotectomies using two ORs in parallel. A patient is prepped in Room 1 (35 min), then Dr. Twofer operates in Room 1 for 25 min while Room 2 is prepped. After Room 1 procedure, 15 min cleaning, 5 min scrub/gown change, then Room 2 case. The cycle repeats.

**Calculation of Resource Utilization:**
- Surgeon's active work: 5 (scrub) + 25 (op) + 5 (scrub) + 25 (op) + 5 (scrub) = 65 min per 90-min session
- Surgeon utilization = 65/90 = 72.2%
- Room 1: prepped 0-35, ops 35-60, cleaned 60-75, prep surgery 3 at 75-110 = 150 min occupied
- Room 2: prepped 30-65, ops 65-90 = 75 min occupied
- Room utilization (both rooms) = (150 + 75) / (2 × 150) = 75%

**Cost-Benefit of Resource Pooling:**

| Configuration | Session Time | Room Cost | Surgeon Cost | Total Cost |
|---------------|-------------|-----------|------------|-----------|
| 2 Rooms (Current) | 2.5 hours | 2 × 2.5 × $1000 = $5000 | 2.5 × $250 = $625 | $5625 |
| 1 Room (Sequential) | 3.75 hours | 3.75 × $1000 = $3750 | 3.75 × $250 = $937.50 | $4687.50 |

**Conclusion:** Despite lower surgeon utilization, one room is more cost-effective when room charges dominate ($937.50 surgeon savings vs. $1250 room savings).

### Shared Resource Scheduling with Gantt Charts

A Gantt chart visualizes activity sequences, resource allocation, and time dependencies. For clinic with shared sonography equipment:

**Scenario A: Independent Clinic Operations**
- SafeBirth clinic: reception (10 min), nurse assessment (15 min), physician consult (50 min), sonography (50 min), discharge
- Sonographer is bottleneck at 70 min per patient
- Capacity = 60 min/hour ÷ 70 min/patient = 0.86 patients/hour

**Scenario B: Parallel Joint Consult**
- Reception (15 min) → parallel: Nurse + Physician + Sonographer consult (40 min) → discharge
- Bottleneck = joint consult at 40 min
- Capacity = 60 ÷ 40 = 1.5 patients/hour
- **Improvement: 74% increase in throughput** while reducing patient cycle time

### Parallelize to Reduce Cycle Time

When precedence constraints allow:
- Break sequential paths into parallel streams
- Identify longest path (critical path) through network
- Bottleneck = longest path activity, not busiest resource

**Example: Treatment Manufacturing**
8-step treatment process:
- Path 1: A (3 min) → B (2 min) → E (6 min) → G (6 min) → H (2 min) = 19 min
- Path 2: A (3 min) → C (12 min) → H (2 min) = 17 min
- Path 3: A (3 min) → D (8 min) → F (7 min) → H (2 min) = 20 min

Critical path = Path 3 at 20 min. **Bottleneck activity is the longest path, not C at 12 min.**

System throughput = 1 / 20 min = 3 treatments/hour (vs. 5/hour if C were serial)
WIP inventory = 3 treatments/hour × (1/3 hour) = 1 unit

---

## Module 4: Time-Driven Activity-Based Costing (TDABC)

### The Cost Crisis in Healthcare

Traditional healthcare accounting allocates costs by department or cost center, obscuring true clinical pathway costs. Issues:
1. **Variation hidden:** All cases in a DRG are costed identically despite significant resource consumption differences
2. **Cross-subsidization:** Efficient clinical teams subsidize inefficient ones; unprofitable services hidden
3. **Decision paralysis:** Clinicians lack cost visibility to make evidence-based choices
4. **Profitability paradox:** High-volume services may be money-losers; low-volume services highly profitable

### TDABC Framework (Kaplan & Porter)

TDABC overcomes traditional ABC limitations by requiring only two parameters:
1. **Capacity Cost Rate (CCR):** Unit cost of providing capacity per time period
2. **Time Equations:** Time required to deliver each activity, accounting for complexity variation

**Formula:**

Cost of activity = CCR × time equation

Where:
- CCR = (Total Departmental Cost / Practical Capacity in Minutes)
- Time equation = base activity time + time adjustments for complexity/variation

### Step 1: Calculate Capacity Cost Rate

**Example: Cardiology Clinic with 3 cardiologists**

Annual operating costs:
- Physician salaries: 3 × $300,000 = $900,000
- Staff (nurses, clerical): $400,000
- Facilities, equipment, supplies: $300,000
- Total: $1,600,000

Practical capacity:
- 240 working days/year × 8 hours/day × 60 min/hour = 115,200 minutes
- Subtract vacation (20 days × 480 min) = 115,200 - 9,600 = 105,600 minutes

**CCR = $1,600,000 / 105,600 min = $15.15 per minute**

### Step 2: Develop Time Equations

Map all activities and estimate time including complexity variation:

**Standard Office Visit (low complexity):**
- Check-in & vital signs: 5 min
- Physician visit: 20 min
- EKG (if indicated): 10 min
- Simple follow-up discharge: 5 min
- **Total: 40 min**

**Complex Case with Diagnostic Workup:**
- Check-in & vital signs: 5 min
- Detailed history & physical: 35 min
- EKG: 10 min
- Echocardiogram ordering & coordination: 15 min
- Medication adjustment: 15 min
- Education & risk counseling: 20 min
- **Total: 100 min**

**Time Equation for Office Visit:**
Time = 40 + (20 if echocardiogram ordered) + (15 if medication adjusted) + (10 if extensive counseling)

### Step 3: Assign Costs to Activities

Using CCR = $15.15/min:

| Activity | Time | Cost |
|----------|------|------|
| Standard Follow-up | 40 min | $606 |
| Complex New Patient | 100 min | $1,515 |
| Simple Telephone Consult | 15 min | $227 |

### Step 4: Build Resource Consumption Model

For a clinical pathway (e.g., Atrial Fibrillation diagnosis & management):

**Initial diagnosis visit:** 80 min office, 15 min EKG = 95 min = $1,439
**Anticoagulation clinic visit:** 30 min evaluation, 5 min counseling = 35 min = $530
**Follow-up visits (avg 4/year per patient):** 40 min each = $606 per visit

**Annual cost per AF patient: $1,439 + $530 + (4 × $606) = $4,363**

This reveals:
- Cost variability by patient complexity
- Profitability by payer and disease
- Opportunities for process redesign (time reduction)
- Justification for prevention/management programs

### Healthcare Applications of TDABC

**Clinical Pathway Costing:**
- Knee replacement: labor, implant, imaging, therapy
- Sepsis management: ED evaluation, ICU stay, cultures, antibiotics
- Chronic disease: office visits, diagnostics, monitoring, medications

**Service Line Profitability:**
Reveal true operating margin by service line accounting for variation, not just revenue minus department overhead.

**Capacity Planning:**
If cardiology visits cost $15.15/min, hiring a new cardiologist (240 × 480 min = 115,200 min capacity) costs the organization:
115,200 min × $15.15/min = $1,745,280 in incremental annual cost

This justifies the salary and infrastructure investment only if incremental revenue exceeds this cost.

**Process Redesign ROI:**
Reducing average visit time from 40 to 35 minutes saves:
5 min × $15.15/min = $75.75 per visit
For 1,000 visits/year = $75,750 annual savings

---

## Module 5: Data Envelopment Analysis for Benchmarking

### Efficiency Measurement Challenge

Comparing healthcare organizations or units requires balancing multiple inputs and outputs:
- **Inputs:** Staff, beds, equipment, supplies, patient complexity
- **Outputs:** Patients served, procedures, quality metrics, research

Traditional metrics (cost per patient, case volume) are one-dimensional and misleading.

### Data Envelopment Analysis (DEA) Framework

DEA is a linear programming method that compares each unit (hospital, clinic, surgeon) to identify the "efficient frontier" — the set of best performers that no single metric dominates.

**Key Concepts:**

**Virtual Inputs and Virtual Outputs:**
DEA assigns mathematical weights to multiple inputs and outputs to create composite "virtual" input and output values:

Virtual Input = w₁×(Staff) + w₂×(Equipment) + w₃×(Supplies)
Virtual Output = v₁×(Patients) + v₂×(Quality Score) + v₃×(Research Output)

**Efficiency Score:**
Efficiency = Virtual Output / Virtual Input (ratio between 0 and 1)

An efficient unit (e = 1) produces the maximum output per unit input relative to all other units.

**CCR Model (Charnes-Cooper-Rhodes):**
Identifies units that cannot improve efficiency without worsening another dimension. Assumes constant returns to scale.

**BCC Model (Banker-Charnes-Cooper):**
Allows variable returns to scale; units operating below optimal scale may show lower efficiency even with good management.

### DEA Applied to Hospital Departments

**Example: Comparing 5 Hospital Laboratory Units**

| Lab | Full-Time Staff | Equipment Investment | Annual Patients | Quality Score (0-100) | Efficiency |
|-----|-----------------|----------------------|-----------------|----------------------|-----------|
| A | 12 | $500K | 15,000 | 92 | 1.00 |
| B | 15 | $600K | 16,000 | 88 | 0.89 |
| C | 18 | $800K | 18,000 | 90 | 0.82 |
| D | 10 | $400K | 12,000 | 95 | 0.98 |
| E | 20 | $700K | 14,000 | 85 | 0.76 |

**Interpretation:**
- Lab A is fully efficient (frontier unit)
- Lab B operates at 89% efficiency; could achieve same output with ~13.4 FTE and $534K equipment
- Lab E is inefficient (76%); either reduce input consumption or increase output to match peers

**Peer benchmarking:**
Each inefficient unit is compared to a combination of efficient units, suggesting targets for improvement.

### Quality-Quantity Tradeoff

In DEA, ensuring quality is not sacrificed for quantity:

**Constraint:** Each quality output weight must be ≥ every quantity output weight

If quality has 5 output weights (x₁, x₂, x₃, x₄, x₅) and quantity has 3 (y₁, y₂, y₃):
- x₁ ≥ max(y₁, y₂, y₃)
- x₂ ≥ max(y₁, y₂, y₃)
- x₃ ≥ max(y₁, y₂, y₃)
- ... etc

This ensures quality metrics receive equal or greater emphasis than volume metrics in the efficiency calculation.

### Limitations and Considerations

- **Data quality:** Garbage inputs = garbage efficiency scores
- **Outliers:** One exceptional unit creates unrealistic benchmarks for others
- **Homogeneity:** Compare similar units; comparing a rural clinic to an academic medical center is inappropriate
- **External factors:** DEA doesn't account for patient complexity, payer mix, or geography differences
- **Causation:** DEA identifies efficient combinations but doesn't explain why some units achieve them

---

## Module 6: Queuing Theory and Waiting Times

### Variability and Queues in Healthcare

Unlike manufacturing with scheduled batches, healthcare demand is largely random. Patients arrive without notice, service times vary (simple vs. complex cases), and staff availability fluctuates. This inherent variability creates queues.

**Key insight:** In a stable system (λ < μ), queues form due to randomness, not insufficient capacity.

### M/M/1 Queue (Single Server)

**Notation:** M/M/1 = Markovian arrivals / Markovian (exponential) service / 1 server

**Assumptions:**
- Arrivals follow Poisson distribution (constant arrival rate λ)
- Service times follow exponential distribution (constant mean 1/μ)
- Single server (e.g., one nurse practitioner in a clinic)
- FIFO queue discipline

**Key Formulas:**

Utilization: ρ = λ/μ

Average waiting time in queue: Wq = ρ/(μ - λ) = λ/(μ(μ - λ))

Average number in queue: Lq = λ²/(μ(μ - λ))

Average cycle time: W = 1/(μ - λ)

Average number in system: L = λ/(μ - λ)

**Stability condition:** λ < μ (arrival rate must be less than service capacity)

### Example: Volunteer Clinic with Single Provider (M/M/1)

- Arrival rate λ = 10 patients/hour
- Service rate μ = 12 patients/hour
- Utilization ρ = 10/12 = 83.3%

**Calculations:**

Wq = 10/(12 × (12 - 10)) = 10/24 = 0.417 hours = **25 minutes average wait**

Lq = 10²/(12 × 2) = 100/24 = **4.2 patients waiting in queue**

W = 1/(12 - 10) = 0.5 hours = **30 minutes average cycle time**

L = 10/2 = **5 patients in system (waiting + being served)**

**Critical insight:** At 83% utilization, average wait time is 25 minutes. This seems reasonable, but variability creates wide swings. Some patients wait seconds; others wait hours.

### Exponential Sensitivity to Utilization

As arrival rate approaches service capacity, waiting times increase **exponentially**, not linearly:

| λ (arrival) | μ (service) | ρ (util) | Wq (minutes) |
|------------|-----------|---------|-------------|
| 6 | 12 | 50% | 2.5 |
| 9 | 12 | 75% | 10 |
| 10 | 12 | 83% | 25 |
| 11 | 12 | 92% | 69 |
| 11.5 | 12 | 96% | 146 |

**Rule for service systems:** Maintain utilization ≤ 70-80% to keep waiting times acceptable. Operating at 90%+ is economically dangerous because small demand increases cause dramatic wait time increases.

### M/M/c Queue (Multiple Servers)

When a single provider becomes a bottleneck, adding parallel servers (nurses, doctors) reduces waiting times dramatically.

**Example: Radiology Department with Multiple Radiologists (M/M/c)**

- Arrival rate λ = 10 exams/hour
- Service rate per radiologist μ = 4 exams/hour
- Number of radiologists c = 3

- Utilization ρ = λ/(c × μ) = 10/(3 × 4) = 83%
- Wq with 3 radiologists = 0.351 hours = **21 minutes**

Compare to scenarios:
- 2 radiologists: Wq = **unstable** (λ = 10 > c × μ = 8)
- 4 radiologists: Wq = 0.053 hours = **3.2 minutes**
- 5 radiologists: Wq = 0.013 hours = **0.78 minutes**

**Insight:** Adding the 4th radiologist reduces wait time by 94% (21 to 1.3 min). The 5th adds marginal value (diminishing returns).

### Staffing Decision Framework

**Question:** Should we hire a 4th radiologist?

Costs and benefits:
- **Cost of 4th radiologist:** $150,000 annual salary + benefits
- **Benefit of reduced wait time:** Lower cancellations, improved patient satisfaction, higher throughput

Using queuing theory:
- With 3 radiologists: Avg patients waiting = Lq = 3.5 patients
- With 4 radiologists: Avg patients waiting = Lq = 0.35 patients
- **Reduction = 3.15 patients × 30 min × $0.10/min (patient satisfaction value) = $9.45/hour**
- Annual benefit = 2,000 work hours × $9.45 = $18,900

Marginal case; other factors (peak demand, growth projection, clinical quality) should guide decision.

### Variability and the "Chunk" Effect

In discrete-capacity healthcare systems, capacity increases in chunks. A radiology practice operating at 83% utilization with 3 radiologists serving 10 exams/hour cannot accommodate demand increase to 11 exams/hour without hiring a full radiologist.

**Implication:** Strategic staffing decisions must account for:
1. Current demand vs. capacity
2. Forecasted demand growth trajectory
3. Discrete nature of hiring decisions
4. Opportunity cost of underutilization vs. overflow risk

---

## Module 7: Clinical Operations and Patient Flow

### Process Optimization in Clinical Settings

Healthcare operations present unique challenges absent in traditional service industries:

1. **High variability:** Case mix, patient complexity, emergency arrivals
2. **Shared resources:** Equipment, personnel assigned across multiple concurrent cases
3. **Precedence constraints:** Certain steps cannot begin until prior steps complete
4. **Quality interdependency:** Process speed cannot compromise clinical outcomes

### Patient Flow Management: Emergency Departments

ED overcrowding affects clinical quality, patient satisfaction, and safety:
- **Door-to-room time** target: <30 minutes (affects patient perception)
- **ED boarding (admitted patients waiting for bed)** >2 hours correlates with worse outcomes
- **Throughput** limited by imaging, lab turnaround, and bed availability downstream

**Flowtime Analysis for ED Admit:**

| Activity | Time (min) | Cumulative |
|----------|-----------|-----------|
| Triage & Registration | 15 | 15 |
| Waiting for bed | 45 | 60 |
| Initial assessment & vital signs | 20 | 80 |
| Physician evaluation | 30 | 110 |
| Diagnostic testing (lab, imaging) | 45 | 155 |
| Physician decision & discharge paperwork | 20 | 175 |
| **Total cycle time** | | **175 min** |

Process bottleneck: Diagnostic turnaround (45 min) and waiting for bed (45 min). Processing content (direct clinical time) = 105 min; non-value-added time (waiting) = 70 min (40%).

**Intervention:** Parallel processing
- Instead of sequential "test then wait for results," place orders immediately during physician evaluation
- Utilize ED bed for patient monitoring while tests run
- Expected reduction: 175 min → 140 min (20% improvement)

### Length of Stay Optimization

High length of stay (LOS) indicates process inefficiency or clinical complexity. Hospitals should:

1. **Benchmark by diagnosis** — compare LOS for similar DRGs across departments
2. **Identify outliers** — patients with unusually long stays
3. **Root-cause analysis** — delayed discharge (waiting for transportation, family availability) vs. clinical complications
4. **Capacity implications** — reducing average LOS from 5 to 4.5 days frees ~8% of beds for additional admissions

**Formula:** Expected bed requirement = (Average daily admissions) × (Average LOS)

Reducing LOS has direct ROI on bed utilization and financial performance.

### Readmission and Complication Prevention

Analytics identify readmission risk factors:
- **Age, comorbidities, socioeconomic status** (fixed factors)
- **Discharge planning quality, post-discharge monitoring, medication adherence** (modifiable)

Hospitals using predictive models to target high-risk patients for intensive follow-up (nurse calls, home visits, medication reconciliation) report 10-20% readmission reductions, generating significant savings.

---

## Module 8: Statistical Methods and Outcome Measurement

### Donabedian Framework: Structure, Process, Outcomes

Healthcare quality has three dimensions (Donabedian, 1966):

**Structure (inputs):** Facilities, equipment, staffing, training
- Example: Board certification of physicians, ICU nurse-to-patient ratios, equipment availability

**Process (what we do):** Clinical activities, adherence to evidence-based protocols, timeliness
- Example: Aspirin administration within 30 minutes of MI arrival, colonoscopy quality metrics

**Outcomes (results):** Mortality, morbidity, patient satisfaction, functional status
- Example: In-hospital mortality, infection rates, patient satisfaction scores, readmission rates

**Principle:** Structure enables process, process drives outcomes. But structure and process don't guarantee outcomes; confounding factors (patient complexity, severity) affect outcomes.

### Statistical Testing in Clinical Settings

**Hypothesis Testing:** Is observed difference due to process change or random variation?

**Example:** A hospital implements a sepsis protocol (rapid culture, antibiotics within 1 hour, fluid resuscitation).

Before: 50 sepsis patients, 8 deaths (16% mortality)
After: 50 sepsis patients, 4 deaths (8% mortality)

**Question:** Is this improvement real or chance?

**Statistical test:** Chi-square test (categorical outcome)

Null hypothesis (H₀): Protocol has no effect; observed difference is random

P-value = 0.15 (15% probability of observing this difference by chance if protocol is ineffective)

**Interpretation:** With p = 0.15 > 0.05, we cannot reject the null hypothesis. Need more data or longer follow-up to confirm effectiveness.

**Confidence Interval:** 95% CI for mortality reduction = -2% to 16%

The true effect could be anywhere in this range; current data cannot conclusively demonstrate effectiveness.

### Quality Metrics and Reporting

**National Quality Measures (US):**
- AHRQ Patient Safety Indicators (PSIs) — adverse events during hospitalization
- HEDIS (Healthcare Effectiveness Data and Information Set) — preventive care, chronic disease management
- NQF (National Quality Forum) endorsed measures — mortality, readmission, safety

**CMS Core Measures:**
- Heart attack: Aspirin on arrival, beta-blocker, ACE inhibitor, statin
- Pneumonia: Appropriate antibiotics, oxygen, blood cultures
- Surgical: Prophylactic antibiotics, temperature management, glucose control

**Tracking quality metrics** enables:
1. Internal performance monitoring and targets
2. Public reporting and patient transparency
3. Pay-for-performance incentive alignment
4. Identification of improvement opportunities

---

## Module 9: Clinical Decision Analytics

### Sensitivity and Specificity

Diagnostic test performance evaluated on ability to correctly identify disease:

**Sensitivity:** Proportion of truly diseased patients who test positive
Sensitivity = TP / (TP + FN)

A high-sensitivity test is good at ruling out disease (negative result = disease unlikely).

**Specificity:** Proportion of truly healthy patients who test negative
Specificity = TN / (TN + FP)

A high-specificity test is good at ruling in disease (positive result = disease likely).

**Example: Troponin for Acute MI**
- Sensitivity 95%: Of 100 true MI patients, troponin detects 95
- Specificity 85%: Of 100 non-MI chest pain patients, troponin correctly excludes 85

At presentation, 5 out of 100 chest pain patients have true MI (prevalence = 5%).

- Positive troponin → 95 true MI patients test positive + 15 false positive
- Positive predictive value (PPV) = 95 / (95 + 15) = 86%

Clinical interpretation: Positive troponin = 86% chance of MI (not 100%).

### Number Needed to Treat (NNT)

NNT quantifies effectiveness of clinical intervention:

**NNT = 1 / (Event rate in treated group - Event rate in control group)**

**Example: Statins in Primary Prevention**

Clinical trial: 1,000 patients without prior MI or stroke randomized to statin vs. placebo over 5 years

- Statin group: 40 patients had CVD event
- Placebo group: 50 patients had CVD event
- Absolute risk reduction = 50/1000 - 40/1000 = 1%
- NNT = 1 / 0.01 = 100

**Interpretation:** Treat 100 patients with statin for 5 years to prevent 1 cardiovascular event.

Cost-benefit: 100 patients × 5 years × $100/year statin cost = $50,000 spent to prevent 1 event
Cost per event prevented = $50,000 (must compare to cost of event, typically $100,000+)

### Likelihood Ratios and Bayesian Updating

**Likelihood Ratio (LR)** combines sensitivity and specificity:

LR+ = Sensitivity / (1 - Specificity) = probability of positive test given disease / probability of positive test without disease

LR+ > 10 strongly confirms diagnosis
LR+ 5-10 moderately confirms
LR+ < 5 weak confirmation

**Bayesian updating:** Prior probability (prevalence) × LR = posterior probability

**Example: D-dimer for Pulmonary Embolism**

- Prevalence of PE in ED chest pain patients = 5% (prior probability)
- D-dimer sensitivity 95%, specificity 80%
- LR+ = 0.95 / (1 - 0.80) = 0.95 / 0.20 = 4.75

Posterior probability if D-dimer positive:
= (Prior odds) × LR+
= (0.05 / 0.95) × 4.75 = 0.25

Probability of PE given positive D-dimer ≈ 20% (not 95%)

This illustrates why serial testing (D-dimer → CT angiography if positive) is more efficient than single tests.

---

## Module 10: Cost-Effectiveness and Health Economics

### Quality-Adjusted Life Years (QALY)

QALY combines survival and quality of life:

QALY = life years gained × quality adjustment (0 to 1)

- Perfect health = 1.0
- Moderate disability = 0.5
- Death = 0.0
- Severe illness year followed by full recovery = 1.0 × 0.5 = 0.5 QALY

**Example: Alzheimer's Drug**

Gives 1 extra year of life but patient remains in moderate dementia (quality 0.4):
- Benefit = 1 year × 0.4 quality factor = 0.4 QALY

### Incremental Cost-Effectiveness Ratio (ICER)

ICER compares two interventions:

ICER = (Cost A - Cost B) / (Effectiveness A - Effectiveness B)

**Interpretation:** Cost per unit of health gained ($/QALY)

**Example: Hepatitis C Treatment**

- Old regimen: $10,000 cost, 60% cure rate → $16,667 per successful cure
- New regimen: $50,000 cost, 95% cure rate → $52,632 per successful cure

ICER = ($50,000 - $10,000) / (0.95 - 0.60) = $40,000 / 0.35 = **$114,286 per additional cure**

**Cost-effectiveness threshold:** Most healthcare systems accept ICER < $100,000-$150,000 per QALY.

If patients in new regimen regain 0.5 QALY vs. 0.3 QALY with old regimen:

ICER = $40,000 / (0.5 - 0.3) = $200,000 per QALY (potentially not acceptable)

### Cortex Analytics Implications

For a CDSS startup targeting Brazilian health systems:

1. **Demonstrate clinical effectiveness:** Which populations benefit most? Use RCT or propensity-match observational data.
2. **Quantify health gains:** QALY improvements, readmission reduction, mortality reduction
3. **Calculate total cost of care:** Includes Cortex subscription, workflow time, reduced complications
4. **Compare ICER to local threshold:** Brazilian CONITEC typically accepts 1-3× GDP per capita per QALY ($2,000-6,000)
5. **Build ROI business case:** For CFO (cost savings) and CMO (clinical outcomes), show:
   - Cost per patient per year with/without Cortex
   - Quality metrics (mortality, readmission, infection rates) improvement
   - Capacity utilization gains (beds freed, throughput increased)

---

## Module 11: Case Studies — Nico's Problem Set Applications

### M3 Case: Shared Resources in 2D Surgery (Parallelization)

Dr. Twofer manages two operating rooms with one surgeon. Analysis compares sequential (one room) vs. parallel (two rooms) configurations:

**Sequential Configuration (1 Room):**
- Cycle time per surgery: 35 (prep) + 25 (op) + 15 (clean) = 75 minutes per patient
- Total for 3 surgeries: 225 minutes
- Room cost: $1,000/hr × 3.75 hrs = $3,750
- Surgeon cost: $250/hr × 3.75 hrs = $937.50
- **Total: $4,687.50 per 3-surgery session**

**Parallel Configuration (2 Rooms):**
- Room 1: prep 0-35 min, op 35-60 min, clean 60-75 min, prep surgery 3 75-110 min
- Room 2: prep 30-65 min, op 65-90 min
- Total time: 150 minutes (2.5 hours for 3 surgeries)
- Room cost: 2 × $1,000/hr × 2.5 hrs = $5,000
- Surgeon cost: $250/hr × 2.5 hrs = $625
- **Total: $5,625 per 3-surgery session**

**Analysis:**

While surgeon utilization drops from 100% (sequential) to 65% (parallel), the overall cost per patient increases:
- Sequential: $4,687.50 / 3 = **$1,562.50 per patient**
- Parallel: $5,625 / 3 = **$1,875 per patient**

**Counterintuitive finding:** Assigning two rooms is less cost-effective. This reflects high room charges ($1,000/hr) vs. surgeon charges ($250/hr). Healthcare facilities with this cost structure should prefer sequential surgery scheduling.

However, if room cost drops to $500/hr:
- Parallel total: 2 × $500 × 2.5 + $625 = $3,125 (vs. $4,687.50 sequential)
- **Parallel becomes cost-effective.**

This illustrates how TDABC reveals which process designs are optimal under specific cost structures.

### M3 Case: SafeBirth Clinic (Bottleneck Identification)

A prenatal clinic handles patients through:
1. Reception: 10 min
2. Nurse assessment: 15 min
3. Physician consultation: 50 min
4. Sonography & ultrasound: 50 min (equipment is bottleneck)
5. Discharge: 5 min

**Process A (Sequential):**
- Total cycle time: 130 minutes
- Capacity: 60 min/hr ÷ 70 min bottleneck = 0.86 patients/hr
- Bottleneck: Sonography at 70 min cumulative (longest cumulative time to reach completion)

**Process B (Joint Consult):**
- Consolidates physician + sonographer into simultaneous 40-minute consultation
- Total cycle time: 65 minutes (reception 15 + nurse 15 + joint consult 40 - 5 discharge)
- Capacity: 60 ÷ 40 = 1.5 patients/hr
- **Improvement: 74% throughput increase**

**Process C (New Service Activity):**
If adding genetic counseling (new activity), depends on whether it uses new resources (no change to bottleneck) or burdens existing resources (shifts bottleneck).

**Key lesson:** Identify the longest cumulative path (critical path) through process network. This determines system capacity regardless of individual resource utilization. Improvements should focus on the critical path.

### M6 Case: Queuing Analysis for Radiology Scheduling

A clinic has M/M/1 scenario (single radiologist):
- Arrivals: 10 exams/hour (λ = 10)
- Service capacity: 12 exams/hour (μ = 12)
- Utilization: 83%
- Average wait time: 25 minutes

**Question 1:** As arrival rate increases toward service capacity, what happens to waiting time?

**Answer:** Waiting time grows exponentially. At λ = 11 (92% utilization), wait time jumps to ~69 minutes. Operating near capacity is dangerous for service quality.

**Question 2:** Why does arrival rate ≥ service rate cause problems?

**Answer:** If λ ≥ μ, queue never clears. Patients accumulate indefinitely, creating mathematical instability.

**Question 3:** If radiologist's speed improves (service time decreases), how do waiting times and queue length change?

**Answer:** Both decrease non-linearly. Small improvements in service speed yield disproportionate reductions in queue length and wait time because utilization drops. Reducing service time by 10% (from 5 min to 4.5 min) reduces wait time by 18% (25 to 20.5 min).

**Question 4:** If adding radiologists, what's the diminishing returns effect?

**Answer:** (M/M/c analysis)
- 1 radiologist: unstable at λ = 10
- 2 radiologists: wait = 1.58 hours (severely congested)
- 3 radiologists: wait = 0.35 hours = **21 minutes**
- 4 radiologists: wait = 0.053 hours = **3.2 minutes** (94% improvement from 3 to 4)
- 5 radiologists: wait = 0.013 hours = **0.78 minutes** (77% improvement from 4 to 5)

Adding the 4th radiologist yields higher ROI than the 5th; staffing recommendations depend on cost per radiologist vs. value of wait time reduction.

---

## Module 12: Cortex Health Analytics Strategy

### Cortex's Value Proposition for Brazilian Health Systems

As a CDSS (Clinical Decision Support System), Cortex must demonstrate value across four dimensions:

**1. Clinical Outcomes (ELENA's Mandate — CMO)**
- Improved diagnostic accuracy (sensitivity/specificity of Cortex recommendations)
- Reduced adverse events (sepsis detection, medication errors, falls)
- Better guideline adherence (evidence-based treatment protocols)
- Example metric: "Cortex users have 12% lower 30-day readmission rate"

**2. Operational Efficiency (ARCHIE's Mandate — CTO)**
- Reduced length of stay (bed days freed, capacity increased)
- Improved throughput (patients/day per bed)
- Lower operating costs via TDABC visibility
- Example metric: "Average LOS reduced from 5.2 to 4.8 days, freeing 8% bed capacity"

**3. Financial Impact (CFO)**
- Cost per patient reduced: (LOS reduction + fewer complications + better resource utilization)
- Revenue impact: Additional capacity enables more admissions/cases
- ICER calculation: Cost of Cortex / (health gains in QALY or readmission reduction)
- Example: Cortex subscription $150/bed/year; reduces readmission by 2%, saving $8,000/bed/year in complications; net ROI = 53x

**4. Strategic Alignment (CEO)**
- Supports health system's value-based care transformation (moving from volume to value)
- Enables data-driven decision-making across clinical and operational leadership
- Facilitates benchmarking against peer systems

### Analytics Dashboard Priorities for Cortex

**Tier 1: Clinical Safety & Quality**
- Mortality by condition (actual vs. expected)
- Readmission rates (30-day, 90-day)
- Hospital-acquired infection rates
- Sepsis recognition time (door-to-antibiotics)
- Medication adverse events
- Fall and pressure ulcer incidence

**Tier 2: Operational Efficiency**
- Length of stay by DRG vs. benchmark
- Bed utilization rates (overall, by unit)
- Surgery turnaround time (patient to next case)
- ED wait times (door-to-room, room-to-provider)
- OR utilization (scheduled start time adherence, emergency add-on capacity)

**Tier 3: Financial Performance (TDABC-driven)**
- Cost per patient by condition/pathway
- Profitability by service line
- Resource utilization (staff, equipment, supplies) per patient
- Variance from standard time equations (identify efficiency gains or slippage)

**Tier 4: Strategic**
- Patient volume trends (by condition, payer, referring provider)
- Quality vs. cost scatterplot (identify high-quality, low-cost units for best practice dissemination)
- Staff productivity (FTE per unit output)
- Benchmarking vs. peer hospitals (where available)

### Building the ROI Business Case

**For CFO:**

Calculate total cost of care (with and without Cortex):

| Metric | Baseline | With Cortex | Delta |
|--------|----------|------------|-------|
| Average LOS (days) | 5.2 | 4.8 | -0.4 |
| Readmission rate (%) | 14% | 12% | -2% |
| Hospital-acquired complications (%) | 5% | 3.5% | -1.5% |
| Cost per hospitalization | $12,500 | $11,200 | -$1,300 |
| Cortex cost per patient | — | $150 | $150 |
| Net cost per patient | $12,500 | $11,350 | **-$950** |

Annual savings (1,000 admissions): 1,000 × $950 = **$950,000**

ROI = $950,000 / (Cortex implementation cost) = 5-10x over 3-year payback

**For CMO/ELENA:**

Demonstrate clinical credibility:

- Cortex recommendations align with current evidence-based guidelines
- Clinical review panel validates accuracy of flagged cases
- Pilot program shows early outcomes improvement
- Publish or present case study to build clinical community trust

**Implementation Strategy:**

1. **Phase 1 (Pilot):** 2-3 hospital units, 500-1,000 admissions, 6-month run-in
2. **Phase 2 (Validation):** Measure outcomes vs. control (matched facilities or historical)
3. **Phase 3 (Scale):** Full hospital deployment with ongoing monitoring
4. **Phase 4 (Optimization):** Integrate with electronic health records, automate workflows, expand analytics

---

## Course Objectives Summary

By completion of this course, healthcare leaders and clinicians will be equipped to:

1. **Map and measure care delivery processes** with precision using flow diagrams, cycle time analysis, and Little's Law
2. **Identify bottlenecks and design capacity plans** accounting for variability, shared resources, and parallelization
3. **Calculate true service delivery costs** using time-driven activity-based costing
4. **Benchmark organizational performance** using data envelopment analysis across multiple quality and efficiency dimensions
5. **Optimize patient flow and staffing** using queuing theory and scheduling analytics
6. **Translate analytics into action** by building compelling business cases grounded in financial and clinical impact

These tools form the analytical foundation for value-based care transformation, enabling healthcare systems to deliver superior clinical outcomes at lower cost.

---

## Key Formulas Reference

**Little's Law:** I = λ × CT

**Capacity Cost Rate:** CCR = Total Department Cost / Practical Capacity (minutes)

**TDABC Activity Cost:** Cost = CCR × Time Equation

**M/M/1 Waiting Time:** Wq = λ / (μ(μ - λ))

**M/M/1 Queue Length:** Lq = λ² / (μ(μ - λ))

**Sensitivity:** TP / (TP + FN)

**Specificity:** TN / (TN + FP)

**Number Needed to Treat:** NNT = 1 / (ARRtreated - ARRcontrol)

**Likelihood Ratio +:** LR+ = Sensitivity / (1 - Specificity)

**ICER:** (CostA - CostB) / (EffectivenessA - EffectivenessB)

**Utilization (Queuing):** ρ = λ / μ

---

**End of Document**
