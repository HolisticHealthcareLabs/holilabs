/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

const mockStatsData = {
  code: 'REF-ABC123',
  totalInvited: 5,
  successfulSignups: 2,
  activeReferrals: 2,
  viralCoefficient: 0.4,
  progressToReward: { current: 2, required: 3, percentage: 66 },
  referrals: [],
};

beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/code')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, stats: mockStatsData }) });
    }
    if (url.includes('/rewards')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, rewards: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }) as any;

  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ReferralDashboard from '../ReferralDashboard';

describe('ReferralDashboard', () => {
  it('shows loading state initially', () => {
    render(<ReferralDashboard />);
    expect(document.querySelector('.animate-spin') || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders referral code after loading', async () => {
    render(<ReferralDashboard />);
    await waitFor(() => {
      expect(screen.getByText('REF-ABC123')).toBeInTheDocument();
    });
  });

  it('shows progress stats after loading', async () => {
    render(<ReferralDashboard />);
    await waitFor(() => {
      expect(screen.getByText('REF-ABC123')).toBeInTheDocument();
    });
    const twos = screen.queryAllByText('2');
    expect(twos.length).toBeGreaterThan(0);
  });
});
