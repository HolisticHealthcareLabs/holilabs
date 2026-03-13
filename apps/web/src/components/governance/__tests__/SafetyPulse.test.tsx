/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  Activity: (props: any) => <svg data-testid="activity-icon" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="alert-icon" {...props} />,
  FileText: (props: any) => <svg data-testid="file-icon" {...props} />,
}));
jest.mock('@/components/ui/Card', () => ({
  StatCard: ({ label, value }: any) => (
    <div data-testid="stat-card">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

const SafetyPulse = require('../SafetyPulse').default;

describe('SafetyPulse', () => {
  const mockStats = {
    sessionsAudited: 142,
    interventionsTriggered: 8,
    avgSafetyScore: 97,
  };

  it('renders without crashing', () => {
    const { container } = render(<SafetyPulse stats={mockStats} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders all three stat cards', () => {
    const { getAllByTestId } = render(<SafetyPulse stats={mockStats} />);
    expect(getAllByTestId('stat-card')).toHaveLength(3);
  });

  it('displays correct labels', () => {
    render(<SafetyPulse stats={mockStats} />);
    expect(screen.getByText('Sessions Audited (24h)')).toBeInTheDocument();
    expect(screen.getByText('Interventions Triggered')).toBeInTheDocument();
    expect(screen.getByText('Average Safety Score')).toBeInTheDocument();
  });
});
