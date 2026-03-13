/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/hooks/useKeyboardShortcuts', () => ({
  formatShortcut: (keys: string[]) => keys.join('+'),
}));

import KeyboardShortcutsOverlay from '../KeyboardShortcutsOverlay';

const mockShortcuts = [
  { id: 's1', keys: ['Ctrl', 'R'], description: 'Toggle recording', category: 'recording' },
  { id: 's2', keys: ['Ctrl', 'P'], description: 'Search patients', category: 'patient' },
];

describe('KeyboardShortcutsOverlay', () => {
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders title when open', () => {
    render(<KeyboardShortcutsOverlay isOpen={true} onClose={onClose} shortcuts={mockShortcuts} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('renders shortcut descriptions', () => {
    render(<KeyboardShortcutsOverlay isOpen={true} onClose={onClose} shortcuts={mockShortcuts} />);
    expect(screen.getByText('Toggle recording')).toBeInTheDocument();
    expect(screen.getByText('Search patients')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<KeyboardShortcutsOverlay isOpen={false} onClose={onClose} shortcuts={mockShortcuts} />);
    expect(container).toBeEmptyDOMElement();
  });
});
