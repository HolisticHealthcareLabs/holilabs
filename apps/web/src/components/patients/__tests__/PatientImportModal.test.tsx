/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

const { PatientImportModal } = require('../PatientImportModal');

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

describe('PatientImportModal', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders null when isOpen is false', () => {
    const { container } = render(<PatientImportModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Import Patients from CSV" heading when open', () => {
    render(<PatientImportModal {...defaultProps} />);
    expect(screen.getByText('Import Patients from CSV')).toBeInTheDocument();
  });

  it('shows "Download CSV Template" button', () => {
    render(<PatientImportModal {...defaultProps} />);
    expect(screen.getByText('Download CSV Template')).toBeInTheDocument();
  });
});
