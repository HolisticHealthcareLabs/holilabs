/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    const map: Record<string, string> = {
      loading: 'Loading prevention data...',
      title: 'Longitudinal Prevention Hub',
      subtitle: `Patient: ${params?.patientId ?? 'demo'}`,
      patientNotFound: 'Patient not found',
      backToPrevention: 'Back to Prevention',
      breadcrumbDashboard: 'Dashboard',
      breadcrumbPrevention: 'Prevention',
      breadcrumbHub: 'Hub',
      tabTimeline: 'Timeline',
      tabDomains: 'Domains',
      tabGaps: 'Prevention Gaps',
      timelineTitle: 'Care Timeline',
      timelineDescription: 'Longitudinal view of screening protocols',
      settings: 'Settings',
      exportReport: 'Export Report',
      exporting: 'Exporting...',
      live: 'Live',
      offline: 'Offline',
      clear: 'Clear',
      now: 'NOW',
      gapsDetected: 'Prevention Gaps Detected',
      reviewNow: 'Review Now',
      domainsTitle: 'Health Domains',
      domainsDescription: 'Organized by clinical domain',
      gapsTitle: 'Prevention Gaps',
      gapsDescription: 'Overdue screening protocols',
      noGapsTitle: 'No Prevention Gaps',
      noGapsDescription: 'All screenings are up to date',
      lastCalculated: 'Last calculated',
      activeInterventions: `${params?.count ?? 0} active`,
      realtimeDetections: 'Real-time Detections',
      description: 'Description',
      evidenceBase: 'Evidence Base',
      aiRecommendation: 'AI Recommendation',
      aiPoweredRecommendation: 'AI-Powered Recommendation',
      quickActions: 'Quick Actions',
      orders: 'Orders',
      ordersDescription: 'Lab, imaging, procedure orders',
      referrals: 'Referrals',
      referralsDescription: 'Specialist referrals',
      patientTasks: 'Patient Tasks',
      patientTasksDescription: 'Self-care tasks for patients',
      addToPlan: 'Add to Plan',
      cancel: 'Cancel',
      markAsComplete: 'Mark as Complete',
      markComplete: 'Mark Complete',
      scheduleNow: 'Schedule Now',
      processing: 'Processing...',
    };
    return map[key] ?? key;
  },
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => 'demo',
  }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

jest.mock('@/hooks/useRealtimePreventionUpdates', () => ({
  usePreventionDetection: () => ({
    connected: false,
    conditions: [],
    recommendations: [],
    isProcessing: false,
    clearDetections: jest.fn(),
  }),
}));

jest.mock('@/components/onboarding/SpotlightTrigger', () => ({
  __esModule: true,
  default: () => <div data-testid="spotlight-trigger" />,
}));

const mockApiData = {
  success: true,
  data: {
    patient: { id: 'demo', age: 55, gender: 'male' },
    riskScores: [
      { id: 'r1', name: 'Cardiac Risk', score: 35, level: 'moderate', lastCalculated: '2026-01-01', nextDue: '2026-06-01' },
    ],
    activeInterventions: [],
    completedInterventions: [],
    summary: { overdueCount: 0, dueCount: 0, scheduledCount: 0, completedCount: 0, totalActive: 0 },
    processingTimeMs: 80,
  },
};

global.fetch = jest.fn() as jest.Mock;

import PreventionHub from '../page';

describe('PreventionHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiData),
    });
  });

  it('shows loading state initially', () => {
    render(<PreventionHub />);
    expect(screen.getByText('Loading prevention data...')).toBeInTheDocument();
  });

  it('renders hub title after data loads', async () => {
    render(<PreventionHub />);
    await waitFor(() => {
      expect(screen.getByText(/Longitudinal Prevention Hub/)).toBeInTheDocument();
    });
  });

  it('renders breadcrumb navigation after data loads', async () => {
    render(<PreventionHub />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Prevention')).toBeInTheDocument();
    });
  });
});
