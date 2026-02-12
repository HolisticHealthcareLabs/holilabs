'use client';

import { cn } from '@/lib/utils';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { getTUSSByCode, formatRate, type TUSSCode } from '@/lib/finance/tuss-lookup';

// =============================================================================
// SEVERITY → BADGE VARIANT MAP
// =============================================================================

const SEVERITY_VARIANT_MAP: Record<string, BadgeVariant> = {
  BLOCK: 'error',
  FLAG: 'warning',
  ATTESTATION_REQUIRED: 'warning',
  PASS: 'success',
};

function getVariantForCode(code: TUSSCode): BadgeVariant {
  // Use the highest-priority severity from applicableSeverities
  const priority: string[] = ['BLOCK', 'FLAG', 'ATTESTATION_REQUIRED', 'PASS'];
  for (const sev of priority) {
    if (code.applicableSeverities.includes(sev)) {
      return SEVERITY_VARIANT_MAP[sev] ?? 'neutral';
    }
  }
  return 'neutral';
}

// Inline currency icon to avoid lucide-react 0.309.0 TS resolution issue
function CurrencyIcon({ className }: { className?: string }) {
  return <span className={cn('font-bold leading-none', className)} aria-hidden>$</span>;
}

// =============================================================================
// PROPS
// =============================================================================

export interface RevenueImpactBadgeProps {
  tussCode: string;
  className?: string;
  showRate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RevenueImpactBadge({
  tussCode,
  className,
  showRate = false,
  size = 'md',
}: RevenueImpactBadgeProps) {
  const code = getTUSSByCode(tussCode);

  if (!code) {
    return (
      <Badge variant="neutral" size={size} className={className}>
        <CurrencyIcon className="text-[10px] mr-0.5" />
        Unknown
      </Badge>
    );
  }

  const variant = getVariantForCode(code);
  const rate = formatRate(code);

  return (
    <Badge variant={variant} size={size} className={cn('gap-1', className)}>
      <CurrencyIcon className="text-[10px]" />
      <span>{code.code}</span>
      {showRate && rate !== '—' && (
        <span className="opacity-75 ml-0.5">{rate}</span>
      )}
    </Badge>
  );
}
