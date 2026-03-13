/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  ThumbsUp: (props: any) => <div data-testid="thumbs-up" {...props} />,
  ThumbsDown: (props: any) => <div data-testid="thumbs-down" {...props} />,
  MessageSquare: (props: any) => <div data-testid="message-square" {...props} />,
  ChevronRight: (props: any) => <div data-testid="chevron-right" {...props} />,
}));

import { AlertFeedback } from '../AlertFeedback';

describe('AlertFeedback', () => {
  it('renders feedback buttons without crashing', () => {
    render(<AlertFeedback assuranceEventId="evt-1" />);
    expect(screen.getByLabelText('Mark as helpful')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark as not helpful')).toBeInTheDocument();
    expect(screen.getByLabelText('Add correction or comment')).toBeInTheDocument();
  });

  it('shows text input when comment button is clicked', () => {
    render(<AlertFeedback assuranceEventId="evt-1" />);
    fireEvent.click(screen.getByLabelText('Add correction or comment'));
    expect(screen.getByPlaceholderText('Correction or comment...')).toBeInTheDocument();
  });

  it('calls onFeedbackSubmitted after successful submit', async () => {
    const onFeedback = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(<AlertFeedback assuranceEventId="evt-1" onFeedbackSubmitted={onFeedback} />);
    fireEvent.click(screen.getByLabelText('Mark as helpful'));

    await screen.findByText('Helpful');
    expect(onFeedback).toHaveBeenCalledWith('THUMBS_UP');
  });
});
