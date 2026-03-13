/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
    h2: 'h2', section: 'section',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en' }),
}));
jest.mock('@/components/landing/copy', () => ({
  getLandingCopy: () => ({
    howItWorks: {
      kicker: 'How It Works',
      title: 'Three-layer safety',
      subtitle: 'A subtitle',
      cards: [
        { number: '01', title: 'Ingest', description: 'Data flows in' },
        { number: '02', title: 'Evaluate', description: 'Rules are checked' },
        { number: '03', title: 'Act', description: 'Actions fire' },
      ],
    },
  }),
}));
jest.mock('@/components/landing/VerificationWorkflow', () => ({
  __esModule: true,
  VerificationWorkflow: () => <div data-testid="verification-workflow" />,
}));

const { HowItWorks } = require('../HowItWorks');

describe('HowItWorks', () => {
  it('renders without crashing', () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelector('section')).toBeTruthy();
  });

  it('renders kicker text', () => {
    const { container } = render(<HowItWorks />);
    expect(container.textContent).toContain('How It Works');
  });
});
