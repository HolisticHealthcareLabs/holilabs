/**
 * Clinical Frailty Scale (CFS) — Rockwood et al. CMAJ 2005;173:489–495.
 * PMID: 16129869. Widely used 9-point ordinal scale for pre-op frailty
 * assessment, especially in patients aged ≥65.
 *
 * Not a computed score — this is a clinician-assigned ordinal level.
 */
import type { CalculatorResult, CalculatorCitation } from './types';

export type CfsLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type CfsTier = 'FIT' | 'VULNERABLE' | 'FRAIL_MILD' | 'FRAIL_MODERATE' | 'FRAIL_SEVERE' | 'TERMINAL';

export interface CfsInput {
  level: CfsLevel;
}

export const CFS_DESCRIPTIONS: Record<CfsLevel, { title: string; description: string }> = {
  1: { title: 'Very fit',              description: 'Robust, active, energetic and motivated. Exercise regularly. Among the fittest for their age.' },
  2: { title: 'Well',                  description: 'No active disease symptoms. Less fit than category 1. Often exercise or are active occasionally (e.g. seasonally).' },
  3: { title: 'Managing well',         description: 'Medical problems well controlled. Not regularly active beyond routine walking.' },
  4: { title: 'Vulnerable',            description: 'Not dependent on others for daily help, but symptoms limit activities. Complaint of being "slowed up" / tired during the day.' },
  5: { title: 'Mildly frail',          description: 'More evident slowing; needs help with high-order IADLs (finances, transportation, heavy housework, medications).' },
  6: { title: 'Moderately frail',      description: 'Needs help with all outside activities and with keeping house. Inside, often has problems with stairs, bathing, and may need minimal assistance with dressing.' },
  7: { title: 'Severely frail',        description: 'Completely dependent for personal care, from whatever cause (physical or cognitive). Seems stable; not at high risk of dying (within ~6 months).' },
  8: { title: 'Very severely frail',   description: 'Completely dependent, approaching end of life. Typically could not recover even from a minor illness.' },
  9: { title: 'Terminally ill',        description: 'Approaching end of life. Category applies to people with life expectancy < 6 months who are not otherwise evidently frail.' },
};

const CITATION: CalculatorCitation = {
  source: 'Rockwood K et al. CMAJ 2005;173:489–495 (Clinical Frailty Scale)',
  pmid: '16129869',
  validatedThrough: 2024,
};

function tierFor(level: CfsLevel): CfsTier {
  if (level <= 3) return 'FIT';
  if (level === 4) return 'VULNERABLE';
  if (level === 5) return 'FRAIL_MILD';
  if (level === 6) return 'FRAIL_MODERATE';
  if (level <= 8) return 'FRAIL_SEVERE';
  return 'TERMINAL';
}

export function computeCfs(input: CfsInput): CalculatorResult<CfsTier> {
  const tier = tierFor(input.level);
  const desc = CFS_DESCRIPTIONS[input.level];

  let interpretation: string;
  if (tier === 'FIT') interpretation = 'Fit. Routine peri-operative pathway.';
  else if (tier === 'VULNERABLE') interpretation = 'Vulnerable. Consider pre-habilitation and enhanced recovery protocols.';
  else if (tier === 'FRAIL_MILD' || tier === 'FRAIL_MODERATE') interpretation = 'Frail. Higher risk of post-operative complications and prolonged recovery — consider geriatric co-management.';
  else if (tier === 'FRAIL_SEVERE') interpretation = 'Severely frail. Elective surgery should be discussed as a shared decision with explicit goals-of-care conversation.';
  else interpretation = 'Terminally ill. Goals-of-care / palliative focus appropriate.';

  return {
    calculator: 'CFS',
    score: input.level,
    tier,
    interpretation,
    factorSummary: [
      { label: `Level ${input.level}: ${desc.title}`, present: true, contributes: input.level },
    ],
    warnings: [],
    citation: CITATION,
  };
}
