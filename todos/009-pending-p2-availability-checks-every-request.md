---
status: pending
priority: p2
issue_id: "009"
tags: [performance, code-review, important]
dependencies: []
---

# Availability Checks on Every Request

## Problem Statement

The task router runs availability checks against local providers (Ollama, vLLM) on every routing request. This causes:

1. Unnecessary latency (network round-trip per request)
2. Load on local provider health endpoints
3. Inefficient when provider status rarely changes
4. Timeout blocking when provider is down

## Findings

From Performance Oracle review:
- `checkAvailability()` called in routing path
- No caching of availability status
- Each check is a network request
- Could add 100-500ms per request

## Proposed Solutions

### Option 1: Cached Availability with TTL (Recommended)
**Pros:** Reduces checks to 1 per interval, simple
**Cons:** May use down provider briefly
**Effort:** Small
**Risk:** Low

### Option 2: Background Health Check
**Pros:** Never blocks request path, always current
**Cons:** More complex, needs timer management
**Effort:** Medium
**Risk:** Low

### Option 3: Lazy Check on Failure
**Pros:** Zero overhead when working, checks on error
**Cons:** First failure still hits user
**Effort:** Small
**Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/providers/task-router.ts`
- `apps/web/src/lib/ai/providers/ollama-provider.ts`
- `apps/web/src/lib/ai/providers/vllm-provider.ts`

**Components:** Task router, local providers

## Acceptance Criteria

- [ ] Availability cached for configurable TTL
- [ ] First request still works (lazy init)
- [ ] Cache invalidated on provider error
- [ ] Metrics for cache hit/miss rate
- [ ] Tests verify caching behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | Performance optimization |

## Resources

- PR: feature/p1-model-routing
- Caching Strategies for Service Health
