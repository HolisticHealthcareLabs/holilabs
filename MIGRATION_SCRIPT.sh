#!/usr/bin/env bash
# ==============================================================================
# CORTEX DUAL-TRACK MIGRATION SCRIPT
# ==============================================================================
#
# PURPOSE: Restructure the monorepo from single-app (apps/web) to dual-track
#          (apps/clinic + apps/enterprise + packages/shared-kernel).
#
# THIS IS A CONCEPTUAL SCRIPT. Review each section before executing.
# Run on a clean branch: git checkout -b arch/dual-track-split
#
# EXECUTION ORDER:
#   Phase 1 — Create shared-kernel package (extract from apps/web/src/lib/)
#   Phase 2 — Rename apps/web → apps/clinic
#   Phase 3 — Initialize apps/enterprise (empty scaffold)
#   Phase 4 — Update import paths
#   Phase 5 — Update workspace config
#   Phase 6 — Validate
#
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

echo "=== Phase 0: Safety Checks ==="
echo "Current branch: $(git branch --show-current)"
echo "Working tree clean: $(git status --porcelain | wc -l | tr -d ' ') uncommitted files"

if [ "$(git status --porcelain | wc -l)" -gt 0 ]; then
  echo "ERROR: Working tree is not clean. Commit or stash changes first."
  exit 1
fi

echo ""
echo "=== Phase 1: Create packages/shared-kernel ==="
echo ""

# 1A. Create the shared-kernel directory structure
mkdir -p packages/shared-kernel/src/{clinical,governance,auth,consent,audit,types,fhir,brazil-interop,ehr,cds,repositories,services,compliance,deid,blockchain,normalization,db,facades,forms}
mkdir -p packages/shared-kernel/src/cds/rules
mkdir -p packages/shared-kernel/src/clinical/{engines,context,quality}
mkdir -p packages/shared-kernel/src/ai/{schemas,validators}

# 1B. Move clinical protocol engine (THE JEWEL)
echo "Moving clinical protocol engine..."
git mv apps/web/src/lib/clinical/content-loader.ts      packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/content-registry.ts     packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/content-types.ts        packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/governance-policy.ts    packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/lab-decision-rules.ts   packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/lab-reference-ranges.ts packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/rule-engine.ts          packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/process-clinical-decision.ts packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/process-with-fallback.ts packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/compliance-rules.ts     packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/index.ts                packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/clinical-trials.service.ts packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/cms-coverage.service.ts packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/icd11.service.ts        packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/international-guidelines.service.ts packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/openfda.service.ts      packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/rxnorm.service.ts       packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/snomed.service.ts       packages/shared-kernel/src/clinical/
git mv apps/web/src/lib/clinical/uspstf.service.ts       packages/shared-kernel/src/clinical/

# Clinical engines
git mv apps/web/src/lib/clinical/engines/medication-adherence-engine.ts packages/shared-kernel/src/clinical/engines/
git mv apps/web/src/lib/clinical/engines/symptom-diagnosis-engine.ts    packages/shared-kernel/src/clinical/engines/
git mv apps/web/src/lib/clinical/engines/treatment-protocol-engine.ts   packages/shared-kernel/src/clinical/engines/
git mv apps/web/src/lib/clinical/engines/index.ts                       packages/shared-kernel/src/clinical/engines/

# Clinical context
git mv apps/web/src/lib/clinical/context/context-merger.ts packages/shared-kernel/src/clinical/context/
git mv apps/web/src/lib/clinical/context/index.ts          packages/shared-kernel/src/clinical/context/

# 1C. Move governance
echo "Moving governance..."
git mv apps/web/src/lib/governance/governance.service.ts  packages/shared-kernel/src/governance/
git mv apps/web/src/lib/governance/governance.rules.ts    packages/shared-kernel/src/governance/
git mv apps/web/src/lib/governance/rules-manifest.ts      packages/shared-kernel/src/governance/
git mv apps/web/src/lib/governance/auto-promoter.ts       packages/shared-kernel/src/governance/
git mv apps/web/src/lib/governance/shared-types.ts        packages/shared-kernel/src/governance/
git mv apps/web/src/lib/governance/rules-db-seed.ts       packages/shared-kernel/src/governance/

# 1D. Move auth
echo "Moving auth..."
git mv apps/web/src/lib/auth/auth.ts                packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/auth.config.ts         packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/casbin.ts              packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/casbin-adapter.ts      packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/casbin-middleware.ts    packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/mfa.ts                 packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/otp.ts                 packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/session-security.ts    packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/session-store.ts       packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/session-tracking.ts    packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/token-revocation.ts    packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/password-validation.ts packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/password-reset.ts      packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/patient-session.ts     packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/server.ts              packages/shared-kernel/src/auth/
git mv apps/web/src/lib/auth/magic-link.ts          packages/shared-kernel/src/auth/

# 1E. Move consent (LGPD)
echo "Moving consent..."
git mv apps/web/src/lib/consent/consent-guard.ts      packages/shared-kernel/src/consent/
git mv apps/web/src/lib/consent/recording-consent.ts   packages/shared-kernel/src/consent/
git mv apps/web/src/lib/consent/expiration-checker.ts  packages/shared-kernel/src/consent/
git mv apps/web/src/lib/consent/version-manager.ts     packages/shared-kernel/src/consent/

# 1F. Move audit
echo "Moving audit..."
git mv apps/web/src/lib/audit.ts                 packages/shared-kernel/src/audit/audit.ts
git mv apps/web/src/lib/audit/bemi-context.ts    packages/shared-kernel/src/audit/
git mv apps/web/src/lib/audit/deid-audit.ts      packages/shared-kernel/src/audit/

# 1G. Move shared types, FHIR, EHR, CDS, repositories, services
echo "Moving FHIR, EHR, CDS, repos, services..."
git mv apps/web/src/lib/fhir/            packages/shared-kernel/src/fhir/
git mv apps/web/src/lib/brazil-interop/  packages/shared-kernel/src/brazil-interop/
git mv apps/web/src/lib/ehr/             packages/shared-kernel/src/ehr/
git mv apps/web/src/lib/cds/engines/     packages/shared-kernel/src/cds/engines/
git mv apps/web/src/lib/cds/rules/       packages/shared-kernel/src/cds/rules/
git mv apps/web/src/lib/cds/types.ts     packages/shared-kernel/src/cds/
git mv apps/web/src/lib/repositories/    packages/shared-kernel/src/repositories/
git mv apps/web/src/lib/encryption.ts    packages/shared-kernel/src/encryption.ts
git mv apps/web/src/lib/compliance/      packages/shared-kernel/src/compliance/
git mv apps/web/src/lib/blockchain/      packages/shared-kernel/src/blockchain/
git mv apps/web/src/lib/normalization/   packages/shared-kernel/src/normalization/
git mv apps/web/src/lib/db/              packages/shared-kernel/src/db/
git mv apps/web/src/lib/deid/            packages/shared-kernel/src/deid/
git mv apps/web/src/lib/deidentification/ packages/shared-kernel/src/deidentification/

# 1H. Move shared AI schemas & validators (NOT providers — those go to Enterprise)
echo "Moving shared AI schemas/validators..."
git mv apps/web/src/lib/ai/schemas/      packages/shared-kernel/src/ai/schemas/
git mv apps/web/src/lib/ai/validators/   packages/shared-kernel/src/ai/validators/
git mv apps/web/src/lib/ai/types.ts      packages/shared-kernel/src/ai/types.ts
git mv apps/web/src/lib/ai/validator.ts  packages/shared-kernel/src/ai/validator.ts
git mv apps/web/src/lib/ai/patient-context-formatter.ts packages/shared-kernel/src/ai/
git mv apps/web/src/lib/ai/patient-data-fetcher.ts      packages/shared-kernel/src/ai/

# 1I. Move clinical rules config and data
echo "Moving clinical config and data..."
git mv apps/web/src/config/clinical-rules.ts packages/shared-kernel/src/clinical/config/clinical-rules.ts

# 1J. Move Prisma schema to shared-kernel (SINGLE SOURCE OF TRUTH)
echo "Moving Prisma schema..."
cp apps/web/prisma/schema.prisma packages/shared-kernel/prisma/schema.prisma
# Note: Keep a symlink in apps/web for now (backward compat during migration)
# ln -sf ../../packages/shared-kernel/prisma/schema.prisma apps/web/prisma/schema.prisma

echo ""
echo "=== Phase 2: Rename apps/web → apps/clinic ==="
echo ""

# NOTE: This is the most disruptive step. The actual rename should be done
# as a separate commit to preserve git history clearly.
# For now, we create apps/clinic as a copy and update package.json.

echo "ADVISORY: Full rename of apps/web to apps/clinic should be done in a"
echo "separate, clean commit. For now, apps/web remains as-is and we create"
echo "a symlink for forward compatibility."
echo ""

# Create the symlink for forward references
# ln -sf web apps/clinic

echo ""
echo "=== Phase 3: Initialize apps/enterprise (Empty Scaffold) ==="
echo ""

mkdir -p apps/enterprise/src/app/api/{telemetry,analytics,risk-scores,tiss-ingest,predictions,cohorts,reports,webhooks}
mkdir -p apps/enterprise/src/app/dashboard/{overview,risk-cohorts,sinistralidade,benchmarking}
mkdir -p apps/enterprise/src/components/{dashboard,risk,analytics,reports}
mkdir -p apps/enterprise/src/hooks
mkdir -p apps/enterprise/src/contexts
mkdir -p apps/enterprise/src/lib/{ai,ml,analytics,aws,tiss,reports}
mkdir -p apps/enterprise/python/api/{routes,models}

# Move enterprise-specific files from apps/web/src/lib/
echo "Moving enterprise-specific AI providers..."
git mv apps/web/src/lib/ai/anthropic-provider.ts    apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/gemini-provider.ts       apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/factory.ts               apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/router.ts                apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/embeddings.ts            apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/confidence-scoring.ts    apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/consensus-verifier.ts    apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/usage-tracker.ts         apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/prompt-builder.ts        apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/cache.ts                 apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/circuit-breaker.ts       apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/retry.ts                 apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/bridge.ts                apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/chat.ts                  apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/claude.ts                apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/provider-interface.ts    apps/enterprise/src/lib/ai/ 2>/dev/null || true
git mv apps/web/src/lib/ai/providers/               apps/enterprise/src/lib/ai/providers/ 2>/dev/null || true

echo "Moving enterprise-specific ML..."
git mv apps/web/src/lib/ml/                         apps/enterprise/src/lib/ml/ 2>/dev/null || true

echo "Moving enterprise-specific analytics..."
git mv apps/web/src/lib/analytics/                  apps/enterprise/src/lib/analytics/ 2>/dev/null || true

echo "Moving enterprise-specific AWS..."
git mv apps/web/src/lib/aws/                        apps/enterprise/src/lib/aws/ 2>/dev/null || true

echo "Moving enterprise-specific hooks/contexts..."
git mv apps/web/src/hooks/useAgent.ts               apps/enterprise/src/hooks/ 2>/dev/null || true
git mv apps/web/src/hooks/useAnalytics.ts           apps/enterprise/src/hooks/ 2>/dev/null || true
git mv apps/web/src/hooks/useToolUsageTracker.ts    apps/enterprise/src/hooks/ 2>/dev/null || true
git mv apps/web/src/contexts/AgentContext.tsx        apps/enterprise/src/contexts/ 2>/dev/null || true

# Create enterprise package.json
cat > apps/enterprise/package.json << 'ENTERPRISE_PKG'
{
  "name": "@holi/enterprise",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@holi/shared-kernel": "workspace:*",
    "@holi/schemas": "workspace:*",
    "@holi/dp": "workspace:*",
    "@holi/utils": "workspace:*",
    "next": "15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  }
}
ENTERPRISE_PKG

# Create enterprise tsconfig.json
cat > apps/enterprise/tsconfig.json << 'ENTERPRISE_TSC'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@holi/shared-kernel": ["../../packages/shared-kernel/src"],
      "@holi/shared-kernel/*": ["../../packages/shared-kernel/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
ENTERPRISE_TSC

# Create Python requirements
cat > apps/enterprise/python/requirements.txt << 'PY_REQS'
fastapi>=0.115.0
uvicorn>=0.34.0
xgboost>=2.1.0
lightgbm>=4.5.0
pandas>=2.2.0
numpy>=2.1.0
scikit-learn>=1.6.0
pydantic>=2.10.0
python-dotenv>=1.0.0
httpx>=0.28.0
pytest>=8.3.0
PY_REQS

echo ""
echo "=== Phase 4: Create shared-kernel package.json ==="
echo ""

cat > packages/shared-kernel/package.json << 'KERNEL_PKG'
{
  "name": "@holi/shared-kernel",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./index.d.ts",
  "exports": {
    ".": "./src/index.ts",
    "./clinical": "./src/clinical/index.ts",
    "./clinical/*": "./src/clinical/*.ts",
    "./governance": "./src/governance/shared-types.ts",
    "./governance/*": "./src/governance/*.ts",
    "./auth": "./src/auth/auth.ts",
    "./auth/*": "./src/auth/*.ts",
    "./consent": "./src/consent/consent-guard.ts",
    "./consent/*": "./src/consent/*.ts",
    "./audit": "./src/audit/audit.ts",
    "./types": "./src/types/index.ts",
    "./types/*": "./src/types/*.ts",
    "./fhir": "./src/fhir/smart-client.ts",
    "./fhir/*": "./src/fhir/*.ts",
    "./ehr": "./src/ehr/index.ts",
    "./ehr/*": "./src/ehr/*.ts",
    "./cds": "./src/cds/types.ts",
    "./cds/*": "./src/cds/*.ts",
    "./encryption": "./src/encryption.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "test": "jest --passWithNoTests",
    "build:bundle": "tsx ../../scripts/clinical/build-content-bundle.ts"
  },
  "dependencies": {
    "@holi/schemas": "workspace:*",
    "@holi/utils": "workspace:*"
  }
}
KERNEL_PKG

# Create shared-kernel tsconfig
cat > packages/shared-kernel/tsconfig.json << 'KERNEL_TSC'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "paths": {
      "@holi/schemas": ["../schemas/src"],
      "@holi/utils": ["../utils/src"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
KERNEL_TSC

echo ""
echo "=== Phase 5: Update Root Workspace Config ==="
echo ""

echo "ADVISORY: Manually update pnpm-workspace.yaml to include:"
echo "  - 'packages/shared-kernel'"
echo "  - 'apps/enterprise'"
echo ""
echo "Update root package.json scripts to add:"
echo '  "typecheck:kernel": "pnpm -C packages/shared-kernel typecheck"'
echo '  "typecheck:clinic": "pnpm -C apps/web typecheck"'
echo '  "typecheck:enterprise": "pnpm -C apps/enterprise typecheck"'
echo '  "typecheck:all": "pnpm -r typecheck"'

echo ""
echo "=== Phase 6: Validate ==="
echo ""

echo "Run these commands to validate the migration:"
echo ""
echo "  # 1. Install dependencies"
echo "  pnpm install"
echo ""
echo "  # 2. Check shared-kernel compiles"
echo "  pnpm -C packages/shared-kernel typecheck"
echo ""
echo "  # 3. Check clinic still builds"
echo "  pnpm -C apps/web typecheck"
echo ""
echo "  # 4. Check enterprise scaffold"
echo "  pnpm -C apps/enterprise typecheck"
echo ""
echo "  # 5. Verify no cross-imports"
echo "  rg 'from.*apps/clinic' apps/enterprise/ --type ts"
echo "  rg 'from.*apps/enterprise' apps/clinic/ --type ts"
echo "  rg 'from.*apps/' packages/ --type ts"
echo ""
echo "=== Migration Script Complete ==="
echo "Review the changes, then commit:"
echo "  git add -A"
echo "  git commit -m 'arch: dual-track Y-split — shared-kernel + clinic + enterprise'"
