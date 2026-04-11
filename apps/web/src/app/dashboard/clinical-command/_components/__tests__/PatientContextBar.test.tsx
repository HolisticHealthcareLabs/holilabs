/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => {
  const React = require('react');
  const cache: Record<string, React.ComponentType<any>> = {};
  const handler = {
    get: (_target: any, prop: string) => {
      if (!cache[prop]) {
        cache[prop] = React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, layout, ...rest }: any, ref: any) => {
          const tag = typeof prop === 'string' ? prop : 'div';
          return React.createElement(tag, { ...rest, ref }, children);
        });
      }
      return cache[prop];
    },
  };
  const motionProxy = new Proxy({}, handler);
  return {
    __esModule: true,
    motion: motionProxy,
    m: motionProxy,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

jest.mock('next-intl', () => {
  const t = (key: string) => {
    const parts = key.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
  };
  return {
    useTranslations: () => t,
    useLocale: () => 'en',
    useMessages: () => ({}),
  };
});

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
    expect(screen.getByText(/patient label/i)).toBeInTheDocument();
  });

  it('renders search icon (collapsed by default)', () => {
    const { container } = render(<PatientContextBar onSelectPatient={onSelectPatient} />);
    const searchIcon = container.querySelector('.lucide-search');
    expect(searchIcon).toBeInTheDocument();
  });

  it('renders the component without crashing', () => {
    const { container } = render(<PatientContextBar onSelectPatient={onSelectPatient} />);
    expect(container.firstChild).toBeTruthy();
  });
});
