---
status: pending
priority: p2
issue_id: "005"
tags: [architecture, code-review, important]
dependencies: []
---

# Duplicate Routing Systems

## Problem Statement

The codebase has two parallel routing systems that overlap in functionality:

1. `router.ts` - Main AI routing with complexity analysis
2. `providers/task-router.ts` - Task-based provider selection

This creates:
- Confusion about which router to use
- Potential for inconsistent routing decisions
- Maintenance burden with duplicated logic
- Risk of divergence over time

## Findings

From Architecture Strategist review:
- Both routers have task-to-provider mapping
- Both have fallback chains
- `router.ts` adds complexity analysis
- `task-router.ts` adds provider instantiation
- No clear documentation on when to use which

## Proposed Solutions

### Option 1: Merge into Single Router (Recommended)
**Pros:** Single source of truth, clearer API
**Cons:** Requires careful merge, may break consumers
**Effort:** Large
**Risk:** Medium

### Option 2: Clear Separation of Concerns
**Pros:** Keep both but with clear responsibilities
**Cons:** Still two systems, needs documentation
**Effort:** Small
**Risk:** Low

### Option 3: Deprecate task-router.ts
**Pros:** Simplest, router.ts is more complete
**Cons:** May lose useful task-router features
**Effort:** Medium
**Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/router.ts`
- `apps/web/src/lib/ai/providers/task-router.ts`
- `apps/web/src/lib/ai/factory.ts`

**Components:** AI routing layer

## Acceptance Criteria

- [ ] Single routing system or clear separation
- [ ] Documentation on when to use each
- [ ] No duplicate task mappings
- [ ] All consumers updated
- [ ] Tests verify unified behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | Technical debt, architecture issue |

## Resources

- PR: feature/p1-model-routing
- Architecture Decision Records
