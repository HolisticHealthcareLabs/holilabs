/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }: any) => React.createElement('div', { 'data-testid': 'markdown' }, children) }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import LegalDocumentViewer from '../LegalDocumentViewer';

describe('LegalDocumentViewer', () => {
  it('shows loading skeleton initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<LegalDocumentViewer documentPath="/legal/terms.md" title="Privacy Policy" />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, text: async () => '' } as any);
    render(<LegalDocumentViewer documentPath="/legal/terms.md" title="Privacy Policy" />);
    await waitFor(() => {
      expect(screen.getByText(/Error Loading Document/i)).toBeInTheDocument();
    });
  });

  it('renders document title heading and markdown content after fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '## Introduction\n\nThis is the document content.',
    } as any);
    render(<LegalDocumentViewer documentPath="/legal/terms.md" title="Privacy Policy" />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
      expect(screen.getByTestId('markdown')).toBeInTheDocument();
    });
  });
});
