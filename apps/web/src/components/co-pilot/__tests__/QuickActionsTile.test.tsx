/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

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
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null }),
}));
jest.mock('@dnd-kit/utilities', () => ({ CSS: { Translate: { toString: () => '' }, Transform: { toString: () => '' } } }));

import QuickActionsTile from '../QuickActionsTile';

describe('QuickActionsTile', () => {
  it('renders Quick Actions title', () => {
    render(<QuickActionsTile />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('shows patient required warning when no patientId is provided', () => {
    render(<QuickActionsTile />);
    expect(screen.getByText(/select a patient/i)).toBeInTheDocument();
  });

  it('calls onAction callback when Print button is clicked (no patient required)', () => {
    const onAction = jest.fn();
    render(<QuickActionsTile patientId="p1" onAction={onAction} />);
    fireEvent.click(screen.getByText('Print'));
    expect(onAction).toHaveBeenCalledWith('print');
  });
});
