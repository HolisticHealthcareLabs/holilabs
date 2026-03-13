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
  DndContext: ({ children }: any) => <div>{children}</div>,
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: () => [],
}));
jest.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: jest.fn(),
}));

import TileManager from '../TileManager';

describe('TileManager', () => {
  it('renders children without crashing', () => {
    render(
      <TileManager>
        <div>Tile A</div>
        <div>Tile B</div>
      </TileManager>
    );
    expect(screen.getByText('Tile A')).toBeInTheDocument();
    expect(screen.getByText('Tile B')).toBeInTheDocument();
  });

  it('renders drop zones', () => {
    render(
      <TileManager>
        <div>Content</div>
      </TileManager>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
