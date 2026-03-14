/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en' }) }));
jest.mock('@/components/landing/copy', () => ({
  getLandingCopy: () => ({
    workflow: {
      progressLabel: 'Clinical Check Progress',
      progressDetail: '{progress}% complete',
      smartContext: 'Smart Context',
      statusDone: 'Done',
      statusActive: 'Active',
      statusQueued: 'Queued',
      contextBody: 'Retrieving patient history...',
      ehrReady: 'EHR connected',
      verify: 'Safety Verification',
      expiresIn: 'Expires in {seconds}s',
      verifyBody: 'Checking interactions...',
      verifyHint: 'LGPD compliant',
      confirm: 'Confirm',
      document: 'Auto-Documentation',
      documentBody: 'Generating SOAP note...',
      toast: 'Note generated',
      toastMobile: 'Done',
    },
  }),
}));

// Stub IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

import { VerificationWorkflow } from '../VerificationWorkflow';

describe('VerificationWorkflow', () => {
  it('renders without crashing', () => {
    const { container } = render(<VerificationWorkflow />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the progress label text', () => {
    render(<VerificationWorkflow />);
    expect(screen.getByText('Clinical Check Progress')).toBeInTheDocument();
  });

  it('renders step titles from copy', () => {
    render(<VerificationWorkflow />);
    expect(screen.getByText('Smart Context')).toBeInTheDocument();
    expect(screen.getByText('Safety Verification')).toBeInTheDocument();
  });
});
