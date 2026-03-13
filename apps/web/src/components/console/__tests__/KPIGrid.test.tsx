/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/common/Tooltip', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

const { KPIGrid } = require('../KPIGrid');

const defaultProps = {
  totalEvaluations: { value: 100, unit: 'count' as const },
  blockRate: { value: 5.2, unit: 'percentage' as const },
  overrideRate: { value: 2.1, unit: 'percentage' as const },
  attestationCompliance: { value: 98, unit: 'percentage' as const },
};

describe('KPIGrid', () => {
  it('renders without crashing', () => {
    const { container } = render(<KPIGrid {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders all 4 KPI labels', () => {
    render(<KPIGrid {...defaultProps} />);
    expect(screen.getByText('Total Evaluations')).toBeInTheDocument();
    expect(screen.getByText('Block Rate')).toBeInTheDocument();
    expect(screen.getByText('Override Rate')).toBeInTheDocument();
    expect(screen.getByText('Attestation Compliance')).toBeInTheDocument();
  });
});
