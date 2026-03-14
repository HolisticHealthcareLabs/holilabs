/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_: any, tag: string) => tag }),
  AnimatePresence: ({ children }: any) => children,
}));

const { SpotlightTutorial } = require('../SpotlightTutorial');

describe('SpotlightTutorial', () => {
  it('renders nothing when isActive is false', () => {
    const { container } = render(<SpotlightTutorial isActive={false} onComplete={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the first step content when active', () => {
    render(<SpotlightTutorial isActive={true} onComplete={jest.fn()} />);
    expect(screen.getByText('Instant Context Ingestion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next step/i })).toBeInTheDocument();
  });

  it('advances to next step and calls onComplete on final step', () => {
    const onComplete = jest.fn();
    render(<SpotlightTutorial isActive={true} onComplete={onComplete} />);
    // Advance to last step
    fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    expect(screen.getByText('Real-Time Evaluation')).toBeInTheDocument();
    // Click final button
    fireEvent.click(screen.getByRole('button', { name: /start demo/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
