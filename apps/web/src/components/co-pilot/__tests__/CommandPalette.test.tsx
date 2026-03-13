/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, onClick, onMouseEnter, className, ...props }: any) => (
      <button onClick={onClick} onMouseEnter={onMouseEnter} className={className}>{children}</button>
    ),
    kbd: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <kbd {...props}>{children}</kbd>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
  },
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
    expect(screen.getByText(/2 of 2/)).toBeInTheDocument();
  });
});
