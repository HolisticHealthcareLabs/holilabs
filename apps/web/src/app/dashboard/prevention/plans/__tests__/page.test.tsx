/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      title: 'Prevention Plans',
      subtitle: 'Track and manage prevention protocols',
      selectPatient: 'Select Patient',
      loadingPlans: 'Loading plans...',
      refresh: 'Refresh',
      filters: 'Filters',
    };
    return map[key] ?? key;
  },
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

jest.mock('@/components/prevention/StatusHistoryTimeline', () => ({
  __esModule: true,
  default: () => <div data-testid="status-timeline" />,
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true, data: { preventionPlans: [] } }),
}) as jest.Mock;

import PreventionPlansPage from '../page';

describe('PreventionPlansPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders page title', () => {
    render(<PreventionPlansPage />);
    expect(screen.getByText('Prevention Plans')).toBeInTheDocument();
  });

  it('renders patient selector', () => {
    render(<PreventionPlansPage />);
    expect(screen.getByText('Select Patient')).toBeInTheDocument();
  });

  it('renders demo patient names', () => {
    render(<PreventionPlansPage />);
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
  });
});
