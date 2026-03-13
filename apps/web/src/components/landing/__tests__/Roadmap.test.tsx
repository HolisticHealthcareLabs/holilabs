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
    roadmap: {
      kicker: 'Roadmap',
      title: 'Where we are heading',
      subtitle: 'Our plan',
      phases: [
        {
          badge: 'LIVE',
          timeline: 'Q1 2025',
          title: 'Foundation',
          challenge: 'Building the base',
          features: ['Safety Engine', 'Audit Trail'],
        },
        {
          badge: 'NEXT',
          timeline: 'Q2 2025',
          title: 'Scale',
          challenge: 'Growing the platform',
          features: ['Enterprise API', 'Custom Rules'],
        },
        {
          badge: 'FUTURE',
          timeline: 'Q3 2025',
          title: 'Intelligence',
          challenge: 'AI-driven insights',
          features: ['Predictive Alerts', 'Pattern Detection'],
        },
      ],
    },
  }),
}));

const { Roadmap } = require('../Roadmap');

describe('Roadmap', () => {
  it('renders without crashing', () => {
    const { container } = render(<Roadmap />);
    expect(container.querySelector('section')).toBeTruthy();
  });

  it('renders roadmap kicker', () => {
    const { container } = render(<Roadmap />);
    expect(container.textContent).toContain('Roadmap');
  });
});
