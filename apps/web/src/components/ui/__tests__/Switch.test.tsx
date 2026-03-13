/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
      React.forwardRef(({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag, { ...rest, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@headlessui/react', () => {
  const Switch = React.forwardRef(({ checked, onChange, disabled, className, children }: any, ref: any) => (
    <button
      ref={ref}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={className}
      onClick={() => onChange && onChange(!checked)}
    >
      {children}
    </button>
  ));
  Switch.displayName = 'Switch';

  const Group = ({ children }: any) => <div>{children}</div>;
  Group.displayName = 'Switch.Group';

  const Label = ({ children, className }: any) => <span className={className}>{children}</span>;
  Label.displayName = 'Switch.Label';

  (Switch as any).Group = Group;
  (Switch as any).Label = Label;

  return { Switch };
});

const { Switch } = require('../Switch');

describe('Switch', () => {
  it('renders as unchecked by default', () => {
    render(<Switch enabled={false} onChange={jest.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('renders as checked when enabled=true', () => {
    render(<Switch enabled={true} onChange={jest.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicked', () => {
    const handler = jest.fn();
    render(<Switch enabled={false} onChange={handler} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('renders label when provided', () => {
    render(<Switch enabled={false} onChange={jest.fn()} label="Enable notifications" />);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });
});
