/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SafetySignal } from './SafetySignal';

// Mock Radix Dialog to render inline in tests
jest.mock('@radix-ui/react-dialog', () => {
  const DialogRoot = ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open !== false ? <div data-testid="dialog-root">{children}</div> : null;
  const DialogContent = ({ children, ...props }: { children: React.ReactNode; role?: string }) =>
    <div data-testid="dialog-content" role={props.role}>{children}</div>;
  const DialogHeader = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const DialogTitle = ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>;
  const DialogDescription = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;
  const DialogFooter = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const DialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const DialogOverlay = () => null;
  const DialogClose = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
  const DialogTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;

  return {
    Root: DialogRoot,
    Content: DialogContent,
    Header: DialogHeader,
    Title: DialogTitle,
    Description: DialogDescription,
    Footer: DialogFooter,
    Portal: DialogPortal,
    Overlay: DialogOverlay,
    Close: DialogClose,
    Trigger: DialogTrigger,
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Shield: ({ className }: { className?: string }) => <span data-testid="icon-shield" className={className} />,
  AlertTriangle: ({ className }: { className?: string }) => <span data-testid="icon-alert" className={className} />,
  Info: ({ className }: { className?: string }) => <span data-testid="icon-info" className={className} />,
  X: ({ className }: { className?: string }) => <span data-testid="icon-x" className={className} />,
}));

const baseProps = {
  ruleId: 'DOAC-CrCl-Rivaroxaban-001',
  ruleName: 'Rivaroxaban CrCl Contraindication',
  clinicalRationale: 'Rivaroxaban is contraindicated when CrCl < 15 ml/min.',
};

describe('SafetySignal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BLOCK variant', () => {
    it('renders as modal with alertdialog role', () => {
      render(
        <SafetySignal {...baseProps} severity="BLOCK" open={true} />
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Clinical Safety Block')).toBeInTheDocument();
      expect(screen.getByText(baseProps.clinicalRationale)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <SafetySignal {...baseProps} severity="BLOCK" open={false} />
      );

      expect(screen.queryByText('Clinical Safety Block')).not.toBeInTheDocument();
    });

    it('calls onAcknowledge when acknowledge button is clicked', () => {
      const onAcknowledge = jest.fn();
      render(
        <SafetySignal {...baseProps} severity="BLOCK" open={true} onAcknowledge={onAcknowledge} />
      );

      fireEvent.click(screen.getByText('I Acknowledge Risk'));
      expect(onAcknowledge).toHaveBeenCalledTimes(1);
    });

    it('shows override input and calls onOverride with reason', () => {
      const onOverride = jest.fn();
      render(
        <SafetySignal {...baseProps} severity="BLOCK" open={true} onOverride={onOverride} />
      );

      // Click "Override with Reason"
      fireEvent.click(screen.getByText('Override with Reason'));

      // Type reason
      const textarea = screen.getByPlaceholderText('Enter clinical justification for override...');
      fireEvent.change(textarea, { target: { value: 'Patient has been on stable dose for 2 years' } });

      // Submit
      fireEvent.click(screen.getByText('Submit Override'));
      expect(onOverride).toHaveBeenCalledWith('Patient has been on stable dose for 2 years');
    });

    it('disables submit button when override reason is empty', () => {
      const onOverride = jest.fn();
      render(
        <SafetySignal {...baseProps} severity="BLOCK" open={true} onOverride={onOverride} />
      );

      fireEvent.click(screen.getByText('Override with Reason'));
      const submitButton = screen.getByText('Submit Override');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('SOFT_NUDGE variant', () => {
    it('renders inline with alert role', () => {
      render(
        <SafetySignal {...baseProps} severity="SOFT_NUDGE" />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(baseProps.ruleName)).toBeInTheDocument();
      expect(screen.getByText(baseProps.clinicalRationale)).toBeInTheDocument();
    });

    it('renders rationale slot', () => {
      render(
        <SafetySignal
          {...baseProps}
          severity="SOFT_NUDGE"
          rationaleSlot={<div data-testid="rationale-detail">Extended rationale here</div>}
        />
      );

      expect(screen.getByTestId('rationale-detail')).toBeInTheDocument();
    });

    it('calls onAcknowledge when acknowledge button is clicked', () => {
      const onAcknowledge = jest.fn();
      render(
        <SafetySignal {...baseProps} severity="SOFT_NUDGE" onAcknowledge={onAcknowledge} />
      );

      fireEvent.click(screen.getByText('Acknowledge'));
      expect(onAcknowledge).toHaveBeenCalledTimes(1);
    });
  });

  describe('INFO variant', () => {
    it('renders inline with aria-live polite', () => {
      render(
        <SafetySignal {...baseProps} severity="INFO" />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('renders finance badge slot', () => {
      render(
        <SafetySignal
          {...baseProps}
          severity="INFO"
          financeBadgeSlot={<span data-testid="finance-badge">R$ 315</span>}
        />
      );

      expect(screen.getByTestId('finance-badge')).toBeInTheDocument();
    });

    it('dismisses when X button is clicked', () => {
      render(
        <SafetySignal {...baseProps} severity="INFO" />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Dismiss'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
