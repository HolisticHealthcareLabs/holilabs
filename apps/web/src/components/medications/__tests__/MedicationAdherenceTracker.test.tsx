/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const MedicationAdherenceTracker = require('../MedicationAdherenceTracker').default;

describe('MedicationAdherenceTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
      writable: true,
    });
  });

  it('renders Today\'s Medications heading', () => {
    render(<MedicationAdherenceTracker />);
    expect(screen.getByText("Today's Medications")).toBeInTheDocument();
  });

  it('renders preset medication names', () => {
    render(<MedicationAdherenceTracker />);
    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText('Lisinopril')).toBeInTheDocument();
    expect(screen.getByText('Atorvastatin')).toBeInTheDocument();
  });

  it('shows streak indicator', () => {
    render(<MedicationAdherenceTracker />);
    expect(screen.getAllByText(/day streak/i).length).toBeGreaterThan(0);
  });
});
