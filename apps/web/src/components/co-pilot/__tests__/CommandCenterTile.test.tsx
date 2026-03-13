/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
}));
jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Translate: { toString: () => undefined } },
}));
jest.mock('@heroicons/react/24/outline', () => ({
  Bars3Icon: (props: any) => <div data-testid="bars-icon" {...props} />,
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
