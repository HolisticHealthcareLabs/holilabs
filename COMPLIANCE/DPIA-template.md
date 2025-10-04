# Data Protection Impact Assessment (DPIA) Template

**Organization:** [Your Organization]
**Date:** [YYYY-MM-DD]
**Version:** 1.0
**Reviewer:** [DPO Name]

---

## 1. Overview

### 1.1 Project Description
VidaBanq Health AI Platform: HIPAA/GDPR/LGPD-compliant healthcare AI system with automatic de-identification and differential privacy for research exports.

### 1.2 Purpose
Assess privacy risks associated with processing health data and identify mitigations.

### 1.3 Scope
- **Data Types:** Clinical records, DICOM imaging, patient demographics
- **Processing Activities:** De-identification, pseudonymization, AI inference, research exports
- **Data Subjects:** Patients receiving healthcare services
- **Geographic Scope:** Latin America (Brazil, Mexico, Argentina)

---

## 2. Necessity and Proportionality

### 2.1 Lawful Basis
- **GDPR Art. 6(1)(e):** Public interest (healthcare provision)
- **GDPR Art. 9(2)(h):** Health data processing for medical diagnosis/treatment
- **LGPD Art. 11, II:** Protection of life or physical safety

### 2.2 Necessity
Processing is necessary for:
- Clinical decision support
- Medical research (with patient consent)
- Public health surveillance

### 2.3 Proportionality
- Minimal data collection (only clinically necessary)
- Automatic de-identification (HIPAA Safe Harbor)
- Purpose limitation (OPA policies)
- Storage limitation (configurable retention per consent)

---

## 3. Data Flow

```
[Patient Record] → [Upload API] → [De-ID Engine] → [Pseudonymous Token + Generalized Data] → [MinIO Storage]
                                                  ↓
                                            [Audit Event]
```

**Key Controls:**
- TLS 1.3 in-transit
- AES-256 at-rest (MinIO SSE-S3)
- RLS for org isolation
- OPA purpose-binding

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
|------|-----------|--------|-----------|--------------|
| **Re-identification** | Medium | High | HIPAA Safe Harbor + k-anonymity heuristics, no quasi-identifiers stored together | Low |
| **Cross-org access** | Low | High | RLS policies, deny-by-default | Very Low |
| **PHI in logs** | Medium | High | Pino redaction, no PII in audit payloads | Low |
| **Insider threat** | Low | High | Honeytokens, audit trail, MFA for admins | Low |
| **DP privacy leak** | Low | Medium | ε/δ accounting, cooldowns, receipt verification | Very Low |
| **Breach notification failure** | Low | Medium | Immutable audit log, automated SIEM alerts | Low |

---

## 5. Consultation

### 5.1 Stakeholders Consulted
- [ ] Data Protection Officer (DPO)
- [ ] Clinical Staff (end users)
- [ ] IT Security Team
- [ ] Legal/Compliance
- [ ] Patient Representatives (optional)

### 5.2 Findings
[Document stakeholder feedback and concerns]

---

## 6. Measures to Mitigate Risks

### 6.1 Technical Measures
- De-identification (HIPAA Safe Harbor)
- Differential privacy for exports
- Row-Level Security (RLS)
- Immutable audit trail
- Quarterly key rotation
- SBOM + SAST/DAST

### 6.2 Organizational Measures
- Staff training on PHI handling
- Incident response plan
- Monthly restore drills
- Quarterly security audits
- DPO oversight

### 6.3 Contractual Measures
- Data Processing Agreements (DPAs) with cloud providers
- BAA (Business Associate Agreement) for HIPAA compliance
- Vendor security assessments

---

## 7. Data Subject Rights

| Right | Mechanism |
|-------|-----------|
| **Access** | API endpoint /admin/audit/events (user-specific) |
| **Rectification** | Update via patient profile UI |
| **Erasure** | Consent revocation → dataset purge |
| **Portability** | Export endpoint with DP-protected data |
| **Objection** | Consent state: REVOKED |
| **Automated Decision-Making** | CDS disclaimers, human oversight required |

---

## 8. International Transfers

### 8.1 Data Residency
- **Brazil:** sa-east-1 (São Paulo)
- **Mexico:** us-south-1 (Mexico City)
- **Argentina:** sa-east-1 (Buenos Aires)

### 8.2 Adequacy
- Within Latin America (LGPD/LFPDPPP/PDPA)
- No transfers to non-adequate jurisdictions without SCCs

---

## 9. Review and Monitoring

- **DPIA Review Frequency:** Annual or upon major system changes
- **Next Review Date:** [YYYY-MM-DD]
- **Responsible Party:** [DPO Name]

---

## 10. Approval

**DPO Signature:** ______________________
**Date:** [YYYY-MM-DD]

**Senior Management Approval:** ______________________
**Date:** [YYYY-MM-DD]
