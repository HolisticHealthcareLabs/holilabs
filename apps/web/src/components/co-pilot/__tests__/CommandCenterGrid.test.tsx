/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: React.PropsWithChildren) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: jest.fn(),
}));

const CommandCenterGrid = require('../CommandCenterGrid').default;

describe('CommandCenterGrid', () => {
  it('renders children inside the grid', () => {
    render(
      <CommandCenterGrid>
        <div data-testid="child-tile">Tile Content</div>
      </CommandCenterGrid>
    );
    expect(screen.getByTestId('child-tile')).toBeInTheDocument();
    expect(screen.getByText('Tile Content')).toBeInTheDocument();
  });

  it('renders DndContext wrapper', () => {
    render(
      <CommandCenterGrid>
        <span>Test</span>
      </CommandCenterGrid>
    );
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <CommandCenterGrid className="custom-class">
        <span>Content</span>
      </CommandCenterGrid>
    );
    expect(container.innerHTML).toContain('custom-class');
  });
});
