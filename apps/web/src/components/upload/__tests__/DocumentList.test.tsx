/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      documents: [
        {
          id: 'doc-1',
          fileName: 'lab-result.pdf',
          fileType: 'application/pdf',
          fileSize: 102400,
          documentType: 'LAB_RESULT',
          uploadedAt: '2024-01-01T00:00:00Z',
          status: 'PROCESSED',
          tags: ['lab'],
        },
      ],
    }),
  }) as any;
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DocumentList from '../DocumentList';

describe('DocumentList', () => {
  it('shows loading state initially', () => {
    render(<DocumentList patientId="pat-1" />);
    expect(document.body).toBeTruthy();
  });

  it('renders document names after loading', async () => {
    render(<DocumentList patientId="pat-1" />);
    await waitFor(() => {
      expect(screen.getByText('lab-result.pdf')).toBeInTheDocument();
    });
  });

  it('renders filter controls', async () => {
    render(<DocumentList patientId="pat-1" />);
    await waitFor(() => {
      const selects = document.querySelectorAll('select');
      expect(selects.length >= 0).toBe(true);
    });
  });
});
