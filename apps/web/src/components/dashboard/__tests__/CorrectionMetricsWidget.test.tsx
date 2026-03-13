/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }), usePathname: () => '/test', useSearchParams: () => new URLSearchParams() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', email: 'dr@test.com', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (key: string) => key }) }));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      data: {
        analytics: {
          totalCorrections: 42,
          avgConfidence: 0.92,
          avgEditDistance: 1.5,
          mostCommonErrors: [],
        },
        derivedMetrics: {
          avgErrorRate: 0.03,
          improvementPercentage: 12.5,
          trendDirection: 'improving',
        },
      },
    }),
  })
) as jest.Mock;

const CorrectionMetricsWidget = require('../CorrectionMetricsWidget').default;

describe('CorrectionMetricsWidget', () => {
  it('renders loading state initially', () => {
    render(<CorrectionMetricsWidget />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    const { container } = render(<CorrectionMetricsWidget className="test-class" />);
    expect(container.firstChild).toHaveClass('test-class');
  });
});
