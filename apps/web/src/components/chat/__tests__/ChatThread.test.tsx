/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('date-fns', () => ({
  format: () => '14:30',
  isToday: () => true,
  isYesterday: () => false,
}));
jest.mock('date-fns/locale', () => ({ es: {} }));
jest.mock('../FileAttachment', () => ({
  __esModule: true,
  default: () => <div data-testid="file-attachment" />,
}));

window.HTMLElement.prototype.scrollIntoView = jest.fn();

import ChatThread from '../ChatThread';

describe('ChatThread', () => {
  const baseProps = {
    currentUserId: 'u1',
    currentUserType: 'CLINICIAN' as const,
    recipientName: 'Ana Torres',
  };

  it('renders empty state when no messages', () => {
    render(<ChatThread {...baseProps} messages={[]} />);
    expect(screen.getByText('Inicia una conversación')).toBeInTheDocument();
  });

  it('renders messages in thread', () => {
    const messages = [
      { id: 'm1', fromUserId: 'u1', fromUserType: 'CLINICIAN' as const, toUserId: 'u2', toUserType: 'PATIENT' as const, body: 'Hello patient', readAt: null, createdAt: new Date(), attachments: null },
      { id: 'm2', fromUserId: 'u2', fromUserType: 'PATIENT' as const, toUserId: 'u1', toUserType: 'CLINICIAN' as const, body: 'Hi doctor', readAt: null, createdAt: new Date(), attachments: null },
    ];
    render(<ChatThread {...baseProps} messages={messages} />);
    expect(screen.getByText('Hello patient')).toBeInTheDocument();
    expect(screen.getByText('Hi doctor')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading', () => {
    const { container } = render(<ChatThread {...baseProps} messages={[]} isLoading />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
