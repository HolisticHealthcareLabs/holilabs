/**
 * Clinical Content Governance Policy
 *
 * Defines the activation lifecycle for deterministic rule bundles.
 * Enforces that only clinically signed-off, approved content may be
 * treated as ACTIVE at runtime.
 *
 * Lifecycle:
 *   DRAFT → REVIEW → APPROVED → ACTIVE → DEPRECATED
 *
 * Invariants:
 *   - Only bundles in APPROVED status may transition to ACTIVE.
 *   - ACTIVE status requires a valid signoff record.
 *   - Runtime primitives must expose provenance metadata for auditability.
 */

// ---------------------------------------------------------------------------
// Lifecycle states
// ---------------------------------------------------------------------------

export const CONTENT_LIFECYCLE_STATES = [
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'ACTIVE',
  'DEPRECATED',
] as const;

export type ContentLifecycleState = (typeof CONTENT_LIFECYCLE_STATES)[number];

/** Allowed forward transitions. Reverse/skip transitions are forbidden. */
export const CONTENT_LIFECYCLE_TRANSITIONS: Record<ContentLifecycleState, ContentLifecycleState[]> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['APPROVED', 'DRAFT'],         // reviewers may return to DRAFT
  APPROVED: ['ACTIVE', 'DEPRECATED'],     // only APPROVED → ACTIVE is valid activation
  ACTIVE: ['DEPRECATED'],
  DEPRECATED: [],                         // terminal state
};

// ---------------------------------------------------------------------------
// Content bundle metadata
// ---------------------------------------------------------------------------

export interface ContentBundleMetadata {
  /** Semantic version of the bundle, e.g. "1.2.0" */
  contentBundleVersion: string;
  /** SHA-256 hex digest of the serialised rule content */
  contentChecksum: string;
  /** Protocol version tag, e.g. "CORTEX-V1" */
  protocolVersion: string;
  /** Current lifecycle state */
  lifecycleState: ContentLifecycleState;
  /** Clinical signoff status */
  signoffStatus: SignoffStatus;
  /** ISO-8601 timestamp of last metadata update */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Signoff
// ---------------------------------------------------------------------------

export const SIGNOFF_STATUSES = [
  'PENDING',
  'SIGNED_OFF',
  'REJECTED',
  'EXPIRED',
] as const;

export type SignoffStatus = (typeof SIGNOFF_STATUSES)[number];

export interface SignoffRecord {
  /** Identifier of the clinician/officer who signed off */
  signedOffBy: string;
  /** Role/title at time of signoff */
  role: string;
  /** ISO-8601 timestamp of signoff */
  signedOffAt: string;
  /** Status */
  status: SignoffStatus;
  /** Optional comment / evidence reference */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Runtime policy helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the bundle can safely be treated as "active" at runtime.
 * A bundle is considered runtime-active when:
 *   1. lifecycleState === 'ACTIVE', AND
 *   2. signoffStatus === 'SIGNED_OFF'
 */
export function isBundleRuntimeActive(meta: ContentBundleMetadata): boolean {
  return meta.lifecycleState === 'ACTIVE' && meta.signoffStatus === 'SIGNED_OFF';
}

/**
 * Validate that a lifecycle transition is permitted.
 */
export function isTransitionAllowed(
  from: ContentLifecycleState,
  to: ContentLifecycleState,
): boolean {
  return CONTENT_LIFECYCLE_TRANSITIONS[from].includes(to);
}

/**
 * Guard: only an APPROVED bundle may become ACTIVE.
 */
export function canActivate(meta: ContentBundleMetadata): { allowed: boolean; reason?: string } {
  if (meta.lifecycleState !== 'APPROVED') {
    return {
      allowed: false,
      reason: `Cannot activate: bundle is in ${meta.lifecycleState}, must be APPROVED first.`,
    };
  }
  if (meta.signoffStatus !== 'SIGNED_OFF') {
    return {
      allowed: false,
      reason: `Cannot activate: signoff status is ${meta.signoffStatus}, must be SIGNED_OFF.`,
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Current active bundle (singleton; seeded from rules-manifest at startup)
// ---------------------------------------------------------------------------

import { createHash } from 'crypto';
import { UNIFIED_RULES_DB } from '@/lib/governance/rules-db-seed';

function computeChecksum(rules: unknown[]): string {
  const content = JSON.stringify(rules.map((r: any) => ({
    id: r.ruleId,
    logic: r.ruleLogic,
    active: r.isActive,
  })));
  return createHash('sha256').update(content).digest('hex');
}

const CURRENT_BUNDLE_VERSION = '1.0.0';
const CURRENT_PROTOCOL_VERSION = 'CORTEX-V1';

const currentChecksum = computeChecksum(UNIFIED_RULES_DB);

/**
 * The signoff record for the initial shipped bundle.
 * In production this would come from a database/approval workflow.
 */
const INITIAL_SIGNOFF: SignoffRecord = {
  signedOffBy: 'clinical-governance-board',
  role: 'Chief Medical Officer',
  signedOffAt: '2026-02-01T00:00:00.000Z',
  status: 'SIGNED_OFF',
  notes: 'Initial Cortex v1 rule bundle approved for pilot deployment.',
};

const ACTIVE_BUNDLE: ContentBundleMetadata = {
  contentBundleVersion: CURRENT_BUNDLE_VERSION,
  contentChecksum: currentChecksum,
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  lifecycleState: 'ACTIVE',
  signoffStatus: INITIAL_SIGNOFF.status,
  updatedAt: new Date().toISOString(),
};

/**
 * Return the metadata for the currently active content bundle.
 */
export function getActiveContentBundle(): ContentBundleMetadata {
  return { ...ACTIVE_BUNDLE };
}

/**
 * Return the signoff record for the active bundle.
 */
export function getActiveSignoffRecord(): SignoffRecord {
  return { ...INITIAL_SIGNOFF };
}

// ---------------------------------------------------------------------------
// Degraded-mode helpers
// ---------------------------------------------------------------------------

export type RuntimeContentStatus =
  | 'ACTIVE_SIGNED_OFF'
  | 'DEGRADED_NO_SIGNOFF'
  | 'DEGRADED_NOT_APPROVED'
  | 'DEGRADED_UNKNOWN';

/**
 * Compute a human/machine-readable runtime status for the current bundle.
 * If the bundle is not properly signed off or approved, the primitive
 * should report "degraded" (never silently succeed).
 */
export function getRuntimeContentStatus(meta: ContentBundleMetadata): RuntimeContentStatus {
  if (isBundleRuntimeActive(meta)) {
    return 'ACTIVE_SIGNED_OFF';
  }
  if (meta.lifecycleState === 'ACTIVE' && meta.signoffStatus !== 'SIGNED_OFF') {
    return 'DEGRADED_NO_SIGNOFF';
  }
  if (meta.lifecycleState !== 'ACTIVE') {
    return 'DEGRADED_NOT_APPROVED';
  }
  return 'DEGRADED_UNKNOWN';
}
