/**
 * next-intl root config shim
 *
 * Some tooling/code paths still expect `apps/web/i18n.js` to exist.
 * Our app-router config lives in `apps/web/src/i18n.ts`, but requiring a `.ts`
 * file from plain Node (CommonJS) is brittle. Instead, keep a small JS version
 * here that matches the runtime behavior.
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });
exports.localeFlags = exports.localeLabels = exports.defaultLocale = exports.locales = void 0;

const { getRequestConfig } = require('next-intl/server');
const { notFound } = require('next/navigation');

// Define supported locales (English primary, Spanish/Portuguese for LATAM)
exports.locales = ['en', 'es', 'pt'];
exports.defaultLocale = 'en';

exports.localeLabels = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

exports.localeFlags = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
};

exports.default = getRequestConfig(async ({ locale }) => {
  if (!exports.locales.includes(locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});


