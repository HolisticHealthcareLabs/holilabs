/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { ConfidenceBadge, ConfidenceBar, ConfidenceAlert } = require('../ConfidenceBadge');

describe('ConfidenceBadge', () => {
  it('renders high confidence badge with percentage', () => {
    render(<ConfidenceBadge confidence={0.95} />);
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });

  it('renders low confidence badge', () => {
    render(<ConfidenceBadge confidence={0.4} />);
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });

  it('renders without label when showLabel is false', () => {
    render(<ConfidenceBadge confidence={0.8} showLabel={false} />);
    expect(screen.getByText(/80%/)).toBeInTheDocument();
    expect(screen.queryByText(/Confiança:/)).not.toBeInTheDocument();
  });
});

describe('ConfidenceBar', () => {
  it('renders with a label', () => {
    render(<ConfidenceBar confidence={0.75} label="SOAP Section" />);
    expect(screen.getByText('SOAP Section')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders without label without crashing', () => {
    const { container } = render(<ConfidenceBar confidence={0.5} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('ConfidenceAlert', () => {
  it('renders nothing for high confidence', () => {
    const { container } = render(<ConfidenceAlert confidence={0.95} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders warning for medium confidence', () => {
    const { container } = render(<ConfidenceAlert confidence={0.8} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
