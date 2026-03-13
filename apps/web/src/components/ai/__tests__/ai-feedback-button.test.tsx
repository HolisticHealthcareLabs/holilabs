/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  Edit2: () => <div data-testid="edit-icon" />,
  MessageSquare: () => <div data-testid="message-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}));

const { AIFeedbackButton } = require('../ai-feedback-button');

const defaultProps = {
  contentType: 'soap_note' as const,
  contentId: 'note-123',
  originalText: 'Patient presents with fever.',
};

describe('AIFeedbackButton', () => {
  it('renders feedback buttons', () => {
    render(<AIFeedbackButton {...defaultProps} />);
    expect(screen.getByText('This is Correct')).toBeInTheDocument();
    expect(screen.getByText('This is Incorrect')).toBeInTheDocument();
  });

  it('renders compact variant with smaller buttons', () => {
    render(<AIFeedbackButton {...defaultProps} compact />);
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
  });

  it('shows correction form when Incorrect is clicked', () => {
    render(<AIFeedbackButton {...defaultProps} />);
    fireEvent.click(screen.getByText('This is Incorrect'));
    expect(screen.getByText('Provide Correction')).toBeInTheDocument();
  });
});
