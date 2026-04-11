# ANVISA Class I SaMD Notification Checklist

**Document ID:** ANVISA-NCL-001  
**Regulatory Reference:** RDC 657/2022 (Resolução da Diretoria Colegiada)  
**Product:** Holi Labs Clinical Platform  
**Classification:** ANVISA Class I — Software as a Medical Device (SaMD)  
**Version:** 1.0  
**Date:** 2026-04-04  
**Author:** Holi Labs Regulatory Affairs  
**Status:** Draft — Pre-Submission Review

---

## 1. Classification Rationale

### 1.1 Why Class I (Lowest Risk)

Per RDC 657/2022, Article 6, the Holi Labs Clinical Platform qualifies as **Class I** based on:

| Classification Criterion | Assessment | RDC 657 Reference |
|-------------------------|-----------|-------------------|
| Software provides information to healthcare professionals | Yes — traffic light alerts (RED/YELLOW/GREEN) for prescriptions and clinical encounters | Art. 6, §1, I |
| Software does NOT autonomously make treatment decisions | Correct — all outputs are advisory; clinician retains full override capability | Art. 6, §1, I |
| Software does NOT directly control medical devices | Correct — web application only, no device interface | Art. 4, §2 |
| Software uses deterministic algorithms (not AI/ML) | Correct — JSON-Logic rule engine, operation allowlist enforced | Art. 6, §2 |
| Clinician can always override system recommendations | Yes — YELLOW requires justification, RED requires supervisor approval; only lethal interactions are blocked | Art. 6, §1, I |

### 1.2 Key Architectural Evidence

| Claim | Evidence | File Reference |
|-------|---------|---------------|
| Deterministic processing | JSON-Logic evaluation with strict operation allowlist (20 safe operations) | `apps/web/src/lib/clinical/rule-engine.ts` lines 40–51 |
| Clinician override | `determineOverrideRequirements()` provides override path for all non-lethal signals | `apps/web/src/lib/traffic-light/engine.ts` lines 478–506 |
| Transparency | Every response wrapped in `ClinicalSafetyEnvelope` with processing method and disclaimer | `apps/web/src/lib/clinical/safety-envelope.ts` |
| Audit trail | All CDS evaluations persisted to GovernanceLog chain | `apps/web/src/lib/clinical/safety-audit-logger.ts` |
| No AI/ML in clinical pathway | Project governance mandates: "engine.ts MUST stay deterministic" | `CLAUDE.md` Section III |

---

## 2. Pre-Requisites

### 2.1 Company Registration

| Requirement | Status | Notes |
|------------|--------|-------|
| CNPJ (Cadastro Nacional da Pessoa Jurídica) | Required | Brazilian legal entity registration |
| AFE (Autorização de Funcionamento da Empresa) | Required | ANVISA company authorization — must be obtained BEFORE notification |
| CEVS/VISA (Certificado de Vigilância Sanitária) | Required | State/municipal sanitary surveillance inspection certificate |
| Technical Responsible (Responsável Técnico) | Required | Named individual with valid CRM or relevant professional council registration |
| GMP Certificate | Not required | Waived for SaMD Class I per RDC 657/2022 Art. 8 |

### 2.2 Regulatory Agent

| Item | Details |
|------|---------|
| Is a Brazilian regulatory agent required? | Only if the legal manufacturer is domiciled outside Brazil |
| Agent role | Represents the manufacturer before ANVISA; receives official communications |

---

## 3. Notification Form — Field Mapping

Per RDC 657/2022 Art. 7, the Class I notification form requires:

| Form Field | Value |
|-----------|-------|
| **Nome do Produto (Product Name)** | Holi Labs Clinical Platform |
| **Fabricante (Manufacturer)** | Holi Labs Ltda. |
| **País de Origem (Country of Origin)** | Brasil |
| **Classe de Risco (Risk Class)** | Classe I |
| **Tipo de Produto** | Software como Dispositivo Médico (SaMD) |
| **Descrição do Produto** | Sistema de apoio à decisão clínica (CDS) determinístico baseado em web, utilizando motor de regras JSON-Logic com padrão semáforo (vermelho/amarelo/verde) para alertas de segurança em prescrições e encontros clínicos. O sistema é consultivo — o clínico mantém controle total sobre todas as decisões clínicas. |
| **Finalidade de Uso (Intended Use)** | Fornecer suporte à decisão clínica para profissionais de saúde brasileiros, incluindo: verificação de segurança de prescrições, alertas de interação medicamentosa, classificação de substâncias controladas (ANVISA CATMAT), e pré-validação de conformidade de faturamento. |
| **Indicações de Uso** | Clínicas, hospitais e farmácias brasileiras |
| **Contra-indicações** | Não deve ser utilizado como base única para decisões clínicas; não substitui julgamento médico profissional |
| **Classificação IEC 62304** | Classe A (nenhuma lesão possível) |
| **Normas Aplicáveis** | IEC 62304:2006+AMD1:2015, ISO 14971:2019, IEC 82304-1:2016 |

---

## 4. Technical Dossier Contents

### 4.1 Required Documents (RDC 657/2022 Art. 7, §2)

| # | Document | File Reference | Status |
|---|----------|---------------|--------|
| 1 | Software Development Plan | `docs/regulatory/iec62304/01-SOFTWARE-DEVELOPMENT-PLAN.md` | Complete |
| 2 | Software Requirements Specification | `docs/regulatory/iec62304/02-SOFTWARE-REQUIREMENTS-SPEC.md` | Complete |
| 3 | Software Architecture Description | `docs/regulatory/iec62304/03-SOFTWARE-ARCHITECTURE.md` | Complete |
| 4 | Risk Management File (ISO 14971) | `docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md` | Complete |
| 5 | Verification & Validation Plan | `docs/regulatory/iec62304/05-VERIFICATION-VALIDATION-PLAN.md` | Complete |
| 6 | Requirements Traceability Matrix | `docs/regulatory/iec62304/06-TRACEABILITY-MATRIX.md` | Complete |
| 7 | IFU (Instructions for Use) | TBD — Portuguese-language user manual | Pending |
| 8 | Label (electronic) | TBD — In-app product identification | Pending |
| 9 | Declaration of Conformity | TBD — Manufacturer self-declaration | Pending |

### 4.2 Supporting Evidence

| Evidence | Reference |
|----------|-----------|
| Test results (1,944 tests, 109 suites) | Jest + Playwright CI output |
| Coverage reports (>80% all metrics) | Jest coverage report |
| Security scan results | `npm audit` clean output |
| Accessibility compliance | AxeBuilder scan results (WCAG 2.1 AA) |
| Load test results | `docs/LOAD_TEST_RESULTS.md` |

---

## 5. Submission Process

### 5.1 Notification Steps (Class I)

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Obtain AFE from ANVISA | 60–90 days (one-time) |
| 2 | Obtain CEVS from state/municipal VISA | 30–60 days (one-time) |
| 3 | Prepare technical dossier (IEC 62304 documents) | Complete (this package) |
| 4 | Submit Class I notification via ANVISA portal (Notivisa or Peticionamento Eletrônico) | 1 day |
| 5 | ANVISA assigns notification number | Automatic for Class I (no pre-market review) |
| 6 | Product may be commercially distributed | Immediately upon notification acceptance |

### 5.2 Key Differences from Class II/III/IV

| Aspect | Class I | Class II–IV |
|--------|---------|------------|
| Pre-market review | No (notification only) | Yes (registration required) |
| ANVISA review time | Immediate | 60–365 days |
| Clinical evidence required | No | Depends on class |
| GMP audit required | No | Yes (Class III/IV) |
| Renewal period | Not applicable | 10 years |

---

## 6. Post-Notification Obligations

### 6.1 Ongoing Requirements

| Obligation | Frequency | Reference |
|-----------|-----------|-----------|
| Adverse event reporting (tecnovigilância) | Within 72 hours of knowledge | RDC 657/2022 Art. 15 |
| Product change notification | Before distribution of significant changes | RDC 657/2022 Art. 12 |
| Annual quality report | Annual | Company QMS obligation |
| Risk management file update | On any change to clinical logic | ISO 14971 Clause 9 |
| Post-market surveillance | Continuous | IEC 82304-1 Clause 7 |

### 6.2 Change Management Triggers

The following changes require updated notification or risk assessment:

| Change Type | Action Required |
|-------------|----------------|
| New clinical rule category | Update risk management file + re-notify if intended use changes |
| Change to override logic | Update risk management file |
| New data integration (RNDS/FHIR) | Update architecture document |
| Move from deterministic to AI/ML | **Reclassification required** (likely Class II+) |
| Change to encryption algorithm | Update architecture + security assessment |

---

## 7. Contacts & Responsible Parties

| Role | Responsibility |
|------|---------------|
| Regulatory Affairs Lead | Notification submission, ANVISA communication |
| Technical Responsible (RT) | Named on AFE, signs technical documents |
| Quality Manager | Maintains QMS, post-market surveillance |
| Clinical Lead (CRM holder) | Validates CDS rules, signs clinical validation |
| Data Protection Officer (DPO) | LGPD compliance, data breach notification |

---

## 8. Timeline Estimate

| Milestone | Target Date | Dependencies |
|-----------|------------|-------------|
| Technical dossier complete | 2026-04-04 | This package |
| AFE application submitted | TBD | CNPJ, company registration |
| AFE granted | AFE + 60–90 days | ANVISA processing |
| CEVS obtained | Parallel to AFE | State VISA inspection |
| IFU and labeling complete | Before notification | Portuguese translation |
| Class I notification submitted | After AFE + CEVS | All pre-requisites met |
| Commercial distribution begins | Notification accepted | Immediate for Class I |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-04 | Holi Labs Regulatory Affairs | Initial release — pre-submission checklist |
