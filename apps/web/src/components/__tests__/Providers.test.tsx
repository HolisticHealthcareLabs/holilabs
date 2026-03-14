/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }),
  SessionProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en', t: (k: string) => k }),
  LanguageProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));
jest.mock('@/providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));

import { Providers } from '../Providers';

beforeEach(() => jest.clearAllMocks());

describe('Providers', () => {
  it('renders children inside provider tree', () => {
    render(<Providers><div data-testid="child">hello</div></Providers>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('wraps multiple children correctly', () => {
    render(
      <Providers>
        <span data-testid="a">A</span>
        <span data-testid="b">B</span>
      </Providers>
    );
    expect(screen.getByTestId('a')).toBeInTheDocument();
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });

  it('does not expose SessionProvider errors to children boundary', () => {
    expect(() =>
      render(<Providers><div>safe</div></Providers>)
    ).not.toThrow();
  });
});
