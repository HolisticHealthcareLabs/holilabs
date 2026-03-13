/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
    li: 'li', ul: 'ul', section: 'section',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ insights: [] }),
});

const { AIInsights } = require('../AIInsights');

describe('AIInsights', () => {
  it('renders without crashing', () => {
    const { container } = render(<AIInsights />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with custom className', () => {
    const { container } = render(<AIInsights className="custom-class" />);
    expect(container.firstChild).toBeTruthy();
  });
});
