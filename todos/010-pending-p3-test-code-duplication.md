---
status: pending
priority: p3
issue_id: "010"
tags: [quality, testing, code-review, enhancement]
dependencies: []
---

# Test Code Duplication (~15%)

## Problem Statement

The test files have significant code duplication:

1. Similar mock setup patterns repeated across files
2. Duplicate PHI logging verification tests
3. Similar error handling test patterns
4. Repeated beforeEach/afterAll cleanup code

This causes:
- Maintenance burden when patterns change
- Inconsistent test quality across files
- Harder to ensure comprehensive coverage

## Findings

From Pattern Recognition Specialist review:
- ~15% duplication across test files
- Similar mock patterns in all provider tests
- PHI logging tests nearly identical
- beforeEach cleanup duplicated everywhere

## Proposed Solutions

### Option 1: Shared Test Utilities (Recommended)
**Pros:** DRY, consistent, easy to update
**Cons:** May make tests harder to read standalone
**Effort:** Medium
**Risk:** Low

### Option 2: Jest Setup Files
**Pros:** Automatic, no import needed
**Cons:** Less explicit, magic behavior
**Effort:** Small
**Risk:** Low

### Option 3: Test Factories/Builders
**Pros:** Flexible, self-documenting
**Cons:** Over-engineering for tests
**Effort:** Medium
**Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/__tests__/*.test.ts`
- `apps/web/src/lib/ai/__tests__/providers/*.test.ts`

**Components:** Test files

## Acceptance Criteria

- [ ] Common mock patterns extracted
- [ ] PHI logging tests use shared helper
- [ ] beforeEach patterns standardized
- [ ] All tests still pass
- [ ] Test readability maintained

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | Code quality improvement |

## Resources

- PR: feature/p1-model-routing
- Jest Best Practices
- DRY Testing Patterns
