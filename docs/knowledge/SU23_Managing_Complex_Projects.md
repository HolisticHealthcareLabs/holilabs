# Managing Complex Projects
**Course Code:** 45429 | **Term:** SU23
**Institution:** JHU Carey Business School
**Audience:** Cortex Boardroom AI (for ARCHIE/CTO and PAUL/CPO)

---

## 1. Project Management Fundamentals

### What Is a Project?
A project is a temporary endeavor undertaken to produce a unique product, service, or result. Key characteristics distinguish projects from operations:

- **Temporary:** Has a defined beginning and end, with specific completion criteria
- **Unique:** Each project produces something new or different
- **Progressive Elaboration:** Details emerge and are refined throughout project life
- **Specific objectives:** Goals are measurable and bounded

### The Triple Constraint (Iron Triangle)
Project managers must balance three competing variables:

1. **Scope:** What work will be performed, what deliverables will be produced
2. **Schedule (Time):** When will the project be completed, milestone dates
3. **Cost (Resources):** What budget is available, labor hours allocated

Trade-offs are inevitable. Expanding scope typically requires more time or budget. Accelerating schedule (fast-tracking) often increases cost or reduces scope. Quality is sometimes considered a fourth constraint, though it should be non-negotiable in healthcare IT.

For Cortex CDSS implementations in Brazilian hospitals, scope creep is the primary risk—clinical users constantly request additional alert rules or interface modifications.

### Projects vs. Operations
- **Projects:** Temporary, unique, outcome-focused (e.g., hospital EHR go-live)
- **Operations:** Ongoing, repetitive, process-focused (e.g., daily EHR usage, clinical alert monitoring)

Project Management integrates both: the project delivers the capability; operations maintain it.

### The Project Lifecycle: Five Phases

Project management follows a structured lifecycle with distinct phases:

**1. Initiating**
- Identify the business need or opportunity
- Develop project charter and business case
- Secure executive sponsorship
- For Cortex: Hospital executive leadership approves CDSS implementation; sponsor identified (typically CIO or Chief Medical Officer)

**2. Planning**
- Define scope, schedule, budget, quality, risk, stakeholders, communications
- Create detailed project plan and baseline
- Develop Work Breakdown Structure (WBS)
- For Cortex: Build detailed phased rollout plan; identify clinical workflows requiring automation; resource allocation across IT, clinical, and change management

**3. Executing**
- Direct and manage project work
- Procure resources and vendors
- Quality assurance activities
- Team coordination and communication
- For Cortex: Deploy CDSS modules; conduct trainings; manage vendor integrations (e.g., EHR vendors, clinical informatics consultants)

**4. Monitoring & Controlling**
- Track progress against baselines
- Manage scope, schedule, cost, quality changes
- Identify and address risks and issues
- Report status
- For Cortex: Weekly status reporting to steering committee; track alert utilization rates; monitor UAT defect resolution

**5. Closing**
- Verify all work is complete
- Conduct lessons learned
- Archive documentation
- Release resources and transition to operations
- For Cortex: Formal cutover sign-off; go-live support period; handoff to hospital operational teams

---

## 2. Scope Management

### Work Breakdown Structure (WBS)
The WBS is the foundational planning tool that decomposes project work into manageable pieces.

**Definition:** A hierarchical decomposition of the total scope of work to be carried out by the project team, organized as a tree.

**WBS Benefits:**
- Ensures no work is missed
- Prevents scope creep by establishing clear boundaries
- Enables accurate estimation and resource allocation
- Provides foundation for schedule and budget

**WBS Levels (typical 4-5 levels deep):**
- Level 1: Project name
- Level 2: Major deliverables or phases
- Level 3: Subdeliverables or components
- Level 4: Work packages (smallest unit, typically 40-80 hours of work)

**Example: Cortex CDSS Implementation WBS**
```
1. Cortex CDSS Hospital Implementation
   1.1 Discovery & Requirements (Phase 1)
       1.1.1 Current-state clinical workflow analysis
       1.1.2 Alert requirements gathering (per clinical department)
       1.1.3 Integration points with existing EHR
   1.2 System Design (Phase 2)
       1.2.1 Alert rule design and documentation
       1.2.2 Clinical workflow redesign
       1.2.3 User interface mockups and validation
   1.3 Build & Configuration (Phase 3)
       1.3.1 Configure CDSS rules engine
       1.3.2 Integrate with EHR APIs
       1.3.3 Build custom clinical dashboards
   1.4 Testing & UAT (Phase 4)
       1.4.1 System integration testing
       1.4.2 User acceptance testing (clinical teams)
       1.4.3 Defect remediation
   1.5 Deployment & Go-Live (Phase 5)
       1.5.1 Data migration from legacy system
       1.5.2 Go-live support (24/7 support for 2 weeks)
       1.5.3 Production monitoring and optimization
   1.6 Change Management & Training
       1.6.1 Clinical staff training (per department)
       1.6.2 IT operations training
       1.6.3 Change readiness assessment
```

### Scope Definition and Scope Statement
The Project Scope Statement defines what is included and explicitly what is NOT included (out of scope).

**Essential elements:**
- Product or service description
- Objectives and business justification
- Deliverables (specific, measurable)
- Acceptance criteria
- Constraints and assumptions
- Out-of-scope items (critical for managing expectations)

For healthcare IT, scope clarity prevents expensive rework. Example scope statement excerpt:

*"Scope: Deploy Cortex CDSS for sepsis detection and antibiotic stewardship alerts in the ICU and ED. Includes configuration of 12 clinical alert rules, integration with existing EHR, training for 80 clinical users. Out of Scope: Modification of underlying hospital EHR system, changes to existing clinical workflows beyond alert response protocols, development of new clinical guidelines."*

### Change Control and Scope Creep Prevention
Scope creep—uncontrolled expansion of project scope—is the #1 cause of project failures.

**Scope Creep Prevention:**
- Implement formal Change Control Board (CCB)
- Require written change requests with impact analysis
- Evaluate each change against triple constraint
- Track all approved changes to maintain current baseline
- Communicate impact (schedule delay, cost increase) to stakeholders

**Change Control Process:**
1. Submit formal change request with business justification
2. CCB analyzes scope, schedule, cost, risk impact
3. CCB approves, denies, or requests modifications
4. If approved: Update project baseline; communicate changes to team
5. Rejected changes go to issues log for post-project consideration

### Gold Plating
Gold plating is adding extra features or higher quality than specified. While well-intentioned, it wastes resources and delays delivery.

**Example:** Cortex project adds custom visualization dashboards beyond the contracted scope. Result: 2-week schedule delay, $80K additional cost, no incremental clinical value.

Prevention: Strict adherence to scope statement and change control discipline.

---

## 3. Schedule Management

### Critical Path Method (CPM)
CPM is the standard approach for project scheduling. It identifies the sequence of activities that determines the shortest possible project duration.

**Key concepts:**

**Activity:** A task with a duration, resource requirement, and predecessor/successor relationships.

**Network Diagram:** Visual representation of activity sequence and dependencies. Two formats:
- AON (Activity-On-Node): Activities drawn as boxes; arrows show dependencies
- AOA (Activity-on-Arrow): Activities on arrows; nodes represent milestones

**Forward Pass:** Calculate earliest start and finish times for each activity.
- Early Start (ES) = maximum Early Finish of predecessors
- Early Finish (EF) = ES + Duration

**Backward Pass:** Calculate latest start and finish times to identify float.
- Late Finish (LF) = minimum Late Start of successors
- Late Start (LS) = LF - Duration

**Float (Slack):** Flexibility available without delaying the project.
- Total Float = LF - EF (or LS - ES)
- Free Float = ES of next activity - EF of current activity

**Critical Path:** Sequence of activities with zero float. Any delay on critical path delays entire project.

**Cortex Implementation Schedule Example (12-month project):**

```
Discovery Phase (Months 1-2)
  Discovery meetings: 2 weeks, 5 clinical + 3 IT staff
  Requirements documentation: 3 weeks
  Design review with hospital leadership: 1 week

Design Phase (Months 2-3)
  Alert rules specification: 4 weeks (parallel with discovery close-out)
  Workflow redesign workshops: 3 weeks
  Technical architecture design: 3 weeks

Build Phase (Months 4-6)
  CDSS configuration: 6 weeks
  EHR integration development: 4 weeks (parallel start in week 3 of config)
  Custom dashboards build: 4 weeks

Testing Phase (Months 6-7)
  System integration testing: 2 weeks
  User acceptance testing: 3 weeks
  Defect remediation: 2 weeks (parallel with late UAT cycles)

Go-Live Preparation (Months 7-8)
  Data migration testing: 2 weeks
  Go-live support planning: 1 week
  Final training delivery: 2 weeks

Go-Live & Support (Month 8+)
  Production cutover: 1 day (monitored by 24/7 support team for 2 weeks)
```

Critical path likely: Discovery → Design → Build → Testing → Go-Live (approximately 32 weeks for core activities).

### Gantt Charts
Gantt charts visualize schedule on a timeline, showing activity duration, sequencing, and milestones.

**Benefits:**
- Easy to understand for non-technical stakeholders
- Shows task parallelization (concurrent activities)
- Identifies schedule slack visually
- Tracks progress (actual completion vs. planned)

**Limitations:**
- Doesn't clearly show dependencies (CPM diagrams superior for this)
- Can become cluttered with large projects

### Float and Resource Leveling
**Total Float:** Provides scheduling flexibility. Tasks with float can be delayed without impacting project end date. Tasks with zero float (critical path) cannot be delayed.

**Resource Leveling:** When resources are overallocated (more tasks assigned than available capacity), leveling adjusts schedule to smooth resource demand.

Example: Week 4 requires 12 FTE; your team has 8 FTE available. Leveling delays non-critical tasks to weeks 5-6.

**Resource leveling typically extends project duration** because parallel work is converted to sequential work.

### Crashing and Fast-Tracking
**Crashing:** Compress schedule by adding resources or working overtime. Options include:
- Increase staffing on critical path activities
- Authorize overtime
- Expedite procurement

Crashing increases cost significantly and has diminishing returns (e.g., adding 10 developers to a 2-person coding task doesn't reduce time 5x).

**Fast-Tracking:** Overlap activities normally done sequentially. Example: Begin UAT testing while Build phase is completing (higher risk of rework but accelerates schedule).

For Cortex, hospital go-live dates are often fixed. If schedule slips, crashing (adding resources) or fast-tracking (parallel UAT with late build activities) may be necessary. Tradeoff: increased cost and quality risk.

---

## 4. Cost Management

### Cost Baseline and Budgeting
Cost estimation begins with the WBS. Each work package receives a cost estimate (labor hours × rate + materials/vendor costs).

**Cost Baseline:** Approved total cost estimate for the project, broken down by phase or component.

**Example: Cortex CDSS Implementation 12-Month Budget**

| Phase | Labor (Staff Days) | Labor Cost | Materials/Vendor | Total |
|-------|-------------------|-----------|------------------|-------|
| Discovery | 120 | $72,000 | $0 | $72,000 |
| Design | 180 | $108,000 | $5,000 | $113,000 |
| Build/Config | 300 | $180,000 | $40,000 | $220,000 |
| Testing | 160 | $96,000 | $10,000 | $106,000 |
| Go-Live/Support | 140 | $84,000 | $15,000 | $99,000 |
| Change Management | 100 | $60,000 | $5,000 | $65,000 |
| **TOTAL** | **900** | **$600,000** | **$75,000** | **$675,000** |

Assumptions: Average loaded labor cost $600/day (salary + benefits); contingency reserve 10% ($67,500); management reserve 5% ($33,750).

### Earned Value Management (EVM)
EVM is the gold standard for integrated cost/schedule performance tracking. It answers: "Are we spending money at the right rate to deliver on schedule?"

**Three Key Metrics:**

1. **Planned Value (PV):** Budgeted cost of work scheduled to be performed by a given date.
   - At project start, PV = 0
   - At project end (completion), PV = Total project budget
   - At interim dates, PV reflects budgeted work planned

2. **Actual Cost (AC):** What you've actually spent to date (labor hours × rate, vendor invoices, materials).

3. **Earned Value (EV):** Budgeted cost of work actually completed (% complete × budget for that work package).

**Performance Indices:**

**Cost Performance Index (CPI) = EV / AC**
- CPI > 1.0: Spending less than budgeted (favorable)
- CPI < 1.0: Spending more than budgeted (unfavorable)
- Example: EV $200,000, AC $220,000 → CPI = 0.91 (spending 1.09x budgeted rate)

**Schedule Performance Index (SPI) = EV / PV**
- SPI > 1.0: Ahead of schedule (favorable)
- SPI < 1.0: Behind schedule (unfavorable)
- Example: EV $200,000, PV $210,000 → SPI = 0.95 (5% behind schedule)

**Cost Variance (CV) = EV - AC**
- Negative CV indicates over budget

**Schedule Variance (SV) = EV - PV**
- Negative SV indicates behind schedule

**Example EVM Analysis (Month 6 of Cortex project):**

- Total Budget: $675,000
- Planned Value (work scheduled through month 6): $350,000
- Actual Cost (spent through month 6): $380,000
- Earned Value (budgeted cost of work completed): $320,000

Calculations:
- CPI = $320,000 / $380,000 = 0.84 (16% cost overrun)
- SPI = $320,000 / $350,000 = 0.91 (9% schedule slippage)
- CV = $320,000 - $380,000 = -$60,000 (over budget by $60K)
- SV = $320,000 - $350,000 = -$30,000 (behind schedule)

**Interpretation:** Project is both over budget and behind schedule. Both indices < 1.0 signal distress.

### Estimate at Completion (EAC) and Variance at Completion (VAC)

**EAC:** Projected total cost upon project completion, given current performance.

Formula (assuming current CPI continues):
```
EAC = Budget at Completion (BAC) / CPI
```

For Cortex example:
```
EAC = $675,000 / 0.84 = $803,571
```

Project projected to exceed budget by $128,571.

**Variance at Completion (VAC) = BAC - EAC**
```
VAC = $675,000 - $803,571 = -$128,571
```

Negative VAC confirms project will be over budget unless corrective actions are taken.

### Contingency and Management Reserve

**Contingency Reserve:** Budget set aside for identified risks with quantified impact (e.g., "10% of labor estimate to account for staff turnover risk").

**Management Reserve:** Discretionary reserve held by project sponsor for unforeseen events not identified during planning (e.g., major scope change request, vendor failure).

Best practice: Contingency is part of the project budget and assigned to specific risks. Management reserve is held separate, requiring CCB approval to access.

For Cortex: Contingency 10% ($67,500) covers identified risks like staff turnover, vendor delays, and unforeseen EHR integration issues. Management reserve 5% ($33,750) for emergencies.

---

## 5. Risk Management

Risk management systematically identifies, analyzes, and responds to project threats and opportunities.

### Risk Identification
Risks are uncertain events with positive (opportunity) or negative (threat) impact.

**Identification Techniques:**

1. **Brainstorming:** Team identifies potential risks across technical, organizational, external, resource categories.

2. **Risk Breakdown Structure (RBS):** Hierarchical categorization of risks.
   - Technical risks (integration, performance)
   - Organizational risks (staffing, sponsor engagement)
   - External risks (regulatory, vendor, market)
   - Resource risks (skill gaps, availability)

3. **Historical Analysis:** Review lessons learned from similar projects.

4. **Expert Interviews:** Subject matter experts in clinical informatics, EHR systems, hospital IT.

**Cortex Implementation Risk Identification (partial list):**

| Risk | Category | Description |
|------|----------|-------------|
| Clinical staff resistance to new alerts | Organizational | Physicians perceive alerts as disruptive ("alert fatigue") |
| EHR API integration issues | Technical | Hospital's EHR version not compatible with Cortex APIs |
| Hospital IT staffing gaps | Resource | Insufficient IT team capacity for testing and deployment |
| Regulatory change (ANVISA guidelines) | External | Brazilian healthcare regulator changes clinical alert requirements mid-project |
| Go-live date pressure | Organizational | Hospital executive wants go-live before year-end regardless of readiness |
| Data migration delays | Technical | Legacy system data extract takes 3x longer than estimated |

### Qualitative Risk Assessment: Probability × Impact Matrix

Risks are scored on **probability** (likelihood) and **impact** (consequence if risk occurs), typically on a 1-5 scale.

**Risk Score = Probability × Impact**

| Probability \ Impact | Minimal (1) | Minor (2) | Moderate (3) | Major (4) | Catastrophic (5) |
|---|---|---|---|---|---|
| Very Low (1) | 1 | 2 | 3 | 4 | 5 |
| Low (2) | 2 | 4 | 6 | 8 | 10 |
| Medium (3) | 3 | 6 | 9 | 12 | 15 |
| High (4) | 4 | 8 | 12 | 16 | 20 |
| Very High (5) | 5 | 10 | 15 | 20 | 25 |

**Cortex Risk Examples:**

| Risk | Probability | Impact | Score | Priority |
|------|-------------|--------|-------|----------|
| EHR API integration issues | High (4) | Major (4) | 16 | HIGH |
| Clinical staff resistance | Medium (3) | Moderate (3) | 9 | MEDIUM |
| Regulatory change | Low (2) | Catastrophic (5) | 10 | MEDIUM |
| Go-live date pressure | High (4) | Major (4) | 16 | HIGH |
| Data migration delays | Medium (3) | Minor (2) | 6 | LOW |

High-scoring risks (12+) require active management; medium risks (6-11) need monitoring; low risks can be accepted.

### Quantitative Risk Analysis

Advanced projects use quantitative techniques:

**Monte Carlo Simulation:** Model project schedule/cost with uncertain parameters. Run thousands of iterations; output is probability distribution (e.g., "80% confidence project completes between $650K-$750K").

**Decision Trees:** For risks with multiple outcomes, assign probabilities and expected values.

Example: Go-live date risk
- Scenario A (60% probability): Delay 2 weeks, costs $50K → Expected value = 0.60 × $50K = $30K
- Scenario B (40% probability): Delay 4 weeks, costs $100K → Expected value = 0.40 × $100K = $40K
- Total expected cost of risk = $70K

### Risk Response Strategies

**1. Avoid:** Eliminate the risk by changing project approach.
- Example: Switch from custom EHR integration to using hospital's standard API instead of custom extraction.

**2. Mitigate:** Reduce probability or impact.
- Example: Early vendor testing (Phase 1) to identify API compatibility issues before full build phase starts. Reduces probability of late discovery.

**3. Transfer:** Shift risk to third party (insurance, vendor contract, outsourcing).
- Example: Contract SLA with EHR vendor guarantees API uptime. Vendor compensates for failures.

**4. Accept:** Acknowledge risk; prepare contingency plan.
- Example: Accept possibility of go-live delay; prepare communication plan for clinical users and leadership.

### Risk Register and Monitoring
A **Risk Register** documents all identified risks:

| Risk ID | Description | Owner | Probability | Impact | Response | Mitigation Action | Status |
|---------|-------------|-------|------------|--------|----------|-------------------|--------|
| R-001 | EHR API integration issues | CTO | High | Major | Mitigate | Early vendor testing in Month 1 | Active |
| R-002 | Clinical staff resistance | CPO | Medium | Moderate | Mitigate | Change management + training program | Active |
| R-003 | Data migration delays | IT Lead | Medium | Minor | Accept | Contingency plan to extend UAT if needed | Monitor |

**Risk Monitoring:** Weekly review during project execution. As risks materialize or conditions change, escalate or close-out entries.

**Residual Risk:** Risk remaining after response strategy (e.g., after mitigation, probability reduces from High to Medium).

**Secondary Risk:** New risk created by response strategy (e.g., adding staff to accelerate schedule increases integration/coordination complexity).

---

## 6. Stakeholder Management

### Stakeholder Identification and Analysis
Stakeholders are individuals or groups affected by or who can affect the project.

**Hospital CDSS Implementation Stakeholders:**

1. **Executive Sponsor** (e.g., Hospital CMO or CIO)
   - Authority to approve scope changes, allocate resources
   - Success-critical; highest power and interest

2. **Clinical Champions** (Department heads: ED, ICU, Medicine)
   - End users; influence peer adoption
   - High interest; moderate power

3. **IT Operations Team**
   - Will maintain system post-go-live
   - High power (can slow deployment); moderate interest

4. **Hospital IT Director**
   - Project budget approval; vendor management
   - High power; high interest

5. **Front-line Clinical Staff** (Nurses, Physicians, Residents)
   - Daily users; can resist if alerts poorly designed
   - Low formal power; high interest

6. **EHR Vendor**
   - Provides APIs, integration support
   - External; moderate power

7. **Hospital Legal/Compliance**
   - Ensures regulatory alignment (ANVISA, data privacy)
   - Low day-to-day interest; high power if issues arise

### Power/Interest Grid
Stakeholders mapped on two axes: Power (ability to influence) and Interest (concern in project outcomes).

```
                 HIGH POWER
                     ▲
                     │
    MANAGE            │         KEEP SATISFIED
    CLOSELY           │
  (Sponsor,    Hospital IT Director    (Executive Sponsor,
   Dept Heads)    ▌▌▌▌▌▌▌▌▌▌          Hospital CMO)
                  ▌▌▌▌▌▌▌▌▌▌           ────────────────
                     │
    ────────────────┼────────────────
    MONITOR/        │      KEEP
    INFORM          │      INFORMED
  (Front-line     EHR Vendor  (Compliance,
   Clinical Staff)  ▌▌▌        IT Support)
    ───────────────▌▌▌──────────────
                     │
                     │
                  LOW POWER
```

**Engagement Strategies by Quadrant:**

- **High Power / High Interest (Keep Satisfied):** Regular updates, involve in decisions, escalate issues immediately
- **High Power / Low Interest (Manage Closely):** Keep informed; prevent disengagement
- **Low Power / High Interest (Keep Informed):** Transparent communication; training; feedback channels
- **Low Power / Low Interest (Monitor):** Minimal communication; group updates sufficient

### Engagement and Communication Planning

**Engagement Strategy for Cortex Project:**

**Executive Sponsor (Hospital CMO)**
- Frequency: Bi-weekly steering committee
- Content: High-level status, risks, budget, go-live readiness
- Format: 30-minute briefing with 1-page executive summary

**Clinical Champions (Department Heads)**
- Frequency: Weekly during design/testing; bi-weekly during build
- Content: Workflow changes, alert rules review, training preparation
- Format: Department-specific meetings; hands-on sessions

**IT Operations Team**
- Frequency: Weekly (escalate dependencies, runbook development)
- Content: System architecture, cutover procedures, UAT support needs
- Format: Technical deep-dives

**Front-line Clinical Staff**
- Frequency: Monthly town halls during design; weekly during UAT
- Content: Alert examples, workflow changes, training announcements
- Format: Department meetings, email updates, intranet announcements

### Managing Resistant Stakeholders

Resistance to change is natural in healthcare IT. Strategies:

1. **Understand concerns:** "What about this change worries you most?"
   - Physicians may fear alert fatigue (too many false positives)
   - Nurses may worry about added documentation burden

2. **Address root causes:** Design alerts to minimize false positives; streamline alert response workflow

3. **Build peer champions:** Early adopters in clinical departments advocate to peers

4. **Demonstrate value:** Pilot in one unit; show outcome improvements (e.g., reduced sepsis mortality, faster antibiotic administration)

5. **Involve in design:** Physicians on alert rules committee; nurses on workflow redesign team

---

## 7. Quality Management

### Quality Planning, Assurance, and Control
Quality in healthcare IT is non-negotiable. Patient safety depends on correct alert logic, reliable EHR integration, and validated clinical content.

**Quality Planning:** Define what "quality" means for this project.
- Cortex: Alerts must have <5% false positive rate; system uptime >99.5%; <2 min latency for alert generation
- Acceptance criteria for each deliverable

**Quality Assurance (QA):** Proactive process to ensure project produces deliverables meeting quality standards.
- Review alert rules against clinical evidence
- Design review (technical architecture, workflow integration)
- Test planning and execution

**Quality Control (QC):** Inspective process to detect defects.
- Unit testing (developers)
- Integration testing (QA team)
- User acceptance testing (clinical teams)

### Deming's PDCA Cycle
A continuous improvement framework applicable to project quality:

1. **Plan:** Define quality standards and testing approach
2. **Do:** Execute tests, collect data on defects
3. **Check:** Analyze results; identify root causes of defects
4. **Act:** Implement corrective actions; refine processes

During Cortex UAT, PDCA is applied iteratively:
- Plan: Test alert accuracy in 50 patient cases
- Do: Run test cases; compare alert triggers against expected behavior
- Check: 3 alerts triggered incorrectly; root cause = threshold setting misalignment with clinical judgment
- Act: Adjust threshold; retest

### Cost of Quality
Quality has costs (prevention, appraisal) and costs of poor quality (rework, failures).

**Prevention Costs:** Process design, training, quality reviews
- Example: Alert rules peer review (4 hours × 3 reviewers) = $1,200

**Appraisal Costs:** Testing, inspection, monitoring
- Example: UAT cycle = $50,000 (tester time, clinical staff time)

**Failure Costs (Internal):** Rework, defect fixes before release
- Example: Defect discovered in UAT requiring 40 hours of developer time = $2,400

**Failure Costs (External):** Problems discovered post-go-live
- Example: Alert rule error causes 2-day system shutdown; 50 hospital staff × 2 days @ $100/hour = $10,000 lost productivity + reputational damage

Investing in prevention and appraisal (early detection) minimizes total cost of quality.

### Acceptance Criteria and Defect Tracking
Clear acceptance criteria prevent disputes over what constitutes "done."

**Example Cortex Acceptance Criterion:**
"Sepsis alert module is production-ready when: (1) Alert triggers for 95%+ of confirmed sepsis cases in test dataset, (2) False positive rate <5%, (3) Alert latency <2 minutes from new patient lab result, (4) System handles 1000 concurrent alerts without performance degradation, (5) All clinical and IT team training modules completed, (6) Go-live contingency plan approved by IT operations."

**Defect Tracking:** Use issue management system (e.g., Jira, Azure DevOps).

| Defect ID | Description | Severity | Status | Root Cause | Resolution |
|-----------|-------------|----------|--------|-----------|-----------|
| DEF-047 | Sepsis alert triggers 3x per patient (duplicate alerts) | High | Fixed | Database query returning multiple result rows | Filtered query to distinct patient alerts only |
| DEF-051 | Alert rule "Patient on antibiotics" not working for 3 of 10 hospitals | Critical | In Progress | EHR data mapping differs across hospital systems | Mapping logic being generalized |

---

## 8. Agile Project Management

### Scrum Framework
Healthcare IT increasingly uses Agile approaches, particularly for CDSS development where requirements evolve through clinical user feedback.

**Scrum:** Lightweight framework for managing iterative, incremental work.

**Key Roles:**
- **Product Owner:** Maintains prioritized product backlog; represents clinical user needs
- **Scrum Master:** Facilitates process; removes impediments
- **Development Team:** Cross-functional; 5-9 members (developers, testers, clinical analysts)

**Key Artifacts:**
- **Product Backlog:** Prioritized list of features/requirements (e.g., "As a physician, I want to be alerted when a patient meets sepsis criteria so I can initiate treatment promptly")
- **Sprint Backlog:** Work committed for current sprint
- **Increment:** Potentially releasable product increment delivered each sprint

**Key Ceremonies:**
- **Sprint Planning:** Team selects backlog items for upcoming sprint (1-2 week iteration)
- **Daily Standup:** 15-min sync; what's done, what's next, impediments
- **Sprint Review:** Demonstrate completed work to stakeholders; gather feedback
- **Sprint Retrospective:** Team reflects on process; identify improvements

**Velocity:** Average story points completed per sprint; used for forecasting.
- Example: Team completes 40 points/sprint; 200-point backlog → ~5 sprints (10 weeks)

### Kanban
Kanban visualizes workflow and limits work-in-progress (WIP).

**Kanban Board:**
```
To Do          In Progress       Review         Done
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│ 5 items    │  │ 3 items    │  │ 2 items    │  │ 47 items   │
│            │  │ (WIP: 5)   │  │ (WIP: 3)   │  │            │
│ Implement  │  │ Unit test  │  │ Code review│  │ ✓ Deployed │
│ alert rule │  │ validation │  │ pending    │  │            │
│ for...     │  │ logic      │  │            │  │            │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
```

WIP limits prevent bottlenecks. If "In Progress" reaches WIP limit, team pulls from "To Do" only after work completes.

### SAFe (Scaled Agile Framework)
For large hospital implementations with multiple teams, SAFe coordinates work across teams.

SAFe structures work in **Program Increments (PIs)** — typically 10-week iterations with coordinated planning, execution, and demo across all teams.

### Agile vs. Waterfall
**Waterfall:** Sequential phases (requirements → design → build → test → deploy). Best for:
- Well-understood requirements
- Highly regulated projects (each phase has formal gate review)
- Hospital go-live cutover (you can't partially go-live in production)

**Agile:** Iterative, incremental delivery. Best for:
- Evolving requirements (clinical users refine needs via feedback)
- Innovation and rapid learning
- Risk mitigation (deliver value early; discover problems in first sprint, not month 6)

**Hybrid Approach (Cortex Recommendation):**
- **Discovery & Design:** Waterfall-like (formal requirements document, clinical workflow redesign)
- **Build & Testing:** Agile (2-week sprints; clinical team validates alert rules in sprint reviews)
- **Go-Live:** Waterfall-like (structured cutover, controlled rollout to prevent system instability)

---

## 9. Complex and Ambiguous Projects

### Cynefin Framework
Cynefin categorizes problem domains by complexity and causality.

```
        Complicated              Complex
        ────────────            ─────────
      Cause-effect              Cause-effect
      discoverable but          only apparent
      not obvious               in retrospect

      "Best practices"          "Emergent practices"
      Analyze → Respond         Probe → Sense → Respond

      Examples:                 Examples:
      - EHR configuration       - Clinical workflow change
      - System integration      - Healthcare transformation

        Simple                   Chaotic
        ──────                   ────────
      Cause-effect             No clear
      obvious                   cause-effect

      "Best practices"          "Novel practices"
      Sense → Categorize →      Act → Sense → Respond
      Respond

      Example:                  Example:
      - Creating training       - Emergency system failure
        documentation             during go-live
```

**Cortex Implementation Complexity Assessment:**

- **Complicated (60%):** EHR API integration (technical problem; solution exists in literature/other implementations)
- **Complex (35%):** Clinical workflow redesign (multiple stakeholders; clinical evidence evolving; behavior changes unpredictable)
- **Chaotic (5%):** Potential emergency scenarios (regulatory inspection mid-implementation; major vendor failure)

**Implications for Project Approach:**

For complicated work: Follow best practices from similar projects; detailed upfront planning works.

For complex work: Embrace iteration; clinical champions guide real-time adjustments; fail fast with small pilots.

For chaotic work: Have contingency plans; decision authority clear; rapid escalation protocols.

### Adaptive Project Management
For complex/ambiguous projects:

1. **Progressive Elaboration:** Details emerge over time; requirements documentation evolves
2. **Iterative Feedback:** Clinical users test prototypes; requirements refined based on feedback
3. **Minimal Viable Product (MVP):** Deliver core functionality early (e.g., sepsis alerts only in first release); enhance in Phase 2
4. **Risk-Driven Development:** Highest-risk items (EHR integration, alert rule accuracy) tackled first; lower-risk items last

---

## 10. IT and Technology Projects

### Why IT Projects Fail
Research shows 30-50% of IT projects fail or are significantly challenged. Root causes:

1. **Unclear or changing requirements** (42%)
2. **Lack of executive sponsorship** (38%)
3. **Insufficient resources or skills** (30%)
4. **Poor communication with stakeholders** (28%)
5. **Scope creep / uncontrolled changes** (25%)
6. **Unrealistic schedules** (23%)

### Healthcare IT Project-Specific Risks

**Clinical Complexity:**
- Healthcare workflows are intricate; IT systems must reflect clinical decision-making
- Clinical staff have high expertise; their judgment must be respected (not over-ruled by system)
- Risk: Designing system that clinical staff perceive as "getting in the way"

**Integration Complexity:**
- Hospitals have dozens of systems (EHR, pharmacy, lab, imaging, billing); all must communicate
- Each hospital's infrastructure unique (different EHR versions, infrastructure; customizations)
- Risk: Integration points fail; delays cascade

**24/7 Operations:**
- Hospitals don't close for maintenance windows; IT changes must be carefully controlled
- Risk: System downtime during patient care; clinical impact visible immediately

**Regulatory & Compliance:**
- Healthcare IT subject to HIPAA, ANVISA (Brazilian), state regulations, accreditation standards
- Data privacy, security, auditability non-negotiable
- Risk: Non-compliance penalties; loss of hospital accreditation

### EHR Implementation Lessons Learned
Institutions implementing large EHR systems (Epic, Cerner) have generated valuable lessons:

1. **Clinical Governance is Critical:** Establish clinical steering committee; physician champions essential. System design without clinical input fails.
2. **Underestimate Change Management at Your Peril:** Training alone insufficient; redesign workflows, communication, performance management, incentives.
3. **Go-Live Readiness:** Too many hospitals "go-live and hope." Formal readiness assessment required: Data migrated and validated? Training complete? Support staffing adequate? Downtime procedures tested?
4. **Extended Support:** First 2 weeks post-go-live chaotic. 24/7 support team (vendor + hospital staff) essential; staffing shortfall = expensive escalations, clinical disruption.
5. **Expect the Unexpected:** Even thorough testing discovers new issues in production. UAT can't simulate all clinical scenarios.

### Requirements Elicitation in Healthcare IT
Gathering requirements from clinical users is nuanced:

1. **Engage multiple roles:** Physicians, nurses, pharmacists, IT staff have different needs
2. **Observe current workflows:** Don't just ask; watch clinical staff work
3. **Prototype and iterate:** Show mockups; refine based on feedback
4. **Manage scope:** "Nice to have" quickly expands; prioritize ruthlessly
5. **Document explicitly:** Ambiguous requirement = expensive rework later

### UAT (User Acceptance Testing)
UAT is clinical staff testing system with realistic patient data and workflows.

**UAT Best Practices:**
- **Realistic scenarios:** Use actual patient cases or realistic de-identified cases; scripted test cases often miss integration issues
- **Diverse users:** Include power users, novices, resistant users; ensure system works for all
- **Adequate time:** 3-4 weeks minimum; allow time for defect remediation and retesting
- **Formal sign-off:** Document acceptance criteria; clinical lead signs off when met
- **Escalation path:** Defects categorized by severity; critical defects block go-live; minor defects can be post-release

---

## 11. Healthcare IT Implementation

### Hospital IT Project Governance
Cortex implementations require structured governance:

**Governance Structure:**

```
Hospital Executive Leadership
        │
        ├─── Steering Committee
        │    (Sponsor, CMO, CIO, CFO, monthly)
        │    Approves scope changes, budget, go-live decisions
        │
        ├─── Program Management Office
        │    (Project Manager, Clinical Lead, IT Lead)
        │    Weekly status, issue management, escalation
        │
        ├─── Clinical Steering Subcommittee
        │    (Department Heads: ED, ICU, Medicine, IT reps)
        │    Alert rules, workflow changes, training validation
        │
        └─── IT Operations Subcommittee
             (IT Director, Network, Security, Infrastructure)
             System architecture, cutover, post-go-live support
```

**Decision Authority:**
- Scope changes <$25K: Project manager approves
- Scope changes $25-100K: Steering committee approves
- Scope changes >$100K or schedule impact >2 weeks: Hospital executive committee approves

### Clinical Informatics Project Management
Clinical informatics expertise required for CDSS projects.

**Clinical Informatics roles:**
- **Chief Medical Information Officer (CMIO):** Physician with IT background; bridges clinical and IT
- **Clinical Analyst:** Understands both clinical workflows and system capabilities
- **Informaticist:** Clinical professional (nurse, pharmacist) embedded in IT team

**Cortex Implementation requires:**
- Clinical validation of alert rules (do they align with clinical evidence?)
- Workflow redesign (how do clinicians respond to alerts? What documentation changes?)
- Safety review (could alert logic produce harm? Edge cases considered?)

### CDSS Rollout Methodology
Cortex deployment to a hospital typically follows this phased approach:

**Phase 1: Discovery & Requirements (Weeks 1-8)**
- Current state assessment: Existing alerts, clinical workflows, EHR capabilities
- Requirements workshops with clinical departments
- Deliverable: Detailed alert specification document (per clinical domain)

**Phase 2: System Design & Configuration (Weeks 9-16)**
- Map clinical requirements to CDSS rule engine capabilities
- Configure alert rules in CDSS platform
- Design integration with hospital EHR (data flows, APIs)
- Design clinical dashboards and reporting
- Deliverable: Configured system ready for testing

**Phase 3: Testing & Validation (Weeks 17-24)**
- System integration testing (alert rules fire correctly given test data)
- Clinical validation testing (physicians validate alert accuracy and clinical appropriateness)
- UAT with clinical staff (realistic workflows)
- Deliverable: UAT sign-off; approved go-live readiness assessment

**Phase 4: Go-Live Preparation (Weeks 25-28)**
- Data migration from legacy system (if applicable)
- Final training delivery
- Support team training and runbook development
- Contingency planning (rollback procedures, downtime protocols)

**Phase 5: Deployment & Cutover (Days 1-14)**
- Controlled go-live (e.g., go-live to pilot unit first; roll out to additional departments over 1 week)
- 24/7 support team monitoring
- Issue escalation and resolution protocols

**Phase 6: Post-Go-Live Optimization (Weeks 29-52)**
- Alert rule refinement based on clinical feedback (false positives, missed positives)
- Performance optimization (system latency, alert delivery speed)
- Phase 2 enhancements (additional alert types, departments)
- Transition to operational support model

### Physician Engagement in IT Projects
Physician engagement is the #1 success factor for healthcare IT projects.

**Engagement strategies:**
1. **Early involvement:** Physicians on design committee; input on alert rules
2. **Demonstrate value:** Show outcome data (e.g., reduced sepsis mortality, faster antibiotic administration)
3. **Minimize disruption:** Design alerts to fit existing workflows; don't force workflow change
4. **Autonomy:** Physicians choose whether to follow alert recommendations (CDSS is advisory, not prescriptive)
5. **Performance feedback:** Real-time dashboards show alert accuracy, clinical impact
6. **Recognition:** Highlight early adopters; celebrate successes

### Alert Fatigue as Implementation Risk
Alert fatigue occurs when clinicians receive too many alerts (high false positive rate), causing them to ignore or disable alerts.

**Risk:** High-sensitivity alert rules generate 50+ alerts/shift; clinical staff tune them out; critical alerts missed.

**Prevention:**
- Test alert rules extensively (target <5% false positive rate)
- Tune threshold settings to clinical judgment
- Monitor alert metrics post-go-live (alert override rate, alert acknowledgment time); adjust if fatigue evident
- Clinical feedback loop for alert refinement

### Go-Live Support Model
Structured support critical for successful cutover:

**Pre-Go-Live (2 weeks before):**
- Support team training complete
- Contingency/rollback procedures tested
- On-call schedule established
- Communication protocols in place

**Go-Live Weekend:**
- 24/7 support team on-site
- IT leadership present (CIO, IT Director)
- Clinical leadership present (CMIO, CMO)
- All escalation paths clear
- System monitoring continuous (performance, errors, user activity)

**Week 1 Post-Go-Live:**
- 24/7 support team (24 hr coverage)
- Daily standup with clinical leadership
- Rapid issue resolution (<2 hr for critical issues)
- Real-time performance monitoring

**Week 2 Post-Go-Live:**
- Support team shifts to standard on-call model
- Transition period complete

---

## 12. Multi-Stakeholder Project Management

### Managing Competing Stakeholder Interests
Hospital IT projects have competing stakeholders with conflicting objectives:

- **Physicians:** Want minimal workflow disruption, alert accuracy, clinical evidence-based rules
- **IT Operations:** Want system reliability, minimal complexity, robust architecture
- **Hospital Finance:** Want cost containment, ROI clarity, budget adherence
- **Hospital Administration:** Want go-live by year-end, positive PR, competitive advantage

**Conflict Resolution:**

1. **Clarify underlying interests:** "What matters most to you?" Often interests (improved patient safety, cost control) align even if positions (alert threshold settings) conflict.

2. **Data-driven decisions:** "Alert threshold should be X because clinical evidence shows Y sensitivity, specificity, and positive predictive value" (objective, not subjective).

3. **Shared governance:** Steering committee structures ensure all voices heard; decisions are deliberate, not abdicated.

4. **Escalation protocols:** Unresolved conflicts escalated to Sponsor for decision; decision documented; all parties accept.

### Executive Sponsor Role
The Sponsor is the single most powerful project stakeholder.

**Sponsor Responsibilities:**
- Secure funding and approve budget
- Authorize scope changes
- Resolve escalated conflicts
- Ensure organizational support and resources
- Sign-off on go-live decision

**Cortex Example:** Hospital CMO (Chief Medical Officer) is Sponsor.
- CMO allocates physician time to alert rules committee
- CMO approves go-live date (after clinical steering committee recommends readiness)
- CMO communicates to department heads: "CDSS go-live is a priority; your teams will participate in training"

Weak sponsorship = project failure. Strong sponsorship = overcome most obstacles.

### Steering Committee Dynamics
Steering committees meet monthly; typically 60 minutes.

**Agenda Structure:**
1. Status summary (2 min): On track? Budget? Schedule?
2. Key metrics (3 min): CPI, SPI, defect trends, UAT progress
3. Risks and issues (5 min): What could derail? What's blocking?
4. Decisions needed (5 min): Change requests? Scope clarification?
5. Next steps and Q&A (5 min)

**Effective Steering Committees:**
- Attend consistently (no proxy attendance)
- Make decisions (don't defer endlessly)
- Support project manager with organizational muscle
- Challenge assumptions (test whether project truly on track)

---

## 13. Cortex Implementation Playbook

### Overview
This playbook operationalizes the knowledge above for a typical Brazilian hospital CDSS implementation.

**Project Profile:**
- 1000-bed academic hospital in São Paulo
- Existing EHR (Epic) with API access
- 300 clinical staff (physicians, nurses, pharmacists)
- Goal: Deploy Cortex CDSS for sepsis detection and antibiotic stewardship across ICU, ED, and Medicine departments

### Cortex Implementation Phases

**PHASE 1: DISCOVERY (Weeks 1-8, 60 staff-days)**

*Objectives:* Understand current clinical workflows, existing alert infrastructure, EHR capabilities, organizational readiness.

*Key Activities:*
1. Stakeholder interviews (15 hours)
   - Hospital CIO, CMO, ED Director, ICU Director, Medicine Department Chair
   - Pharmacy Director (antibiotic stewardship committee chair)
   - IT Operations Lead, EHR Administrator

2. Current-state workflow mapping (20 hours)
   - Observe ED physician identifying septic patient (current process: verbal communication, manual chart review, provider judgment)
   - Time: 45 minutes from sepsis recognition to first antibiotic

3. EHR capability assessment (15 hours)
   - Epic API documentation review
   - Available data elements: Lab results, medications, vital signs, orders
   - Integration feasibility: What data can be extracted real-time vs. nightly batch?

4. Clinical requirements workshops (10 hours, per department)
   - ED: What sepsis triggers would be clinically useful? What's too sensitive (alert fatigue)?
   - ICU: Alert rule preferences (same as ED or different?)
   - Medicine: Applicability to inpatient wards?

5. Stakeholder engagement mapping
   - Identify clinical champions in each department
   - Assess readiness for change (resistance pockets identified; mitigation planned)

*Deliverables:*
- Current-state workflow diagrams
- EHR capability report (data availability, API response times, security considerations)
- Clinical requirements document (per department)
- Stakeholder engagement plan
- High-level project timeline and budget estimate

*Success Criteria:*
- Requirements document approved by clinical steering committee
- EHR integration feasibility confirmed
- Sponsorship and governance structure established

---

**PHASE 2: SYSTEM DESIGN & CONFIGURATION (Weeks 9-16, 120 staff-days)**

*Objectives:* Design CDSS configuration; prepare for technical integration.

*Key Activities:*

1. Alert rules specification (30 hours)
   - Sepsis alert rule: "Patient meets sepsis criteria if: Core temperature >38.3°C or <36°C AND (WBC >12K or <4K) AND (lactate >2.0 mmol/L) AND on at least 1 antibiotic within 6 hours"
   - Evidence base: Surviving Sepsis Campaign guidelines; hospital clinical evidence committee reviews and approves
   - Per-department variants: ED vs. ICU (different urgency/actions)

2. Workflow redesign (20 hours)
   - Current: Manual sepsis recognition → verbal alert to provider → provider initiates antibiotics
   - Future: CDSS identifies sepsis criteria → Alert displayed on ED dashboard and via pop-up → Provider reviews alert (can accept/override) → Orders antibiotics within CDSS integration
   - Redesign minimizes workflow disruption; alert supplements (not replaces) clinical judgment

3. Technical architecture design (25 hours)
   - EHR data extraction: Real-time API calls for vital signs, labs, medications (vs. nightly batch)
   - CDSS rule engine: Cortex cloud-based platform; hospital data remains in hospital (privacy compliance)
   - Alert delivery: Embedded in hospital Epic EHR interface (single pane of glass; no context-switching)

4. Dashboard design (15 hours)
   - Clinical team dashboard: "Sepsis cases in ED today" with alert status, patient acuity, antibiotics given
   - Administrative dashboard: Alert performance metrics (sensitivity, specificity, override rate)

5. Testing strategy (20 hours)
   - Unit testing: Each alert rule tested with historical patient cohorts (did it trigger as expected?)
   - Integration testing: EHR data flows correctly; alert latency acceptable (<2 min)
   - Clinical validation: Physician review of test cases; alert rules clinically appropriate

6. Training curriculum design (10 hours)
   - Clinician training: Alert interpretation, workflow changes, how to override if needed
   - IT operations training: System architecture, runbook procedures, troubleshooting
   - Administrator training: Alert rule management, performance reporting

*Deliverables:*
- Alert rules specification document (clinical evidence, configuration parameters)
- Workflow redesign diagrams (future state)
- Technical architecture document (system components, data flows)
- Dashboard design mockups (reviewed by clinical team)
- Testing plan (scenarios, acceptance criteria)
- Training curriculum and schedule

*Success Criteria:*
- Alert rules approved by clinical steering committee
- Technical architecture approved by IT leadership
- Hospital CIO confirms EHR API capability (no roadblocks)
- Training curriculum reviewed by clinical educators

---

**PHASE 3: BUILD & TESTING (Weeks 17-24, 180 staff-days)**

*Objectives:* Configure CDSS; integrate with hospital EHR; conduct UAT.

*Key Activities:*

1. CDSS configuration (40 hours)
   - Cortex rule engine: Configure sepsis alert rules with thresholds, clinical logic
   - Data mapping: Cortex field definitions mapped to Epic EHR data elements
   - Alert delivery: Configure alert routing to ED Dashboard, pop-up notifications

2. EHR API integration (50 hours)
   - Develop integration code (FHIR APIs, OAuth authentication)
   - Test data flows: Can Cortex extract vital signs, labs, medications from Epic in real-time?
   - Performance testing: What's latency? Does high load affect EHR performance?
   - Security review: Data encryption, audit logging, HIPAA compliance

3. Dashboard development (30 hours)
   - ED dashboard: Customized views for Cortex sepsis alerts (patient list, alert status, response actions)
   - Admin dashboard: Alert metrics dashboard for hospital administrators

4. System integration testing (30 hours)
   - Test cases with historical patient cohorts
   - Scenario: "Patient admitted to ED with fever, elevated WBC, positive blood cultures; does Cortex trigger sepsis alert?"
   - Scenario: "Patient on prophylactic antibiotics; does Cortex rule prevent false alert?"

5. Clinical validation testing (20 hours)
   - Physician review: Do alert rules match clinical judgment?
   - Scenario: "You're the ED physician; patient presents with sepsis criteria; would Cortex alert change your management?"

6. User Acceptance Testing (20 hours)
   - 20 clinical staff (ED physicians, nurses, medicine physicians) test system with realistic patient cases
   - Formal UAT log: Issues, severity, resolution status
   - Go-live readiness assessment

7. Defect remediation (20 hours)
   - Critical defects: Alert rule logic errors (must fix before go-live)
   - Major defects: Performance issues, integration bugs (must fix before go-live)
   - Minor defects: UI polish, nice-to-haves (can defer post-go-live)

*Deliverables:*
- Configured CDSS system ready for production
- Integration testing report (pass/fail for all scenarios)
- Clinical validation report
- UAT results and go-live readiness assessment
- Defect log and resolution status

*Success Criteria:*
- 95%+ of alert rules trigger correctly on test data
- Alert latency <2 minutes
- UAT sign-off by clinical leads
- Zero critical defects remaining
- Go-live readiness assessment: GREEN

---

**PHASE 4: GO-LIVE PREPARATION (Weeks 25-28, 80 staff-days)**

*Objectives:* Final training, support preparation, cutover planning.

*Key Activities:*

1. Data migration (if applicable) (10 hours)
   - Cortex requires minimal historical data for sepsis alert rules
   - Current patient cohort (active patients in hospital) loaded at cutover
   - Verify data accuracy in production system

2. Clinical staff training (30 hours)
   - 4 training sessions (1.5 hours each): Alert interpretation, workflow changes, system navigation
   - Target audience: 300 clinical staff (ED, ICU, Medicine, Pharmacy)
   - Train-the-trainer: 10 clinical champions trained first; they lead local department training

3. IT operations training (15 hours)
   - Runbook development: Step-by-step procedures for alert rule updates, system restart, troubleshooting
   - Support team (IT, clinical informatics) trained on operational procedures
   - Go-live support schedule confirmed: 24/7 coverage weeks 1-2 post-go-live

4. Contingency planning (15 hours)
   - Rollback procedure: If critical issues in first 24 hours, revert to pre-Cortex workflows
   - Downtime procedures: If Cortex system fails, how do clinicians manage patient care? (Manual processes)
   - On-call escalation: Critical issue during nights/weekends; who escalates? To whom?

5. Go-live readiness review (10 hours)
   - Formal readiness checklist (submitted to steering committee)
   - Questions: Is training complete? Are staffing levels adequate? Have contingencies been tested? Is sponsorship confirmed?
   - GO/NO-GO decision by Sponsor (CMO)

*Deliverables:*
- Completed clinical staff training (sign-in sheets)
- IT operations runbooks
- Go-live support plan (24/7 coverage schedule)
- Contingency and rollback procedures
- Go-live readiness checklist (approved by steering committee)

*Success Criteria:*
- 95%+ of clinical staff complete training
- IT operations team passes competency assessment
- Steering committee approves GO for production go-live

---

**PHASE 5: GO-LIVE & SUPPORT (Weeks 29-30, 140 staff-days)**

*Objectives:* Deploy to production; stabilize system; support clinical adoption.

*Activities:*

**Go-Live Day (Day 1):**
- Cutover window: Saturday midnight (minimal patient volume)
- Production deployment: Cortex system goes live; sepsis alerts begin firing
- 24/7 support team on-site (Project Manager, Clinical Lead, IT Lead, 2 IT engineers, CMIO on-call)
- System monitoring: Alert firing rates, user feedback, error logs
- First alert fired at 2:47 AM (patient admitted with fever, elevated lactate); alert delivered to ED dashboard; physician notified

**Week 1 Post-Go-Live:**
- Daily stand-ups (7 AM) with clinical and IT leadership
- Issue log: Triage and resolve issues within 2 hours if critical
- Example issues:
  - Day 2: ED physicians report alert fatigue (30+ alerts in 8-hour shift); root cause = threshold too sensitive; mitigation = adjust WBC threshold from 4K to 5.5K; re-deploy; alert volume drops to 5-6/shift
  - Day 4: One hospital unit (cardiac ICU) reports no sepsis alerts; investigation = unit uses different EHR template; data mapping incomplete; fix = add conditional logic for cardiac ICU data structure

- Clinical feedback: Informal conversations with ED physicians; "Alerts are helpful but appeared to miss one case yesterday"

**Week 2 Post-Go-Live:**
- Support team transitions to standard on-call
- Formal UAT follow-up: Any system issues clinical staff experienced? Documented for phase 2 optimization

*Deliverables:*
- Go-live incident log (issues, resolution, timeline)
- System performance report (alert accuracy, latency, uptake)
- Clinical staff feedback summary
- Transition plan to operational support model

*Success Criteria:*
- System stable (no critical outages >1 hour)
- Alert accuracy maintained (clinical teams confirm clinical appropriateness)
- 80%+ of ED staff using CDSS within first week
- Zero patient safety incidents attributable to CDSS

---

**PHASE 6: POST-GO-LIVE OPTIMIZATION (Weeks 31-52, 100 staff-days)**

*Objectives:* Refine alert rules based on clinical feedback; optimize performance; plan Phase 2.

*Key Activities:*

1. Alert rule refinement (30 hours)
   - Month 1 post-go-live: Monitor alert override rates, clinician feedback
   - If override rate >20%, alert rule too sensitive; adjust thresholds
   - If missed cases >5%, alert rule too specific; loosen criteria

2. Performance optimization (15 hours)
   - Analyze alert latency data; typical <1.5 min (meets goal)
   - EHR performance impact: Minimal (API calls <1% of EHR load)

3. Clinical outcomes monitoring (20 hours)
   - Sepsis mortality tracking: Did CDSS reduce mortality? Compare pre- vs. post-CDSS cohorts
   - Time-to-antibiotics: Did CDSS reduce time from sepsis recognition to antibiotics? (Goal: <1 hour)
   - Clinical adoption: % of ED patients screened by CDSS; alert acknowledgment rate; physician compliance with alert recommendations

4. Phase 2 planning (20 hours)
   - Expand CDSS to additional clinical conditions (e.g., AMI detection, hyperglycemia alerts)
   - Expand to additional departments (Medicine wards)
   - Gather requirements for Phase 2

5. Operational transition (15 hours)
   - IT operations team assumes full operational responsibility for CDSS
   - Clinical informatics team defines ongoing alert rule governance (how frequently can thresholds be adjusted? Who approves changes?)
   - Project Manager role transitions to smaller "optimization team"

*Deliverables:*
- Alert rule refinements (documented changes, rationale)
- Performance and clinical outcomes dashboard
- Phase 2 requirements and roadmap
- Operational support procedures (post-project)
- Lessons learned report

*Success Criteria:*
- Alert accuracy maintained or improved
- Clinical outcomes positive (reduced mortality, faster time-to-antibiotics)
- Clinical adoption sustained >70%
- Phase 2 roadmap approved by steering committee

---

### Key Implementation Success Factors

**1. Clinical Leadership:** CMO (Sponsor) actively involved; sets tone that CDSS is clinical priority.

**2. Governance:** Monthly steering committee; clear escalation; rapid decision-making.

**3. Requirements Clarity:** Detailed alert specification; clinical validation before build phase.

**4. Integration Planning:** Confirm EHR API capability early (Phase 1); no surprises during integration.

**5. Physician Engagement:** Alert rules developed with physicians; clinical validation; early access (pilot group).

**6. Change Management:** Training, communication, performance incentives aligned with CDSS adoption.

**7. Go-Live Readiness:** Formal readiness assessment; trained support team; contingency procedures tested.

**8. Support Model:** 24/7 support first 2 weeks; rapid issue resolution; clinical feedback loop.

**9. Metrics & Monitoring:** Track clinical outcomes, alert accuracy, user adoption; adjust based on data.

**10. Post-Implementation:** Optimize alert rules based on clinical feedback; plan continuous improvement and expansion.

---

## Appendix: Tools and Resources

**Project Management Software:**
- Microsoft Project: Scheduling, resource management, EVM calculations
- Jira: Issue and defect tracking
- Asana: Task management and team collaboration
- Monday.com: Visual project management

**EVM and Financial Tools:**
- Excel with EVM templates
- Oracle Primavera P6: Enterprise-grade EVM
- Smartsheet: EVM capabilities in cloud

**Requirements and Documentation:**
- Confluence: Documentation collaboration
- Miro: Whiteboarding and workflow mapping
- Figma: UI/UX design and prototyping

**Stakeholder Engagement:**
- Communication plans (email templates, meeting schedules)
- Stakeholder analysis matrices
- Change management templates (training, communication, resistance management)

**Risk Management:**
- Risk register templates (Excel, Jira)
- Risk probability × impact matrix
- Monte Carlo simulation (Crystal Ball, @Risk add-ins)

**Clinical Informatics:**
- Clinical evidence databases (UpToDate, PubMed for alert rule justification)
- EHR vendor documentation (Epic, Cerner APIs)
- FHIR standards (hl7.org) for healthcare data interoperability

---

## References

Verzuh, E. (2021). *The Fast Forward MBA in Project Management (5th ed.).* John Wiley & Sons.

Project Management Institute. (2021). *A Guide to the Project Management Body of Knowledge (PMBOK Guide)* (7th ed.).

DeMeyer, A., Loch, C., & Pich, M. (2002). Managing project uncertainty: From variation to chaos. *MIT Sloan Management Review, 44*(2), 60–67.

Dvir, D., & Shenhar, A. (2011). What great projects have in common. *MIT Sloan Management Review, 52*(3), 19–21.

Klein, G. (2007). Performing a project premortem. *Harvard Business Review, 85*(9), 18–19.

Matta, N., & Ashkenas, R. (2003). Why good projects fail anyway. *Harvard Business Review, 81*(9), 109–114.

---

**Document Version:** 2.0
**Last Updated:** March 17, 2026
**Audience:** Cortex Boardroom AI (ARCHIE/CTO, PAUL/CPO)
**Line Count:** 680+ lines
