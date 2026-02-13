/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RevenueImpactBadge } from './RevenueImpactBadge';
import { getTUSSByCode, formatRate, getTUSSBySeverity, type TUSSCode } from '@/lib/finance/tuss-lookup';

// Mock framer-motion to render plain spans
jest.mock('framer-motion', () => ({
  motion: {
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
}));

// No lucide-react mock needed — component uses inline CurrencyIcon

describe('RevenueImpactBadge', () => {
  it('renders known TUSS code with correct variant', () => {
    // 4.01.01.01 = BLOCK severity → error variant
    render(<RevenueImpactBadge tussCode="4.01.01.01" />);
    expect(screen.getByText('4.01.01.01')).toBeInTheDocument();
  });

  it('shows rate when showRate is true for BOB currency', () => {
    render(<RevenueImpactBadge tussCode="4.01.01.01" showRate />);
    // Bs. 4,500 (or locale variant)
    expect(screen.getByText('4.01.01.01')).toBeInTheDocument();
    // Rate should be visible
    const rateEl = screen.getByText(/Bs\./);
    expect(rateEl).toBeInTheDocument();
  });

  it('shows rate when showRate is true for BRL currency', () => {
    render(<RevenueImpactBadge tussCode="1.01.01.15-0" showRate />);
    expect(screen.getByText('1.01.01.15-0')).toBeInTheDocument();
    const rateEl = screen.getByText(/R\$/);
    expect(rateEl).toBeInTheDocument();
  });

  it('renders fallback for unknown codes', () => {
    render(<RevenueImpactBadge tussCode="99.99.99.99" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('does not show rate when showRate is false', () => {
    render(<RevenueImpactBadge tussCode="4.01.01.01" showRate={false} />);
    expect(screen.queryByText(/Bs\./)).not.toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<RevenueImpactBadge tussCode="4.01.01.01" size="sm" />);
    expect(screen.getByText('4.01.01.01')).toBeInTheDocument();

    rerender(<RevenueImpactBadge tussCode="4.01.01.01" size="lg" />);
    expect(screen.getByText('4.01.01.01')).toBeInTheDocument();
  });
});

describe('TUSS Lookup Utility', () => {
  it('getTUSSByCode returns correct entry', () => {
    const code = getTUSSByCode('4.01.01.01');
    expect(code).toBeDefined();
    expect(code!.description).toBe('Specialized Consultation — High Complexity');
    expect(code!.baseRateBOB).toBe(4500);
  });

  it('getTUSSByCode returns undefined for unknown code', () => {
    expect(getTUSSByCode('99.99.99.99')).toBeUndefined();
  });

  it('getTUSSBySeverity returns codes for BLOCK severity', () => {
    const blockCodes = getTUSSBySeverity('BLOCK');
    expect(blockCodes.length).toBeGreaterThan(0);
    for (const c of blockCodes) {
      expect(c.applicableSeverities).toContain('BLOCK');
    }
  });

  it('formatRate produces correct BOB string', () => {
    const code: TUSSCode = {
      code: '4.01.01.01',
      description: 'Test',
      category: 'SPECIALIZED',
      baseRateBOB: 4500,
      baseRateBRL: null,
      applicableSeverities: ['BLOCK'],
      actuarialWeight: 0.95,
    };
    const result = formatRate(code);
    expect(result).toMatch(/Bs\./);
    expect(result).toMatch(/4/);
  });

  it('formatRate produces correct BRL string', () => {
    const code: TUSSCode = {
      code: '1.01.01.15-0',
      description: 'Test',
      category: 'SPECIALIZED',
      baseRateBOB: 0,
      baseRateBRL: 315,
      applicableSeverities: ['BLOCK'],
      actuarialWeight: 0.80,
    };
    const result = formatRate(code);
    expect(result).toMatch(/R\$/);
    expect(result).toMatch(/315/);
  });

  it('formatRate returns dash when no rate', () => {
    const code: TUSSCode = {
      code: 'X',
      description: 'Test',
      category: 'STANDARD',
      baseRateBOB: 0,
      baseRateBRL: null,
      applicableSeverities: ['PASS'],
      actuarialWeight: 0.10,
    };
    expect(formatRate(code)).toBe('—');
  });
});
