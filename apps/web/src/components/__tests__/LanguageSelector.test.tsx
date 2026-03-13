/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'en',
    setLocale: jest.fn(),
    t: (key: string) => key,
  }),
}));

jest.mock('@/i18n/shared', () => ({
  locales: ['en', 'es', 'pt'],
  localeLabels: { en: 'English', es: 'Español', pt: 'Português' },
  localeFlags: { en: '🇺🇸', es: '🇪🇸', pt: '🇧🇷' },
}));

// LanguageSelector imports from '../i18n' which resolves to src/i18n.ts.
// That file imports from next-intl/server (ESM-only in Node), so we mock it here.
jest.mock('../../i18n', () => ({
  locales: ['en', 'es', 'pt'],
  localeLabels: { en: 'English', es: 'Español', pt: 'Português' },
  localeFlags: { en: '🇺🇸', es: '🇪🇸', pt: '🇧🇷' },
  defaultLocale: 'en',
}));

const LanguageSelector = require('../LanguageSelector').default;

describe('LanguageSelector', () => {
  it('renders the trigger button', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /select language/i })).toBeInTheDocument();
  });

  it('shows current locale flag in non-compact mode', () => {
    render(<LanguageSelector />);
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('opens dropdown and shows all language options when clicked', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /select language/i }));
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('Português')).toBeInTheDocument();
  });

  it('renders compact variant without locale label', () => {
    render(<LanguageSelector compact={true} />);
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });
});
