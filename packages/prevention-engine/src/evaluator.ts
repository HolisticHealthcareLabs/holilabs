/**
 * PreventionEvaluator — evaluates CanonicalHealthRecord objects against clinical rules.
 *
 * ELENA invariants:
 *   1. Missing lab value → return INSUFFICIENT_DATA, never impute silently
 *   2. All rules must have sourceAuthority + citationUrl (enforced by RuleRegistry)
 *   3. LLM output MUST NOT be written as clinical recommendation without review flag
 *   4. humanReviewRequired is set true when any AI-adjacent processing is involved
 *
 * RUTH invariant: // ANVISA SaMD: Class I — informational clinical decision support
 *
 * @module @holi/prevention-engine/evaluator
 */

import { randomUUID } from 'crypto';
import type { CanonicalHealthRecord, CanonicalLabResult, CanonicalVitalSign } from '@holi/data-ingestion';
import type { ClinicalRule, PatientHistory, PreventionAlert, RuleConditionOperator } from './types';
import { ruleRegistry } from './rule-registry';

// RUTH: ANVISA SaMD: Class I — this module provides informational alerts only, not diagnostic decisions.

export class PreventionEvaluator {
  /**
   * Evaluate a single CanonicalHealthRecord against all applicable clinical rules.
   * Returns an array of PreventionAlerts (empty if no rules match).
   *
   * ELENA: INSUFFICIENT_DATA records produce no alerts (their validation errors already
   * surface to the caller via the ingestion pipeline).
   */
  evaluate(record: CanonicalHealthRecord, history?: PatientHistory): PreventionAlert[] {
    // Do not evaluate records that failed validation — ELENA invariant
    if (!record.validation.isValid) {
      return [];
    }

    const rules = ruleRegistry.getRulesForRecordType(record.recordType);
    const alerts: PreventionAlert[] = [];

    for (const rule of rules) {
      const alert = this.applyRule(rule, record, history);
      if (alert) alerts.push(alert);
    }

    return alerts;
  }

  private applyRule(
    rule: ClinicalRule,
    record: CanonicalHealthRecord,
    history?: PatientHistory,
  ): PreventionAlert | null {
    const payload = record.payload;

    let matched = false;
    let fieldValue: number | undefined;

    // Resolve the numeric value from the payload based on record type
    if (record.recordType === 'LAB_RESULT') {
      const lab = payload as CanonicalLabResult;
      const raw = lab.value;
      if (typeof raw === 'number') {
        fieldValue = raw;
      } else if (typeof raw === 'string') {
        const parsed = parseFloat(raw);
        if (isNaN(parsed)) return null; // non-numeric lab result, skip
        fieldValue = parsed;
      } else {
        return null;
      }

      // Unit check — if rule specifies a unit and it doesn't match, skip
      if (rule.condition.unit && lab.unit && !this.unitsCompatible(lab.unit, rule.condition.unit)) {
        return null;
      }

      matched = this.evaluateCondition(rule.condition.operator, fieldValue, rule.condition.value as number);

    } else if (record.recordType === 'VITAL_SIGN') {
      const vital = payload as CanonicalVitalSign;
      fieldValue = vital.value;

      if (rule.condition.unit && vital.unit && !this.unitsCompatible(vital.unit, rule.condition.unit)) {
        return null;
      }

      matched = this.evaluateCondition(rule.condition.operator, fieldValue, rule.condition.value as number);

    } else if (record.recordType === 'PATIENT_DEMOGRAPHICS') {
      // Screening gap rules — check against patient history
      matched = this.evaluateScreeningGap(rule, history);
    }

    if (!matched) return null;

    return {
      alertId: randomUUID(),
      patientId: record.patientId ?? 'UNKNOWN',
      tenantId: record.tenantId,
      rule,
      severity: rule.severity,
      message: rule.message,
      actionRequired: rule.actionRequired,
      citationUrl: rule.citationUrl,
      triggeredAt: new Date(),
      recordType: record.recordType,
      sourceRecordId: record.ingestId,
      // ELENA: human review required for any alert that could influence clinical decisions
      humanReviewRequired: true,
    };
  }

  private evaluateCondition(
    operator: RuleConditionOperator,
    actual: number,
    threshold: number | undefined,
  ): boolean {
    if (threshold === undefined) return false;
    switch (operator) {
      case '>':  return actual > threshold;
      case '>=': return actual >= threshold;
      case '<':  return actual < threshold;
      case '<=': return actual <= threshold;
      case '==': return actual === threshold;
      case '!=': return actual !== threshold;
      default:   return false;
    }
  }

  private evaluateScreeningGap(rule: ClinicalRule, history?: PatientHistory): boolean {
    if (!history) return false;
    if (rule.condition.operator !== 'OVERDUE_BY_DAYS') return false;

    const overdueDays = rule.condition.value as number;
    const fieldPath = rule.condition.field; // e.g. "lastScreeningDates.MAMMOGRAM"

    const [category, key] = fieldPath.split('.');
    if (!key) return false;

    if (category === 'lastScreeningDates') {
      const lastDate = history.lastScreeningDates?.[key];
      if (!lastDate) return true; // Never screened = overdue
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > overdueDays;
    }

    if (category === 'lastLabResults') {
      const lastLab = history.lastLabResults?.[key];
      if (!lastLab) return true; // Never tested = overdue
      const daysSince = (Date.now() - lastLab.date.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > overdueDays;
    }

    if (category === 'lastVitals') {
      const lastVital = history.lastVitals?.[key];
      if (!lastVital) return true; // Never measured = overdue
      const daysSince = (Date.now() - lastVital.date.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > overdueDays;
    }

    return false;
  }

  /**
   * Evaluate existing alerts against family history escalation rules.
   * For each FAMILY_HISTORY_ESCALATION rule, checks if:
   * 1. The rule's escalatesRule matches an existing alert's rule.ruleId
   * 2. The patient's familyHistory contains a condition whose ICD code
   *    starts with the rule's condition.value
   * Returns the merged alert array (original + escalated).
   */
  evaluateWithFamilyHistory(
    record: CanonicalHealthRecord,
    history: PatientHistory,
    existingAlerts: PreventionAlert[],
  ): PreventionAlert[] {
    if (!history.familyHistory?.length) {
      return existingAlerts;
    }

    const escalationRules = ruleRegistry.getAllRules().filter(
      r => r.category === 'FAMILY_HISTORY_ESCALATION'
    );

    const escalatedAlerts: PreventionAlert[] = [];

    for (const rule of escalationRules) {
      if (!rule.escalatesRule) continue;

      const matchingAlert = existingAlerts.find(
        a => a.rule.ruleId === rule.escalatesRule
      );
      if (!matchingAlert) continue;

      const icdPrefix = rule.condition.value as string;
      const hasFamilyMatch = history.familyHistory.some(member =>
        member.conditions.some(c => c.icdCode.startsWith(icdPrefix))
      );
      if (!hasFamilyMatch) continue;

      escalatedAlerts.push({
        alertId: randomUUID(),
        patientId: record.patientId ?? 'UNKNOWN',
        tenantId: record.tenantId,
        rule,
        severity: rule.escalatedSeverity ?? rule.severity,
        message: rule.message,
        actionRequired: rule.actionRequired,
        citationUrl: rule.citationUrl,
        triggeredAt: new Date(),
        recordType: record.recordType,
        sourceRecordId: record.ingestId,
        humanReviewRequired: true,
      });
    }

    return [...existingAlerts, ...escalatedAlerts];
  }

  /**
   * Check if two unit strings are compatible (case-insensitive, handle common aliases).
   * ELENA: we do NOT silently convert between units — if incompatible, skip the rule.
   */
  private unitsCompatible(recordUnit: string, ruleUnit: string): boolean {
    const normalize = (u: string) => u.toLowerCase().replace(/\s+/g, '').replace('°', '');
    const a = normalize(recordUnit);
    const b = normalize(ruleUnit);
    if (a === b) return true;

    // Common aliases
    const aliases: Record<string, string[]> = {
      'mmhg': ['mmhg', 'mm hg', 'mm_hg'],
      '%': ['%', 'percent', 'pct'],
      'mg/dl': ['mg/dl', 'mg/dl'],
      'meq/l': ['meq/l', 'mmol/l'],  // Note: not always interchangeable — ELENA warning
      'miu/l': ['miu/l', 'μiu/ml', 'uiu/ml'],
      'c': ['c', 'celsius', 'degc'],
      'bpm': ['bpm', '/min', 'beats/min'],
    };

    for (const group of Object.values(aliases)) {
      if (group.includes(a) && group.includes(b)) return true;
    }

    return false;
  }
}

/** Singleton evaluator instance */
export const preventionEvaluator = new PreventionEvaluator();
