/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  Shield: (props: any) => <svg data-testid="shield-icon" {...props} />,
  CheckCircle2: (props: any) => <svg data-testid="check-icon" {...props} />,
}));

const { VerifiedBadge, VerificationStatusIcon } = require('../VerifiedBadge');

describe('VerifiedBadge', () => {
  it('returns null when not verified', () => {
    const { container } = render(<VerifiedBadge verified={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders badge when verified', () => {
    render(<VerifiedBadge verified={true} />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows verification count', () => {
    render(<VerifiedBadge verified={true} verificationCount={3} />);
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });
});

describe('VerificationStatusIcon', () => {
  it('renders VERIFIED status', () => {
    const { getByTestId } = render(<VerificationStatusIcon status="VERIFIED" />);
    expect(getByTestId('shield-icon')).toBeInTheDocument();
  });

  it('renders PENDING status', () => {
    const { getByTestId } = render(<VerificationStatusIcon status="PENDING" />);
    expect(getByTestId('shield-icon')).toBeInTheDocument();
  });

  it('renders REJECTED status', () => {
    const { getByTestId } = render(<VerificationStatusIcon status="REJECTED" />);
    expect(getByTestId('shield-icon')).toBeInTheDocument();
  });
});
