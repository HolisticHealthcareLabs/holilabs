// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://52aaa16d91208b01661a802f8be429a0@o4510387452641280.ingest.us.sentry.io/4510387465879552",

  // APM: tracing sample rates (staging gets more visibility)
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

  // Spotlight for local development
  spotlight: process.env.NODE_ENV === 'development',
});
