# Tools & Integrations

## Version Control
- **Git:** Local repository at `.git/`
- **Conventional Commits:** Enforced in pre-commit gate
- **Pre-commit Hooks:** Check tests, secrets, dead code

## Development
- **Package Manager:** pnpm
- **Testing:** Jest (with custom mocking rules)
- **Type Safety:** TypeScript (inferred)

## Deployment & CI
- **CI Pipeline:** GitHub Actions (`.github/workflows/`)
- **Test Gate:** Must pass before commit
- **Circuit Breaker:** Halts after 3 consecutive failures

## Documentation
- **Environment Files:** `.env`, `.env.local`, `.env.production.secrets.template`
- **Rules & Governance:** `.cursor/rules/` (persona profiles)
- **Project Docs:** `.do/` directory (Digital Ocean integration?)

## Connected Services

(To be discovered)

- Email/Calendar: (not yet connected)
- Project Management: (not yet connected)
- Slack/Chat: (not yet connected)
- CRM/Billing: (not yet connected)

