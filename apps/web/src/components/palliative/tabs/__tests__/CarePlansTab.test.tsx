/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const CarePlansTab = require('../CarePlansTab').default;

const mockCarePlans = [
  {
    id: 'cp1',
    title: 'Pain Management Plan',
    category: 'PAIN_MANAGEMENT',
    priority: 'HIGH',
    status: 'ACTIVE',
    goals: ['Reduce pain to 3/10'],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

describe('CarePlansTab', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders empty state when no care plans', () => {
    render(<CarePlansTab carePlans={[]} patientId="p1" />);
    expect(screen.getByText('Sin planes de atención')).toBeInTheDocument();
  });

  it('renders care plan title when plans provided', () => {
    render(<CarePlansTab carePlans={mockCarePlans} patientId="p1" />);
    expect(screen.getByText('Pain Management Plan')).toBeInTheDocument();
  });

  it('shows summary statistics when plans exist', () => {
    render(<CarePlansTab carePlans={mockCarePlans} patientId="p1" />);
    expect(screen.getByText('Total de Planes')).toBeInTheDocument();
  });
});
