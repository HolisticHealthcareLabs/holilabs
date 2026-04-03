#!/bin/bash
# =============================================================================
# HoliLabs v2 — Parallel Agent Launcher
# Launches 5 Claude Code agents in separate tmux panes
# Usage: ./scripts/launch-parallel-agents.sh
# Prereq: tmux, claude CLI
# =============================================================================

set -euo pipefail

PROJECT_DIR="$HOME/prototypes/holilabsv2"
SESSION_NAME="holilabs-agents"

# Check prereqs
command -v tmux >/dev/null 2>&1 || { echo "❌ tmux required. Install: brew install tmux"; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "❌ claude CLI required."; exit 1; }

echo "🚀 Launching 5 parallel agents for HoliLabs v2 GTM Sprint..."
echo "📂 Project: $PROJECT_DIR"
echo "⏱️  Estimated time: 30-60 min per agent"
echo ""

# Kill existing session if present
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create new tmux session with first agent
tmux new-session -d -s "$SESSION_NAME" -n "security" -c "$PROJECT_DIR"

# Agent 1: Security Hardening
tmux send-keys -t "$SESSION_NAME:security" "claude --dangerously-skip-permissions -p 'You are a senior security engineer hardening a healthcare SaaS app for production launch. The context: an autonomous AI agent just exploited a FreeBSD kernel RCE in 4 hours for a few hundred dollars (CVE-2026-4747). The median enterprise patch time is 60+ days. We are a healthcare app handling PHI under HIPAA, LGPD (Brazil), and ANVISA RDC 657/2022. We must assume AI-speed attacks against our stack.

PROJECT: ~/prototypes/holilabsv2 (Next.js 14 + Fastify 4 + Prisma/Postgres + Redis + Electron sidecar)

PHASE 1 - AUDIT (read-only): 1. Read apps/api/src/index.ts - find the rate limiting code (DISABLED, lines 96-102). 2. Read prisma/schema.prisma - identify all PII/PHI fields. 3. Read apps/api/src/middleware/ for security middleware. 4. Read .github/workflows/security-enhanced.yml. 5. Read apps/web/src/app/api/auth/ for NextAuth config.

PHASE 2 - IMPLEMENT: A) RATE LIMITING: Enable @fastify/rate-limit in index.ts. 100 req/min general, 10 req/min auth, 5 req/min password reset. Use Upstash Redis with fallback in-memory. B) JWT HARDENING: 15 min access tokens, refresh rotation, device fingerprint binding. C) INPUT VALIDATION: Add Zod schemas to ALL Fastify routes. D) SECURITY HEADERS: Tighten Helmet CSP, add Permissions-Policy, HSTS preload. E) AUDIT LOGGING: Middleware for all patient data access. Make audit table append-only. F) DEPENDENCY LOCKDOWN: Pin security-critical packages, add .npmrc save-exact=true.

PHASE 3 - CI: Update security-enhanced.yml to run on every PR. Add npm audit as blocking step.

PHASE 4 - VERIFY: Run pnpm typecheck and pnpm test. Create docs/SECURITY_HARDENING_REPORT.md.

Commit: feat(security): AI-era hardening - rate limiting, JWT rotation, input validation, audit logging'" C-m

# Agent 2: UI Polish
tmux new-window -t "$SESSION_NAME" -n "ui-polish" -c "$PROJECT_DIR/apps/web"
sleep 1
tmux send-keys -t "$SESSION_NAME:ui-polish" "claude --dangerously-skip-permissions -p 'You are a senior frontend engineer. Make this healthcare app feel polished and production-ready.

PROJECT: ~/prototypes/holilabsv2/apps/web (Next.js 14, React 18, Tailwind CSS, Radix UI)
BRAND: Primary #00FF88, Dark #0A0A0A

PHASE 1 - AUDIT: Read tailwind.config.js, globals.css, src/components/ui/, dashboard pages, public pages, error pages.

PHASE 2 - IMPLEMENT: A) SKELETON LOADING: Create reusable Skeleton component using existing shimmer animation. Create DashboardSkeleton, PatientListSkeleton, AppointmentSkeleton. B) EMPTY STATES: Create reusable empty-state component. Add to patient list, appointments, medications, lab results, notifications. C) ERROR BOUNDARIES: Improve error.tsx and not-found.tsx with clean branded design. Add error.tsx to each route group. D) PAGE TRANSITIONS: Subtle fade-in animation wrapper component. E) BUTTON POLISH: Consistent hover states, focus-visible rings, loading spinners. F) TOAST POLISH: Slide-in animation, auto-dismiss with progress bar. G) CHART POLISH: Loading shimmer for Recharts, styled tooltips, entrance animations.

PHASE 3 - RESPONSIVE: Check 5 main pages at 375px, 768px, 1440px. Fix any layout breaks.

PHASE 4 - VERIFY: Run pnpm typecheck and pnpm test.

Commit: feat(ui): production polish - skeletons, empty states, error boundaries, micro-interactions'" C-m

# Agent 3: Demo Seed Data
tmux new-window -t "$SESSION_NAME" -n "seed-data" -c "$PROJECT_DIR"
sleep 1
tmux send-keys -t "$SESSION_NAME:seed-data" "claude --dangerously-skip-permissions -p 'You are a senior full-stack engineer preparing this healthcare app for investor demos.

PROJECT: ~/prototypes/holilabsv2 (Prisma + PostgreSQL)

PHASE 1: Read prisma/schema.prisma completely. Read existing prisma/seed.ts if it exists.

PHASE 2 - BUILD SEED SYSTEM: A) Create prisma/seeds/demo-data.ts with: 3 Organizations (Hospital SP, Clinica Bogota, Posto Rural), 12 Users (physicians, nurses, admin, pharmacists), 25 Patients (mix of ages/conditions, Brazilian names, CPF, SUS + private insurance), 50 Appointments (past 30 days + next 14), 30 SOAP notes, 40 Lab results, 20 Prescriptions, 15 Diagnoses (ICD-10), 10 Allergies, 5 Medical images, 100 Vitals data points, 5 Screening gap alerts, 200 Audit log entries. B) Create prisma/seeds/index.ts with --clean, --demo, --minimal flags. C) Add seed scripts to package.json. D) Create demo login page showing quick-login buttons when DEMO_MODE=true.

PHASE 3 - FEATURE FLAGS: Create src/lib/feature-flags.ts with env-var-based flags for FHIR, telehealth, AI scribe, prescriptions, lab integration.

PHASE 4 - VERIFY: Run pnpm typecheck. Create docs/DEMO_GUIDE.md.

Commit: feat(demo): comprehensive seed data, feature flags, and demo mode for GTM'" C-m

# Agent 4: E2E Stabilization
tmux new-window -t "$SESSION_NAME" -n "e2e-tests" -c "$PROJECT_DIR/apps/web"
sleep 1
tmux send-keys -t "$SESSION_NAME:e2e-tests" "claude --dangerously-skip-permissions -p 'You are a senior QA engineer. Stabilize the Playwright E2E test suite. Unit tests pass (922/922). E2E has ~150 failing tests.

PROJECT: ~/prototypes/holilabsv2/apps/web (Playwright 1.40)
DEV SERVER: Ensure localhost:3000 is running. If not: cd ~/prototypes/holilabsv2 && pnpm dev &

PHASE 1 - INFRASTRUCTURE: Reduce workers to 2. Increase timeout to 45s. Verify webServer config.

PHASE 2 - VR BASELINES: Run npx playwright test --project=chromium --update-snapshots tests/visual-regression/

PHASE 3 - CONTENT FIXES: For tests expecting non-existent content: mark with test.skip or test.fixme. For trivial page fixes, fix the page.

PHASE 4 - A11Y FIXES: Run a11y tests, fix top 5 violations in actual component code (contrast, alt text, form labels, heading order, button names).

PHASE 5 - SMOKE/API: Mark DB-dependent tests with test.skip for non-CI environments.

PHASE 6 - FINAL RUN: npx playwright test --project=chromium --workers=2. Target 85%+ pass rate. Create docs/E2E_TEST_STATUS.md.

Commit: test(e2e): stabilize Playwright suite - baselines, content fixes, a11y improvements'" C-m

# Agent 5: DevOps & ECC Integration
tmux new-window -t "$SESSION_NAME" -n "devops-ecc" -c "$PROJECT_DIR"
sleep 1
tmux send-keys -t "$SESSION_NAME:devops-ecc" "claude --dangerously-skip-permissions -p 'You are a DevOps engineer. Integrate best patterns from everything-claude-code into HoliLabs v2.

PROJECT: ~/prototypes/holilabsv2

PHASE 1: Clone https://github.com/affaan-m/everything-claude-code.git to /tmp/ecc. Study rules/common/security.md, coding-style.md, testing.md, hooks/hooks.json, examples/saas-nextjs-CLAUDE.md.

PHASE 2 - ENHANCE CLAUDE.MD: Rewrite CLAUDE.md keeping MEGATRON governance but adding: A) Security rules (never log PHI, audit all patient access, no hardcoded secrets, Zod on all routes, encryption for CPF/phone/email). B) Coding standards (strict TS, immutability, error handling, JSDoc, 300 line max). C) Testing mandates (80% coverage, integration tests per route, a11y tests per page). D) Agent delegation rules. E) PR/commit conventions.

PHASE 3 - HEALTHCARE HOOKS: Create .claude/hooks/ with pre-commit-security-check.sh (scan for secrets, PII in logs, .env files) and pre-push-validation.sh (typecheck + test). Create .claude/rules/security.md with data classification levels.

PHASE 4 - CI HARDENING: Update ci.yml with secret scanning, dependency audit, license check, bundle size check. Create security-continuous.yml for every push. Update deploy.yml with health check and auto-rollback.

PHASE 5: Create docs/DEVELOPER_SECURITY_GUIDE.md.

PHASE 6 - VERIFY: Run pnpm typecheck. Validate YAML. Clean up /tmp/ecc.

Commit: feat(devops): healthcare-grade CLAUDE.md, security hooks, CI hardening - ECC patterns integrated'" C-m

# Attach to session
echo ""
echo "✅ All 5 agents launched in tmux session: $SESSION_NAME"
echo ""
echo "📋 Windows:"
echo "  0: security    — Rate limiting, JWT, input validation, audit logging"
echo "  1: ui-polish   — Skeletons, empty states, error boundaries, animations"
echo "  2: seed-data   — Demo data, feature flags, demo login"
echo "  3: e2e-tests   — Playwright stabilization, VR baselines, a11y fixes"
echo "  4: devops-ecc  — CLAUDE.md upgrade, hooks, CI hardening"
echo ""
echo "🎯 Commands:"
echo "  tmux attach -t $SESSION_NAME          # Watch all agents"
echo "  tmux select-window -t $SESSION_NAME:0 # Switch to security agent"
echo "  tmux kill-session -t $SESSION_NAME    # Stop all agents"
echo ""
echo "🏋️ Go to the gym. Check back in 30-60 min."

tmux attach -t "$SESSION_NAME"
