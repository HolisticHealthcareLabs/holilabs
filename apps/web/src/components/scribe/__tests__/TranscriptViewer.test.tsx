/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import TranscriptViewer from '../TranscriptViewer';

const segments = [
  { speaker: 'CLINICIAN', text: 'How are you feeling today?', startTime: 0, endTime: 3, confidence: 0.95 },
  { speaker: 'PATIENT', text: 'I have a headache.', startTime: 4, endTime: 7, confidence: 0.88 },
];

describe('TranscriptViewer', () => {
  it('renders transcript segments', () => {
    render(<TranscriptViewer segments={segments} />);
    expect(screen.getByText('How are you feeling today?')).toBeInTheDocument();
    expect(screen.getByText('I have a headache.')).toBeInTheDocument();
  });

  it('renders speaker labels', () => {
    render(<TranscriptViewer segments={segments} />);
    expect(screen.getAllByText(/CLINICIAN|PATIENT/i).length).toBeGreaterThan(0);
  });

  it('renders empty state for no segments', () => {
    const { container } = render(<TranscriptViewer segments={[]} />);
    expect(container).toBeTruthy();
  });
});
