/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const { HoverMenu } = require('../HoverMenu');

describe('HoverMenu', () => {
  const items = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' },
  ];

  it('returns null when not open', () => {
    const { container } = render(
      <HoverMenu
        toolId="test"
        isOpen={false}
        onMouseEnter={jest.fn()}
        onMouseLeave={jest.fn()}
        items={items}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders menu items when open', () => {
    render(
      <HoverMenu
        toolId="test"
        isOpen={true}
        onMouseEnter={jest.fn()}
        onMouseLeave={jest.fn()}
        items={items}
      />
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
