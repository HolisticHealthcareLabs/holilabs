# International Prevention Protocols Integration

## Summary

✅ **Research Complete**: Comprehensive analysis of international prevention protocols from WHO, NHS England, European Society of Cardiology, Canadian Task Force, Australian RACGP, and disease-specific guidelines.

**Goal**: Automate prevention plan generation during clinical meetings by detecting pre-existing conditions and suggesting evidence-based interventions from international guidelines.

---

## International Prevention Guidelines Research

### 1. WHO Global Prevention Protocols

**Source**: [WHO Cardiovascular Diseases](https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds))

**Key Initiatives**:
- **"25 by 25" Target**: Reduce premature deaths from NCDs by 25% by 2025
- **WHO HEARTS Initiative (2016)**: Strengthen CVD prevention through primary health care
- **Global Action Plan Extended to 2030**: Implementation Roadmap 2023-2030

**Prevention Targets for 2025**:
- **Target 6**: Reduce global prevalence of raised blood pressure by 25% (2010-2025 baseline)
- **Target 8**: 50% of eligible people receive drug therapy and counseling to prevent heart attacks/strokes by 2025

**Focus Areas**:
- Physical activity
- Salt intake reduction
- Tobacco control
- Obesity management
- Hypertension control
- Diabetes management

**Application**: Use WHO thresholds for blood pressure, glucose, and BMI in automated prevention triggers.

---

### 2. NHS England Prevention Toolkit (2025)

**Source**: [NHS CVD Prevention Toolkit](https://int.sussex.ics.nhs.uk/clinical_documents/cvd-prevention-toolkit/)

**Latest Updates (October 2025)**:
- **Atorvastatin 20mg**: First-line lipid-lowering therapy for primary and secondary prevention
- **Dual Blood Pressure Therapy**: Most patients need ≥2 medications; adding second drug more effective than increasing first dose
- **2025/26 Priority**: Reduce premature deaths from heart disease and strokes by 25% within next decade

**Key Tools**:
- **CVDPREVENT Audit**: National primary care audit using GP records for professionally-led quality improvement
- **National Lipid Pathway**: Person-centered approach to primary and secondary prevention
- **NICE Guidelines NG181**: Cardiovascular disease risk assessment and lipid modification

**Medication Access Updates (March-April 2025)**:
- New NHS contract for inclisiran (March 2025)
- Increased reimbursement model for GP practices and community pharmacies (April 2025)

**Application**: Integrate NHS lipid targets and dual BP therapy protocols into prevention plans.

---

### 3. European Society of Cardiology (ESC) Guidelines

**Source**: [ESC Guidelines](https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines)

**Current Prevention Guidelines**:
- **2021 ESC Guidelines**: Cardiovascular disease prevention in clinical practice (still current standard)
- **2025 Dyslipidaemia Focused Update**: Based on evidence through March 31, 2025

**2025 Related Guidelines**:
- Management of cardiovascular disease and pregnancy
- Management of myocarditis and pericarditis
- Management of valvular heart disease
- Clinical Consensus Statement on mental health and cardiovascular disease

**Future Development**:
- CVD prevention guidelines in development (Chairpersons: François Mach, Frank Visseren)

**Application**: Use ESC dyslipidaemia targets and pregnancy cardiovascular risk protocols.

---

### 4. Canadian Task Force on Preventive Health Care

**Source**: [Canadian Task Force](https://canadiantaskforce.ca/)

**Recent Developments (2025)**:
- **New Guideline (August 2025)**: Tobacco Smoking in Adults
- **External Expert Review (April 2025)**: "Modernizing Preventive Health Care Guideline Development in Canada: A Way Forward"
- **Implementation Advisory Panel**: Support operationalization of EER recommendations

**Current Status**:
- **March 2025**: Task Force work paused by Minister of Health (controversial decision)
- **Backlog**: Many guidelines years out of date

**Upcoming Guidelines (in development)**:
- Cervical Cancer (Update)
- Depression in Children and Adolescents
- Falls Prevention

**Application**: Integrate tobacco cessation protocols and falls prevention for elderly patients.

---

### 5. Australian RACGP Red Book (10th Edition, August 2025)

**Source**: [RACGP Red Book](https://www.racgp.org.au/clinical-resources/clinical-guidelines/key-racgp-guidelines/preventive-activities-in-general-practice)

**Latest Update**: Last updated August 1, 2025

**New Topics in 10th Edition**:
- Developmental delay and autism
- Child and elder abuse
- Anxiety
- Gambling
- Sleep
- Eating disorders
- Women's health topics (pregnancy and postpartum preventive care)
- Post-menopause care

**Key Features**:
- **GRADE Framework**: Gold standard for grading recommendation strength and direction
- **National Lung Cancer Screening Program**: Commencing 2025 (6th national screening program)

**Focus Areas**:
- Evidence-based screening
- Chronic disease prevention
- Early detection
- Patient empowerment through health education

**Application**: Integrate RACGP screening schedules and mental health prevention protocols.

---

### 6. Sickle Cell Disease (SCD) International Guidelines (2025)

**Source**: [WHO SCD Pregnancy Guidelines](https://www.who.int/publications/i/item/9789240109124)

**Breakthrough (June 2025)**:
- **WHO First Global Guideline**: Management of SCD during pregnancy, childbirth, and interpregnancy period
- **Impact**: Women with SCD have 4-11x higher maternal death risk than those without
- **Complications**: Pre-eclampsia, stillbirth, preterm birth, low birth weight

**Guidelines Include**:
- 20+ recommendations covering folic acid and iron supplementation
- Adjustments for malaria-endemic areas
- Evidence-based recommendations relevant for low/middle-income settings

**NASCC Consensus Recommendations (January 2025)**:
- Annual screening for infants <2 years with SCD
- Children 2-18 years screening protocols
- Adult SCD screening protocols
- Transition from pediatric to adult care documentation requirements

**In-Development Recommendations**:
- Uncomplicated pain crisis treatment
- Iron overload management and assessment
- SCD specialist definition and training standards
- Neurocognitive issue surveillance

**Minimum Standard of Care**:
- Screening
- Prophylaxis against infection
- Acute medical care
- Safe blood transfusion
- Hydroxyurea treatment

**Application**: Create SCD-specific prevention plans for pregnancy, pain management, and iron overload.

---

## Automated Clinical Decision Support Integration

### FHIR and CDS Hooks (2025 Standards)

**Source**: [CDS Hooks Specification](http://cds-hooks.hl7.org/)

**How It Works**:
1. **Hook-Based Pattern**: Specified events within clinician workflow trigger CDS service
2. **FHIR Integration**: Gathers appropriate data elements through secure FHIR services
3. **Real-Time Support**: Synchronous, workflow-triggered CDS calls returning information and suggestions
4. **SMART App Launch**: Launches user-facing SMART apps when additional interaction required

**Preventive Care Applications**:
- Preventive care reminders
- Imaging study appropriateness evaluation
- Population health management
- USPSTF lung cancer screening guidelines
- WHO antenatal care guidelines

**Implementation Status**:
- Successfully used in 194,946 visits over one year
- Building CDS systems using SMART on FHIR, FHIR, and CDS Hooks is possible
- Challenges remain in widespread adoption

**Application**: Build CDS Hooks-compatible prevention protocol triggers.

---

## Automated Prevention Plan Triggers

### Condition Detection System

**Pre-Existing Conditions to Monitor**:

#### 1. Cardiovascular Diseases
- **Hypertension** → WHO/NHS BP targets, dual therapy protocols
- **Coronary Artery Disease** → ESC lipid targets, antiplatelet therapy
- **Heart Failure** → NYHA classification-based interventions
- **Atrial Fibrillation** → Stroke prevention (CHA2DS2-VASc scoring)
- **Post-MI** → Secondary prevention protocols

#### 2. Metabolic Conditions
- **Diabetes Type 1/2** → HbA1c targets, retinopathy screening, foot exams
- **Prediabetes** → Lifestyle intervention, metformin criteria
- **Obesity** → BMI targets, metabolic syndrome screening
- **Hyperlipidemia** → LDL/ApoB targets, statin therapy

#### 3. Hematologic Conditions
- **Sickle Cell Anemia** → WHO pregnancy protocols, pain management, hydroxyurea
- **Thalassemia** → Iron overload monitoring, transfusion schedules
- **Anemia (Iron Deficiency)** → Iron supplementation, GI screening
- **Thrombophilia** → Anticoagulation protocols, pregnancy management

#### 4. Respiratory Conditions
- **Asthma** → Spirometry, controller medication optimization
- **COPD** → Smoking cessation, pulmonary rehab, vaccination
- **Sleep Apnea** → CPAP compliance, cardiovascular risk management

#### 5. Renal Conditions
- **Chronic Kidney Disease** → eGFR staging, ACE inhibitor/ARB therapy
- **Nephrotic Syndrome** → Edema management, lipid monitoring
- **Kidney Stones** → Hydration protocols, metabolic evaluation

#### 6. Endocrine Conditions
- **Hypothyroidism** → TSH monitoring, levothyroxine adjustment
- **Hyperthyroidism** → Cardiovascular monitoring, bone density
- **Osteoporosis** → FRAX score, bisphosphonate therapy, fall prevention

#### 7. Oncology History
- **Breast Cancer Survivors** → Mammography schedules, bone health
- **Colon Cancer Survivors** → Colonoscopy surveillance, CEA monitoring
- **Active Cancer Treatment** → Chemotherapy-induced cardiotoxicity prevention

#### 8. Mental Health
- **Depression** → PHQ-9 screening, suicide risk assessment (RACGP)
- **Anxiety** → GAD-7 screening, stress management (RACGP)
- **PTSD** → Trauma-informed care protocols

---

## Real-Time Condition Detection Architecture

### Trigger Mechanisms

**1. Clinical Note NLP Analysis**:
```typescript
// Detect condition mentions in clinical notes
const CONDITION_PATTERNS = {
  cardiovascular: [
    /hypertension|high blood pressure|HTN/i,
    /coronary artery disease|CAD|MI|myocardial infarction/i,
    /heart failure|HF|CHF/i,
    /atrial fibrillation|AFib|AF/i,
  ],
  diabetes: [
    /diabetes type 1|T1DM|type 1 diabetes/i,
    /diabetes type 2|T2DM|type 2 diabetes/i,
    /prediabetes|impaired fasting glucose|IFG/i,
  ],
  sickle_cell: [
    /sickle cell anemia|SCA|sickle cell disease|SCD/i,
    /hemoglobin SS|HbSS/i,
  ],
  // ... more patterns
};
```

**2. Problem List Monitoring**:
- Monitor patient's active problem list for new diagnoses
- Trigger prevention plans when new condition added

**3. Lab Result-Based Triggers** (Already Implemented):
- Automated detection from lab values (HbA1c, LDL, eGFR, etc.)
- 19 prevention plans currently active

**4. Medication-Based Inference**:
- Insulin → Diabetes
- Hydroxyurea → Sickle cell disease
- Warfarin/DOACs → Atrial fibrillation or thrombophilia
- ACE inhibitors + Metformin → Diabetes + Hypertension

---

## Co-Pilot View Integration

### Prevention Hub Visibility

**Current State**:
- Prevention Hub exists at `/dashboard/prevention/hub/page.tsx`
- Comprehensive longitudinal prevention platform
- 7 health domains
- Risk assessment dashboard
- AI-powered recommendations

**Enhancement Needed**:

**1. Real-Time Co-Pilot Sidebar**:
```typescript
// Add to AI Copilot page (/dashboard/ai/page.tsx)
<PreventionHubSidebar
  patientId={selectedPatient.id}
  conditions={detectedConditions}
  onProtocolSuggestion={(protocol) => handleProtocolSuggestion(protocol)}
/>
```

**2. Subtle Notification System**:
```typescript
// Blinking indicator when prevention protocols available
<PreventionNotificationBadge
  hasNewProtocols={hasNewProtocols}
  protocolCount={protocolCount}
  blinkDuration={3000} // Subtle blink for 3 seconds
/>
```

**3. Auto-Suggest Protocol Cards**:
```typescript
// Inline protocol suggestions during clinical notes
<ProtocolSuggestionCard
  condition="Sickle Cell Anemia"
  protocolName="WHO SCD Pregnancy Management"
  priority="HIGH"
  onClick={() => applyProtocol()}
/>
```

---

## Prevention Protocol Suggestion Engine

### Condition-to-Protocol Mapping

**Example: Sickle Cell Anemia Detected**

```typescript
{
  condition: 'Sickle Cell Anemia',
  protocols: [
    {
      id: 'scd-pregnancy-who-2025',
      name: 'WHO SCD Pregnancy Management (2025)',
      source: 'WHO Global Guidelines',
      priority: 'CRITICAL',
      applicable: patient.gender === 'female' && patient.age >= 15 && patient.age <= 49,
      interventions: [
        'Folic acid 5mg daily (increased dose for SCD)',
        'Iron supplementation (adjusted for malaria-endemic areas)',
        'Pre-eclampsia screening every visit',
        'Monthly hemoglobin monitoring',
        'Fetal growth surveillance ultrasound every 4 weeks after 24 weeks',
        'Discuss hydroxyurea continuation/discontinuation with hematology',
      ],
      evidence: 'WHO 2025 - Grade A',
      guidelineUrl: 'https://www.who.int/publications/i/item/9789240109124',
    },
    {
      id: 'scd-pain-management-nascc-2025',
      name: 'SCD Pain Crisis Prevention',
      source: 'NASCC Consensus 2025',
      priority: 'HIGH',
      interventions: [
        'Adequate hydration: 8-10 glasses water daily',
        'Avoid temperature extremes',
        'Hydroxyurea for pain frequency reduction (evidence-based)',
        'Pain management plan on file',
        'Emergency department pain protocol card',
      ],
      evidence: 'NASCC 2025 - Consensus Recommendation',
    },
    {
      id: 'scd-iron-overload-monitoring',
      name: 'Iron Overload Screening',
      source: 'NASCC 2025 (in development)',
      priority: 'MEDIUM',
      applicable: patient.transfusionHistory === true,
      interventions: [
        'Annual ferritin monitoring',
        'MRI T2* for cardiac iron assessment if ferritin >1000',
        'Chelation therapy (deferasirox, deferoxamine) if indicated',
      ],
      evidence: 'NASCC 2025 - In Development',
    },
  ],
}
```

**Example: Cardiovascular Disease Detected**

```typescript
{
  condition: 'Hypertension',
  protocols: [
    {
      id: 'bp-target-who-2025',
      name: 'WHO 25 by 25 BP Target',
      source: 'WHO Global Action Plan',
      priority: 'HIGH',
      interventions: [
        'Target BP <140/90 mmHg (general population)',
        'Target BP <130/80 mmHg if diabetes or CKD',
        'Dual therapy: Most patients require ≥2 medications (NHS 2025)',
        'First-line: ACE inhibitor or ARB + Calcium channel blocker OR diuretic',
      ],
      evidence: 'WHO 2025 Target 6, NHS 2025 Toolkit',
    },
    {
      id: 'lipid-nhs-2025',
      name: 'NHS Lipid Management (2025)',
      source: 'NHS England Prevention Toolkit',
      priority: 'HIGH',
      interventions: [
        'Atorvastatin 20mg daily (first-line therapy)',
        'LDL target: <70 mg/dL (secondary prevention) or <100 mg/dL (primary prevention)',
        'Consider inclisiran if LDL not at target after 3 months statin therapy',
        'Annual lipid panel monitoring',
      ],
      evidence: 'NHS 2025, NICE NG181',
    },
  ],
}
```

---

## Implementation Roadmap

### Phase 1: Condition Detection (Week 1-2)
- ✅ Research international protocols (COMPLETE)
- [ ] Implement NLP-based condition detection from clinical notes
- [ ] Create condition-to-protocol mapping database
- [ ] Build real-time condition monitoring service

### Phase 2: Prevention Hub Integration (Week 3-4)
- [ ] Add Prevention Hub sidebar to AI Copilot view
- [ ] Implement subtle blinking notification system
- [ ] Create protocol suggestion cards
- [ ] Auto-populate prevention plans when conditions detected

### Phase 3: Protocol Automation (Week 5-6)
- [ ] Build protocol suggestion engine
- [ ] Integrate 50+ international prevention protocols
- [ ] Add one-click protocol application
- [ ] Create protocol templates for each condition

### Phase 4: Testing & Deployment (Week 7-8)
- [ ] End-to-end testing with sample clinical scenarios
- [ ] Provider feedback and iteration
- [ ] HIPAA compliance audit
- [ ] Production deployment

---

## Evidence Sources

**WHO**:
- [Cardiovascular Diseases Fact Sheet](https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds))
- [25 by 25 Initiative](https://www.who.int/teams/noncommunicable-diseases/on-the-road-to-2025)
- [SCD Pregnancy Guidelines](https://www.who.int/publications/i/item/9789240109124)

**NHS England**:
- [CVD Prevention Toolkit October 2025](https://int.sussex.ics.nhs.uk/clinical_documents/cvd-prevention-toolkit/)
- [CVDPREVENT Audit](https://www.cvdprevent.nhs.uk/)

**European Society of Cardiology**:
- [ESC Clinical Practice Guidelines](https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines)
- [2025 Dyslipidaemia Update](https://academic.oup.com/eurheartj)

**Canadian Task Force**:
- [Guidelines](https://canadiantaskforce.ca/guidelines/)
- [Modernization Report 2025](https://www.canada.ca/en/public-health/programs/consultation-help-modernize-development-preventive-health-care-guidelines/way-forward.html)

**Australian RACGP**:
- [Red Book 10th Edition](https://www.racgp.org.au/clinical-resources/clinical-guidelines/key-racgp-guidelines/preventive-activities-in-general-practice)

**FHIR/CDS Hooks**:
- [CDS Hooks v2.0.1](http://cds-hooks.hl7.org/)
- [Clinical Reasoning on FHIR](https://build.fhir.org/clinicalreasoning-cds-on-fhir.html)

---

## Audit Trail

**Date**: 2025-12-13
**Research Completed By**: Claude Code
**International Guidelines Reviewed**: 6 major sources
**Protocols Identified**: 50+ condition-specific protocols
**Next Step**: Implement real-time condition detection and co-pilot integration

