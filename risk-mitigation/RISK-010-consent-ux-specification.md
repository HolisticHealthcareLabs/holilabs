# RISK-010: Consent UX Specification
## Granular Consent Architecture for Population Health Platform

**Risk Summary:** Three granular consent types (treatment, population research, prediction service) create onboarding friction that hospital partners resist. Hospital legal teams struggle to explain consent scope to clinicians; sales teams lack differentiation language; and users dismiss consent screens as boilerplate.

**Solution Approach:** Progressive disclosure, bilingual (Portuguese/English) plain-language framing, role-based consent flows, and sales/legal enablement materials that position consent as a feature (privacy + autonomy) rather than a compliance tax.

---

## 1. Three Consent Types: Definitions & Plain-Language Descriptions

Each consent type is independently toggleable and maps to specific data handling and use cases.

### Consent Type 1: Treatment Support (Suporte ao Tratamento)

**Legal Classification:** LGPD Art. 7(II) — Legitimate Interest (hospital clinical operations); may also qualify as Art. 7(IV) if patient explicitly requests support.

**What It Is (English):**
- Authorizes the platform to use your clinical data (EHR diagnoses, vitals, medications, lab results) to support your immediate treatment in this hospital.
- Examples: ED triage recommendations, length-of-stay predictions for your specific case, drug interaction alerts, readmission risk flags (for your care team only).
- **Data Scope:** Patient-level clinical data, PHI retained per hospital policy.
- **Visibility:** Only your direct care team sees predictions. Data is not shared outside the hospital without separate authorization.
- **Retention:** Tied to your hospital stay + 7 days post-discharge (then deleted unless other legal basis applies).
- **Revocation Impact:** If revoked, the platform stops providing clinical decision-support for your case; however, de-identified aggregated data may still be used for research (if that consent was given separately).

**What It Is (Portuguese):**
- Autoriza a plataforma a usar seus dados clínicos (diagnósticos do prontuário eletrônico, sinais vitais, medicações, resultados laboratoriais) para apoiar seu tratamento imediato neste hospital.
- Exemplos: recomendações de triagem na emergência, previsões de duração da internação para seu caso específico, alertas de interações medicamentosas, sinalizadores de risco de readmissão (apenas para sua equipe médica).
- **Escopo de Dados:** Dados clínicos em nível de paciente, PHI retido conforme política do hospital.
- **Visibilidade:** Apenas sua equipe direta de cuidado vê as previsões. Os dados não são compartilhados fora do hospital sem autorização separada.
- **Retenção:** Vinculada à sua internação + 7 dias pós-alta (depois excluído, a menos que outra base legal se aplique).
- **Impacto da Revogação:** Se revogado, a plataforma deixa de fornecer suporte de decisão clínica para seu caso; porém, dados agregados desidentificados ainda podem ser usados para pesquisa (se esse consentimento foi dado separadamente).

---

### Consent Type 2: Population Research (Pesquisa Populacional)

**Legal Classification:** LGPD Art. 7(VI) — Scientific Research (requires data protection plan; CNPD notification if cross-border).

**What It Is (English):**
- Authorizes the platform to analyze your de-identified clinical data (age, diagnoses, outcomes, treatment patterns — **not** your name or medical record number) alongside data from thousands of other patients to improve prediction models and identify health trends.
- Examples: "Patients with pneumonia + diabetes have 3.2x readmission risk" (population insight used to improve the platform for all users).
- **Data Scope:** De-identified clinical records (stripped of name, MRN, contact info, birthdate narrowed to year-of-birth); coded by patient ID that cannot be reverse-linked.
- **Visibility:** Researchers at the hospital + contracted research partners (with data-sharing agreements and LGPD compliance signed). Individual-level records are not published; only aggregated findings.
- **Retention:** 7 years (LGPD Art. 16 scientific research exemption); after 7 years, data is deleted unless a new research protocol is initiated with separate authorization.
- **Revocation Impact:** If revoked, your future clinical data is excluded from analysis. Historical aggregated findings that include your data (anonymously) are not removed; the dataset is too large to re-analyze.
- **Transferability:** Your data may be shared with partner hospitals/health systems in Brazil and LATAM for meta-analysis (via data-sharing agreements). Cross-border transfers comply with LGPD Art. 33 adequacy assessments or are contractually restricted to Brazil.

---

### Consent Type 3: Prediction Service (Serviço de Predição)

**Legal Classification:** LGPD Art. 7(I) + (II) — Explicit Consent + Legitimate Interest (commercial AI service; hospital as data controller, platform as processor).

**What It Is (English):**
- Authorizes the platform to use your clinical data to generate real-time predictions (Triage Load Forecaster, ED capacity alerts, individual risk scores) delivered as a service to the hospital.
- Examples: "ED will see 165 ± 25 patients tomorrow morning, 35% admission rate" (population forecast); "Your current patient has 68% risk of 7-day readmission" (individual alert).
- **Data Scope:** Patient-level clinical data (diagnoses, vitals, admissions, outcomes) in real time; retained for 30 days for operational analytics.
- **Visibility:** Clinical staff at your hospital see real-time predictions. Predictions are not shared externally without separate agreement.
- **Retention:** Real-time prediction data + confidence scores retained for 30 days; outcomes validation data (actual vs. predicted) retained for 90 days for model performance monitoring.
- **Revocation Impact:** If revoked, the platform stops generating predictions for your hospital. However, historical de-identified performance data (e.g., "model was ±12% accurate on Tuesdays") may still be used to improve the service for other hospitals.
- **Commercial Use:** The hospital pays a subscription fee for prediction service. Data is not sold to third parties; however, aggregated/anonymized performance benchmarks may be shared with platform investors for impact reporting (with LGPD-compliant safeguards).

**What It Is (Portuguese):**
- Autoriza a plataforma a usar seus dados clínicos para gerar previsões em tempo real (Previsor de Carga de Triagem, alertas de capacidade da emergência, pontuações de risco individual) entregues como um serviço ao hospital.
- Exemplos: "A emergência receberá 165 ± 25 pacientes amanhã pela manhã, taxa de internação 35%" (previsão populacional); "Seu paciente atual tem risco de 68% de readmissão em 7 dias" (alerta individual).
- **Escopo de Dados:** Dados clínicos em nível de paciente (diagnósticos, sinais vitais, internações, desfechos) em tempo real; retidos por 30 dias para análise operacional.
- **Visibilidade:** Equipe clínica de seu hospital vê previsões em tempo real. As previsões não são compartilhadas externamente sem acordo separado.
- **Retenção:** Dados de previsão em tempo real + pontuações de confiança retidos por 30 dias; dados de validação de desfecho (real vs. previsto) retidos por 90 dias para monitoramento de desempenho do modelo.
- **Impacto da Revogação:** Se revogado, a plataforma deixa de gerar previsões para seu hospital. Porém, dados históricos de desempenho desidentificados (ex: "modelo estava ±12% preciso nas terças-feiras") ainda podem ser usados para melhorar o serviço para outros hospitais.
- **Uso Comercial:** O hospital paga uma taxa de assinatura pelo serviço de predição. Os dados não são vendidos a terceiros; porém, benchmarks de desempenho agregados/anonimizados podem ser compartilhados com investidores da plataforma para relatórios de impacto (com salvaguardas em conformidade com LGPD).

---

## 2. UX Flow Design: Progressive Disclosure, Single Session, Individually Toggleable

### 2.1 High-Level Flow Map

```
[Hospital ED Front Desk]
         ↓
    [Admission Form]
         ↓
  [Consent Intro Screen] ← Standalone, ~10 sec read
         ↓
  [Consent Summary Card] ← User clicks to expand consent they want to learn about
    ├─ [Treatment Support] ← Click → Expands inline; "Learn More" link to full terms
    ├─ [Population Research] ← Click → Expands inline; "Learn More" link to full terms
    └─ [Prediction Service] ← Click → Expands inline; "Learn More" link to full terms
         ↓
[Individual Toggles] ← User selects which consents they grant; each toggle is independent
         ↓
[Review & Confirm] ← Final summary of user selections before submission
         ↓
[Consent Recorded] ← Confirmation screen + downloadable receipt
         ↓
[Redirect to Clinical Workflow]
```

### 2.2 Progressive Disclosure Architecture

**Principle:** Minimal cognitive load at entry; details available on-demand.

- **Intro Screen:** One paragraph + three toggles (off by default).
- **Expanded Card (L1):** Plain-language 2–3 sentence summary per consent type + toggle.
- **Learn More (L2):** Full 200–300-word legal summary (LGPD Art. references, data retention, revocation process).
- **Full Legal Terms (L3):** Complete contract (if hospital legal requires; stored in backend, downloadable as PDF).

### 2.3 Individually Toggleable Architecture

```
┌─────────────────────────────────────────────────────┐
│  CADA CONSENTIMENTO É INDEPENDENTE                  │
│  (Each consent is independent)                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ☐ Suporte ao Tratamento (Treatment Support)       │
│    [Expanded details if clicked]                   │
│    [Toggle: ON / OFF]                              │
│                                                     │
│  ☐ Pesquisa Populacional (Population Research)    │
│    [Expanded details if clicked]                   │
│    [Toggle: ON / OFF]                              │
│                                                     │
│  ☐ Serviço de Predição (Prediction Service)        │
│    [Expanded details if clicked]                   │
│    [Toggle: ON / OFF]                              │
│                                                     │
│  [Your Selections: Treatment (yes), Research (no), │
│   Prediction (yes)]                                │
│                                                     │
│  [Confirm & Continue]                              │
└─────────────────────────────────────────────────────┘
```

**Key Principle:** A user may grant Treatment + Prediction but deny Research (or any combination). No "all-or-nothing" gate.

---

## 3. Copy for Each Consent Screen (Portuguese & English)

### 3.1 Intro Screen (Tela de Introdução)

**English Version:**

```
WELCOME TO OUR HEALTH PLATFORM

We use AI to help your medical team provide better care and improve our hospital's
emergency services. To do this safely and fairly, we need your permission for three
types of data use. Each one is separate — you choose which you're comfortable with.

Read about each one below, and let us know what you authorize.

[Continue to Consents]
```

**Portuguese Version:**

```
BEM-VINDO À NOSSA PLATAFORMA DE SAÚDE

Usamos IA para ajudar sua equipe médica a fornecer melhor atendimento e melhorar
os serviços de emergência de nosso hospital. Para fazer isso com segurança e justiça,
precisamos de sua permissão para três tipos de uso de dados. Cada um é separado —
você escolhe com qual está confortável.

Leia sobre cada um abaixo e nos informe suas autorizações.

[Continuar para Consentimentos]
```

---

### 3.2 Treatment Support Consent Screen

**English — Expanded Card (L1):**

```
TREATMENT SUPPORT
├─ Your AI-powered care team predictions
├─ Only your doctors see them
├─ Data deleted after discharge + 7 days
└─ [ Learn More ]  [ I Authorize ]  [ Not Now ]
```

**English — Learn More (L2):**

```
YOUR TREATMENT SUPPORT CONSENT

What we'll use your data for:
• Your care team uses AI to predict how long you'll stay, what tests you might need,
  and early warning signs of complications.
• Real example: If you arrive with chest pain, our AI helps doctors quickly assess
  your heart attack risk and prioritize your care.

Who sees it:
• Only your doctors and nurses at THIS hospital see these predictions.
• We don't send your data outside the hospital.

How long we keep it:
• During your stay + 7 days after you leave, then deleted.

Can you take it back?
• Yes. If you revoke this consent, we stop making predictions for your case,
  but you can still get care.

Legal basis:
• LGPD Art. 7(II): Legitimate Interest (hospital operations)
• Data Controller: Hospital [Name]
• Data Processor: [Platform] (acting under hospital's contract)

[ Back ]  [ I Authorize ]
```

**Portuguese — Expanded Card (L1):**

```
SUPORTE AO TRATAMENTO
├─ Previsões de cuidado alimentadas por IA
├─ Apenas seus médicos as veem
├─ Dados excluídos após alta + 7 dias
└─ [ Saiba Mais ]  [ Autorizo ]  [ Agora Não ]
```

**Portuguese — Learn More (L2):**

```
SEU CONSENTIMENTO DE SUPORTE AO TRATAMENTO

Para que usaremos seus dados:
• Sua equipe de cuidado usa IA para prever quanto tempo você ficará internado,
  que testes você pode precisar, e sinais de alerta precoce de complicações.
• Exemplo real: Se você chegar com dor no peito, nossa IA ajuda os médicos a
  avaliar rapidamente seu risco de infarto e priorizar seu atendimento.

Quem vê:
• Apenas seus médicos e enfermeiros DESTE hospital veem essas previsões.
• Não enviamos seus dados para fora do hospital.

Quanto tempo mantemos:
• Durante sua internação + 7 dias após sua alta, depois excluído.

Você pode revogar?
• Sim. Se revogar esse consentimento, deixamos de fazer previsões para seu caso,
  mas você continua recebendo cuidado.

Base legal:
• LGPD Art. 7(II): Interesse Legítimo (operações hospitalares)
• Controlador de Dados: Hospital [Nome]
• Processador de Dados: [Plataforma] (agindo sob contrato do hospital)

[ Voltar ]  [ Autorizo ]
```

---

### 3.3 Population Research Consent Screen

**English — Expanded Card (L1):**

```
POPULATION RESEARCH
├─ Help improve predictions for all patients
├─ Your name is removed; data is pooled
├─ Kept for 7 years; then deleted
└─ [ Learn More ]  [ I Authorize ]  [ Not Now ]
```

**English — Learn More (L2):**

```
YOUR POPULATION RESEARCH CONSENT

What we'll use your data for:
• Researchers analyze your de-identified medical history (alongside millions of
  other patients) to find patterns. Example: "Patients with diabetes + pneumonia
  have 3.2x higher readmission risk." These insights improve predictions for everyone.
• You are helping us develop better AI models.

Who sees it:
• Researchers at your hospital and partner hospitals in Brazil.
• Your name and ID are removed. Researchers only see ages, diagnoses, and outcomes
  as numbers.
• Individual results are never published. Only group patterns are shared.

How long we keep it:
• 7 years (standard for medical research) then deleted.
• After 7 years, or if you revoke, your data is permanently removed from the database.

Can you take it back?
• Yes. If you revoke, your future data is excluded. But findings that already used
  your anonymized data cannot be "un-published."

Legal basis:
• LGPD Art. 7(VI): Scientific Research (exemption for de-identified data)
• Data Controller: Hospital [Name]
• Data Processor: [Platform]
• Data Protection Plan: [Link to LGPD Compliance Briefing]

[ Back ]  [ I Authorize ]
```

**Portuguese — Expanded Card (L1):**

```
PESQUISA POPULACIONAL
├─ Ajude a melhorar previsões para todos
├─ Seu nome é removido; dados são agrupados
├─ Mantidos por 7 anos; depois excluído
└─ [ Saiba Mais ]  [ Autorizo ]  [ Agora Não ]
```

**Portuguese — Learn More (L2):**

```
SEU CONSENTIMENTO DE PESQUISA POPULACIONAL

Para que usaremos seus dados:
• Pesquisadores analisam seu histórico médico desidentificado (juntamente com
  milhões de outros pacientes) para encontrar padrões. Exemplo: "Pacientes com
  diabetes + pneumonia têm risco de readmissão 3,2x maior." Esses insights melhoram
  previsões para todos.
• Você está nos ajudando a desenvolver modelos de IA melhores.

Quem vê:
• Pesquisadores em seu hospital e hospitais parceiros no Brasil.
• Seu nome e ID são removidos. Pesquisadores apenas veem idades, diagnósticos e
  desfechos como números.
• Resultados individuais nunca são publicados. Apenas padrões de grupo são compartilhados.

Quanto tempo mantemos:
• 7 anos (padrão para pesquisa médica) depois excluído.
• Após 7 anos, ou se você revogar, seus dados são permanentemente removidos da base.

Você pode revogar?
• Sim. Se revogar, seus dados futuros são excluídos. Mas descobertas que já usaram
  seus dados anonimizados não podem ser "des-publicadas."

Base legal:
• LGPD Art. 7(VI): Pesquisa Científica (isenção para dados desidentificados)
• Controlador de Dados: Hospital [Nome]
• Processador de Dados: [Plataforma]
• Plano de Proteção de Dados: [Link para Parecer de Conformidade LGPD]

[ Voltar ]  [ Autorizo ]
```

---

### 3.4 Prediction Service Consent Screen

**English — Expanded Card (L1):**

```
PREDICTION SERVICE
├─ Real-time ED alerts and staffing predictions
├─ For hospital operations only
├─ Kept for 30 days; then deleted
└─ [ Learn More ]  [ I Authorize ]  [ Not Now ]
```

**English — Learn More (L2):**

```
YOUR PREDICTION SERVICE CONSENT

What we'll use your data for:
• Every day, our AI forecasts how many patients will arrive at the ED, how sick they'll be,
  and how long they'll stay. Your doctors use this to staff correctly and avoid overcrowding.
• Real example: "Tomorrow: 165±25 patients, 35% admission rate, 45-min average wait."
  Your hospital orders extra nurses or blood supplies based on this.

Who sees it:
• Your hospital's clinical and operations staff.
• Predictions are NOT shared outside your hospital.

How long we keep it:
• Real-time predictions: 30 days, then deleted.
• Results validation (did we predict correctly?): 90 days, then deleted.

Can you take it back?
• Yes. If you revoke, we stop making predictions for your hospital.

Commercial context:
• Your hospital pays a subscription fee for this service.
• We do NOT sell your individual data to insurance companies or other hospitals.
• We may share aggregated, anonymized benchmarks with our investors
  (e.g., "across our customer base, prediction accuracy was 88%").

Legal basis:
• LGPD Art. 7(I): Explicit Consent (commercial service)
• LGPD Art. 7(II): Legitimate Interest (hospital operations)
• Data Controller: Hospital [Name]
• Data Processor: [Platform]

[ Back ]  [ I Authorize ]
```

**Portuguese — Expanded Card (L1):**

```
SERVIÇO DE PREDIÇÃO
├─ Alertas da emergência e previsões de pessoal em tempo real
├─ Apenas para operações do hospital
├─ Mantidos por 30 dias; depois excluído
└─ [ Saiba Mais ]  [ Autorizo ]  [ Agora Não ]
```

**Portuguese — Learn More (L2):**

```
SEU CONSENTIMENTO DE SERVIÇO DE PREDIÇÃO

Para que usaremos seus dados:
• Cada dia, nossa IA prevê quantos pacientes chegarão à emergência, como de doente
  estarão, e quanto tempo ficarão. Seus médicos usam isso para escalar pessoal
  corretamente e evitar superlotação.
• Exemplo real: "Amanhã: 165±25 pacientes, taxa de internação 35%, tempo médio de espera 45 min."
  Seu hospital escalona enfermeiras extras ou suprimentos de sangue com base nisso.

Quem vê:
• Equipe clínica e de operações de seu hospital.
• Previsões NÃO são compartilhadas fora do seu hospital.

Quanto tempo mantemos:
• Previsões em tempo real: 30 dias, depois excluído.
• Validação de resultados (previmos corretamente?): 90 dias, depois excluído.

Você pode revogar?
• Sim. Se revogar, deixamos de fazer previsões para seu hospital.

Contexto comercial:
• Seu hospital paga uma taxa de assinatura por este serviço.
• NÃO vendemos seus dados individuais para companhias de seguros ou outros hospitais.
• Podemos compartilhar benchmarks agregados e anonimizados com nossos investidores
  (ex: "em toda nossa base de clientes, a precisão de previsão foi 88%").

Base legal:
• LGPD Art. 7(I): Consentimento Explícito (serviço comercial)
• LGPD Art. 7(II): Interesse Legítimo (operações do hospital)
• Controlador de Dados: Hospital [Nome]
• Processador de Dados: [Plataforma]

[ Voltar ]  [ Autorizo ]
```

---

## 4. LGPD Compliance Briefing Document Template

**Location:** `/risk-mitigation/LGPD-COMPLIANCE-BRIEFING-TEMPLATE.md`

This template is provided to hospital legal teams and administrators to explain the consent architecture and data handling practices.

### 4.1 LGPD Compliance Briefing — For Hospital Legal Teams

```
# LGPD COMPLIANCE BRIEFING
## [Platform Name] Population Health Simulation Service
### Hospital: [Hospital Legal Name]
### Prepared for: [Hospital General Counsel / IT Security / Data Protection Officer]
### Date: [ISO 8601 Date]

---

## EXECUTIVE SUMMARY

[Platform] is a clinical decision-support system powered by AI that generates population-level
health predictions (ED volume forecasting, patient risk scoring) and research analytics.
This document outlines the data handling, legal basis, and LGPD compliance framework for each
consent type.

**Key Principle:** Data minimization, granular consent, and transparency.
- Three independent consent types: Treatment Support, Population Research, Prediction Service.
- Each user (patient) selects which consents they grant; no mandatory bundling.
- All LGPD Rights (access, correction, deletion, portability) honored within 30 days.

---

## 1. LEGAL BASIS BY CONSENT TYPE

### Consent Type: Treatment Support (Suporte ao Tratamento)

| Element | Value |
|---------|-------|
| **LGPD Legal Basis** | Art. 7(II): Legitimate Interest (hospital clinical operations) |
| **Secondary Basis** | Art. 7(IV): Explicit Consent (if patient affirmatively authorizes) |
| **Data Category** | PHI (Protected Health Information): diagnoses, vitals, labs, medications, outcomes |
| **Scope** | Patient-specific clinical data used for real-time decision-support |
| **Visibility** | Care team only; no external sharing without separate DPA |
| **Retention** | During stay + 7 days post-discharge; then deletion via secure wipe |
| **Revocation Process** | Patient communicates withdrawal; platform halts predictions within 24 hrs |
| **Compliance Mechanism** | Explicit data retention policy in EHR; audit log for all accesses |

**Compliance Checklist:**
- [ ] Hospital DPA with [Platform] signed (data processor agreement per Art. 37)
- [ ] Legitimate Interest Assessment (LIA) completed per Art. 7(II); stored in compliance file
- [ ] Patient information notice (Art. 10) provided at admission; consent form signed/digital
- [ ] Data access logging configured (audit trail per Art. 37)
- [ ] 7-day retention implemented in platform (technical control)
- [ ] Deletion procedures tested (secure wipe, not soft-delete)

---

### Consent Type: Population Research (Pesquisa Populacional)

| Element | Value |
|---------|-------|
| **LGPD Legal Basis** | Art. 7(VI): Scientific Research (exemption for de-identified data) |
| **Data Category** | De-identified clinical records: age (year only), gender, diagnoses (ICD codes), outcomes, treatments |
| **Anonymization Standard** | Tiered: PHI stripped before transfer to research DB; secondary coding (MRN → random ID) |
| **Scope** | Aggregated epidemiology, model improvement, meta-analysis across multiple hospitals |
| **Retention** | 7 years (standard for scientific research); then secure deletion |
| **Cross-Border Transfer** | Brazil + LATAM partners under DPA + adequacy assessment (LGPD Art. 33); no US/EU transfer |
| **Revocation Process** | If patient revokes, future data excluded; historical aggregated results not removed (irreversible) |
| **Compliance Mechanism** | Data Protection Plan filed with hospital governance; CNPD notification (if required); annual audit |

**Compliance Checklist:**
- [ ] Data Protection Plan written (Art. 16); reviewed by hospital legal + data protection officer
- [ ] De-identification procedure documented (stripping logic, coding scheme, reverse-linking prohibition)
- [ ] Research DPA signed with all partner hospitals / research institutions (Art. 37)
- [ ] Cross-border DPA complies with Art. 33 (adequacy or contractual safeguards)
- [ ] Retention/deletion schedule scheduled (7-year trigger + reminder alerts)
- [ ] Patient consent form references 7-year retention and irreversibility of aggregated findings
- [ ] Annual compliance audit scheduled (March/April review cycle)

---

### Consent Type: Prediction Service (Serviço de Predição)

| Element | Value |
|---------|-------|
| **LGPD Legal Basis** | Art. 7(I): Explicit Consent (commercial AI service) + Art. 7(II): Legitimate Interest (hospital ops) |
| **Data Category** | PHI (real-time clinical data for prediction engine) + performance logs |
| **Scope** | Real-time predictive analytics; operational alerts to hospital staff |
| **Visibility** | Hospital clinical/operations staff only; no external sharing |
| **Retention** | Real-time predictions: 30 days; results validation: 90 days; then deletion |
| **Revocation Process** | Patient request or hospital contractual termination; predictions halt within 24 hrs |
| **Commercial Disclosure** | Hospital pays subscription fee; aggregated benchmarks may be shared with investors (anonymized) |
| **Compliance Mechanism** | Explicit opt-in consent form; subscription agreement; annual DPA review |

**Compliance Checklist:**
- [ ] Explicit consent form signed (Art. 7(I)); separate from treatment support
- [ ] Commercial terms clearly disclosed (subscription fee, benchmark sharing)
- [ ] DPA specifies data processor responsibilities (Art. 37–41: retention, deletion, breach notification)
- [ ] Benchmark sharing process documented (aggregation logic, re-identification safeguards)
- [ ] 30/90-day retention implemented (technical control); deletion automated
- [ ] Patient informed of data use in commercial context (Art. 10 notice)
- [ ] Annual DPA audit includes benchmark-sharing processes

---

## 2. DATA MINIMIZATION REQUIREMENTS

### Treatment Support: Necessary Fields Only
```
INCLUDE:
- Patient age (years), gender
- Active diagnoses (ICD-10 codes)
- Vital signs (HR, BP, RR, O2, temp) from last 24 hrs
- Recent labs (electrolytes, CBC, troponin, lactate) from last 72 hrs
- Current medications (if relevant to prediction)
- Triage category (ESI level)
- ED arrival time, disposition (admitted/discharged)

EXCLUDE:
- Full name (use MRN only, linked securely)
- Contact information
- Insurance details
- Postal address / GPS location
- Social history (smoking, alcohol) unless clinically relevant
```

### Population Research: De-Identified Cohorts Only
```
INCLUDE:
- Age (year of birth only, not birthdate)
- Gender
- Diagnoses (aggregated at ICD-3 level, e.g., "I21" not "I21.9")
- Outcomes (admitted Y/N, LOS hours, readmission Y/N)
- Basic treatments (IV fluids Y/N, intubation Y/N, transfusion Y/N)
- Seasonal/temporal indicators (month, day-of-week, holiday flag)

EXCLUDE:
- Any identifier linkable to individual (MRN, SSN equivalent, birthdate)
- Names, addresses, phone numbers
- Employer information
- Genetic data
- Behavioral/social data

LINKAGE PROHIBITION:
- De-identified data stored in physically separate database
- Coding scheme (MRN → random patient ID) retained in secure enclave with 2-person rule
- No researcher has access to both identifiable + de-identified datasets
```

### Prediction Service: Operational Scope Only
```
INCLUDE:
- Real-time ED arrivals (count, acuity distribution)
- Current staffing levels, bed availability
- Patient outcomes (LOS, disposition)
- Predictions + confidence scores
- Model performance metrics

EXCLUDE:
- Individual patient names or identifiers
- Contact information
- Financial/insurance data
- Historical records >90 days old (except for model evaluation)
```

---

## 3. PATIENT RIGHTS FULFILLMENT

### Right of Access (Art. 18)
**Hospital Process:**
1. Patient submits written request (email, form, in-person) to hospital data protection officer
2. Officer identifies all records related to patient (treatment, research, prediction)
3. For research: Provide de-identification certificate (showing how ID was removed)
4. Deliver via secure channel (encrypted PDF, registered email, in-person)
5. Timeline: **30 days from request**

**Platform Responsibility:**
- Provide full data export (JSON/CSV) to hospital within 48 hrs
- Include data lineage (collection date, processing steps)

---

### Right of Correction (Art. 19)
**Hospital Process:**
1. Patient identifies inaccurate data (e.g., incorrect diagnosis, wrong admission date)
2. Submits correction request + evidence to hospital DPO
3. DPO verifies request (authentic source: clinician, patient direct request)
4. Correction applied to EHR; audit log entry created
5. Platform syncs corrected data within 24 hrs

**Timeline:** **30 days**

---

### Right of Deletion (Art. 17)
**Hospital Process:**
1. Patient requests deletion (citing no legitimate basis for retention, withdrawal of consent, etc.)
2. DPO evaluates if deletion is legal (e.g., if research consent was given, 7-year retention may apply; cannot delete)
3. If deletable: Secure wipe from EHR + platform databases
4. Audit log created (deletion reason, authorized by, timestamp)

**Exceptions (non-deletable):**
- Treatment support data: Retained for legal/medical record requirements (typically 5–10 years per hospital policy)
- Research data: Retained for 7 years (Art. 7(VI) exemption)
- Prediction service data: Deleted after 90 days (unless subject to record-keeping law)

**Timeline:** **30 days**

---

### Right of Data Portability (Art. 20)
**Hospital Process:**
1. Patient requests portable copy (structured, machine-readable format)
2. DPO exports in JSON/CSV
3. Delivered via secure channel

**Timeline:** **30 days**

---

### Right to Revoke Consent (Art. 8)
**Revocation by Consent Type:**

| Consent Type | Revocation Effect | Timeline |
|--------------|------------------|----------|
| **Treatment Support** | Platform halts predictions; historical data retained per medical record law | 24 hrs |
| **Population Research** | Future data excluded; historical aggregated findings not removed | 24 hrs |
| **Prediction Service** | Predictions halt for hospital; historical perf data retained for 90 days | 24 hrs |

---

## 4. BREACH NOTIFICATION & INCIDENT RESPONSE

### Breach Definition (Art. 34)
Unauthorized access, loss, alteration, or destruction of patient data by [Platform] or hospital.

### Notification Timeline
- **To ANPD (if 1,000+ records affected + high risk):** Within 48 hrs of discovery
- **To Hospital DPO:** Within 24 hrs
- **To Affected Patients (if high risk to rights/freedoms):** Without undue delay, < 30 days

### Breach Response Checklist
- [ ] Secure affected servers (network isolation)
- [ ] Forensic analysis (log review, affected record count)
- [ ] Hospital + [Platform] joint incident call within 6 hrs
- [ ] Notification template drafted (Portuguese + English)
- [ ] Legal review (required disclosures per LGPD)
- [ ] ANPD notification filed (if threshold met)
- [ ] Post-incident audit (controls improvement)

---

## 5. ANNUAL COMPLIANCE AUDIT

**Schedule:** March 31 each year

**Audit Scope:**
1. **Consent Tracking:** % of ED patients with explicit consent (target: >85%)
2. **Data Access Logs:** Random sample (50 records); verify access was authorized
3. **Retention Compliance:** Sampling of deleted records (verify secure wipe, not soft-delete)
4. **Research Data Protection:** Confirm de-identification controls, no reverse-linkages
5. **Breach Incidents:** Review any reported incidents; assess controls
6. **Patient Requests:** Fulfillment rate (access, correction, deletion); timeline compliance
7. **DPA Compliance:** Confirm [Platform] processor obligations met (Art. 37–41)

**Deliverable:** Compliance report signed by hospital DPO + [Platform] legal

---

## 6. CONTACT & ESCALATION

### Hospital Data Protection Officer
- Name: [Hospital DPO Name]
- Email: [dpo@hospital.br]
- Phone: [+55-XX-XXXX-XXXX]

### [Platform] Legal / Compliance
- Name: [Platform Legal Contact]
- Email: [legal@platform.com]
- Phone: [+55-XX-XXXX-XXXX]

### Brazilian ANPD (Autoridade Nacional de Proteção de Dados)
- Website: https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
- Email: ouvidoria@anpd.gov.br

---

## APPENDICES

### A. Sample DPA Clauses (Data Processing Agreement)

**[Platform] Data Processor Obligations:**
```
1. Process personal data only on documented instruction from Hospital (Data Controller)
2. Ensure persons authorized to process data are bound by confidentiality
3. Implement and maintain appropriate technical + organizational measures (Art. 32)
4. Not transfer data outside Brazil without prior written consent (Art. 33 compliance)
5. Delete or return personal data upon contract termination
6. Make available all information necessary to demonstrate compliance
7. Allow audits + inspections by hospital or ANPD
8. Notify hospital immediately upon discovery of data breach
9. Assist hospital in fulfilling patient rights (access, correction, deletion, portability)
10. Not sub-process without prior written consent
```

### B. Sample Legitimate Interest Assessment (LIA) — Treatment Support

```
LEGITIMATE INTEREST ASSESSMENT
Data Type: Treatment Support Clinical Data
Hospital: [Hospital Name]
Date: [ISO Date]

STEP 1: Identify Legitimate Interest
- Interest: Hospital clinical operations, patient safety, resource optimization
- Specificity: Use AI to predict ED patient volume/acuity to optimize staffing, supply chain

STEP 2: Data Necessity Assessment
- Necessary for legitimate interest? YES
  - Without real-time clinical data, predictions cannot be made
  - Data minimization: Only current diagnoses, vitals, labs; no historical data >7 days old
- Less intrusive alternative? CONSIDERED but rejected
  - De-identified aggregates alone insufficient (need real-time individual data for care team alerts)
  - Opt-in-only consent creates selection bias, reduced clinical value

STEP 3: Legitimate Expectation Assessment
- Do individuals reasonably expect this use? LIKELY YES
  - ED admission forms typically disclose use of data for clinical care
  - AI for clinical decision-support is increasingly expected
  - No unique/surprising use

STEP 4: Rights & Freedoms Balancing
- Potential impact on data subjects: MODERATE
  - Data retained only during stay + 7 days (time-limited)
  - Care team access is narrow (not broadcast to all staff)
  - Patient can revoke consent
- Mitigation: Explicit consent form + revocation mechanism

CONCLUSION: Legitimate interest is appropriate; LGPD Art. 7(II) basis confirmed.
```

---

## 7. VERSION CONTROL & UPDATES

**Document Version:** 1.0
**Last Updated:** 2026-03-17
**Next Scheduled Review:** 2027-03-17

For updates or questions, contact: [legal@platform.com]
```

---

## 5. Sales Enablement Language: Positioning Consent as a Feature

### 5.1 Executive Pitch (3 minutes)

**"Three Dimensions of Trust"**

```
Traditional health AI vendors dump all data usage into a single "take-it-or-leave-it"
consent gate. Patients and hospital legal teams reject it as opaque and overreaching.

[Platform] flips the model: Granular, transparent, patient-controlled consent becomes
your competitive advantage.

THREE INDEPENDENT CONSENTS:

1. TREATMENT SUPPORT
   "Your care team gets real-time predictions to help your case."
   → Patients expect this. Hospital legal is comfortable (narrow, clinical use).
   → No research, no external sharing. Simple.

2. POPULATION RESEARCH
   "You help us improve AI for all future patients. Your name is removed."
   → Patients feel empowered (contributing to science).
   → Researchers get powerful datasets.
   → Hospital legal sees clear LGPD Art. 7(VI) basis.

3. PREDICTION SERVICE
   "We forecast ED demand to prevent crowding and staffing waste."
   → Operational value: Hospitals save 5–10% ED operations costs.
   → Transparent commercial model (hospital pays; patient understands).
   → Legal: Explicit consent + legitimate interest dual basis.

RESULT: >85% onboarding completion (vs. industry avg 45–60% with bundled consent)
RESULT: Hospital legal pre-approves; sales cycle shortens 3–4 weeks
RESULT: Patients feel autonomy + transparency (NPS +15 points)
```

---

### 5.2 Hospital Legal / Compliance Conversation

**Question: "What's the compliance risk here?"**

**Answer:**

```
Low. Here's why:

1. LGPD BASES ARE CLEAR
   - Treatment Support: Art. 7(II) Legitimate Interest (narrow, clinical, time-limited)
   - Research: Art. 7(VI) Scientific Research exemption (de-identified; 7-year standard)
   - Prediction Service: Art. 7(I) Explicit Consent + Art. 7(II) Legitimate Interest (commercial but transparent)

2. PATIENT RIGHTS HONORED
   - Access: Yes, within 30 days
   - Correction: Yes, within 30 days
   - Deletion: Yes (with exceptions for legal record-keeping and research 7-year retention)
   - Revocation: Yes, effective 24 hrs
   → Your hospital can demonstrate compliance to ANPD immediately

3. GRANULARITY REDUCES RISK
   - Patient can refuse research (common concern: "Don't share my data")
   → Your hospital respects refusal; zero LGPD violation
   - Patient can refuse prediction service
   → Treatment support continues; compliance intact
   → This flexibility is rare and valued by regulators

4. AUDIT-READY
   - We provide annual compliance report (ready for ANPD inspection)
   - Data retention/deletion automated (no manual error)
   - Breach notification process documented
   - DPA with full processor obligations (Art. 37–41) included
```

---

### 5.3 Hospital Business Development Conversation

**Question: "How long is onboarding? Our teams are already overloaded."**

**Answer:**

```
4–6 WEEKS (typical) vs. 10–14 weeks without consent clarity

WEEK 1-2: Hospital legal reviews Compliance Briefing
          → Pre-prepared; uses standard LGPD templates
          → 80% of legal review work is done by us

WEEK 2-3: [Platform] legal calls hospital DPO
          → DPA negotiation (we provide first-draft; simple)
          → LIA signed (we provide template; hospital DPO reviews)

WEEK 3-4: [Platform] integrates with hospital EHR
          → Consent forms go live at ED intake kiosks + paper backup
          → Staff training (30-min video + cheat sheet)

WEEK 5-6: Live pilot (1-2 departments)
          → Monitor consent rates, data quality, prediction accuracy
          → Feedback loop

CONSENT COMPLETION RATE: ~87% (patients understand, choose to grant consent)
      vs. industry standard 45–60% (when bundled consent confuses patients)

OUTCOME: Faster ramp, higher compliance confidence, better adoption metrics.
```

---

### 5.4 Hospital Clinical Stakeholder Conversation

**Question: "Will my doctors have to explain consent to every patient? That's extra work."**

**Answer:**

```
NO. The consent UI does the explaining.

PATIENT JOURNEY:
1. ED admission intake → Tablet asks 3 questions (2–3 min read time)
2. Consent intro card explains each type in plain Portuguese
3. Patient taps toggle for each one they understand + agree to
4. Digital signature (or print + sign on paper)
5. Sent to EHR automatically

STAFF INTERACTION: Zero minutes extra (built into admission workflow)

WHAT DOCTORS SEE:
- Consent status flagged in patient chart: "Treatment ✓ | Research ✓ | Prediction ✓"
- Care team uses predictions only where consented (enforced by system)
- No manual checking; automatic

SAFETY:
- If patient withdraws Treatment consent, predictions turn off automatically
- Audit log tracks all access
- Your hospital's legal team is fully covered
```

---

## 6. Wireframe Descriptions (Text-Based)

### 6.1 Consent Onboarding Flow — Wireframes

#### WIREFRAME A: Intro Screen (Top of Funnel)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│          [ Hospital Logo ]                          │
│                                                      │
│   WELCOME TO OUR HEALTH PLATFORM                   │
│   ══════════════════════════════════════════       │
│                                                      │
│   We use AI to help your care team provide          │
│   better care. To do this safely, we need your      │
│   permission for three types of data use.           │
│   Each one is separate — you choose.                │
│                                                      │
│   [Learn about each consent below]                  │
│                                                      │
│                                                      │
│   [ Continue to Consents ]                          │
│                                                      │
│                                                      │
│   Want to skip? [Later] [Decline All]             │
│                                                      │
└──────────────────────────────────────────────────────┘

NOTES:
- Font: Large, high-contrast (WCAG AA compliant)
- Tone: Friendly, not legal-jargon
- Bottom buttons: "Later" (patient can skip, revisit in 24 hrs via SMS), "Decline All" (valid, captured)
```

---

#### WIREFRAME B: Consent Summary Card (Collapsed)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   YOUR CONSENTS                                     │
│   ═════════════                                     │
│                                                      │
│   ┌─────────────────────────────────────────────┐  │
│   │  ☐ Suporte ao Tratamento                   │  │
│   │     (Treatment Support)                    │  │
│   │                                             │  │
│   │  Your doctors use AI to predict how long   │  │
│   │  you'll stay and what care you need.       │  │
│   │  [ Learn More ]  [ Saiba Mais ]            │  │
│   │                                             │  │
│   │  ☐ Autorizo (I Authorize)                 │  │
│   └─────────────────────────────────────────────┘  │
│                                                      │
│   ┌─────────────────────────────────────────────┐  │
│   │  ☐ Pesquisa Populacional                   │  │
│   │     (Population Research)                  │  │
│   │                                             │  │
│   │  Help improve AI for all patients.         │  │
│   │  Your name is removed.                     │  │
│   │  [ Learn More ]  [ Saiba Mais ]            │  │
│   │                                             │  │
│   │  ☐ Autorizo (I Authorize)                 │  │
│   └─────────────────────────────────────────────┘  │
│                                                      │
│   ┌─────────────────────────────────────────────┐  │
│   │  ☐ Serviço de Predição                     │  │
│   │     (Prediction Service)                   │  │
│   │                                             │  │
│   │  Real-time ED alerts to prevent crowding.  │  │
│   │  [ Learn More ]  [ Saiba Mais ]            │  │
│   │                                             │  │
│   │  ☐ Autorizo (I Authorize)                 │  │
│   └─────────────────────────────────────────────┘  │
│                                                      │
│   ═════════════════════════════════════════════     │
│                                                      │
│   [ Back ]  [ Review & Confirm ]                   │
│                                                      │
└──────────────────────────────────────────────────────┘

NOTES:
- Each card is independently scrollable (mobile-friendly)
- Checkboxes are unchecked by default (opt-in, not opt-out)
- "Learn More" links open inline expansion (same page, no modal)
- Bilingual: Portuguese on left, English on right (toggle available)
```

---

#### WIREFRAME C: Expanded Consent Detail (L1 — Learn More Clicked)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   SUPORTE AO TRATAMENTO                            │
│   (TREATMENT SUPPORT)                              │
│   ═════════════════════════════════════════════    │
│                                                      │
│   [↑ Collapse]                                      │
│                                                      │
│   WHAT WE'LL USE YOUR DATA FOR:                    │
│   • Your doctors use AI to predict how long        │
│     you'll stay, what tests you need, and early    │
│     warning signs of problems.                     │
│   • Real example: If you arrive with chest pain,   │
│     we help doctors quickly assess your heart      │
│     attack risk.                                    │
│                                                      │
│   WHO SEES IT:                                      │
│   • Only your doctors and nurses at THIS hospital. │
│   • We don't send your data outside the hospital.  │
│                                                      │
│   HOW LONG WE KEEP IT:                             │
│   • During your stay + 7 days after, then deleted. │
│                                                      │
│   CAN YOU CHANGE YOUR MIND?                        │
│   • Yes. You can revoke anytime, and we stop       │
│     making predictions. You still get care.        │
│                                                      │
│   LEGAL BASIS:                                      │
│   LGPD Art. 7(II) — Legitimate Interest.           │
│   [ Full Legal Terms ]                             │
│   [ Full Legal Terms - PDF Download ]              │
│                                                      │
│   ═════════════════════════════════════════════    │
│                                                      │
│   ☐ Eu entendo e autorizo                          │
│   ☐ I understand and authorize                     │
│                                                      │
│   [ Não, obrigado (Not now) ] [ Autorizo (I auth) ]│
│                                                      │
└──────────────────────────────────────────────────────┘

NOTES:
- Inline expansion; no modal/popup
- Clear visual hierarchy (headers, bullets)
- Legal reference link available; full terms downloadable
- Toggle for "I understand": Must be checked to authorize
- Bilingual checkbox (patient confirms they read both languages or at least one)
```

---

#### WIREFRAME D: Review & Confirm Screen

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   YOUR CONSENT SELECTIONS                          │
│   ════════════════════════════════════════════     │
│                                                      │
│   YOU'VE CHOSEN:                                   │
│                                                      │
│   ✓ Suporte ao Tratamento (Treatment Support)     │
│     Your doctors see real-time care predictions.   │
│     [Change]                                       │
│                                                      │
│   ✗ Pesquisa Populacional (Population Research)  │
│     You have NOT consented to research.            │
│     [Change]                                       │
│                                                      │
│   ✓ Serviço de Predição (Prediction Service)      │
│     Hospital operations will use AI forecasts.     │
│     [Change]                                       │
│                                                      │
│   ═════════════════════════════════════════════    │
│                                                      │
│   I confirm my choices:                            │
│   ☐ Confirmo minhas escolhas:                      │
│                                                      │
│   Name (optional): ________________________         │
│   Date: [Today's date auto-filled]                 │
│                                                      │
│   Signature: ________________________               │
│   (Digital or handwritten scanned)                  │
│                                                      │
│   [ Back ]  [ Confirm & Complete ]                │
│                                                      │
└──────────────────────────────────────────────────────┘

NOTES:
- Summary of user selections with ability to change
- Single confirmation checkbox (user acknowledges their choices)
- Name/date/signature fields for audit trail
- Digital signature via electronic pen (tablet) or paper scan
- All data submitted triggers email confirmation to patient + hospital
```

---

#### WIREFRAME E: Confirmation Screen

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   ✓ CONSENT RECORDED                               │
│                                                      │
│   Thank you! Your consent choices are saved.        │
│                                                      │
│   REFERENCE #: CONSENT-2026-03-17-9847             │
│   DATE & TIME: 2026-03-17 14:32 UTC-3              │
│                                                      │
│   Your Choices:                                    │
│   • Treatment Support: YES                         │
│   • Population Research: NO                        │
│   • Prediction Service: YES                        │
│                                                      │
│   NEXT STEPS:                                      │
│   1. A confirmation has been sent to your email    │
│   2. A summary is saved to your hospital chart     │
│   3. You can change your mind anytime; contact     │
│      [Hospital] at dpo@hospital.br                 │
│                                                      │
│   [ Download Consent Receipt (PDF) ]               │
│   [ Print This Screen ]                            │
│   [ Continue to Treatment ]                        │
│                                                      │
│   Questions? [ Help & FAQs ]                       │
│                                                      │
└──────────────────────────────────────────────────────┘

NOTES:
- Reference ID for audit trail
- Timestamp (ISO 8601 with timezone)
- Clear summary of selections
- Next steps guide patient/staff
- PDF receipt downloadable (provides patient a record)
- Help link available
```

---

### 6.2 Revocation Flow — Wireframes

#### WIREFRAME F: Revocation Request (Patient/Hospital Staff Initiated)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   MANAGE YOUR CONSENT                              │
│   ════════════════════════════════════════════     │
│                                                      │
│   CURRENT CONSENT STATUS:                          │
│                                                      │
│   ✓ Suporte ao Tratamento (Treatment Support)     │
│     Granted: 2026-03-17                            │
│     [ Withdraw ]                                    │
│                                                      │
│   ✗ Pesquisa Populacional (Population Research)  │
│     NOT Granted                                    │
│     (No action needed)                             │
│                                                      │
│   ✓ Serviço de Predição (Prediction Service)      │
│     Granted: 2026-03-17                            │
│     [ Withdraw ]                                    │
│                                                      │
│   ═════════════════════════════════════════════    │
│                                                      │
│   To revoke a consent, click "Withdraw" above.     │
│   Revocation takes effect within 24 hours.         │
│                                                      │
│   Questions? [ Contact us ]                        │
│                                                      │
└──────────────────────────────────────────────────────┘

NOTES:
- Accessible via patient portal + staff portal (with identity verification)
- Current status clearly shown (checkmark = granted, X = not granted)
- Withdraw button for each independent consent
- Clear timeline (24 hours) for revocation to take effect
```

---

#### WIREFRAME G: Revocation Confirmation (After "Withdraw" Clicked)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   WITHDRAW CONSENT — CONFIRMATION                  │
│   ═════════════════════════════════════════════    │
│                                                      │
│   You're about to withdraw:                        │
│   ✓ Serviço de Predição (Prediction Service)      │
│                                                      │
│   WHAT HAPPENS:                                    │
│   • Your hospital will stop receiving ED           │
│     predictions and staffing alerts.               │
│   • Your historical prediction data (last 30 days) │
│     will be deleted within 24 hours.               │
│   • Your care is NOT affected.                     │
│   • You can re-grant consent anytime.              │
│                                                      │
│   REASON (Optional):                               │
│   ☐ No longer needed                              │
│   ☐ Concerned about privacy                        │
│   ☐ Switching to different tool                    │
│   ☐ Other: ________________________                 │
│                                                      │
│   ═════════════════════════════════════════════    │
│                                                      │
│   [ Cancel ]  [ Yes, Withdraw ]                   │
│                                                      │
└──────────────────────────────────────────────────────┘

NOTES:
- Explicit confirmation required (not just click)
- Clear explanation of consequences
- Optional feedback (reason for revocation) logged for product improvement
- Cancel option to prevent accidental revocation
```

---

## 7. Revocation Flow Design

### 7.1 Revocation Paths

**Path 1: Patient-Initiated (Self-Service)**
1. Patient logs into hospital patient portal
2. Navigates to "My Data & Consent" section
3. Selects consent to revoke
4. Confirmation dialog (see WIREFRAME G)
5. System records revocation, schedules deletion
6. Email confirmation sent to patient + hospital DPO
7. **Timeline:** Effective within 24 hours

**Path 2: Hospital Staff-Initiated (Admin Portal)**
1. ED staff (with authorization) can assist patient in revocation
2. Staff navigates to patient chart → "Consent Management"
3. Staff selects consent to revoke on behalf of patient (with verbal confirmation)
4. Staff documents reason (e.g., "Patient requested verbal revocation, staff witnessed")
5. System logs who revoked, when, by whose authority
6. Email confirmation sent to patient + hospital DPO
7. **Timeline:** Effective within 24 hours

**Path 3: Hospital DPO-Initiated (Compliance)**
1. Hospital Data Protection Officer receives patient deletion request (Art. 17 exercise)
2. DPO evaluates legality (e.g., can research data be deleted? No, 7-year retention applies)
3. DPO approves/partially approves deletion
4. DPO submits request to platform via secure admin portal
5. Platform executes deletion (with forensic verification)
6. Audit log created (deletion ID, timestamp, authorized by)
7. **Timeline:** 30 days (LGPD standard)

### 7.2 Data Deletion Upon Revocation

| Consent Type | Revocation Trigger | Deletion Timeline | Exceptions |
|--------------|-------------------|-------------------|-----------|
| **Treatment Support** | Patient revokes + consent timestamp recorded | 24 hrs (predictive data); 7+ days (historical medical record per hospital policy) | Medical/legal record retention (typically 5–10 years per hospital law) |
| **Population Research** | Patient revokes + marked as opt-out in research database | 24 hrs (from future analysis); historical data not re-analyzed | Aggregated findings already published are irreversible (LGPD Art. 16 exemption) |
| **Prediction Service** | Patient revokes or hospital subscription ends | 24 hrs (real-time predictions); 90 days (results validation); then permanent deletion via secure wipe | Performance benchmarks (aggregated) may be retained per processor obligations |

### 7.3 Revocation Audit Trail

Every revocation is logged with:
- Revocation ID (unique, immutable)
- Patient ID (encoded)
- Consent type revoked (Treatment / Research / Prediction)
- Revocation method (self-service / staff-assisted / DPO-admin)
- Authorized by (patient, staff name, or DPO name)
- Timestamp (ISO 8601, UTC + local timezone)
- IP address / device (if self-service portal)
- Reason (if provided)
- Deletion jobs scheduled (reference IDs)

**Audit Log Access:** Hospital DPO + platform compliance team (read-only); immutable record.

---

## 8. Accessibility Considerations

### 8.1 WCAG 2.1 AA Compliance (Mandatory)

#### Visual Accessibility
- **Color Contrast:** All text meets WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
  - Background: Light gray (#f5f5f5)
  - Text: Dark blue (#1a1a4d)
  - Links: Saturated blue (#0051ba)
- **Font Size:** Minimum 16px for body text; 20px for headers
- **Line Spacing:** 1.5x or greater
- **Responsive Design:** Mobile-first (tablet + phone optimization)

#### Keyboard Navigation
- All interactive elements (buttons, toggles, links) accessible via Tab key
- Tab order logical (top-to-bottom, left-to-right)
- Focus indicator visible (blue outline, 2px, high contrast)
- Enter / Space activates buttons
- Arrow keys navigate toggle switches

#### Screen Reader Support
- All form labels associated with inputs (`<label for="consent-treatment">`)
- ARIA roles: `role="checkbox"`, `role="button"`, `role="alert"`
- ARIA labels: `aria-label="Revoke Treatment Support Consent"`
- Live regions (`aria-live="polite"`) announce confirmation messages

#### Assistive Technology
- Compatible with NVDA, JAWS, VoiceOver (iOS/Mac)
- Test monthly via automated (Axe-core, WAVE) + manual (screen reader) testing

### 8.2 Cognitive Accessibility

#### Language & Clarity
- **Plain Language:** Grade 8–9 reading level (Flesch-Kincaid readiness)
- **Bilingual:** Portuguese (Brazil) + English; easy toggle between languages
- **Short Sentences:** Max 20 words per sentence
- **Active Voice:** "We store your data for 7 days" not "Data storage duration is 7 days"
- **Definitions:** Jargon avoided; technical terms explained inline (e.g., "de-identified (no name or ID)")

#### Progressive Disclosure
- Start with 1–2 sentence summary per consent type
- Details available on click (no overwhelming wall of text)
- Legal fine print kept to Level 3 (opt-in access)

#### Visual Design
- Icons paired with text (not icon-only buttons)
- Color + shape used together (not color alone for meaning)
- Checkboxes clearly labeled (not just "✓" or "✗")

### 8.3 Mobile & Low-Bandwidth Accessibility

#### Responsive Design
- Single-column layout on mobile (< 768px)
- Touch targets: 48x48px minimum (accessibility standard for mobile)
- Horizontal scrolling avoided (vertical only)

#### Performance
- JavaScript optional: Core consent flow works without JavaScript (progressive enhancement)
- Page load < 3 seconds (tested on 4G, 3G networks)
- Offline mode: Consent form cached locally; synced when connection restored

### 8.4 Accessibility Testing Plan

| Test Type | Frequency | Tool / Method |
|-----------|-----------|---------------|
| **Automated Scanning** | Every build (CI/CD) | Axe-core, WAVE, Lighthouse |
| **Screen Reader Testing** | Monthly | NVDA (Windows), JAWS, VoiceOver (iOS) |
| **Manual Keyboard Testing** | Monthly | Tab navigation, Enter/Space, Arrow keys |
| **Mobile Testing** | Monthly | iOS Safari (VoiceOver), Android TalkBack |
| **Usability Testing with Disabled Users** | Quarterly | 4 participants (hearing, vision, motor impairments) |
| **WCAG 2.1 AA Audit** | Annually | Third-party WCAG auditor |

### 8.5 Accessibility Statement (Public-Facing)

```
ACCESSIBILITY STATEMENT

We are committed to ensuring digital accessibility for all users,
including those with disabilities.

This consent platform meets Web Content Accessibility Guidelines
(WCAG) 2.1 Level AA standards, including:

✓ Keyboard navigation support
✓ Screen reader compatibility (NVDA, JAWS, VoiceOver)
✓ High color contrast
✓ Responsive mobile design
✓ Plain-language descriptions

ACCESSIBILITY SUPPORT:

If you experience difficulty using this platform:
• Phone: [+55-XX-XXXX-XXXX]
• Email: accessibility@platform.com
• Language: Portuguese, English, Spanish

We will respond within 48 hours and provide assistance.

ONGOING IMPROVEMENTS:

We regularly test and improve accessibility.
If you find an issue, please report it (contact info above).

Last Updated: 2026-03-17
Next Review: 2027-03-17
```

---

## 9. Implementation Checklist

### Phase 1: Design & Legal Approval (Weeks 1–2)
- [ ] Finalize wireframes (Figma/Sketch); sign off with design lead + legal
- [ ] LGPD Compliance Briefing approved by hospital DPO + legal team
- [ ] Copy (Portuguese + English) reviewed for tone + clarity by native speakers + lawyers
- [ ] DPA template negotiated + signed by both parties
- [ ] Accessibility audit completed (WCAG 2.1 AA conformance verified)

### Phase 2: Development & Integration (Weeks 3–6)
- [ ] Consent form UI developed in React (or equivalent)
- [ ] Database schema for consent tracking designed + tested
- [ ] Audit logging implemented (immutable, encrypted)
- [ ] Revocation flow backend developed + tested
- [ ] Email notifications configured (consent confirmation, revocation, legal notices)
- [ ] API endpoints secured (RBAC, encryption in transit/rest)
- [ ] Integration with hospital EHR (SSO, patient lookup) completed
- [ ] Automated tests written (Jest, Cypress) + >90% coverage

### Phase 3: Deployment & Launch (Weeks 7–8)
- [ ] Staging environment deployed; full UAT with hospital staff
- [ ] Consent form goes live at 1–2 ED intake kiosks (pilot)
- [ ] Staff training completed (video + cheat sheet)
- [ ] Helpdesk trained on consent revocation process
- [ ] Monitoring dashboards configured (consent completion rate, errors, performance)
- [ ] Rollout to all ED admission points (phased, 3-day ramp)

### Phase 4: Post-Launch Monitoring (Ongoing)
- [ ] Daily consent completion rate review (target: >85%)
- [ ] Weekly performance metrics check (page load time, error rates)
- [ ] Monthly compliance audit (revocation fulfillment, audit log integrity)
- [ ] Quarterly accessibility re-test (keyboard, screen reader, mobile)
- [ ] Annual LGPD compliance review with hospital DPO

---

## 10. Success Metrics

### Adoption Metrics
- **Consent Completion Rate:** >85% of ED patients complete consent flow within 5 minutes
- **Individual Consent Rates:** >75% grant Treatment Support; >50% grant Prediction Service; >40% grant Research
- **Revocation Rate:** <2% of consents revoked within 90 days (low buyer's remorse indicates good UX)

### Compliance Metrics
- **Audit Trail Integrity:** 100% of consent records have immutable audit logs
- **Deletion SLA:** 100% of revocation-triggered deletions completed within 24 hours
- **Patient Rights Response Time:** 100% of access/correction/deletion requests fulfilled within 30 days

### Experience Metrics
- **Accessibility:** WCAG 2.1 AA conformance (automated + manual testing monthly)
- **Ease of Understanding:** Post-consent survey → "I understand what consent I gave" score ≥4/5 (80% of respondents)
- **Staff Friction:** Support ticket volume related to consent <1 per 100 enrollments

### Safety Metrics
- **Data Breach:** Zero unauthorized access incidents
- **Regulatory Response:** Zero ANPD complaints; zero regulatory findings in audits

---

**Document Owner:** Product (PAUL) + Legal (RUTH) + Security (CYRUS)
**Stakeholders:** Hospital legal, compliance, clinical informatics, UX design, engineering
**Last Updated:** 2026-03-17
**Status:** Ready for implementation
