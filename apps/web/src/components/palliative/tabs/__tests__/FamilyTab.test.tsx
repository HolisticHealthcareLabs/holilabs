/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const FamilyTab = require('../FamilyTab').default;

const mockFamilyMembers = [
  {
    id: 'fm1',
    familyMemberName: 'María García',
    relationship: 'Esposa',
    email: 'maria@example.com',
    phone: '+1234567890',
    isPrimaryContact: true,
    canMakeMedicalDecisions: true,
    portalAccess: false,
    createdAt: '2026-03-01T00:00:00Z',
  },
];

describe('FamilyTab', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders header with member count', () => {
    render(<FamilyTab familyMembers={mockFamilyMembers} patientId="p1" />);
    expect(screen.getByText(/1 miembros/)).toBeInTheDocument();
  });

  it('shows empty state when no family members', () => {
    render(<FamilyTab familyMembers={[]} patientId="p1" />);
    expect(screen.getByText('Sin familiares registrados')).toBeInTheDocument();
  });

  it('renders primary contact badge', () => {
    render(<FamilyTab familyMembers={mockFamilyMembers} patientId="p1" />);
    expect(screen.getByText('Contacto Principal')).toBeInTheDocument();
  });
});
