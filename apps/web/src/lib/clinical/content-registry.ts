/**
 * Clinical Content Registry
 *
 * In-memory registry backed by a validated ClinicalContentBundle.
 * Provides fast lookup APIs used by the rule engine, validate-dose,
 * and future consumers.
 *
 * Thread-safe for single-process Node (Next.js server).
 * For multi-process deployments, each process loads its own copy.
 *
 * @module lib/clinical/content-registry
 */

import type {
  ClinicalContentBundle,
  ClinicalBundleManifest,
  ClinicalRuleRecord,
  ClinicalRuleDomain,
} from './content-types';
import { loadBundle } from './content-loader';

// ============================================================================
// Registry state
// ============================================================================

let currentBundle: ClinicalContentBundle | null = null;
let ruleIndex: Map<string, ClinicalRuleRecord> = new Map();
let domainIndex: Map<ClinicalRuleDomain, ClinicalRuleRecord[]> = new Map();

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize (or re-initialize) the registry from a raw bundle object.
 * Validates the bundle on load; throws on malformed data.
 */
export function initializeRegistry(rawBundle: unknown): void {
  const bundle = loadBundle(rawBundle);
  currentBundle = bundle;

  // Build indexes
  const byId = new Map<string, ClinicalRuleRecord>();
  const byDomain = new Map<ClinicalRuleDomain, ClinicalRuleRecord[]>();

  for (const rule of bundle.rules) {
    byId.set(rule.ruleId, rule);

    const domainRules = byDomain.get(rule.domain) ?? [];
    domainRules.push(rule);
    byDomain.set(rule.domain, domainRules);
  }

  ruleIndex = byId;
  domainIndex = byDomain;
}

/**
 * Clear the registry (useful for testing).
 */
export function clearRegistry(): void {
  currentBundle = null;
  ruleIndex = new Map();
  domainIndex = new Map();
}

// ============================================================================
// Query APIs
// ============================================================================

/**
 * Check whether the registry has been initialized with a valid bundle.
 */
export function isRegistryReady(): boolean {
  return currentBundle !== null;
}

/**
 * Get a single rule by its ruleId.
 * Returns undefined if not found or registry is not initialized.
 */
export function getRegistryRuleById(ruleId: string): ClinicalRuleRecord | undefined {
  return ruleIndex.get(ruleId);
}

/**
 * List all rules belonging to a given domain (e.g. "CONTRAINDICATION").
 * Returns an empty array if the domain has no rules or the registry is uninitialized.
 */
export function listRulesByDomain(domain: ClinicalRuleDomain): ClinicalRuleRecord[] {
  return domainIndex.get(domain) ?? [];
}

/**
 * Get all loaded rules. Order matches the deterministic bundle sort (by ruleId).
 */
export function getAllRegistryRules(): ClinicalRuleRecord[] {
  return currentBundle?.rules ?? [];
}

/**
 * Get the bundle manifest metadata.
 * Returns null if the registry is not initialized.
 */
export function getBundleMetadata(): ClinicalBundleManifest | null {
  return currentBundle?.manifest ?? null;
}

/**
 * Get the total number of rules loaded.
 */
export function getRegistryRuleCount(): number {
  return ruleIndex.size;
}

/**
 * Get domain → count breakdown.
 */
export function getRegistryDomainCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [domain, rules] of domainIndex.entries()) {
    counts[domain] = rules.length;
  }
  return counts;
}
