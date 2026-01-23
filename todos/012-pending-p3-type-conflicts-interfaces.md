---
status: pending
priority: p3
issue_id: "012"
tags: [architecture, types, code-review, enhancement]
dependencies: []
---

# Type Conflicts and Incomplete Interfaces

## Problem Statement

The AI module has several type-related issues:

1. ClinicalTask vs AITask type confusion
2. Incomplete provider interfaces
3. Missing generic constraints
4. Inconsistent type exports

This causes:
- TypeScript errors in consumers
- Confusion about which types to use
- Incomplete IDE support

## Findings

From Architecture Strategist review:
- `ClinicalTask` in router.ts vs `AITask` in task-router.ts
- Provider interface doesn't require all methods
- Some methods accept `any` instead of specific types
- Type exports scattered across files

## Proposed Solutions

### Option 1: Unified Type Module (Recommended)
**Pros:** Single source of truth, clear imports
**Cons:** May require updating many files
**Effort:** Medium
**Risk:** Low

### Option 2: Type Aliases for Compatibility
**Pros:** Backward compatible, gradual migration
**Cons:** Two names for same thing, confusing
**Effort:** Small
**Risk:** Low

### Option 3: Full Interface Contracts
**Pros:** Complete type safety, IDE support
**Cons:** More boilerplate, stricter
**Effort:** Medium
**Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/router.ts`
- `apps/web/src/lib/ai/providers/task-router.ts`
- `apps/web/src/lib/ai/types.ts` (may need to create)

**Components:** Type definitions

## Acceptance Criteria

- [ ] Single task type definition
- [ ] Complete provider interface
- [ ] No `any` types in public API
- [ ] All exports from single location
- [ ] TypeScript strict mode passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | Type safety improvement |

## Resources

- PR: feature/p1-model-routing
- TypeScript Best Practices
- Interface Design Patterns
