/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-icon" />,
  Info: () => <div data-testid="info-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
}));

const { ConfidenceHighlight } = require('../confidence-highlight');

const mockScores = [
  { sentenceIndex: 0, sentenceText: 'First sentence.', confidence: 0.9, needsReview: false },
  { sentenceIndex: 1, sentenceText: 'Second sentence.', confidence: 0.5, needsReview: true },
];

describe('ConfidenceHighlight', () => {
  it('renders provided scores as text', () => {
    render(
      <ConfidenceHighlight
        contentType="soap_note"
        contentId="note-1"
        scores={mockScores}
      />
    );
    expect(screen.getByText(/First sentence\./)).toBeInTheDocument();
    expect(screen.getByText(/Second sentence\./)).toBeInTheDocument();
  });

  it('shows confidence legend when showLegend is true', () => {
    render(
      <ConfidenceHighlight
        contentType="soap_note"
        contentId="note-1"
        scores={mockScores}
        showLegend
      />
    );
    expect(screen.getByText('Confidence Level:')).toBeInTheDocument();
  });

  it('shows empty state when no scores and not loading', () => {
    render(
      <ConfidenceHighlight
        contentType="soap_note"
        contentId="note-1"
        scores={[]}
      />
    );
    expect(screen.getByText('No text to display')).toBeInTheDocument();
  });
});
