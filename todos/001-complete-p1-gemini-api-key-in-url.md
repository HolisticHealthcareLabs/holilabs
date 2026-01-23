---
status: complete
priority: p1
issue_id: "001"
tags: [security, code-review, critical]
dependencies: []
---

# Gemini API Key Exposed in URL Query Parameter

## Problem Statement

The Gemini API key is being passed as a URL query parameter instead of in the request headers. This is a critical security vulnerability because:

1. API keys in URLs are logged by web servers, proxies, and CDNs
2. Keys appear in browser history and can be leaked via Referer headers
3. This violates security best practices for credential handling
4. Potential HIPAA/SOC2 compliance violation

**Location:** `apps/web/src/lib/ai/chat.ts:274-276`

## Findings

From Security Sentinel review:
- The Gemini provider constructs URLs with the API key as a query parameter
- This pattern exposes the key in logs across the entire request chain
- Standard practice is to use `Authorization: Bearer <key>` header

## Proposed Solutions

### Option 1: Move API Key to Authorization Header (Recommended) ✅ IMPLEMENTED
**Pros:** Industry standard, no URL logging risk, works with all proxies
**Cons:** Requires verifying Gemini API supports this auth method
**Effort:** Small
**Risk:** Low

### Option 2: Use Gemini SDK
**Pros:** SDK handles auth properly, type safety
**Cons:** Additional dependency, may require refactor
**Effort:** Medium
**Risk:** Low

### Option 3: Server-side Proxy
**Pros:** Key never leaves server, additional security layer
**Cons:** More infrastructure, latency increase
**Effort:** Large
**Risk:** Medium

## Recommended Action

✅ **IMPLEMENTED Option 1** - Moved Gemini API key from URL query parameter to `x-goog-api-key` header.

## Technical Details

**Affected Files:**
- `apps/web/src/lib/ai/chat.ts` ✅ FIXED

**Components:** Gemini AI provider integration

## Acceptance Criteria

- [x] API key is NOT present in any URL
- [x] API key is passed via `x-goog-api-key` header
- [x] Existing tests pass (193/193)
- [ ] Manual verification: no key in network tab URLs (needs human verification)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Finding documented from code review | Critical security issue, blocks merge |
| 2026-01-22 | Remediated - moved API key to x-goog-api-key header | Gemini API accepts header auth per docs |

## Resources

- PR: feature/p1-model-routing
- [Gemini API Auth Docs](https://ai.google.dev/gemini-api/docs/api-key)
- OWASP: API Key Best Practices
