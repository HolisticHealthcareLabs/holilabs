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
  Upload: (props: any) => <div data-testid="upload-icon" {...props} />,
  FileText: (props: any) => <div data-testid="file-icon" {...props} />,
  X: (props: any) => <div data-testid="x-icon" {...props} />,
  CheckCircle2: (props: any) => <div data-testid="check-icon" {...props} />,
  AlertCircle: (props: any) => <div data-testid="alert-icon" {...props} />,
}));

const { CredentialUpload } = require('../CredentialUpload');

describe('CredentialUpload', () => {
  const defaultProps = {
    onUploadComplete: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders without crashing', () => {
    render(<CredentialUpload {...defaultProps} />);
    expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
  });

  it('shows drop zone instructions', () => {
    render(<CredentialUpload {...defaultProps} />);
    expect(screen.getByText(/Drop your credential document here/)).toBeInTheDocument();
  });

  it('shows supported file types', () => {
    render(<CredentialUpload {...defaultProps} />);
    expect(screen.getByText(/Supports: JPG, PNG, WEBP, PDF/)).toBeInTheDocument();
  });
});
