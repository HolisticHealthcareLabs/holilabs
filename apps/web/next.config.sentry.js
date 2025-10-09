/**
 * Sentry Next.js Configuration
 *
 * This file is loaded by next.config.js when Sentry is installed.
 *
 * To enable Sentry:
 * 1. Run: pnpm add @sentry/nextjs
 * 2. Run: npx @sentry/wizard@latest -i nextjs
 * 3. Add environment variables:
 *    SENTRY_DSN=https://...
 *    SENTRY_AUTH_TOKEN=... (for source maps upload)
 * 4. Uncomment the require() in next.config.js
 */

const { withSentryConfig } = require('@sentry/nextjs');

/**
 * Sentry webpack plugin options for source maps
 */
const sentryWebpackPluginOptions = {
  // Suppress Sentry CLI logs
  silent: true,

  // Organization and project from Sentry dashboard
  org: process.env.SENTRY_ORG || 'holi-labs',
  project: process.env.SENTRY_PROJECT || 'holi-labs-web',

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  enabled: process.env.NODE_ENV === 'production',

  // Hide source maps from public
  hideSourceMaps: true,

  // Disable source map generation in development
  disableLogger: true,
};

/**
 * Wrap Next.js config with Sentry
 */
module.exports = (nextConfig) => {
  return withSentryConfig(nextConfig, sentryWebpackPluginOptions);
};
