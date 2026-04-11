import type {
  ActionStrength,
  CorrectiveAction,
  FishboneBone,
  FishboneFinding,
  FiveWhyStep,
  RCAResult,
  SafetyEvent,
} from './types';

// Ordered by specificity: REGULATORY checked before PATIENT_FACTORS
// because "compliance" appears in both keyword sets.
const BONE_KEYWORD_PAIRS: [FishboneBone, string[]][] = [
  [
    'COMMUNICATION',
    ['handoff', 'communication', 'informed', 'notification', 'order', 'verbal', 'written', 'report'],
  ],
  [
    'EQUIPMENT',
    ['device', 'equipment', 'malfunction', 'calibration', 'maintenance', 'alarm', 'monitor'],
  ],
  [
    'ENVIRONMENT',
    ['lighting', 'noise', 'temperature', 'space', 'layout', 'crowding', 'distraction'],
  ],
  [
    'POLICIES_PROCEDURES',
    ['protocol', 'policy', 'guideline', 'procedure', 'checklist', 'sop', 'workflow'],
  ],
  [
    'PEOPLE_STAFF',
    ['training', 'competency', 'fatigue', 'supervision', 'staffing', 'workload', 'skill'],
  ],
  [
    'REGULATORY',
    ['anvisa', 'cofepris', 'minsalud', 'lgpd', 'hipaa', 'license', 'accreditation', 'compliance'],
  ],
  [
    'PATIENT_FACTORS',
    ['comorbidity', 'language', 'literacy', 'allergy', 'condition'],
  ],
  [
    'INFRASTRUCTURE',
    ['network', 'system', 'downtime', 'power', 'connectivity', 'integration', 'ehr'],
  ],
];

const ACTION_STRENGTH_KEYWORDS: Record<ActionStrength, string[]> = {
  ARCHITECTURAL: [
    'redesign',
    'automate',
    'forcing function',
    'physical barrier',
    'standardize',
  ],
  PROCESS: ['checklist', 'double-check', 'verification', 'alert', 'audit'],
  ADMINISTRATIVE: ['policy', 'memo', 'sign', 'label', 'awareness'],
  TRAINING: ['education', 'training', 'orientation', 'reminder'],
};

/**
 * Keyword-based Ishikawa bone categorization.
 * Scans the finding text against each bone's keyword list and returns the
 * first match. Falls back to POLICIES_PROCEDURES when no keyword matches.
 */
export function categorizeBone(finding: string): FishboneBone {
  const lower = finding.toLowerCase();

  for (const [bone, keywords] of BONE_KEYWORD_PAIRS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return bone;
    }
  }

  return 'POLICIES_PROCEDURES';
}

/**
 * AHRQ RCA2 triage gate.
 * SENTINEL events always require a full RCA.
 * ADVERSE_EVENT with HIGH or CRITICAL severity also triggers a full RCA.
 * Everything else gets an abbreviated review.
 */
export function triageForFullRCA(event: SafetyEvent): boolean {
  if (event.eventType === 'SENTINEL') return true;
  if (
    event.eventType === 'ADVERSE_EVENT' &&
    (event.severity === 'HIGH' || event.severity === 'CRITICAL')
  ) {
    return true;
  }
  return false;
}

/**
 * Rates a corrective action description by the AHRQ strength hierarchy.
 * Stronger actions (architectural) are preferred over weaker ones (training).
 * Falls back to TRAINING when no keyword matches.
 */
export function scoreActionStrength(action: string): ActionStrength {
  const lower = action.toLowerCase();

  for (const [strength, keywords] of Object.entries(ACTION_STRENGTH_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return strength as ActionStrength;
    }
  }

  return 'TRAINING';
}

/**
 * Deterministic RCA engine. Takes raw clinical findings and a why-chain,
 * categorizes each finding into an Ishikawa bone, structures the Five Whys
 * chain, and returns a complete RCAResult. No LLM involved.
 */
export function performRCA(
  event: SafetyEvent,
  findings: string[],
  whyChain: string[],
): RCAResult {
  const now = new Date();

  const fishboneFindings: FishboneFinding[] = findings.map((f, idx) => ({
    bone: categorizeBone(f),
    finding: f,
    evidence: `Finding ${idx + 1} from safety event ${event.eventId}`,
    contributionLevel: idx === 0 ? 'PRIMARY' : idx < 3 ? 'CONTRIBUTING' : 'MINOR',
  }));

  const steps: FiveWhyStep[] = whyChain.map((why, idx) => ({
    level: idx + 1,
    why,
    evidence: `Analysis step ${idx + 1} for event ${event.eventId}`,
    isSystemic: idx === whyChain.length - 1,
  }));

  const rootCause = whyChain.length > 0 ? whyChain[whyChain.length - 1] : 'Unknown';

  const correctiveActions: CorrectiveAction[] = [
    {
      id: `CA-${event.eventId}-001`,
      description: `Address root cause: ${rootCause}`,
      strength: scoreActionStrength(rootCause),
      responsible: event.reportedBy,
      deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      status: 'PROPOSED',
      measurableOutcome: `Root cause "${rootCause}" eliminated or mitigated`,
    },
  ];

  return {
    eventId: event.eventId,
    fishbone: {
      eventId: event.eventId,
      findings: fishboneFindings,
      createdAt: now,
    },
    fiveWhys: {
      eventId: event.eventId,
      steps,
      rootCause,
    },
    correctiveActions,
    rootCauses: [rootCause],
    completedAt: now,
  };
}
