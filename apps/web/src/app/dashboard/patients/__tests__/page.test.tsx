/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
      React.forwardRef(({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag, { ...rest, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'usr_1', organizationId: 'org_1', role: 'DOCTOR', name: 'Dr Test' },
    },
    status: 'authenticated',
  }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/onboarding/SpotlightTrigger', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../_components/PatientEditDrawer', () => ({
  PatientEditDrawer: () => null,
}));

// Mock the shared-kernel path
jest.mock(
  '../../../../../../packages/shared-kernel/src/types/auth',
  () => ({
    filterRecordsForOrganization: (records: unknown[]) => records,
  }),
  { virtual: true }
);

const PatientsPage = require('../page').default;

describe('PatientsPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<PatientsPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders the patient registry heading', () => {
    render(<PatientsPage />);
    expect(screen.getByText('patientRegistry')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<PatientsPage />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });
});
