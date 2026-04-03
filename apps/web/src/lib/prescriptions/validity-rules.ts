/**
 * Prescription Validity & Expiry Rules — ANVISA Regulations
 *
 * Calculates prescription expiration dates and enforces quantity limits
 * per ANVISA Portaria SVS/MS 344/1998 and RDC 20/2011.
 *
 * RUTH: These rules are legally binding. Do not weaken without ANVISA authorization.
 * ELENA: Clinical provenance — all rules reference specific ANVISA regulations.
 */

import type { PrescriptionTypeCode, ControlledSchedule } from '../brazil-interop/anvisa-drug-registry';

export interface ValidityRule {
  prescriptionType: PrescriptionTypeCode;
  maxValidityDays: number;
  maxUnitsPerPrescription: number | null;
  maxDaysSupply: number | null;
  requiresWitness: boolean;
  requiresCopyRetention: boolean;
  retentionCopies: number;
  requiresIcpBrasil: boolean;
  sncrRequired: boolean;
  sourceRegulation: string;
}

/**
 * Validity rules per prescription type.
 * Source: Portaria SVS/MS 344/1998, RDC 20/2011, RDC 1.000/2025.
 */
const VALIDITY_RULES: Record<PrescriptionTypeCode, ValidityRule> = {
  BRANCA: {
    prescriptionType: 'BRANCA',
    maxValidityDays: 30,
    maxUnitsPerPrescription: null,
    maxDaysSupply: null,
    requiresWitness: false,
    requiresCopyRetention: false,
    retentionCopies: 0,
    requiresIcpBrasil: false,
    sncrRequired: false,
    sourceRegulation: 'Portaria SVS/MS 344/1998 — Receituário Simples',
  },
  AZUL: {
    prescriptionType: 'AZUL',
    maxValidityDays: 30,
    maxUnitsPerPrescription: 5,
    maxDaysSupply: 60,
    requiresWitness: false,
    requiresCopyRetention: true,
    retentionCopies: 2,
    requiresIcpBrasil: true,
    sncrRequired: true,
    sourceRegulation: 'Portaria SVS/MS 344/1998 — Notificação de Receita B',
  },
  AMARELA: {
    prescriptionType: 'AMARELA',
    maxValidityDays: 30,
    maxUnitsPerPrescription: 1,
    maxDaysSupply: 30,
    requiresWitness: true,
    requiresCopyRetention: true,
    retentionCopies: 3,
    requiresIcpBrasil: true,
    sncrRequired: true,
    sourceRegulation: 'Portaria SVS/MS 344/1998 — Notificação de Receita A',
  },
  ESPECIAL: {
    prescriptionType: 'ESPECIAL',
    maxValidityDays: 30,
    maxUnitsPerPrescription: null,
    maxDaysSupply: 60,
    requiresWitness: false,
    requiresCopyRetention: true,
    retentionCopies: 2,
    requiresIcpBrasil: false,
    sncrRequired: true,
    sourceRegulation: 'Portaria SVS/MS 344/1998 — Receita de Controle Especial (Lista C)',
  },
  ANTIMICROBIAL: {
    prescriptionType: 'ANTIMICROBIAL',
    maxValidityDays: 10,
    maxUnitsPerPrescription: null,
    maxDaysSupply: null,
    requiresWitness: false,
    requiresCopyRetention: true,
    retentionCopies: 1,
    requiresIcpBrasil: false,
    sncrRequired: false,
    sourceRegulation: 'ANVISA RDC 20/2011 — Antimicrobianos',
  },
};

export function getValidityRule(type: PrescriptionTypeCode): ValidityRule {
  return VALIDITY_RULES[type];
}

/**
 * Calculate the `validUntil` date for a prescription based on its type.
 */
export function calculateValidUntil(
  prescriptionType: PrescriptionTypeCode,
  signedAt: Date = new Date(),
): Date {
  const rule = VALIDITY_RULES[prescriptionType];
  const validUntil = new Date(signedAt);
  validUntil.setDate(validUntil.getDate() + rule.maxValidityDays);
  return validUntil;
}

export interface ValidationError {
  code: string;
  message: string;
  regulation: string;
  severity: 'BLOCK' | 'WARNING';
}

/**
 * Validate a prescription against ANVISA rules before signing.
 * Returns blocking errors and warnings.
 */
export function validatePrescription(params: {
  prescriptionType: PrescriptionTypeCode;
  controlledSchedule: ControlledSchedule;
  signatureMethod: string;
  medicationCount: number;
  daysSupply?: number | null;
  hasWitness?: boolean;
}): ValidationError[] {
  const errors: ValidationError[] = [];
  const rule = VALIDITY_RULES[params.prescriptionType];

  // RUTH: ICP-Brasil required for controlled substances
  if (
    rule.requiresIcpBrasil &&
    params.signatureMethod !== 'icp_brasil'
  ) {
    errors.push({
      code: 'RX_SIGNATURE_INSUFFICIENT',
      message: `${params.prescriptionType} prescriptions require ICP-Brasil digital signature (Advanced/Qualified). Current method: ${params.signatureMethod}`,
      regulation: rule.sourceRegulation,
      severity: 'BLOCK',
    });
  }

  // RUTH: Witness required for yellow prescriptions
  if (rule.requiresWitness && !params.hasWitness) {
    errors.push({
      code: 'RX_WITNESS_REQUIRED',
      message: `${params.prescriptionType} prescriptions require a witness for dispensing. ANVISA mandates witness for Lista ${params.controlledSchedule} substances.`,
      regulation: rule.sourceRegulation,
      severity: 'WARNING',
    });
  }

  // RUTH: Maximum units per prescription
  if (
    rule.maxUnitsPerPrescription !== null &&
    params.medicationCount > rule.maxUnitsPerPrescription
  ) {
    errors.push({
      code: 'RX_UNITS_EXCEEDED',
      message: `${params.prescriptionType} prescriptions allow max ${rule.maxUnitsPerPrescription} unit(s). Requested: ${params.medicationCount}`,
      regulation: rule.sourceRegulation,
      severity: 'BLOCK',
    });
  }

  // RUTH: Maximum days supply
  if (
    rule.maxDaysSupply !== null &&
    params.daysSupply != null &&
    params.daysSupply > rule.maxDaysSupply
  ) {
    errors.push({
      code: 'RX_DAYS_SUPPLY_EXCEEDED',
      message: `${params.prescriptionType} prescriptions allow max ${rule.maxDaysSupply} days supply. Requested: ${params.daysSupply}`,
      regulation: rule.sourceRegulation,
      severity: 'BLOCK',
    });
  }

  // RUTH: SNCR submission required for controlled/especial
  if (rule.sncrRequired) {
    errors.push({
      code: 'RX_SNCR_REQUIRED',
      message: `${params.prescriptionType} prescriptions must be submitted to SNCR after signing (ANVISA RDC 1.000/2025).`,
      regulation: 'ANVISA RDC 1.000/2025 — SNCR',
      severity: 'WARNING',
    });
  }

  return errors;
}

/**
 * Check if a prescription has expired.
 */
export function isPrescriptionExpired(validUntil: Date): boolean {
  return new Date() > validUntil;
}

/**
 * Check if a prescription is approaching expiry (within 3 days).
 */
export function isPrescriptionExpiringSoon(validUntil: Date): boolean {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  return new Date() <= validUntil && validUntil <= threeDaysFromNow;
}

/**
 * Check refill eligibility.
 */
export function canRefill(params: {
  prescriptionType: PrescriptionTypeCode;
  validUntil: Date;
  refillsRemaining: number;
}): { eligible: boolean; reason?: string } {
  if (isPrescriptionExpired(params.validUntil)) {
    return { eligible: false, reason: 'Prescription has expired' };
  }

  if (params.refillsRemaining <= 0) {
    return { eligible: false, reason: 'No refills remaining' };
  }

  // RUTH: Yellow prescriptions cannot be refilled
  if (params.prescriptionType === 'AMARELA') {
    return { eligible: false, reason: 'Receita Amarela (Lista A) prescriptions cannot be refilled — new prescription required' };
  }

  return { eligible: true };
}
