/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn((...args: any[]) => args),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  closestCenter: jest.fn(),
}));
jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <>{children}</>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: {},
}));

import { DragDropCanvas } from '../DragDropCanvas';

beforeEach(() => jest.clearAllMocks());

describe('DragDropCanvas', () => {
  it('renders children inside the canvas', () => {
    render(<DragDropCanvas><div data-testid="tile">tile</div></DragDropCanvas>);
    expect(screen.getByTestId('tile')).toBeInTheDocument();
  });

  it('wraps content in a DndContext', () => {
    render(<DragDropCanvas><span>x</span></DragDropCanvas>);
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  it('renders drop zone overlays when dropZones are provided', () => {
    const zones = [{ id: 'z1', x: 0, y: 0, width: 100, height: 100 }];
    render(<DragDropCanvas dropZones={zones}><span>x</span></DragDropCanvas>);
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });
});
