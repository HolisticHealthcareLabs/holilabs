/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

import MessageInput from '../MessageInput';

describe('MessageInput', () => {
  it('renders textarea and send button without crashing', () => {
    render(<MessageInput onSend={jest.fn()} />);
    expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeInTheDocument();
  });

  it('disables send button when message is empty', () => {
    const { container } = render(<MessageInput onSend={jest.fn()} />);
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).toBeDisabled();
  });

  it('enables send button when user types a message', () => {
    const { container } = render(<MessageInput onSend={jest.fn()} />);
    const textarea = screen.getByPlaceholderText('Escribe un mensaje...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).not.toBeDisabled();
  });
});
