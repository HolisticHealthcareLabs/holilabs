/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const EPrescribingDrawer = require('../EPrescribingDrawer').default;

const mockMedications = [
  { id: 'm1', name: 'Metformin', dose: '500mg', frequency: 'Twice daily' },
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  currentMedications: mockMedications,
  patientId: 'p1',
  clinicianId: 'dr1',
};

describe('EPrescribingDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(<EPrescribingDrawer {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders drawer heading when open', () => {
    render(<EPrescribingDrawer {...defaultProps} />);
    expect(screen.getByText('Gestión Rápida de Recetas')).toBeInTheDocument();
  });

  it('shows current medications list', () => {
    render(<EPrescribingDrawer {...defaultProps} />);
    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText(/500mg/)).toBeInTheDocument();
  });
});
