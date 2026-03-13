/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
    li: 'li', ul: 'ul', section: 'section',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

const { ActivityTimeline } = require('../ActivityTimeline');

const mockActivities = [
  {
    id: '1',
    type: 'appointment',
    action: 'Appointment scheduled',
    timestamp: new Date('2025-01-15T10:00:00'),
    patient: { name: 'John Doe', id: 'p1' },
  },
];

describe('ActivityTimeline', () => {
  it('renders without crashing with empty activities', () => {
    const { container } = render(<ActivityTimeline activities={[]} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders activities', () => {
    render(<ActivityTimeline activities={mockActivities} />);
    expect(screen.getByText('Appointment scheduled')).toBeInTheDocument();
  });
});
