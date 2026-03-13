/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => 'hace 5 min',
}));
jest.mock('date-fns/locale', () => ({ es: {} }));

import ChatList from '../ChatList';

describe('ChatList', () => {
  const conversations = [
    { id: 'c1', patientName: 'Ana Torres', lastMessage: 'Buenos días', lastMessageAt: new Date(), unreadCount: 2 },
    { id: 'c2', clinicianName: 'Dr. Lopez', lastMessage: 'Cita confirmada', lastMessageAt: new Date(), unreadCount: 0 },
  ];

  it('renders empty state when no conversations', () => {
    render(<ChatList conversations={[]} selectedConversationId={null} onSelectConversation={jest.fn()} />);
    expect(screen.getByText('No hay conversaciones')).toBeInTheDocument();
  });

  it('renders conversation list items', () => {
    render(<ChatList conversations={conversations} selectedConversationId={null} onSelectConversation={jest.fn()} />);
    expect(screen.getByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByText('Dr. Lopez')).toBeInTheDocument();
  });

  it('calls onSelectConversation when clicked', () => {
    const onSelect = jest.fn();
    render(<ChatList conversations={conversations} selectedConversationId={null} onSelectConversation={onSelect} />);
    fireEvent.click(screen.getByText('Ana Torres'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });
});
