/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

import { VitalSignsTracker } from '../VitalSignsTracker';

describe('VitalSignsTracker', () => {
  it('renders heading without crashing', () => {
    render(<VitalSignsTracker />);
    expect(screen.getByText('Signos Vitales')).toBeInTheDocument();
  });

  it('shows record vitals button when not read-only', () => {
    render(<VitalSignsTracker readOnly={false} />);
    expect(screen.getByText('Registrar Vitales')).toBeInTheDocument();
  });

  it('displays alert for critical vital signs', () => {
    render(<VitalSignsTracker currentVitals={{ bloodPressureSystolic: 200 }} />);
    expect(screen.getByText(/CRÍTICO.*Presión sistólica/)).toBeInTheDocument();
  });
});
