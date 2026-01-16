// Root middleware shim
//
// Next.js reliably discovers middleware when it lives at the project root
// (`apps/web/middleware.ts`). We keep our real implementation in `src/middleware.ts`
// so imports stay consistent with the rest of the codebase.
//
// This shim ensures middleware is actually compiled and applied in dev/prod,
// preventing regressions like `/en/sign-in` 404s and missing security headers.

export { middleware, config } from './src/middleware';


