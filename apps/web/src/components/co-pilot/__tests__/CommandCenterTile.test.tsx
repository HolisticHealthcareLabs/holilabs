/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

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
  useAnimation: () => ({ start: () => {} }),
  useMotionValue: () => ({ set: () => {}, get: () => 0 }),
}));
jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
}));
jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Translate: { toString: () => undefined } },
}));
jest.mock('@heroicons/react/24/outline', () => ({
  Bars3Icon: (props: any) => <div data-testid="bars-icon" {...props} />,
  ChevronDownIcon: (props: any) => <div data-testid="chevron-icon" {...props} />,
}));

import CommandCenterTile from '../CommandCenterTile';

describe('CommandCenterTile', () => {
  it('renders title and children without crashing', () => {
    render(
      <CommandCenterTile id="tile-1" title="Test Tile">
        <div>Tile content</div>
      </CommandCenterTile>
    );
    expect(screen.getByText('Test Tile')).toBeInTheDocument();
    expect(screen.getByText('Tile content')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <CommandCenterTile id="tile-1" title="Tile" subtitle="Sub info">
        <div />
      </CommandCenterTile>
    );
    expect(screen.getByText('Sub info')).toBeInTheDocument();
  });

  it('renders drag handle when draggable', () => {
    render(
      <CommandCenterTile id="tile-1" title="Tile" isDraggable showGrip>
        <div />
      </CommandCenterTile>
    );
    expect(screen.getByTestId('bars-icon')).toBeInTheDocument();
  });
});
