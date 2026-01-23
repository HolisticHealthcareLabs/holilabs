---
status: pending
priority: p2
issue_id: "006"
tags: [performance, reliability, code-review, important]
dependencies: []
---

# Missing Timeouts and Retry Logic

## Problem Statement

The AI providers lack consistent timeout and retry configurations:

1. Some providers have timeout but no retry
2. Some have neither timeout nor retry
3. No circuit breaker for failing providers
4. No exponential backoff on retries

This causes:
- Request hangs when providers are slow
- Cascading failures from one bad provider
- Poor user experience during outages

## Findings

From Performance Oracle review:
- `OllamaProvider`: Has timeout, no retry
- `VLLMProvider`: Has timeout, no retry
- `TogetherProvider`: Has timeout, no retry
- No circuit breaker pattern
- Availability checks run on every request

## Proposed Solutions

### Option 1: Centralized Retry/Timeout Config (Recommended)
**Pros:** Consistent behavior, easy to tune
**Cons:** May not suit all providers
**Effort:** Medium
**Risk:** Low

### Option 2: Circuit Breaker Pattern
**Pros:** Prevents cascade failures, graceful degradation
**Cons:** Complex state management, needs monitoring
**Effort:** Large
**Risk:** Medium

### Option 3: Provider-Specific Configs
**Pros:** Optimized per provider, flexible
**Cons:** Inconsistent, harder to maintain
**Effort:** Medium
**Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/providers/ollama-provider.ts`
- `apps/web/src/lib/ai/providers/vllm-provider.ts`
- `apps/web/src/lib/ai/providers/together-provider.ts`

**Components:** All AI providers

## Acceptance Criteria

- [ ] All providers have configurable timeout
- [ ] Retry with exponential backoff exists
- [ ] Circuit breaker for repeated failures
- [ ] Availability cached (not checked per-request)
- [ ] Tests cover timeout/retry scenarios

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | Reliability improvement |

## Resources

- PR: feature/p1-model-routing
- Circuit Breaker Pattern (Fowler)
- Exponential Backoff Best Practices
