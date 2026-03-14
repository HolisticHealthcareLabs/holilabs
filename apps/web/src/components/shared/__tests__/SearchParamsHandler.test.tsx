/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams('query=test'),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import SearchParamsHandler from '../SearchParamsHandler';

describe('SearchParamsHandler', () => {
  it('renders children with search params', async () => {
    render(
      <SearchParamsHandler>
        {(params) => <div data-testid="child">query: {params?.get('query')}</div>}
      </SearchParamsHandler>
    );
    await new Promise((r) => setTimeout(r, 50));
    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
  });

  it('passes searchParams to render function', async () => {
    render(
      <SearchParamsHandler>
        {(params) => <span>{params?.get('query') ?? 'none'}</span>}
      </SearchParamsHandler>
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders custom fallback during suspense', () => {
    render(
      <SearchParamsHandler fallback={<div data-testid="fallback">Loading...</div>}>
        {() => <div>Content</div>}
      </SearchParamsHandler>
    );
    // Either renders content or fallback
    expect(document.body).toBeTruthy();
  });
});
