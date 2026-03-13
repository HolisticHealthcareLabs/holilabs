/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
    h1: 'h1', h2: 'h2', section: 'section', a: 'a',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en' }),
}));
jest.mock('@/components/landing/copy', () => ({
  getLandingCopy: () => ({
    hero: {
      badge: 'Now in private beta',
      headlineParts: [
        { text: 'Clinical Safety', isHighlight: true },
        { text: ' Infrastructure' },
      ],
      subheading: 'The safety layer for modern healthcare.',
      cta: 'Request Access',
      ctaSecondary: 'See How It Works',
    },
  }),
}));

const { Hero } = require('../Hero');

describe('Hero', () => {
  it('renders without crashing', () => {
    const { container } = render(<Hero />);
    expect(container.querySelector('section')).toBeTruthy();
  });

  it('renders badge text', () => {
    const { container } = render(<Hero />);
    expect(container.textContent).toContain('Now in private beta');
  });
});
