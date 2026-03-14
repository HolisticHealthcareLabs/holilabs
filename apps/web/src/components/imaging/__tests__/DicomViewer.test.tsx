/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ url: 'https://example.com/study.dcm' }),
  } as any);
});

import { DicomViewer } from '../DicomViewer';

describe('DicomViewer', () => {
  it('renders patient name in header', () => {
    render(<DicomViewer studyId="study-1" patientName="John Smith" modality="CT" />);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders tool buttons in the toolbar', () => {
    render(<DicomViewer studyId="study-1" patientName="Test" modality="CT" />);
    expect(screen.getByTitle('Pan (drag)')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom (drag up/down)')).toBeInTheDocument();
  });

  it('shows close button when onClose provided', () => {
    const onClose = jest.fn();
    render(<DicomViewer studyId="study-1" onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
