import type { RuleId } from '../../index';

export type SafetyAlertVariant = 'BLOCK' | 'SOFT_NUDGE' | 'INFO';

export interface SafetyAlertProps {
  severity: SafetyAlertVariant;
  ruleId: RuleId;
  ruleName: string;
  clinicalRationale: string;
  onAcknowledge?: () => void;
  onOverride?: (reason: string) => void;
  /** Slot: Elena's clinical rationale detail */
  rationaleSlot?: React.ReactNode;
  /** Slot: Victor's revenue impact badge */
  financeBadgeSlot?: React.ReactNode;
}
