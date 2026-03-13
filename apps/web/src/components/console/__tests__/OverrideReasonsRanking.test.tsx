/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

const { OverrideReasonsRanking } = require('../OverrideReasonsRanking');

describe('OverrideReasonsRanking', () => {
  it('renders without crashing with empty reasons', () => {
    const { container } = render(
      <OverrideReasonsRanking reasons={[]} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders error state', () => {
    render(<OverrideReasonsRanking reasons={[]} error="Failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { container } = render(
      <OverrideReasonsRanking reasons={[]} isLoading />
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });
});
