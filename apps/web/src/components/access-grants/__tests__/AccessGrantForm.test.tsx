/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }), usePathname: () => '/test', useSearchParams: () => new URLSearchParams() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', email: 'dr@test.com', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (key: string) => key }) }));

const AccessGrantForm = require('../AccessGrantForm').default;

describe('AccessGrantForm', () => {
  it('renders without crashing', () => {
    render(<AccessGrantForm patientId="p1" />);
    expect(screen.getByText('Destinatario')).toBeInTheDocument();
  });

  it('shows resource sharing section', () => {
    render(<AccessGrantForm patientId="p1" />);
    expect(screen.getByText('Recurso a Compartir')).toBeInTheDocument();
  });

  it('shows permissions section with checkboxes', () => {
    render(<AccessGrantForm patientId="p1" />);
    expect(screen.getByText('Permisos')).toBeInTheDocument();
    expect(screen.getByText('Ver')).toBeInTheDocument();
    expect(screen.getByText('Descargar')).toBeInTheDocument();
    expect(screen.getByText('Compartir')).toBeInTheDocument();
  });
});
