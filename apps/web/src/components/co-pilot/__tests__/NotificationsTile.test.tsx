/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const motionCache: Record<string, React.FC<any>> = {};
jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: any, tag: string) => {
      if (!motionCache[tag]) {
        const Comp = React.forwardRef(({ children, ...props }: any, ref: any) =>
          React.createElement(tag, { ...props, ref }, children)
        );
        Comp.displayName = `motion.${tag}`;
        motionCache[tag] = Comp;
      }
      return motionCache[tag];
    },
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@heroicons/react/24/outline', () => ({
  BellIcon: () => <div data-testid="bell-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="exclamation-icon" />,
  InformationCircleIcon: () => <div data-testid="info-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
  XMarkIcon: () => <div data-testid="x-icon" />,
}));

jest.mock('../CommandCenterTile', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="tile-wrapper">{children}</div>,
}));

const NotificationsTile = require('../NotificationsTile').default;

describe('NotificationsTile', () => {
  it('renders without crashing with empty initial notifications', () => {
    const { container } = render(<NotificationsTile initialNotifications={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with notifications after mount', () => {
    render(<NotificationsTile initialNotifications={[]} />);
    expect(screen.getByText('Lab Results Ready')).toBeInTheDocument();
  });
});
