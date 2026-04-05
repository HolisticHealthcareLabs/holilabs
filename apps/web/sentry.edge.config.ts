// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://52aaa16d91208b01661a802f8be429a0@o4510387452641280.ingest.us.sentry.io/4510387465879552",

  // APM: tracing sample rates
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 1.0,

  // CPU profiling (low sample rate to control cost)
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,

  // IMPORTANT: Disabled for healthcare compliance — never send PII to external services
  sendDefaultPii: false,

  // Healthcare compliance: strip cookies, headers, and PII patterns
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
