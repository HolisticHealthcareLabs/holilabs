---
status: pending
priority: p3
issue_id: "011"
tags: [quality, simplification, code-review, enhancement]
dependencies: ["005"]
---

# Dead Code and Over-Engineering (40-50% Removable)

## Problem Statement

The Code Simplicity Reviewer identified significant code that could be removed or simplified:

1. Duplicate routing logic between router.ts and task-router.ts
2. Unused provider methods
3. Over-complex complexity analysis
4. Redundant type definitions

Estimated ~870 lines could be removed or simplified.

## Findings

From Code Simplicity Reviewer:
- 40-50% of code is potentially unnecessary
- Complexity analysis may be overkill for current needs
- Some provider methods never called
- Type definitions duplicated

## Proposed Solutions

### Option 1: Incremental Simplification (Recommended)
**Pros:** Safe, can validate each step
**Cons:** Slower, may miss systemic issues
**Effort:** Medium
**Risk:** Low

### Option 2: Rewrite Core Module
**Pros:** Clean slate, optimal design
**Cons:** High risk, significant effort
**Effort:** Large
**Risk:** High

### Option 3: Document and Defer
**Pros:** No immediate risk, preserves existing
**Cons:** Debt accumulates, harder later
**Effort:** Small
**Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/router.ts`
- `apps/web/src/lib/ai/providers/task-router.ts`
- `apps/web/src/lib/ai/providers/*.ts`

**Components:** All AI module files

## Acceptance Criteria

- [ ] Unused exports identified and removed
- [ ] Duplicate logic consolidated
- [ ] All tests still pass
- [ ] Coverage maintained or improved
- [ ] Documentation updated

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | Technical debt reduction |

## Resources

- PR: feature/p1-model-routing
- YAGNI Principle
- Code Simplification Patterns
