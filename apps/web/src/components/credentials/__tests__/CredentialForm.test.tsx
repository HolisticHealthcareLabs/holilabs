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
jest.mock('lucide-react', () => ({
  Save: (props: any) => <div data-testid="save-icon" {...props} />,
  X: (props: any) => <div data-testid="x-icon" {...props} />,
}));

const { CredentialForm } = require('../CredentialForm');

describe('CredentialForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders without crashing', () => {
    render(<CredentialForm {...defaultProps} />);
    expect(screen.getByText('Credential Details')).toBeInTheDocument();
  });

  it('shows credential type select', () => {
    render(<CredentialForm {...defaultProps} />);
    expect(screen.getByLabelText(/Credential Type/)).toBeInTheDocument();
  });

  it('shows save and cancel buttons', () => {
    render(<CredentialForm {...defaultProps} />);
    expect(screen.getByText('Save Credential')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
