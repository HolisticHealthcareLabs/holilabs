/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import ConsentAcceptanceFlow from '../ConsentAcceptanceFlow';

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ allAccepted: false }),
  } as any);
});

describe('ConsentAcceptanceFlow', () => {
  it('renders consent acceptance modal', async () => {
    render(<ConsentAcceptanceFlow />);
    expect(screen.getByText(/Consent Acceptance Required/i)).toBeInTheDocument();
  });

  it('shows step 1 of 4 and progress bar', () => {
    render(<ConsentAcceptanceFlow />);
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  it('Next button is disabled until document is accepted', () => {
    render(<ConsentAcceptanceFlow />);
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeDisabled();
    // Accept the current document
    fireEvent.click(screen.getByRole('checkbox'));
    expect(nextBtn).not.toBeDisabled();
  });
});
