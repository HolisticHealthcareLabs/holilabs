'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Shield, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';

// Matches SafetyAlertVariant from @holi/shared-kernel
type SafetyAlertVariant = 'BLOCK' | 'SOFT_NUDGE' | 'INFO';

// =============================================================================
// CVA VARIANTS
// =============================================================================

const safetySignalVariants = cva(
  'relative rounded-lg border p-4',
  {
    variants: {
      variant: {
        BLOCK: 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200',
        SOFT_NUDGE: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-900 dark:text-yellow-200',
        INFO: 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200',
      },
    },
    defaultVariants: {
      variant: 'INFO',
    },
  }
);

// =============================================================================
// ICON MAP
// =============================================================================

const ICON_MAP: Record<SafetyAlertVariant, typeof Shield> = {
  BLOCK: Shield,
  SOFT_NUDGE: AlertTriangle,
  INFO: Info,
};

const ICON_COLOR_MAP: Record<SafetyAlertVariant, string> = {
  BLOCK: 'text-red-600 dark:text-red-400',
  SOFT_NUDGE: 'text-yellow-600 dark:text-yellow-400',
  INFO: 'text-blue-600 dark:text-blue-400',
};

// =============================================================================
// PROPS
// =============================================================================

export interface SafetySignalProps {
  severity: SafetyAlertVariant;
  ruleId: string;
  ruleName: string;
  clinicalRationale: string;
  onAcknowledge?: () => void;
  onOverride?: (reason: string) => void;
  rationaleSlot?: React.ReactNode;
  financeBadgeSlot?: React.ReactNode;
  /** For BLOCK modal control */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

// =============================================================================
// SHARED CONTENT
// =============================================================================

function SafetySignalContent({
  severity,
  ruleId,
  ruleName,
  clinicalRationale,
  onAcknowledge,
  onOverride,
  rationaleSlot,
  financeBadgeSlot,
}: SafetySignalProps) {
  const Icon = ICON_MAP[severity];
  const [showOverrideInput, setShowOverrideInput] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState('');
  const rationaleId = `rationale-${ruleId}`;

  const handleOverrideSubmit = () => {
    if (overrideReason.trim() && onOverride) {
      onOverride(overrideReason.trim());
      setOverrideReason('');
      setShowOverrideInput(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', ICON_COLOR_MAP[severity])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm">{ruleName}</h4>
            {financeBadgeSlot}
          </div>
          <p className="text-xs opacity-60 mt-0.5">{ruleId}</p>
        </div>
      </div>

      {/* Rationale */}
      <p id={rationaleId} className="text-sm leading-relaxed">
        {clinicalRationale}
      </p>

      {/* Rationale slot */}
      {rationaleSlot && <div className="text-sm">{rationaleSlot}</div>}

      {/* Override input */}
      {showOverrideInput && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`override-${ruleId}`} className="text-xs font-medium">
            Override reason (required):
          </label>
          <textarea
            id={`override-${ruleId}`}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full rounded-md border bg-white/50 dark:bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            rows={2}
            placeholder="Enter clinical justification for override..."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleOverrideSubmit}
              disabled={!overrideReason.trim()}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Override
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOverrideInput(false);
                setOverrideReason('');
              }}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showOverrideInput && (
        <div className="flex items-center gap-2 pt-1">
          {severity === 'BLOCK' && (
            <>
              {onAcknowledge && (
                <button
                  type="button"
                  onClick={onAcknowledge}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  I Acknowledge Risk
                </button>
              )}
              {onOverride && (
                <button
                  type="button"
                  onClick={() => setShowOverrideInput(true)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  Override with Reason
                </button>
              )}
            </>
          )}
          {severity === 'SOFT_NUDGE' && onAcknowledge && (
            <button
              type="button"
              onClick={onAcknowledge}
              className="rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
            >
              Acknowledge
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BLOCK VARIANT (Modal)
// =============================================================================

function SafetySignalBlock(props: SafetySignalProps) {
  const { open, onOpenChange, className } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('sm:max-w-lg', className)}
        role="alertdialog"
        aria-describedby={`rationale-${props.ruleId}`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Shield className="h-5 w-5" />
            Clinical Safety Block
          </DialogTitle>
          <DialogDescription>
            This action has been blocked by a clinical safety rule. Review the details below.
          </DialogDescription>
        </DialogHeader>
        <div className={cn(safetySignalVariants({ variant: 'BLOCK' }))}>
          <SafetySignalContent {...props} />
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// INLINE VARIANT (SOFT_NUDGE + INFO)
// =============================================================================

function SafetySignalInline(props: SafetySignalProps) {
  const { severity, className, onAcknowledge } = props;
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      aria-live={severity === 'INFO' ? 'polite' : undefined}
      className={cn(safetySignalVariants({ variant: severity }), className)}
    >
      {severity === 'INFO' && (
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            onAcknowledge?.();
          }}
          className="absolute top-2 right-2 rounded-sm opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <SafetySignalContent {...props} />
    </div>
  );
}

// =============================================================================
// ENTRY POINT
// =============================================================================

export function SafetySignal(props: SafetySignalProps) {
  if (props.severity === 'BLOCK') {
    return <SafetySignalBlock {...props} />;
  }
  return <SafetySignalInline {...props} />;
}
