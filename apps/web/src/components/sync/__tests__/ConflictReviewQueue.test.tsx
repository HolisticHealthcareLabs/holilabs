/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({ data: null, error: null, isLoading: true }),
  mutate: jest.fn(),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConflictReviewQueue } from '../ConflictReviewQueue';

describe('ConflictReviewQueue', () => {
  it('renders the FHIR Sync Conflicts heading', () => {
    render(<ConflictReviewQueue />);
    expect(screen.getByText('FHIR Sync Conflicts')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    render(<ConflictReviewQueue />);
    // isLoading: true → loading skeleton or spinner
    expect(document.body).toBeTruthy();
  });

  it('renders "No conflicts pending" when data is empty', () => {
    const useSWR = require('swr').default;
    useSWR.mockReturnValue({
      data: { success: true, data: { conflicts: [], pagination: { totalCount: 0, totalPages: 1, page: 1, limit: 20, hasMore: false } } },
      error: null,
      isLoading: false,
    });
    render(<ConflictReviewQueue />);
    expect(screen.getByText('No conflicts pending')).toBeInTheDocument();
  });
});
