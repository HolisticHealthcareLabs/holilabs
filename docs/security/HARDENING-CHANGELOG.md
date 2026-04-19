# Hardening Changelog (Agent 6)

## Routes Migrated
- `api/admin/invitations/route.ts`: Hand-rolled `isAdmin()` and `createPublicRoute` migrated to `createProtectedRoute({ roles: ['ADMIN'] })`
- `api/telemetry/stream/route.ts`: `createPublicRoute` migrated to `createProtectedRoute` and redundant `auth()` call removed.
- `api/jobs/aggregate-corrections/route.ts`: Manual authorization check logic replaced with `verifyInternalToken(token)`.

## Routes Skipped
- CDS Hooks discovery endpoints (spec requires public access)
- Webhook receivers that verify signatures in-handler (Stripe, Deepgram, etc.)
- Patient OTP/auth endpoints (pre-authentication by definition)
- Health check / readiness probes

## Sanitization Utility
- **Added**: `sanitizeAIOutput()` utility for Claude SOAP notes outputs.
- **Strips**: HTML tags (`<script>`, `<div>`), `javascript:` URIs, `data:` URIs, event handler attributes.
- **Preserves**: Markdown structure, line breaks, clinical abbreviations, and special characters.

## Remaining Known Gaps
- End-to-end `encryptPHIWithVersion` rollout for all route inputs/outputs.
- More comprehensive CSRF protection configurations.
- Broad implementation of patient IDOR protection across other sub-services.
