/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import VersionDiffViewer from '../VersionDiffViewer';

const baseVersion = {
  id: 'v1',
  versionNumber: 1,
  subjective: 'Patient reports mild pain',
  objective: 'BP 120/80',
  assessment: 'Hypertension',
  plan: 'Lifestyle modification',
  chiefComplaint: 'Headache',
  changedByUser: { firstName: 'Dr. Ana', lastName: 'López' },
  changedFields: ['subjective'],
  changesSummary: 'Updated subjective',
  createdAt: '2024-01-01T10:00:00Z',
};

const newVersion = {
  id: 'v2',
  versionNumber: 2,
  subjective: 'Patient reports moderate pain',
  objective: 'BP 130/85',
  assessment: 'Hypertension, uncontrolled',
  plan: 'Lifestyle modification + medication',
  chiefComplaint: 'Headache',
  changedByUser: { firstName: 'Dr. Ana', lastName: 'López' },
  changedFields: ['subjective', 'objective', 'assessment', 'plan'],
  changesSummary: 'Full update',
  createdAt: '2024-01-15T10:00:00Z',
};

describe('VersionDiffViewer', () => {
  it('renders version numbers', () => {
    render(<VersionDiffViewer oldVersion={baseVersion} newVersion={newVersion} />);
    expect(screen.getByText(/Version 1|v1/i) || screen.getByText(/versión/i)).toBeTruthy();
  });

  it('renders changed fields labels', () => {
    render(<VersionDiffViewer oldVersion={baseVersion} newVersion={newVersion} />);
    expect(screen.getByText(/Subjective|Subjetivo/i) || document.querySelector('[class*="diff"]')).toBeTruthy();
  });

  it('renders author information', () => {
    render(<VersionDiffViewer oldVersion={baseVersion} newVersion={newVersion} />);
    expect(screen.getByText(/Ana|López/i)).toBeInTheDocument();
  });
});
