/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => {
  const React = require('react');
  const cache: Record<string, React.ComponentType<any>> = {};
  const handler = {
    get: (_target: any, prop: string) => {
      if (!cache[prop]) {
        cache[prop] = React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, layout, ...rest }: any, ref: any) => {
          const tag = typeof prop === 'string' ? prop : 'div';
          return React.createElement(tag, { ...rest, ref }, children);
        });
      }
      return cache[prop];
    },
  };
  const motionProxy = new Proxy({}, handler);
  return {
    __esModule: true,
    motion: motionProxy,
    m: motionProxy,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      claimReview: 'Claim Review',
      billingStandards: 'TUSS/CBHPM billing standards',
      analyzingDocumentation: 'Analyzing documentation...',
      approveSubmitClaim: 'Approve & Submit',
      editNoteFirst: 'Edit Note First',
      retry: 'Retry',
    };
    return map[key] ?? key;
  },
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({
    success: true,
    data: {
      extractedDiagnoses: [],
      suggestedServices: [],
      totalEstimatedValue: 0,
      cdiWarnings: [],
    },
  }),
}) as jest.Mock;

import { SignAndBillModal } from '../SignAndBillModal';

describe('SignAndBillModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when closed', () => {
    const { container } = render(
      <SignAndBillModal isOpen={false} onClose={jest.fn()} onComplete={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Claim Review header when open', () => {
    render(<SignAndBillModal isOpen={true} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(screen.getByText('Claim Review')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<SignAndBillModal isOpen={true} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(screen.getByText('Analyzing documentation...')).toBeInTheDocument();
  });
});
