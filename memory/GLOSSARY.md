# Glossary — Acronyms, Terms & Codenames

## Core System Terms
| Term | Meaning |
|------|---------|
| CDSS | Clinical Decision Support System |
| SaMD | Software as a Medical Device |
| ANVISA | Agência Nacional de Vigilância Sanitária (Brazilian regulatory authority) |
| COFEPRIS | Federal Commission for the Protection against Sanitary Risk (Mexican regulatory) |
| LGPD | Lei Geral de Proteção de Dados (Brazilian data privacy law) |
| LPDP | Latin American data privacy protection equivalents |
| RBAC | Role-Based Access Control |
| PII | Personally Identifiable Information |
| PHI | Protected Health Information |

## Data & Security
| Term | Meaning |
|------|---------|
| CPF | Cadastro de Pessoas Físicas (Brazilian tax ID) |
| CNS | Cartão Nacional de Saúde (Brazilian national health ID) |
| RG | Registro Geral (Brazilian national ID) |
| Audit Trail | Immutable log of system actions; retained per LGPD Art. 37 |
| Hash-chain | Integrity mechanism ensuring audit log cannot be tampered with |
| AuditLog | Database table maintaining action history for compliance |

## Clinical Concepts
| Term | Meaning |
|------|---------|
| Biomarker | Measurable biological indicator of health state |
| Manchester Triage | Clinical triage protocol for acuity assessment |
| Pathological Range | Lab values indicating disease/abnormality |
| Functional Range | Lab values indicating normal physiologic function |
| Clinical Rule | Evidence-based decision logic with provenance metadata |
| Bro-Science | Tier 3 source (unreliable); never cite for clinical rules |

## Architecture & Patterns
| Term | Meaning |
|------|---------|
| Circuit Breaker | Halts execution after 3 consecutive failures |
| Zero-Trust DAG | Deny-by-default routing with explicit delegation paths |
| Protected Route | API endpoint with RBAC guard (createProtectedRoute) |
| Cross-tenant Isolation | Prevents one tenant accessing another's patient data |
| Lateral Movement | Unauthorized delegation outside declared DAG paths |

## Compliance & Governance
| Term | Meaning |
|------|---------|
| SOX 404 | Sarbanes-Oxley control testing (if applicable) |
| HIPAA | U.S. Health Insurance Portability & Accountability Act |
| Consent Granularity | Separate consent for each data use (not collapsed checkboxes) |
| legalBasis | Mandatory field on export/erasure routes (GDPR/LGPD) |
| encryptPHIWithVersion | Function for encrypting sensitive health data |
| verifyPatientAccess | Function checking cross-tenant data access permissions |

## Testing & Quality
| Term | Meaning |
|------|---------|
| Jest Mocking | Test framework using require() after jest.mock() |
| CI Pipeline | Continuous integration automated testing & deployment |
| Test Gate | Pre-commit verification that all tests pass |
| Coverage | Percentage of code paths executed by tests |

