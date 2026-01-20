/**
 * @jest-environment jsdom
 */

/**
 * CoPilotPreventionAlerts Component Tests
 *
 * Tests for the real-time prevention alerts component displayed in Co-Pilot.
 * Phase 6: Prevention-CoPilot Real-Time Integration
 */

import React from 'react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CoPilotPreventionAlerts } from '../CoPilotPreventionAlerts';
import type {
  DetectedConditionFromServer,
  RecommendationFromServer,
} from '@/hooks/useRealtimePreventionUpdates';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('CoPilotPreventionAlerts', () => {
  const mockPatientId = 'patient-123';

  const mockConditions: DetectedConditionFromServer[] = [
    {
      id: 'condition-1',
      name: 'Type 2 Diabetes',
      category: 'endocrine',
      confidence: 0.92,
      icd10Codes: ['E11.9'],
    },
    {
      id: 'condition-2',
      name: 'Hypertension',
      category: 'cardiovascular',
      confidence: 0.88,
    },
  ];

  const mockRecommendations: RecommendationFromServer[] = [
    {
      id: 'rec-1',
      type: 'screening',
      title: 'HbA1c Monitoring',
      priority: 'HIGH',
      description: 'Quarterly HbA1c monitoring recommended for diabetes management',
      guidelineSource: 'ADA',
      uspstfGrade: 'A',
    },
    {
      id: 'rec-2',
      type: 'monitoring',
      title: 'Blood Pressure Check',
      priority: 'MEDIUM',
      description: 'Regular blood pressure monitoring',
    },
    {
      id: 'rec-3',
      type: 'counseling',
      title: 'Refer to Nutritionist',
      priority: 'LOW',
      description: 'Dietary counseling for diabetes management',
    },
  ];

  const defaultProps = {
    patientId: mockPatientId,
    conditions: mockConditions,
    recommendations: mockRecommendations,
    isExpanded: true,
    onToggleExpand: jest.fn(),
    alertCount: 5,
    onCreateOrder: jest.fn().mockResolvedValue(undefined),
    onCreateReferral: jest.fn().mockResolvedValue(undefined),
    onCreateTask: jest.fn().mockResolvedValue(undefined),
    onViewFullHub: jest.fn(),
    lastUpdateMs: Date.now() - 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component when there are alerts', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('Prevention Alerts')).toBeInTheDocument();
    });

    it('should not render when there are no conditions or recommendations', () => {
      const { container } = render(
        <CoPilotPreventionAlerts
          {...defaultProps}
          conditions={[]}
          recommendations={[]}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should display the alert count badge', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display 9+ when alert count exceeds 9', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} alertCount={15} />);

      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('should display time since last update', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('5s ago')).toBeInTheDocument();
    });
  });

  describe('Conditions Section', () => {
    it('should display detected conditions', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument();
      expect(screen.getByText('Hypertension')).toBeInTheDocument();
    });

    it('should display condition categories', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('endocrine')).toBeInTheDocument();
      expect(screen.getByText('cardiovascular')).toBeInTheDocument();
    });

    it('should display confidence percentages', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
    });

    it('should display conditions count header', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('Detected Conditions (2)')).toBeInTheDocument();
    });
  });

  describe('Recommendations Section', () => {
    it('should display recommendations', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('HbA1c Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Blood Pressure Check')).toBeInTheDocument();
    });

    it('should display priority badges', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    it('should display USPSTF grade when available', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('USPSTF A')).toBeInTheDocument();
    });

    it('should display recommendation descriptions', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(
        screen.getByText('Quarterly HbA1c monitoring recommended for diabetes management')
      ).toBeInTheDocument();
    });

    it('should display recommendations count header', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      expect(screen.getByText('Recommendations (3)')).toBeInTheDocument();
    });

    it('should display all recommendations with correct priorities', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      // Verify all recommendations are displayed
      expect(screen.getByText('HbA1c Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Blood Pressure Check')).toBeInTheDocument();
      expect(screen.getByText('Refer to Nutritionist')).toBeInTheDocument();

      // Verify all priority levels are displayed
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should call onToggleExpand when header is clicked', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      const header = screen.getByRole('button', { name: /prevention alerts/i });
      fireEvent.click(header);

      expect(defaultProps.onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it('should not render expanded content when isExpanded is false', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} isExpanded={false} />);

      expect(screen.queryByText('Detected Conditions (2)')).not.toBeInTheDocument();
      expect(screen.queryByText('Recommendations (3)')).not.toBeInTheDocument();
    });

    it('should render expanded content when isExpanded is true', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Detected Conditions (2)')).toBeInTheDocument();
      expect(screen.getByText('Recommendations (3)')).toBeInTheDocument();
    });
  });

  describe('Action Handlers', () => {
    it('should call onCreateOrder when Order button is clicked for screening type', async () => {
      // Use only a screening recommendation to make the test deterministic
      const screeningOnlyRecs: RecommendationFromServer[] = [
        {
          id: 'rec-1',
          type: 'screening',
          title: 'HbA1c Monitoring',
          priority: 'HIGH',
          description: 'Quarterly HbA1c monitoring',
        },
      ];

      render(
        <CoPilotPreventionAlerts
          {...defaultProps}
          recommendations={screeningOnlyRecs}
        />
      );

      // For screening type, Order should be the primary action button
      const orderButton = screen.getByRole('button', { name: /order/i });
      fireEvent.click(orderButton);

      await waitFor(() => {
        expect(defaultProps.onCreateOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'rec-1',
            type: 'screening',
          })
        );
      });
    });

    it('should call onCreateReferral when Refer button is clicked', async () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      // The "Refer to Nutritionist" recommendation should have a Refer button as primary
      const referButtons = screen.getAllByRole('button', { name: /refer/i });
      fireEvent.click(referButtons[0]);

      await waitFor(() => {
        expect(defaultProps.onCreateReferral).toHaveBeenCalled();
      });
    });

    it('should call onCreateTask when Assign button is clicked', async () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      // Find an Assign button (secondary action)
      const taskButtons = screen.getAllByTitle(/assign patient task/i);
      fireEvent.click(taskButtons[0]);

      await waitFor(() => {
        expect(defaultProps.onCreateTask).toHaveBeenCalled();
      });
    });

    it('should disable buttons while action is loading', async () => {
      const slowCreateOrder = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <CoPilotPreventionAlerts {...defaultProps} onCreateOrder={slowCreateOrder} />
      );

      const orderButton = screen.getAllByRole('button', { name: /order/i })[0];
      fireEvent.click(orderButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });
  });

  describe('View Full Hub', () => {
    it('should call onViewFullHub when View Hub link is clicked', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      const viewHubLink = screen.getByText('View Hub');
      fireEvent.click(viewHubLink);

      expect(defaultProps.onViewFullHub).toHaveBeenCalledTimes(1);
    });

    it('should not toggle expand when View Hub is clicked', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} />);

      const viewHubLink = screen.getByText('View Hub');
      fireEvent.click(viewHubLink);

      // onToggleExpand should not be called since we stopped propagation
      expect(defaultProps.onToggleExpand).not.toHaveBeenCalled();
    });
  });

  describe('Show More/Less', () => {
    it('should show "Show X more..." button when conditions exceed 3', () => {
      const manyConditions: DetectedConditionFromServer[] = [
        { id: '1', name: 'Condition 1', category: 'cat1', confidence: 0.9 },
        { id: '2', name: 'Condition 2', category: 'cat2', confidence: 0.8 },
        { id: '3', name: 'Condition 3', category: 'cat3', confidence: 0.7 },
        { id: '4', name: 'Condition 4', category: 'cat4', confidence: 0.6 },
        { id: '5', name: 'Condition 5', category: 'cat5', confidence: 0.5 },
      ];

      render(
        <CoPilotPreventionAlerts
          {...defaultProps}
          conditions={manyConditions}
        />
      );

      expect(screen.getByText('Show 2 more...')).toBeInTheDocument();
    });

    it('should show all conditions when "Show more" is clicked', () => {
      const manyConditions: DetectedConditionFromServer[] = [
        { id: '1', name: 'Condition 1', category: 'cat1', confidence: 0.9 },
        { id: '2', name: 'Condition 2', category: 'cat2', confidence: 0.8 },
        { id: '3', name: 'Condition 3', category: 'cat3', confidence: 0.7 },
        { id: '4', name: 'Condition 4', category: 'cat4', confidence: 0.6 },
      ];

      render(
        <CoPilotPreventionAlerts
          {...defaultProps}
          conditions={manyConditions}
        />
      );

      // Initially, condition 4 should not be visible
      expect(screen.queryByText('Condition 4')).not.toBeInTheDocument();

      // Click show more
      fireEvent.click(screen.getByText('Show 1 more...'));

      // Now condition 4 should be visible
      expect(screen.getByText('Condition 4')).toBeInTheDocument();
    });
  });

  describe('Primary Action Determination', () => {
    it('should show Order as primary action for screening type', () => {
      const screeningRec: RecommendationFromServer[] = [
        {
          id: 'rec-screening',
          type: 'screening',
          title: 'Colonoscopy Screening',
          priority: 'HIGH',
        },
      ];

      render(
        <CoPilotPreventionAlerts
          {...defaultProps}
          recommendations={screeningRec}
        />
      );

      // Primary action button should be Order (not just icon)
      const orderButtons = screen.getAllByRole('button', { name: /order/i });
      expect(orderButtons.length).toBeGreaterThan(0);
    });

    it('should show Refer as primary action for referral-related titles', () => {
      const referralRec: RecommendationFromServer[] = [
        {
          id: 'rec-referral',
          type: 'counseling',
          title: 'Refer to Cardiologist',
          priority: 'HIGH',
        },
      ];

      render(
        <CoPilotPreventionAlerts
          {...defaultProps}
          recommendations={referralRec}
        />
      );

      // Primary action button should be Refer
      const referButtons = screen.getAllByRole('button', { name: /refer/i });
      expect(referButtons.length).toBeGreaterThan(0);
    });

    it('should show Assign as primary action for other types', () => {
      const taskRec: RecommendationFromServer[] = [
        {
          id: 'rec-task',
          type: 'education',
          title: 'Patient Education on Diet',
          priority: 'LOW',
        },
      ];

      render(
        <CoPilotPreventionAlerts
          {...defaultProps}
          recommendations={taskRec}
        />
      );

      // Primary action button should be Assign
      const assignButtons = screen.getAllByRole('button', { name: /assign/i });
      expect(assignButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Time Since Update Formatting', () => {
    it('should display "just now" for very recent updates', () => {
      render(
        <CoPilotPreventionAlerts {...defaultProps} lastUpdateMs={Date.now() - 500} />
      );

      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('should display seconds for updates under a minute', () => {
      render(
        <CoPilotPreventionAlerts {...defaultProps} lastUpdateMs={Date.now() - 30000} />
      );

      expect(screen.getByText('30s ago')).toBeInTheDocument();
    });

    it('should display minutes for updates over a minute', () => {
      render(
        <CoPilotPreventionAlerts {...defaultProps} lastUpdateMs={Date.now() - 120000} />
      );

      expect(screen.getByText('2m ago')).toBeInTheDocument();
    });

    it('should not display time when lastUpdateMs is null', () => {
      render(<CoPilotPreventionAlerts {...defaultProps} lastUpdateMs={null} />);

      expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
      expect(screen.queryByText('just now')).not.toBeInTheDocument();
    });
  });
});
