/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryDraft } from '../SummaryDraft';

const mockDraft = {
  chiefComplaint: { text: 'Headache', approved: false, confidence: 0.9 },
  assessment: { text: 'Tension headache', differentials: [], approved: false, confidence: 0.8 },
  plan: { medications: [], labs: [], imaging: [], referrals: [], instructions: 'Rest', approved: false, confidence: 0.7 },
  prevention: { screeningsAddressed: [], nextScreenings: [], approved: false, confidence: 0.6 },
  followUp: { interval: '2 weeks', reason: 'Follow up', approved: false, confidence: 0.85 },
};

describe('SummaryDraft', () => {
  it('renders all sections with labels', () => {
    render(<SummaryDraft draft={mockDraft as any} encounterId="enc-1" />);
    expect(screen.getByText('Chief Complaint')).toBeInTheDocument();
    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Follow-Up')).toBeInTheDocument();
  });

  it('calls onApproveSection when Approve button is clicked', () => {
    const onApproveSection = jest.fn();
    render(<SummaryDraft draft={mockDraft as any} encounterId="enc-1" onApproveSection={onApproveSection} />);
    const approveButtons = screen.getAllByText('Approve');
    fireEvent.click(approveButtons[0]);
    expect(onApproveSection).toHaveBeenCalledWith('chiefComplaint');
  });

  it('shows Approve All button when not all sections are approved', () => {
    render(<SummaryDraft draft={mockDraft as any} encounterId="enc-1" onApproveAll={jest.fn()} />);
    expect(screen.getByText('Approve All & Sign')).toBeInTheDocument();
  });
});
