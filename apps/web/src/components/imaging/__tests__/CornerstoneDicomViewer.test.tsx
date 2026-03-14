/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

// Prevent real fetch from hanging
global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) } as any);

// Mock cornerstone-init to throw so the dynamic cornerstonejs imports are never reached
jest.mock('@/lib/imaging/cornerstone-init', () => {
  throw new Error('Cornerstone not available in test environment');
});

import { CornerstoneDicomViewer } from '../CornerstoneDicomViewer';

describe('CornerstoneDicomViewer', () => {
  it('renders patient name in the header', () => {
    render(<CornerstoneDicomViewer studyId="study-1" patientName="Jane Doe" modality="CT" />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders modality and body part information', () => {
    render(<CornerstoneDicomViewer studyId="study-1" patientName="Jane Doe" modality="MRI" bodyPart="Brain" />);
    expect(screen.getByText('MRI')).toBeInTheDocument();
    expect(screen.getByText('Brain')).toBeInTheDocument();
  });

  it('shows error state after cornerstone fails to initialize', async () => {
    render(<CornerstoneDicomViewer studyId="study-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Error Loading Images/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
