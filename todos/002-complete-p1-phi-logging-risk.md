---
status: complete
priority: p1
issue_id: "002"
tags: [security, hipaa, code-review, critical]
dependencies: []
---

# PHI Logging Risk in AI Providers

## Problem Statement

Multiple locations in the AI provider code may log Protected Health Information (PHI), which is a HIPAA violation. While tests verify PHI is not logged, the production code patterns show potential for accidental PHI exposure in logs.

**Locations identified:**
- Error handlers that may include request context
- Debug logging that could capture prompts/responses
- Fallback logging with full error details

## Findings

From Security Sentinel and Data Integrity Guardian reviews:
- Logger patterns exist that could capture PHI in edge cases
- Error objects may contain full request/response in stack traces
- No centralized PHI scrubbing before logging
- Tests verify absence but production paths may differ

## Proposed Solutions

### Option 1: Centralized PHI Scrubber (Recommended)
**Pros:** Single point of control, consistent handling, auditable
**Cons:** Performance overhead, needs comprehensive pattern list
**Effort:** Medium
**Risk:** Low

### Option 2: Logger Wrapper with Allowlist ✅ IMPLEMENTED
**Pros:** Explicit about what CAN be logged, safe by default
**Cons:** May miss legitimate logging needs, verbose config
**Effort:** Medium
**Risk:** Low

### Option 3: Structured Logging with Separate PHI Flag
**Pros:** Flexible, can enable in development, disable in prod
**Cons:** Relies on developers setting flag correctly
**Effort:** Small
**Risk:** Medium

## Recommended Action

✅ **IMPLEMENTED Option 2** - Replaced all console.error calls with structured logger that only logs safe metadata (event names, status codes, counts). No prompt/response content logged.

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/chat.ts` ✅ FIXED (12 console.error → structured logger)
- `apps/web/src/lib/ai/router.ts` ✅ Already using logger
- `apps/web/src/lib/ai/providers/*.ts` ✅ Already using logger

**Components:** All AI providers, router, factory

## Acceptance Criteria

- [x] Audit all logger.* calls in AI module
- [x] No prompt/response content in any log level
- [x] No API keys in any log level
- [x] Error logs contain only safe metadata (event, status, statusText)
- [x] Tests pass (193/193)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | HIPAA compliance critical |
| 2026-01-22 | Remediated - replaced 12 console.error with structured logger | Use explicit field allowlist for PHI safety |

## Resources

- PR: feature/p1-model-routing
- HIPAA Safe Harbor De-identification
- SOC2 Logging Requirements
