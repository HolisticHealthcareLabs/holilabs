/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalSearch } from '../GlobalSearch';

describe('GlobalSearch', () => {
  it('renders the search trigger button', () => {
    render(<GlobalSearch />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows Search patients text', () => {
    render(<GlobalSearch />);
    expect(screen.getByText('Search patients...')).toBeInTheDocument();
  });

  it('opens search panel on click and shows search input', () => {
    render(<GlobalSearch />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByPlaceholderText(/Search by name/i)).toBeInTheDocument();
  });
});
