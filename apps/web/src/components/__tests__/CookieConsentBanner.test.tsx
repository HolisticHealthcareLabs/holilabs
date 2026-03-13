/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const { CookieConsentBanner } = require('../CookieConsentBanner');

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders without crashing', () => {
    const { container } = render(<CookieConsentBanner />);
    expect(container).toBeTruthy();
  });

  it('shows banner when no consent stored', () => {
    render(<CookieConsentBanner />);
    expect(screen.getByText('Accept All')).toBeInTheDocument();
    expect(screen.getByText('Reject Non-Essential')).toBeInTheDocument();
  });

  it('hides after accepting all', () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Accept All'));
    expect(screen.queryByText('Accept All')).not.toBeInTheDocument();
  });
});
