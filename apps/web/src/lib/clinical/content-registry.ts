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

import * as fs from 'node:fs';
import * as path from 'node:path';

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

// ============================================================================
// Lazy initialization (cold-path loader)
// ============================================================================

/**
 * Resolve the path to the latest clinical content bundle.
 * Uses process.cwd() which in Next.js points to the project root.
 */
function resolveBundlePath(): string {
  // In Next.js, process.cwd() is the apps/web directory (project root).
  // The bundle lives at ../../data/clinical/bundles/latest.json relative to it,
  // or we can resolve from the monorepo root.
  const candidates = [
    path.resolve(process.cwd(), 'data', 'clinical', 'bundles', 'latest.json'),
    path.resolve(process.cwd(), '..', '..', 'data', 'clinical', 'bundles', 'latest.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Clinical content bundle not found. Searched: ${candidates.join(', ')}. ` +
    `Run "tsx scripts/clinical/build-content-bundle.ts" to generate.`
  );
}

/**
 * Ensure the clinical content registry is initialized with the latest bundle.
 *
 * This function is idempotent: if the registry is already loaded, it returns
 * immediately (fast path). On cold start, it reads the bundle from disk,
 * validates it, and populates the in-memory indexes.
 *
 * **Must be called before any rule evaluation in safety-critical paths.**
 * Throws on failure — never silently degrades.
 */
export function ensureRegistryInitialized(): void {
  if (isRegistryReady()) {
    return; // Fast path: already loaded
  }

  const bundlePath = resolveBundlePath();

  let rawJson: string;
  try {
    rawJson = fs.readFileSync(bundlePath, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read clinical content bundle at ${bundlePath}: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse clinical content bundle JSON: ${message}`);
  }

  // initializeRegistry() calls loadBundle() which validates and throws on error
  initializeRegistry(parsed);

  // Log success (non-sensitive metadata only)
  const ruleCount = getRegistryRuleCount();
  const domainCounts = getRegistryDomainCounts();
  console.info(
    `[content-registry] Initialized: ${ruleCount} rules loaded from ${bundlePath}. ` +
    `Domains: ${JSON.stringify(domainCounts)}`
  );
}

