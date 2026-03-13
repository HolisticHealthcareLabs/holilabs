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
jest.mock('@headlessui/react', () => ({
  Dialog: Object.assign(
    ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
    {
      Panel: ({ children, className }: any) => <div className={className}>{children}</div>,
      Title: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
      Description: ({ children, className }: any) => <p className={className}>{children}</p>,
    }
  ),
}));
jest.mock('@prisma/client', () => ({
  AccessReason: {},
}));

const { AccessReasonModal } = require('../AccessReasonModal');

describe('AccessReasonModal', () => {
  const defaultProps = {
    isOpen: true,
    patientName: 'Maria Silva',
    onSelectReason: jest.fn(),
    onCancel: jest.fn(),
    autoSelectAfter: 9999,
  };

  it('renders when open', () => {
    render(<AccessReasonModal {...defaultProps} />);
    expect(screen.getByText('Motivo de Acesso aos Dados do Paciente')).toBeInTheDocument();
  });

  it('displays patient name', () => {
    render(<AccessReasonModal {...defaultProps} />);
    expect(screen.getByText(/Maria Silva/)).toBeInTheDocument();
  });

  it('shows reason options', () => {
    render(<AccessReasonModal {...defaultProps} />);
    expect(screen.getByText('Atendimento Direto ao Paciente')).toBeInTheDocument();
    expect(screen.getByText('Acesso Emergencial')).toBeInTheDocument();
  });
});
