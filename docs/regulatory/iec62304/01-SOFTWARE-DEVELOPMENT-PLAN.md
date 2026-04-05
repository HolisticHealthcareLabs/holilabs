# SOFTWARE DEVELOPMENT PLAN (SDP)
**IEC 62304 Compliance - Software Lifecycle**
**Classification:** Class A (ou B, pendente de definição final pela ANVISA)

## 1. PURPOSE
This Software Development Plan (SDP) defines the lifecycle model, processes, activities, and tasks used for the development of the HoliLabs Clinical Intelligence Platform. 

## 2. SCOPE
This document covers the entire software development lifecycle, from requirements gathering through coding, testing, release, and maintenance.

## 3. LIFECYCLE MODEL
HoliLabs employs an **Agile (Scrum/Kanban) Development Model** adapted for regulatory compliance:
- **Sprint Planning:** 2-week iterations.
- **Continuous Integration/Continuous Deployment (CI/CD):** Automated pipelines enforce testing and quality checks before deployment.
- **Traceability:** Requirements (SRS) are mapped to architecture, code, and test cases.

## 4. TOOLS AND ENVIRONMENT
- **Source Control:** Git (GitHub/GitLab) with protected `main` branch.
- **Code Reviews:** Mandatory Pull Requests (PRs) requiring at least 1 approval.
- **CI/CD Pipeline:** GitHub Actions (runs linters, TypeScript type checks, Unit Tests, and E2E Tests via Playwright).
- **Issue Tracking:** Jira / Linear / GitHub Issues.
- **Development Stack:** Next.js, TypeScript, Prisma, PostgreSQL.

## 5. ROLES AND RESPONSIBILITIES
- **Product Manager / Medical Officer:** Defines clinical requirements and validates clinical workflows.
- **Lead Developer / Architect:** Ensures architecture matches SRS and approves technical PRs.
- **QA / Test Engineer:** Designs verification protocols and oversees E2E testing.
- **Regulatory / DPO:** Ensures compliance with IEC 62304, LGPD, and ANVISA requirements.

## 6. CONFIGURATION MANAGEMENT
All software artifacts (code, documentation, infrastructure scripts) are version-controlled. Release tagging follows Semantic Versioning (SemVer). The production release candidate must pass all automated verification and manual QA checks before the tag is created.

## 7. RISK MANAGEMENT INTEGRATION
Risk management activities (ISO 14971) run concurrently with development. High-risk features (e.g., CDS alerts, AI transcriptions) require specific hazard mitigation strategies implemented as code or UI warnings.

---
*Document Version: 1.0*
*Status: DRAFT*