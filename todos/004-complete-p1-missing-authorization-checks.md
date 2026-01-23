---
status: complete
priority: p1
issue_id: "004"
tags: [security, code-review, high]
dependencies: []
---

# Missing Authorization Checks in Provider Selection

## Problem Statement

The AI provider factory and router do not verify that users are authorized to use specific providers or tasks. This could allow:

1. Unauthorized access to premium providers
2. Bypassing task-based restrictions
3. Cost abuse via expensive model access
4. Compliance violations for restricted tasks

## Findings

From Security Sentinel review:
- `getProvider()` accepts userId but doesn't verify permissions
- No role-based access control for provider selection
- Task routing doesn't check user authorization
- BYOK keys are used without verifying ownership

## Proposed Solutions

### Option 1: Authorization Middleware (Recommended)
**Pros:** Centralized, consistent, auditable
**Cons:** Adds latency, needs permission model
**Effort:** Medium
**Risk:** Low

### Option 2: Provider-Level Permission Checks ✅ IMPLEMENTED (BYOK ownership)
**Pros:** Fine-grained control, fail-safe
**Cons:** Duplicated logic across providers
**Effort:** Medium
**Risk:** Low

### Option 3: Task-Based Authorization
**Pros:** Aligns with clinical workflow permissions
**Cons:** Complex mapping, may miss edge cases
**Effort:** Large
**Risk:** Medium

## Recommended Action

✅ **IMPLEMENTED Option 2 (BYOK ownership)** - Added explicit ownership verification for BYOK keys:
- Defense-in-depth check: `key.userId !== userId` throws error
- Explicit logging for ownership mismatch attempts
- Logging for BYOK fallback to system provider (when decryption fails)

Note: Full RBAC for provider/task authorization deferred to P2 (requires permission model design).

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/factory.ts` ✅ FIXED - Added BYOK ownership verification

**Components:** AI factory

## Acceptance Criteria

- [x] BYOK key ownership is verified (defense-in-depth)
- [x] Ownership mismatch attempts are logged
- [x] BYOK fallback to system provider is logged
- [x] Tests pass (193/193)
- [ ] Full RBAC authorization (deferred to P2)
- [ ] Task permissions checked (deferred to P2)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | Security-critical for multi-tenant |
| 2026-01-22 | Remediated - added BYOK ownership verification, fallback logging | Defense-in-depth: query already filters by userId, but explicit check adds safety |

## Resources

- PR: feature/p1-model-routing
- RBAC Best Practices
- SOC2 Access Control Requirements
