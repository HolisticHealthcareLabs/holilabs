/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const { CDSChatDrawer } = require('../CDSChatDrawer');

describe('CDSChatDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <CDSChatDrawer open={false} onClose={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders header and close button when open', () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) })
    ) as jest.Mock;

    render(
      <CDSChatDrawer
        open={true}
        onClose={jest.fn()}
        patientId="p-123"
        patientName="Ana Garcia"
      />
    );
    expect(screen.getByText('Clinical Decision Support Agent')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByText(/Ana Garcia/)).toBeInTheDocument();
  });

  it('renders chat and SOAP tabs', () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) })
    ) as jest.Mock;

    render(
      <CDSChatDrawer open={true} onClose={jest.fn()} />
    );
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('SOAP Summary')).toBeInTheDocument();
  });
});
