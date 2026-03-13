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

import ConnectionStatus from '../ConnectionStatus';

describe('ConnectionStatus', () => {
  it('renders "Excellent" label when connected with excellent quality', () => {
    render(<ConnectionStatus isConnected={true} quality="excellent" />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('renders "Offline" label when not connected', () => {
    render(<ConnectionStatus isConnected={false} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders device count when connected devices > 0', () => {
    render(<ConnectionStatus isConnected={true} connectedDevices={3} />);
    expect(screen.getByText('3 devices')).toBeInTheDocument();
  });
});
