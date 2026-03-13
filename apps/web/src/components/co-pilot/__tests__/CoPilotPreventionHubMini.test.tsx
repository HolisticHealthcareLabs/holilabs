/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({
    success: true,
    data: {
      patient: { id: 'p1', age: 55, gender: 'male' },
      riskScores: [],
      activeInterventions: [],
      completedInterventions: [],
      summary: { overdueCount: 2, dueCount: 3, scheduledCount: 1, completedCount: 0, totalActive: 5 },
      processingTimeMs: 100,
    },
  }),
}) as jest.Mock;

import { CoPilotPreventionHubMini } from '../CoPilotPreventionHubMini';

describe('CoPilotPreventionHubMini', () => {
  const onOpenFullHub = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          patient: { id: 'p1', age: 55, gender: 'male' },
          riskScores: [],
          activeInterventions: [],
          completedInterventions: [],
          summary: { overdueCount: 2, dueCount: 3, scheduledCount: 1, completedCount: 0, totalActive: 5 },
          processingTimeMs: 100,
        },
      }),
    });
  });

  it('renders hub title', () => {
    render(<CoPilotPreventionHubMini patientId="p1" onOpenFullHub={onOpenFullHub} />);
    expect(screen.getByText('Prevention Hub')).toBeInTheDocument();
  });

  it('renders View full hub button', () => {
    render(<CoPilotPreventionHubMini patientId="p1" onOpenFullHub={onOpenFullHub} />);
    expect(screen.getByText('View full hub')).toBeInTheDocument();
  });

  it('renders summary counts after loading', async () => {
    render(<CoPilotPreventionHubMini patientId="p1" onOpenFullHub={onOpenFullHub} />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
