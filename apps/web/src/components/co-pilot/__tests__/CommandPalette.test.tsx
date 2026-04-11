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
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@heroicons/react/24/outline', () => ({
  MagnifyingGlassIcon: (props: any) => <svg data-testid="search-icon" {...props} />,
  ClockIcon: (props: any) => <svg data-testid="clock-icon" {...props} />,
  SparklesIcon: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
}));

const CommandPalette = require('../CommandPalette').default;

const mockCommands = [
  { id: 'cmd-1', label: 'New Patient', description: 'Create a new patient record', action: jest.fn() },
  { id: 'cmd-2', label: 'Open Dashboard', description: 'Go to main dashboard', action: jest.fn() },
];

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <CommandPalette isOpen={false} onClose={jest.fn()} commands={mockCommands} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders search input and commands when open', () => {
    render(
      <CommandPalette isOpen={true} onClose={jest.fn()} commands={mockCommands} />
    );
    expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
  });

  it('shows command count in footer', () => {
    render(
      <CommandPalette isOpen={true} onClose={jest.fn()} commands={mockCommands} />
    );
    expect(screen.getByText(/\d+ of 2/)).toBeInTheDocument();
  });
});
