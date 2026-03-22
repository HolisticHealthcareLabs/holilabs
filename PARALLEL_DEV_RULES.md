# Parallel Development Orchestration Rules
# Two simultaneous Claude Code sessions on holilabsv2

## Session 1 (Claude Code CLI — active build repair)
**Jurisdiction**: Existing code under repair
**OWNED FILES — DO NOT TOUCH from Session 2:**
- apps/web/src/lib/api/middleware.ts
- apps/web/src/lib/ai/gateway.ts
- apps/web/src/lib/api/audit-buffer.ts
- apps/web/src/components/onboarding/**
- apps/web/src/components/patients/**
- apps/web/src/legacy_archive/**
- apps/web/src/app/layout.tsx
- apps/web/src/app/actions/onboarding.ts
- apps/web/.next/ (build cache)
- apps/web/.turbo/

## Session 2 (Cowork — Health 3.0 data ingestion)
**Jurisdiction**: NEW files only, under new directories
**SAFE ZONES — Session 2 may create/edit freely:**
- packages/data-ingestion/** (NEW package, does not exist yet)
- apps/web/src/app/api/ingest/** (NEW API routes only)
- apps/web/src/app/(dashboard)/health3/** (NEW pages only)
- prisma/migrations/** (ONLY additive migrations, no schema edits to existing models)

**SHARED RESOURCES — READ ONLY from Session 2:**
- prisma/schema.prisma (read to understand models, do NOT edit)
- packages/ui/** (import from @holi/ui, do NOT edit)
- apps/web/src/lib/prisma.ts (import, do NOT edit)
- apps/web/src/lib/auth/** (import patterns, do NOT edit)

## Merge Protocol (when Session 1 build is stable)
1. Session 1 confirms: `pnpm build` exits 0
2. Session 2 confirms: no files outside its SAFE ZONES were touched
3. Single `pnpm build` run in holilabsv2 root to verify combined state
4. If conflict: Session 2 changes take precedence for new files; Session 1 changes take precedence for existing files
5. Run full test suite before any commit

## Hard Rules (both sessions)
- NEVER run `git push` — human only
- NEVER edit prisma/schema.prisma concurrently — coordinate via this file
- NEVER run `pnpm build` simultaneously — stagger by 5+ minutes
- Session 2 MUST use `packages/data-ingestion` as its root; never scatter new files into existing app directories
