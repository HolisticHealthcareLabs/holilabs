/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../CommandCenterTile', () => ({
  __esModule: true,
  default: ({ children, title }: any) => <div data-testid="tile"><h3>{title}</h3>{children}</div>,
}));

import VitalsTile from '../VitalsTile';

describe('VitalsTile', () => {
  it('renders vital sign names', () => {
    render(<VitalsTile />);
    expect(screen.getByText('Heart Rate')).toBeInTheDocument();
    expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('SpO2')).toBeInTheDocument();
  });

  it('renders tile title', () => {
    render(<VitalsTile />);
    expect(screen.getByText('Vital Signs')).toBeInTheDocument();
  });

  it('shows select patient message when no patientId', () => {
    render(<VitalsTile />);
    expect(screen.getByText('Select a patient to monitor vitals')).toBeInTheDocument();
  });
});
