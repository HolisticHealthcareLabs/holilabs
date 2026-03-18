# RISK-009: Clinical Trust Research Plan
## User Research for Population Health Simulation Outputs

**Risk Summary:** Clinicians either over-trust simulation outputs (treating population predictions as individual patient diagnoses) or under-trust them (dismissing as "just a simulation"). This threatens both patient safety (inappropriate interventions based on population data) and adoption (dismissal reduces clinical value).

**Research Goal:** Calibrate clinician trust in the Triage Load Predictor widget and population-level outputs through evidence-based framing and UI design.

---

## 1. Research Objectives & Hypotheses

### Primary Objectives
1. **Understand current mental models** — How do clinical informatics users conceptualize population-level predictions? Do they conflate population trends with individual patient risk?
2. **Identify trust calibration gaps** — Where do clinicians over-trust (e.g., treating a prediction as ground truth) vs. under-trust (dismissing uncertainty as model weakness)?
3. **Test explanatory framing effectiveness** — Which narrative (weather forecast, simulation replay, historical comparison) most effectively anchors trust at the appropriate level (high confidence in population-level trends, caution in individual extrapolation)?
4. **Establish UI/interaction patterns** — What design affordances (e.g., confidence bands, source data transparency, scenario toggles) most effectively support appropriate trust calibration?

### Hypotheses (H1–H5)

| Hypothesis | Prediction | Success Criteria |
|-----------|-----------|------------------|
| **H1: Mental Model Confusion** | At least 50% of clinical informatics users initially conflate population predictions with individual patient risk assessments. | >50% of participants verbalize individual-level predictions during unprompted scenarios. |
| **H2: Weather Framing Works Best** | Participants exposed to "weather forecast" framing (e.g., "60% probability of surge tomorrow") exhibit better-calibrated trust than control (no framing). | Weather-framing group: ±15% accuracy on follow-up trust calibration quiz; control: ±35% or wider. |
| **H3: Simulation Replay Adds Confidence** | Showing agent behavior traces and simulation replay patterns increases clinician confidence in model internals, reducing mystery/black-box perception. | Replay-exposed participants: +40% increase in "I understand why the model predicted X" agreement. |
| **H4: Historical Comparison Reduces Over-Trust** | Displaying prediction vs. actual historical data side-by-side prevents over-confidence in edge-case predictions. | Participants in comparison condition: 25% fewer selections of "Act on this prediction immediately" in scenario tasks. |
| **H5: Progressive Disclosure Reduces Cognitive Load** | Showing detailed simulation metadata (confidence, source data, scenario assumptions) only on demand reduces onboarding friction vs. always-visible detail. | Progressive-disclosure flow: 35% faster first-interaction time; 40% fewer scroll/dismiss gestures. |

---

## 2. Participant Recruitment Criteria

### Target Persona: Clinical Informatics Decision-Makers

**Number of Participants:** 12–15 users (stratified sample)

**Geography:** Brazil (São Paulo, Rio de Janeiro, Brasília preferred for urban hospital density; recruitment via hospital networks and professional associations)

**Professional Roles (4–5 of each category):**
1. **Emergency Physicians (4 participants)**
   - 3+ years ED clinical experience
   - Active exposure to triage decision-making
   - Hospitals with 100+ ED beds
   - Familiarity with EHR systems and clinical dashboards

2. **Medical Directors / Hospitalists (4 participants)**
   - Responsible for clinical strategy or operational metrics
   - Authority to adopt tools in their department
   - Experience with population-level metrics (e.g., readmission rates, length-of-stay tracking)
   - 5+ years post-residency

3. **Hospital Administrators / Chief Information Officers (4–5 participants)**
   - IT/operations leaders evaluating clinical simulation tools
   - Budget authority for clinical software
   - Exposure to data governance, consent, and compliance requirements
   - Preference for hospitals with 200+ beds

### Inclusion Criteria
- Active clinical or operational role at a hospital in Brazil (or equivalent LATAM healthcare system)
- Ability to read and converse in Portuguese (with English option if bilingual)
- No prior hands-on experience with this specific Triage Load Predictor (to avoid priming)
- Willing to participate in 90-minute in-person or high-fidelity video session

### Exclusion Criteria
- Data science / ML background (would introduce statistical sophistication bias)
- Prior tooling experience at direct competitors
- Unable to commit to full 90-minute session + optional 30-minute follow-up

### Recruitment Strategy
- Partner with Brazilian Hospital Associations (Associação Médica Brasileira, hospital networks)
- Direct outreach to 50–70 emergency departments and hospital innovation offices
- Advertise as "clinical decision-support usability research" (neutral framing, no product pitch)
- Offer 150–200 BRL honorarium + coffee/light refreshments

---

## 3. Research Methodology

### 3.1 Study Design: Mixed-Methods Cognitive Walkthrough + Trust Calibration Testing

**Study Duration:** 90 minutes per participant
**Modality:** In-person (preferred) or high-fidelity video (Zoom + screen share + eye-tracking optional)

**Structure:**

#### Phase 1: Unprompted Mental Model Elicitation (15 min)
- **Task:** Show participant a static screenshot of the Triage Load Predictor widget (population-level, 24-hour forecast with ±CI bands). No framing.
- **Prompt:** "What does this tell you? What decisions would you make based on this?" (open-ended, clinician explains without interrupt)
- **Observation:** Document:
  - Does clinician conflate population trend with individual patient risk?
  - Does clinician ask about data sources, model calibration, or confidence intervals?
  - Does clinician mention real-world scenarios (e.g., "What if we get a mass casualty event?")?

#### Phase 2: Cognitive Walkthrough — Three Framing Conditions (50 min total)
Participants are randomly assigned to one of three framing conditions. Each condition presents the **same underlying data and model output** but with different narrative scaffolding.

**Condition A: "Weather Forecast" Framing (Familiar Probabilistic Model)**
- **Narrative:** "This tool works like a weather forecast — it aggregates patterns from historical ED data to predict tomorrow's patient volume and acuity. Just as weather forecasts have uncertainty bands, our predictions include confidence intervals."
- **UI language:** "60% probability of moderate surge (20–40 additional patients) tomorrow morning"
- **Analogy reinforcement:** "Forecast validity horizon is 24–72 hours; beyond that, uncertainty widens (like long-range weather forecasting)."
- **Interaction:** Participant sees:
  - Forecast summary card (point estimate + ±CI)
  - Historical accuracy overlay (e.g., "This model was correct within ±15% on 82% of days last quarter")
  - Confidence decay curve (shows how confidence drops over longer time horizons)

**Condition B: "Simulation Replay" Framing (Transparent Agent Behavior)**
- **Narrative:** "This tool simulates how your ED patient flow typically unfolds under different demand scenarios. It replays agent behaviors learned from your historical logs — showing triage patterns, admission rates, and bottlenecks."
- **UI language:** "Simulation shows: If 150 walk-ins arrive by 8 AM (like the 28 days similar to tomorrow's forecast), average wait time is 45 min; predicted capacity stress: 72%."
- **Agent transparency:** Participant sees:
  - Replay video (2-min animation of simulated ED patient flow under predicted demand)
  - Agent decision trace (e.g., "System routed 65% to main ED, 35% to fast-track based on acuity distribution")
  - Scenario sensitivity (e.g., "If arrivals +20%: capacity stress jumps to 89%; current staffing insufficient")

**Condition C: "Historical Comparison" Framing (Empirical Ground Truth)**
- **Narrative:** "This tool predicts tomorrow's ED profile by comparing your current data to 28 historical 'twin days' — days when weather, season, and recent events were similar. The prediction is essentially the median outcome from those similar past days."
- **UI language:** "Tomorrow looks most like March 14, 17, 21 (last year). On those days, you had median 165 arrivals, 28% ED admissions, avg LOS 320 min. Confidence: High (similar historical patterns)."
- **Comparator table:** Participant sees:
  - Side-by-side table: Predicted metrics vs. actual historical data from 5 most-similar days
  - Uncertainty visualization (range of outcomes from similar past days, shown as histogram)
  - Explanation: "Prediction reflects historical distribution; external shocks (e.g., pandemic, major accident) are not captured."

**Walkthrough Task (same for all three conditions):**
1. Participant reads framing + sees 3 UI mockups (forecast, replay, or comparison, depending on condition)
2. Researcher asks: "Tell me what you notice. What would you do with this information?"
3. Participant is given 3 scenario cards (escalating ambiguity):
   - **Scenario 1 (Clear):** "Prediction says 'high surge tomorrow.' Your ED is fully staffed. Do you adjust anything?"
   - **Scenario 2 (Ambiguous):** "Prediction says 'borderline surge, ±25% confidence.' Your attending is considering discharging patients early to free capacity. Does the prediction change your advice?"
   - **Scenario 3 (Edge Case):** "Prediction suggests normal volumes, but you hear rumors of a major accident 20 km away. How much do you trust the prediction? Explain your reasoning."
4. For each scenario, researcher probes:
   - "Why did you make that choice?" (decision rationale)
   - "How confident are you?" (Likert 1–5)
   - "What additional info would you need?" (uncertainty triggers)

#### Phase 3: Trust Calibration Quiz (15 min)
Participant is shown 5 synthetic scenarios (vignettes), each pairing a prediction confidence level with a clinical decision scenario. Participant rates trust appropriately.

**Example Vignettes:**
- "Model predicts 85% probability of surge (high confidence). Do you staff for surge?" → Correct answer: Yes (high-confidence population-level prediction warrants resource planning). Over-trust error: "Yes, and discharge current patients to make room." Under-trust error: "No, don't staff; the model is just a simulation."
- "Model predicts 55% probability of surge (moderate confidence). A single high-acuity patient arrives (potential mass casualty incident). Do you staff for surge?" → Correct answer: Yes, but for different reason (clinical event, not model prediction). Over-trust error: "No, because model only says 55%." Under-trust error: "The model is useless; I'll ignore it entirely."

**Scoring:** Correct answers reflect "appropriate trust calibration" — high confidence in the model for population trends, caution in extrapolating to individual cases, and integration with other clinical signals.

#### Phase 4: Open-Ended Trust Discussion (10 min)
- "What would make you more confident in this tool?"
- "What scenarios worry you most?" (e.g., edge cases, model failures)
- "How would you explain this tool to a colleague?"

---

## 3.2 A/B Framing Test (Parallel Design)

To isolate framing effects, a subset of 6 participants (2 per condition) undergo a **counterbalanced within-subjects design** after the main walkthrough:

- Participants see a fourth condition (unlabeled: the framing narratives are obscured, showing only raw data + charts)
- Participant attempts same scenario tasks
- Comparison: Does framing condition outperform unlabeled baseline?
- **Success criterion:** Framing-exposed conditions show ≥30% higher accuracy and ≥40% higher confidence appropriateness vs. unlabeled baseline

---

## 4. Three Explanatory Framings (Detailed UI Specifications)

### Framing 1: Weather Forecast
**Mental Model:** "This is a probabilistic forecast, like weather. Helpful for planning, not prescriptive."

**Key Messages:**
- "Based on historical patterns and current conditions"
- "Includes uncertainty bands (±CI)"
- "Accuracy decreases over longer horizons"
- "Complement clinical judgment; don't replace it"

**UI Elements:**
- Forecast card with point estimate ± range (e.g., "165 ± 28 arrivals")
- Mini confidence-decay graph (shows why 72-hour predictions are less reliable)
- "Last 90 days accuracy: ±12% 82% of the time" (calibration statement)
- Icon: thermometer or sun/cloud

---

### Framing 2: Simulation Replay
**Mental Model:** "This tool runs thousands of 'what-if' simulations of your ED under predicted conditions. You see patterns that emerge, not individual predictions."

**Key Messages:**
- "Agent behaviors learned from your actual ED logs"
- "Shows capacity bottlenecks and staffing implications"
- "Sensitivity testing: what changes if demand increases 20%?"
- "Transparent enough to debug; complex enough to be useful"

**UI Elements:**
- 2-min animated replay (agent movement, queue dynamics, bottleneck visualization)
- Agent decision trace (e.g., triage algorithm output)
- Sensitivity sliders (manually adjust assumed demand, observe output changes)
- "Under these conditions, system predicts 72% ED capacity stress" (outcome-focused language)

---

### Framing 3: Historical Comparison
**Mental Model:** "This is a data-driven forecast built by finding the 'most similar' days in your past, then showing their median outcome."

**Key Messages:**
- "Tomorrow's profile resembles: March 14, 17, 21 (last year)"
- "Historical distribution of outcomes from similar days: [range]"
- "Limitations: external shocks (accidents, policy changes) not captured"
- "Useful for baseline planning; clinical judgment required for edge cases"

**UI Elements:**
- Comparison table (predicted metrics vs. historical 5 similar days)
- Histogram showing distribution of actual outcomes from similar days
- "Confidence: High" label (based on number of historical matches)
- "Learn more" expandable showing which historical days match and why

---

## 5. Interview Guide with Specific Questions

**Duration:** 90 minutes
**Recording:** Audio + anonymized screen recording (with participant consent)
**Interviewer:** Clinical informatics researcher + note-taker

### Opening (5 min)
1. "Thank you for joining. Before we start, tell me about your typical day in the ED / your role in hospital operations. What clinical or operational decisions do you make regularly?"
2. "Have you worked with prediction tools or dashboards before? Tell me about that experience."
3. "No wrong answers here — we're exploring how clinicians think about this kind of tool, not testing you."

### Framing Introduction (3 min)
4. "I'm going to show you a tool that predicts ED patient volume and acuity over the next 24 hours. It's presented in one of three ways. Let me show you the framing [present assigned condition]."

### Mental Model Elicitation (15 min)
5. **Unprompted:** "Looking at this interface, what does it tell you? What stands out?" (Let them talk; use silence and affirm).
6. "What decisions would you make based on this information?"
7. "How confident would you be in acting on this prediction? Why?"
8. "What questions do you have about how this prediction was made?"

### Scenario Walkthroughs (35 min, ~11 min each)
9. **Scenario 1 (Clear):** "It's 4 PM. The tool predicts 'high surge tomorrow morning — 190 arrivals (±25), 35% admission rate.' Your ED is currently fully staffed. What do you do?"
   - Probe: "Why that choice?" / "How confident?" / "What else would you need to know?"
10. **Scenario 2 (Ambiguous):** "It's 8 AM. The tool predicts 'borderline conditions — 155 ± 40 arrivals, moderate surge risk (55% probability).' Your attending is considering discharging 8 stable patients to free space. They ask you what the prediction means. What's your advice?"
    - Probe: "Would you recommend the early discharge based on this prediction?" / "Why or why not?" / "How would you explain the uncertainty to the attending?"
11. **Scenario 3 (Edge Case):** "It's 5 PM. The tool predicts 'normal volumes — 120 arrivals.' But you hear on the news that a major traffic accident occurred 15 km away, with ~30 trauma patients en route. The prediction says 'normal.' How much do you trust the tool now?"
    - Probe: "What's your ED's response?" / "How do you integrate the prediction with this real-time event?" / "When would you trust the tool? When wouldn't you?"

### Trust Calibration Quiz (10 min)
12. [Present 5 vignettes; clinician rates appropriate action for each]
    - Example: "Prediction: high confidence (87%), moderate surge. Do you call in extra staff?" (yes — matches population prediction)
    - Counterexample: "Prediction: low confidence (42%), mild surge. Do you discharge patients early to make space?" (no — low confidence + uncertain)

### Synthesis & Open-Ended Questions (15 min)
13. "Overall, what's your impression of this tool?"
14. "What would make you more confident in using it?"
15. "Are there scenarios where you'd distrust it completely?"
16. "How would you explain this to a colleague — an ED physician, a medical director, a hospital administrator?"
17. "If you had to redesign one thing about this interface, what would it be?"

### Demographics & Wrap-Up (2 min)
18. "Before we finish: How many years in your role? How many patients / decisions do you handle weekly? Any final thoughts?"

---

## 6. Trust Proxy Metrics (Post-Launch Monitoring)

After deployment, the following metrics will be tracked to assess whether calibrated trust is sustained in production:

### User Engagement Metrics

| Metric | Definition | Target / Concern Threshold |
|--------|-----------|---------------------------|
| **Prediction View Rate** | % of daily ED sessions where Triage Load Predictor widget is viewed | Target: >60% (indicates adoption); <30% indicates under-trust / dismissal |
| **Interaction Depth** | % of views that include click on detail/explanation (not just glance) | Target: >40%; <20% indicates disengagement |
| **Confidence Band Inspection** | % of users who hover/expand confidence interval bands within 30 sec of view | Target: >35%; shows attention to uncertainty |

### Decision Integration Metrics

| Metric | Definition | Target / Concern Threshold |
|--------|-----------|---------------------------|
| **Staffing Adjustment Rate** | % of high-confidence (>75%) predictions followed by ED staffing call-in decisions within 12 hours | Target: 55–70%; <40% = under-trust; >85% = over-trust (all predictions acted on immediately) |
| **Low-Confidence Dismissal** | % of <50% confidence predictions NOT triggering immediate action | Target: >80%; <60% indicates over-trust in low-confidence outputs |
| **Clinical Overrides** | % of high-confidence predictions overridden by ED physician (real-time event contradicts prediction) | Target: <15% (normal; reflects rare edge cases); >30% indicates model miscalibration or framing failure |

### Temporal Dynamics

| Metric | Definition | Target / Concern Threshold |
|--------|-----------|---------------------------|
| **Time-to-Dismiss** | Median time (seconds) before user closes prediction widget after viewing | Target: 45–120 sec (sufficient time to parse prediction); <20 sec = too fast (dismissal); >300 sec = confusion |
| **Repeat View Rate** | % of users who view prediction >2x in same ED shift | Target: 30–40%; indicates reliance or verification behavior; >60% might indicate confusion re-checking |
| **Help/Support Clicks** | # clicks to help docs / "Explain this prediction" per 1,000 predictions viewed | Target: <50/1,000 (after training ramp); >200/1,000 indicates persistent confusion |

### Outcome Validation Metrics

| Metric | Definition | Target / Concern Threshold |
|--------|-----------|---------------------------|
| **Prediction Accuracy (ED-Observed)** | Median absolute error (%) between predicted and actual arrivals / admission rate | Target: <±15%; >±25% indicates model drift or systematic bias |
| **Trust Calibration Index (TCI)** | Derived from decision alignment: high-confidence predictions + high-certainty decisions + low-confidence predictions + low-action rate | Target: TCI > 0.75 (appropriate calibration); <0.5 = severe miscalibration |
| **Adverse Events (Safety Check)** | Count of incidents where over-trust in prediction contributed to capacity exhaustion / patient harm (flagged during incident review) | Target: 0 over 90 days; any incident triggers re-framing review |

### Framing Effectiveness (A/B Holdout)

If 3 hospitals are recruited with different framings (A: weather, B: simulation, C: historical):

| Metric | Definition | Comparison |
|--------|-----------|-----------|
| **Framing-Specific Adoption** | View rate + interaction depth by framing type | Which framing shows highest engagement + lowest dismissal rate? |
| **Framing-Specific Accuracy** | TCI by framing type | Which framing most closely predicts clinician decision-making behavior? |

---

## 7. Timeline: 3-Week Research Sprint

### Week 1: Preparation & Recruitment
- **Mon–Tue:** Finalize interview guide, create UI mockups for all three framing conditions, secure IRB approval (if required).
- **Wed–Fri:** Launch recruitment campaign (email outreach, hospital partnerships). Target: 15 commitments by EOW.

### Week 2: Data Collection (Sessions)
- **Mon–Wed:** Sessions 1–9 (3 per day, 90 min each; buffer time between). Rotate through framing conditions (A, B, C, A, B, C, ...).
- **Thu–Fri:** Sessions 10–15. Parallel: initial transcription and note compilation.

### Week 3: Analysis & Report
- **Mon–Tue:** Thematic coding (unprompted mental models, scenario decision patterns, trust calibration accuracy). Aggregate across framing conditions.
- **Wed:** Statistical summary (% participants with over-trust, under-trust, appropriate calibration; accuracy by framing; key quotes).
- **Thu–Fri:** Draft Trust Calibration Report with design recommendations. Share draft with clinical + design team.

**Post-Research:** Final report shared with product team by EOW3. Design iterations incorporating findings begin Week 4.

---

## 8. Deliverable: Trust Calibration Report

### Report Structure (5,000–7,000 words)

1. **Executive Summary**
   - Key findings: Which mental models dominate? Which framing works best?
   - Design recommendations (UI, language, interaction patterns)
   - Safety implications and red flags

2. **Methodology Recap**
   - 15 participants, stratified roles, 3 framing conditions
   - Cognitive walkthrough + trust calibration quiz + vignettes
   - Analysis approach (thematic + quantitative)

3. **Findings by Theme**
   - **Theme A: Mental Model Confusion** — Do clinicians conflate population ↔ individual risk? Evidence from unprompted elicitation.
   - **Theme B: Framing Effectiveness** — Which narrative (weather, simulation, historical) best supports appropriate trust? Comparison of scenario task performance.
   - **Theme C: Trust Calibration Success** — On the quiz, which participants showed well-calibrated trust? Correlations with framing, role, experience.
   - **Theme D: Edge Cases & Model Boundaries** — When did clinicians distrust the model? What scenarios expose limitations?
   - **Theme E: UI/Interaction Preferences** — Which affordances (detail toggles, confidence bands, replay animations) mattered most?

4. **Quantitative Results**
   - % participants by calibration level (over-trust, under-trust, appropriate) by framing
   - Quiz accuracy by framing condition
   - Scenario task decision patterns (staffing call-in rate, early discharge recommendations, etc.)

5. **Qualitative Insights (Representative Quotes)**
   - Best: Quotes showing appropriate trust calibration
   - Worst: Quotes showing dangerous over-trust or dismissive under-trust
   - Design drivers: Quotes that directly suggest UI/copy improvements

6. **Design Recommendations**
   - **Primary:** Which framing should ship? (Or hybrid approach?)
   - **Secondary:** UI elements to emphasize (e.g., confidence bands, historical accuracy overlay)
   - **Tertiary:** Onboarding language and training for hospital staff
   - **Safety guardrails:** Explicit disclaimers, scenario-based training content

7. **Limitations & Future Work**
   - Sample size, recruitment bias (volunteering bias toward tech-friendly clinicians)
   - Predictive validity: Will results replicate in production with real predictions vs. mockups?
   - Proposed: Post-launch monitoring plan (see Section 6 Trust Proxy Metrics)

8. **Appendices**
   - Full interview transcripts (anonymized)
   - Vignette quiz + answer key
   - Framing condition UI mockups (if not embedded in body)
   - Recruitment materials

---

## 9. Success Criteria for Research Plan

- **Recruitment:** 12–15 clinicians recruited, representing 3 professional roles, across 3+ hospitals in Brazil
- **Data Quality:** 90%+ of sessions completed (allow 1–2 no-shows); audio recordings usable; informed consent documented
- **Analysis:** Thematic saturation reached by participant 13–14 (minimal new codes emerging)
- **Framing Validation:** One framing condition shows ≥25% higher scenario task accuracy and lower miscalibration errors vs. others
- **Actionable Recommendations:** Design team can implement ≥5 specific UI/copy changes informed by findings
- **Monitoring Setup:** Trust proxy metrics (Section 6) integrated into analytics dashboard for Week 4+ post-launch tracking

---

## 10. Risk Mitigation & Contingencies

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Recruitment delays (slow hospital responses) | Medium | Parallel outreach to 3 recruitment partners (professional assoc., hospital networks, consulting firms) by start of Week 1 |
| Participant no-shows | Low–Medium | Confirm 48 hrs before; offer makeup sessions; budget for 20% attrition |
| Framing conditions show no meaningful differences | Low | Fallback: prioritize hybrid approach combining strongest elements of all three; extend analysis to role-based differences (physician vs. admin framing preferences) |
| Clinicians already have entrenched mental models (hard to shift) | Medium | Design team accepts findings and focuses on "meeting clinicians where they are" (e.g., disclaimers, training) rather than expecting framing alone to fix over-trust |
| IRB delays (if institutional review required) | Low | Begin pre-screening with legal + compliance; minimize risk profile (interviews, no intervention; low-risk population) |

---

**Document Owner:** Product (PAUL) + Clinical (ELENA)
**Stakeholders:** Clinical informatics, UX design, safety & compliance
**Last Updated:** 2026-03-17
**Status:** Ready for team review and recruitment launch
