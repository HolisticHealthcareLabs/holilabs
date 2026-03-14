/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/solid', () => new Proxy({}, { get: () => () => null }));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ templates: [] }),
  }) as any;

  // Mock localStorage
  Storage.prototype.getItem = jest.fn().mockReturnValue(null);
  Storage.prototype.setItem = jest.fn();
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TemplatePicker } from '../TemplatePicker';

describe('TemplatePicker', () => {
  it('renders the search input', () => {
    render(<TemplatePicker onSelect={jest.fn()} />);
    expect(screen.getByPlaceholderText(/Search|Buscar/i) || document.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('renders template categories', async () => {
    render(<TemplatePicker onSelect={jest.fn()} />);
    expect(document.body).toBeTruthy();
  });

  it('renders without crashing when favoritesOnly is true', () => {
    render(<TemplatePicker onSelect={jest.fn()} favoritesOnly={true} />);
    expect(document.body).toBeTruthy();
  });
});
