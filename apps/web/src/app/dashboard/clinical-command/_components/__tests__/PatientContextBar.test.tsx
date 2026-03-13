/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      patientLabel: 'PATIENT',
      searchPatients: 'Search patients...',
      selectPatientHint: 'Select a patient to begin',
      addPatient: 'Add Patient',
      fullNamePlaceholder: 'Full name',
      dobPlaceholder: 'DOB (MM/DD/YYYY)',
      addButton: 'Add',
      viewChart: 'View Chart',
      attachDocument: 'Attach Document',
    };
    return map[key] ?? key;
  },
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Dr. Test', organizationId: 'org-demo-clinic' } },
  }),
}));

jest.mock('../../../../../../../../packages/shared-kernel/src/types/auth', () => ({
  filterRecordsForOrganization: (records: any[], orgId: string) =>
    records.filter((r: any) => r.organizationId === orgId),
}));

import { PatientContextBar } from '../PatientContextBar';

describe('PatientContextBar', () => {
  const onSelectPatient = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders patient label', () => {
    render(<PatientContextBar onSelectPatient={onSelectPatient} />);
    expect(screen.getByText('PATIENT')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<PatientContextBar onSelectPatient={onSelectPatient} />);
    expect(screen.getByPlaceholderText('Search patients...')).toBeInTheDocument();
  });

  it('renders select patient hint', () => {
    render(<PatientContextBar onSelectPatient={onSelectPatient} />);
    expect(screen.getByText('Select a patient to begin')).toBeInTheDocument();
  });
});
