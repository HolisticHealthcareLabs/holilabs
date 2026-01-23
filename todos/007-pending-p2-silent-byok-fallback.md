---
status: pending
priority: p2
issue_id: "007"
tags: [data-integrity, code-review, important]
dependencies: []
---

# Silent BYOK Fallback Without User Notification

## Problem Statement

When a user's BYOK (Bring Your Own Key) fails decryption or is invalid, the system silently falls back to the system provider. This is problematic because:

1. User expects their key to be used for privacy/cost reasons
2. No notification that fallback occurred
3. May violate user's data handling expectations
4. Could result in unexpected charges on system account

## Findings

From Data Integrity Guardian review:
- `factory.ts` catches decryption errors and falls through
- Only logs at error level, no user notification
- User has no way to know their key wasn't used
- Could be billing/compliance surprise

## Proposed Solutions

### Option 1: Fail-Fast with User Error (Recommended)
**Pros:** Clear feedback, user can fix, no surprises
**Cons:** May cause more support requests
**Effort:** Small
**Risk:** Low

### Option 2: Fallback with Notification
**Pros:** Service continues, user informed
**Cons:** User may miss notification, async complexity
**Effort:** Medium
**Risk:** Low

### Option 3: Admin Alert Only
**Pros:** Ops can investigate, service continues
**Cons:** User still surprised, delayed resolution
**Effort:** Small
**Risk:** Medium

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/factory.ts`

**Components:** AI provider factory, BYOK flow

## Acceptance Criteria

- [ ] BYOK failure returns error to user
- [ ] Clear error message explains what happened
- [ ] User can choose to use system provider explicitly
- [ ] Logging captures failure (without key content)
- [ ] Tests cover BYOK failure scenarios

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | UX and compliance issue |

## Resources

- PR: feature/p1-model-routing
- BYOK Implementation Patterns
