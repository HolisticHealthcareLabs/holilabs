# Antigravity Session Primer — Holi Labs / Cortex

> **Copy everything below this line and paste it as your opening prompt in the new session.**

---

## WHO YOU ARE

You are continuing development on **Holi Labs / Cortex** — a clinical AI co-pilot platform for Latin American healthcare (Brazil-first, expanding to Bolivia and Argentina). The codebase lives in a Next.js 14 monorepo at `apps/web/`. You have a governance system of 8 AI personas (CTO, CPO, CSO, CFO, CLO, CMO, CISO, QA) that enforce domain rules — read `.cursorrules` and `CLAUDE.md` at the project root to understand the orchestration protocol.

## WHAT WAS SHIPPED IN THE LAST SESSION

### 1. Legal Framework (docs/legal/)
- **Terms of Service** — 18 sections, LGPD/ANVISA/HIPAA/CFM compliant. Benchmarked against 24+ companies (Ro, K Health, Suki AI, Elation, Augmedix, Conexa Saúde, iClinic, Doctoralia). Key section: **§4.6 AI Model Transparency** — commits to benchmarking, transparent pros/cons disclosure, per-discipline model recommendations across 14 specialties, and Healthcare Provider's right to override.
- **Privacy Policy** — 16 sections + 3 appendices (PT-BR consent templates, international transfer disclosure, automated decision disclaimer). Granular 3-toggle consent model (Service/Research/Marketing).
- **Research** — 3 comparative analysis docs in `docs/legal/` covering US telehealth, AI clinical copilots, and LATAM health tech.
- Lives at `/legal/terms-of-service` and `/legal/privacy-policy` via `LegalDocumentViewer` component rendering markdown from `apps/web/public/legal/`.

### 2. Auth Flow Integration
- Login page (`/auth/login`) — fixed broken links (`/legal/terms` → `/legal/terms-of-service`), ToS checkbox gates sign-in
- Register page (`/auth/register`) — added terms/privacy checkbox with links, submit disabled until accepted
- Onboarding (`/onboarding`) — "Holi Labs'" possessive fixed, Terms and Privacy are now clickable links opening in new tabs
- `ConsentAcceptanceFlow` and `LegalDocumentViewer` components — "HoliLabs" → "Holi Labs" branding fix

### 3. Landing Page Hero Typography
- Responsive "heartbeat" line-break pattern on the subhead using `lg:whitespace-pre-line`
- Large screens: 4-line layout with punchy kicker lines ("at the source." / "medical billing compliance.")
- Mobile: natural word-wrap for density
- Footer legal links now point to actual legal pages instead of `#` placeholders

### 4. Ambient Scribe Pipeline
- `AudioWaveform` component, `/api/audio/token` route, `useClinicalContext` hook
- `/api/clinical/context-scan` route for live patient context awareness
- Demo personas library (`src/lib/demo/personas.ts`), cinematic transitions, dedicated demo setup page

### 5. Known Issue
- `/api/auth/session` returns 404 in dev — NextAuth can't reach the database. The `.env.local` needs `DATABASE_URL` pointing at a running Postgres instance. This is a pre-existing infrastructure issue, not from recent changes.

## WHAT NEEDS TO HAPPEN NEXT

### Priority 1: Get the Dev Environment Running
- Ensure Postgres is running and `DATABASE_URL` in `.env.local` is correct
- Run `pnpm prisma db push` or `pnpm prisma migrate dev` to sync schema
- Run `npx tsx prisma/seed-demo.ts` to seed demo data
- Verify `localhost:3000/auth/login` renders and the demo account works

### Priority 2: API Integration Audit
- Verify every API route in `apps/web/src/app/api/` has proper error handling and returns correct status codes
- Ensure all routes that touch patient data have `createProtectedRoute` RBAC guards (CYRUS invariant)
- Verify the CDSS chat route (`/api/cdss/chat/route.ts`) works end-to-end
- Test the billing analysis route (`/api/billing/analyze/route.ts`)
- Test the FHIR export route (`/api/interop/fhir/export/route.ts`)
- Verify the audio token and context-scan routes work with the ambient scribe pipeline

### Priority 3: Backend Architecture Tightness
- Audit Prisma schema for missing indexes, orphaned relations, or type mismatches
- Ensure all PII fields use `encryptPHIWithVersion` (CYRUS invariant)
- Verify audit logging is emitting `AuditEvent` on every data access
- Check that the consent-guard (`packages/shared-kernel/src/consent/consent-guard.ts`) is enforced before data access
- Review middleware.ts — LGPD access reason enforcement, security headers, locale routing

### Priority 4: UI/UX Polish
- The design language is Apple-inspired: high contrast, generous whitespace, SF-style typography, dark hero sections, light content sections
- Every user-visible string must go through `LanguageContext` or `next-intl` — no hardcoded text
- Dashboard should feel premium and simple — a LATAM doctor with 3 minutes between patients should be able to use it without thinking
- Clinical alerts follow Manchester Triage: RED/ORANGE/YELLOW/GREEN — no custom colors
- Demo mode must always work — it's the primary sales tool

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Auth | NextAuth v5 (credentials + Google OAuth) |
| Database | PostgreSQL via Prisma |
| i18n | next-intl (en, pt-BR) |
| AI | Multiple LLM providers (OpenAI, Anthropic, Google) via anonymization proxy |
| Monorepo | pnpm workspaces |
| Testing | Jest + Playwright |

## KEY FILE LOCATIONS

| What | Where |
|------|-------|
| Root orchestrator rules | `.cursorrules` |
| Project memory | `CLAUDE.md` |
| Agent routing table | `.cursor/rules/ROUTER.md` |
| 8 persona profiles | `.cursor/rules/*_V2.md` |
| Legal docs (source) | `docs/legal/TERMS_OF_SERVICE.md`, `docs/legal/PRIVACY_POLICY.md` |
| Legal docs (served) | `apps/web/public/legal/terms-of-service.md`, `apps/web/public/legal/privacy-policy.md` |
| Auth config | `apps/web/src/lib/auth/auth.config.ts` |
| Middleware | `apps/web/src/middleware.ts` |
| Landing page | `apps/web/src/components/landing/BillingComplianceLanding.tsx` |
| Dashboard layout | `apps/web/src/app/dashboard/layout.tsx` |
| Clinical command | `apps/web/src/app/dashboard/clinical-command/` |
| Translation files | `apps/web/messages/en.json`, `apps/web/messages/pt-BR.json` |
| Prisma schema | `prisma/schema.prisma` |

## CONSTRAINTS (non-negotiable)

1. **SaMD Defense** — Never use "diagnose," "detect," "prevent," or "treat" in UI/API/marketing. We are "Clinical Decision Support" (Class I).
2. **Consent** — Granular toggles (Service/Research/Marketing). Never a single "I Agree" checkbox for health data.
3. **Doctor Liability** — The platform is a tool. The Healthcare Provider retains sole, exclusive, and non-delegable responsibility for all clinical decisions. This is in the ToS at §3.1.
4. **Security by Default** — Every API route needs RBAC. Every PII field needs encryption. Every data access emits an audit event.
5. **Possessive** — Always "Holi Labs'" (not "Holi Labs's").

## GIT STATE

- Branch: `main`, 10 commits ahead of `origin/main`
- Working tree: clean
- Pre-commit hook: gitleaks secret scanning (runs automatically)
- Commit style: Conventional Commits, 3-sentence body (what/how/why)

Start by reading `.cursorrules` and `CLAUDE.md`, then get the dev environment running. Once `localhost:3000` serves the login page cleanly, audit the API routes and tighten the backend before touching any UI.
