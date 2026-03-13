/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg data-testid="alert-icon" {...props} />,
  Shield: (props: any) => <svg data-testid="shield-icon" {...props} />,
  FileText: (props: any) => <svg data-testid="file-icon" {...props} />,
  ChevronRight: (props: any) => <svg data-testid="chevron-icon" {...props} />,
}));
jest.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
jest.mock('../OverrideForm', () => ({
  __esModule: true,
  default: () => <div data-testid="override-form" />,
}));

const RiskCard = require('../RiskCard').default;

describe('RiskCard', () => {
  it('returns null when verdict is null', () => {
    const { container } = render(
      <RiskCard verdict={null} isOpen={true} onDismiss={jest.fn()} onOverride={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when severity is not HARD_BLOCK', () => {
    const verdict = {
      action: 'FLAGGED' as const,
      severity: 'SOFT_NUDGE' as const,
      transactionId: 'tx-1',
    };
    const { container } = render(
      <RiskCard verdict={verdict} isOpen={true} onDismiss={jest.fn()} onOverride={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });
});
