/**
 * RuleRegistry — loads, validates, and indexes clinical rules.
 *
 * ELENA invariant enforcement:
 *   - Every rule MUST have sourceAuthority (non-empty string)
 *   - Every rule MUST have citationUrl (non-empty, valid URL)
 *   - Throws at load time if any rule violates either constraint
 *   - LLM output MUST NOT be used as sourceAuthority
 *
 * @module @holi/prevention-engine/rule-registry
 */

import type { ClinicalRule } from './types';

// Static imports of all rule JSON files
// resolveJsonModule: true required in tsconfig
import labAlerts from './rules/lab-alerts.json';
import vitalAlerts from './rules/vital-alerts.json';
import screeningGaps from './rules/screening-gaps.json';
import familyHistoryEscalation from './rules/family-history-escalation.json';

const ALL_RULE_FILES: { name: string; rules: unknown[] }[] = [
  { name: 'lab-alerts.json', rules: labAlerts },
  { name: 'vital-alerts.json', rules: vitalAlerts },
  { name: 'screening-gaps.json', rules: screeningGaps },
  { name: 'family-history-escalation.json', rules: familyHistoryEscalation },
];

const URL_REGEX = /^https?:\/\/.+/;

/** Validate a single rule satisfies ELENA invariants. Throws if violated. */
function validateRule(rule: unknown, sourceFile: string): ClinicalRule {
  const r = rule as Partial<ClinicalRule>;

  if (!r.ruleId || typeof r.ruleId !== 'string') {
    throw new Error(`[ELENA VETO] Rule in ${sourceFile} missing ruleId`);
  }

  // ELENA invariant: sourceAuthority is mandatory
  if (!r.sourceAuthority || typeof r.sourceAuthority !== 'string' || r.sourceAuthority.trim() === '') {
    throw new Error(
      `[ELENA VETO] Rule "${r.ruleId}" in ${sourceFile} missing sourceAuthority. ` +
      `Every clinical rule must cite its evidence source.`
    );
  }

  // ELENA invariant: citationUrl is mandatory and must look like a URL
  if (!r.citationUrl || typeof r.citationUrl !== 'string' || !URL_REGEX.test(r.citationUrl)) {
    throw new Error(
      `[ELENA VETO] Rule "${r.ruleId}" in ${sourceFile} missing or invalid citationUrl. ` +
      `URL must start with http:// or https://.`
    );
  }

  // ELENA invariant: LLM output as clinical source is prohibited
  const lowerAuthority = r.sourceAuthority.toLowerCase();
  if (lowerAuthority.includes('claude') || lowerAuthority.includes('chatgpt') ||
      lowerAuthority.includes('gpt-') || lowerAuthority.includes('llm') ||
      lowerAuthority.includes('ai-generated')) {
    throw new Error(
      `[ELENA VETO] Rule "${r.ruleId}" sourceAuthority appears to cite LLM output. ` +
      `LLM output MUST NOT be used as a clinical evidence source.`
    );
  }

  // Required structural fields
  const required: (keyof ClinicalRule)[] = ['name', 'category', 'targetRecordType', 'condition', 'severity', 'message', 'actionRequired'];
  for (const field of required) {
    if (r[field] === undefined || r[field] === null || r[field] === '') {
      throw new Error(`[ELENA VETO] Rule "${r.ruleId}" in ${sourceFile} missing required field: ${field}`);
    }
  }

  return r as ClinicalRule;
}

export class RuleRegistry {
  private rules: Map<string, ClinicalRule> = new Map();
  private byRecordType: Map<string, ClinicalRule[]> = new Map();
  private byCategory: Map<string, ClinicalRule[]> = new Map();

  constructor() {
    this.loadAll();
  }

  private loadAll(): void {
    for (const { name, rules } of ALL_RULE_FILES) {
      for (const raw of rules) {
        const rule = validateRule(raw, name);
        this.register(rule);
      }
    }
  }

  private register(rule: ClinicalRule): void {
    if (this.rules.has(rule.ruleId)) {
      throw new Error(`[QUINN] Duplicate ruleId detected: "${rule.ruleId}". Rule IDs must be globally unique.`);
    }
    this.rules.set(rule.ruleId, rule);

    // Index by record type
    const byType = this.byRecordType.get(rule.targetRecordType) ?? [];
    byType.push(rule);
    this.byRecordType.set(rule.targetRecordType, byType);

    // Index by category
    const byCat = this.byCategory.get(rule.category) ?? [];
    byCat.push(rule);
    this.byCategory.set(rule.category, byCat);
  }

  /** Get all rules applicable to a given CanonicalRecordType */
  getRulesForRecordType(recordType: string): ClinicalRule[] {
    return this.byRecordType.get(recordType) ?? [];
  }

  /** Get a single rule by ID */
  getRule(ruleId: string): ClinicalRule | undefined {
    return this.rules.get(ruleId);
  }

  /** Get all loaded rules */
  getAllRules(): ClinicalRule[] {
    return Array.from(this.rules.values());
  }

  /** Total loaded rule count */
  get count(): number {
    return this.rules.size;
  }

  /** Add custom rules at runtime (e.g. from a database) — validates ELENA invariants */
  registerCustomRule(rule: ClinicalRule): void {
    validateRule(rule, 'runtime-custom');
    this.register(rule);
  }
}

/** Singleton instance for use across the prevention engine */
export const ruleRegistry = new RuleRegistry();
