/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en' }),
}));
jest.mock('@/components/landing/copy', () => ({
  getLandingCopy: () => ({
    a11y: { skipToMain: 'Skip to main content' },
  }),
}));

const { SkipLink } = require('../SkipLink');

describe('SkipLink', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkipLink />);
    expect(container.querySelector('a')).toBeTruthy();
  });

  it('has correct href for main content', () => {
    const { container } = render(<SkipLink />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#main-content');
  });

  it('renders skip text', () => {
    render(<SkipLink />);
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });
});
