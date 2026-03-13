/**
 * Mercosur Compliance Engine
 *
 * Country-specific healthcare and data privacy compliance rules
 * for Latin American jurisdictions.
 */

export type MercosurCountry = 'BR' | 'AR' | 'BO' | 'UY' | 'PY' | 'CO' | 'MX' | 'US';

export interface ConsentRequirement {
  id: string;
  label: string;
  description: string;
  required: boolean;
  defaultValue: boolean;
}

export interface ComplianceRuleSet {
  country: MercosurCountry;
  countryName: string;
  dataPrivacyLaw: string;
  healthRegulator: string;
  retentionYears: number;
  consentModel: 'opt-in' | 'opt-out';
  dataResidency: 'local' | 'regional' | 'global';
  requiredPatientFields: string[];
  optionalPatientFields: string[];
  hiddenPatientFields: string[];
  consentRequirements: ConsentRequirement[];
  auditRequirements: string[];
}

const COMPLIANCE_RULES: Record<MercosurCountry, ComplianceRuleSet> = {
  BR: {
    country: 'BR',
    countryName: 'Brazil',
    dataPrivacyLaw: 'LGPD (Lei 13.709/2018)',
    healthRegulator: 'ANVISA + CFM',
    retentionYears: 20,
    consentModel: 'opt-in',
    dataResidency: 'local',
    requiredPatientFields: ['firstName', 'lastName', 'dateOfBirth', 'sex', 'cpf'],
    optionalPatientFields: ['cns', 'rg', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'payer', 'emergencyContactName', 'emergencyContactPhone'],
    hiddenPatientFields: ['dni', 'cuil', 'curp', 'ssn'],
    consentRequirements: [
      { id: 'data-processing', label: 'Data Processing Consent', description: 'I consent to the processing of my personal and health data for clinical care and consultations per LGPD Art. 7 and Art. 11.', required: true, defaultValue: false },
      { id: 'ai-analysis', label: 'AI-Assisted Analysis', description: 'I consent to the use of AI-assisted clinical decision support tools for diagnostic and treatment suggestions.', required: false, defaultValue: false },
      { id: 'cross-border', label: 'Cross-Border Data Transfer', description: 'I consent to the transfer of my de-identified health data to servers outside Brazil per LGPD Art. 33.', required: false, defaultValue: false },
      { id: 'privacy-notice', label: 'Privacy Notice', description: 'I acknowledge I have received and understood the Privacy Notice describing how my data is collected, used, and protected.', required: true, defaultValue: false },
    ],
    auditRequirements: ['accessReason', 'accessPurpose', 'ipAddress', 'userAgent'],
  },

  AR: {
    country: 'AR',
    countryName: 'Argentina',
    dataPrivacyLaw: 'PDPA (Ley 25.326)',
    healthRegulator: 'Superintendencia de Servicios de Salud + ANMAT',
    retentionYears: 15,
    consentModel: 'opt-in',
    dataResidency: 'regional',
    requiredPatientFields: ['firstName', 'lastName', 'dateOfBirth', 'sex', 'dni'],
    optionalPatientFields: ['cuil', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'payer', 'emergencyContactName', 'emergencyContactPhone'],
    hiddenPatientFields: ['cpf', 'cns', 'rg', 'curp', 'ssn'],
    consentRequirements: [
      { id: 'data-processing', label: 'Consentimiento de Procesamiento', description: 'Consiento el procesamiento de mis datos personales y de salud para atención clínica según la Ley 25.326.', required: true, defaultValue: false },
      { id: 'ai-analysis', label: 'Análisis con IA', description: 'Consiento el uso de herramientas de soporte clínico asistidas por IA para sugerencias diagnósticas y de tratamiento.', required: false, defaultValue: false },
      { id: 'privacy-notice', label: 'Aviso de Privacidad', description: 'Reconozco haber recibido y comprendido el Aviso de Privacidad.', required: true, defaultValue: false },
    ],
    auditRequirements: ['accessReason', 'ipAddress'],
  },

  BO: {
    country: 'BO',
    countryName: 'Bolivia',
    dataPrivacyLaw: 'Constitution Art. 21 + Habeas Data',
    healthRegulator: 'AGEMED + CNS',
    retentionYears: 10,
    consentModel: 'opt-in',
    dataResidency: 'regional',
    requiredPatientFields: ['firstName', 'lastName', 'dateOfBirth', 'sex'],
    optionalPatientFields: ['ci', 'email', 'phone', 'address', 'city', 'payer', 'emergencyContactName', 'emergencyContactPhone'],
    hiddenPatientFields: ['cpf', 'cns', 'rg', 'dni', 'cuil', 'curp', 'ssn'],
    consentRequirements: [
      { id: 'data-processing', label: 'Consentimiento de Datos', description: 'Consiento el tratamiento de mis datos personales y de salud para atención médica.', required: true, defaultValue: false },
      { id: 'privacy-notice', label: 'Aviso de Privacidad', description: 'Reconozco haber recibido el aviso de privacidad.', required: true, defaultValue: false },
    ],
    auditRequirements: ['accessReason'],
  },

  UY: {
    country: 'UY',
    countryName: 'Uruguay',
    dataPrivacyLaw: 'LPDP (Ley 18.331)',
    healthRegulator: 'MSP',
    retentionYears: 15,
    consentModel: 'opt-in',
    dataResidency: 'regional',
    requiredPatientFields: ['firstName', 'lastName', 'dateOfBirth', 'sex', 'ci'],
    optionalPatientFields: ['email', 'phone', 'address', 'city', 'payer'],
    hiddenPatientFields: ['cpf', 'cns', 'rg', 'dni', 'cuil', 'curp', 'ssn'],
    consentRequirements: [
      { id: 'data-processing', label: 'Consentimiento', description: 'Consiento el procesamiento de mis datos de salud según la Ley 18.331.', required: true, defaultValue: false },
      { id: 'privacy-notice', label: 'Aviso de Privacidad', description: 'Reconozco el aviso de privacidad.', required: true, defaultValue: false },
    ],
    auditRequirements: ['accessReason'],
  },

  PY: {
    country: 'PY',
    countryName: 'Paraguay',
    dataPrivacyLaw: 'Constitution Art. 135 (Habeas Data)',
    healthRegulator: 'MSPyBS',
    retentionYears: 10,
    consentModel: 'opt-in',
    dataResidency: 'global',
    requiredPatientFields: ['firstName', 'lastName', 'dateOfBirth', 'sex'],
    optionalPatientFields: ['ci', 'email', 'phone', 'address', 'payer'],
    hiddenPatientFields: ['cpf', 'cns', 'rg', 'dni', 'cuil', 'curp', 'ssn'],
    consentRequirements: [
      { id: 'data-processing', label: 'Consentimiento', description: 'Consiento el tratamiento de mis datos para atención médica.', required: true, defaultValue: false },
    ],
    auditRequirements: ['accessReason'],
  },

  CO: {
    country: 'CO',
    countryName: 'Colombia',
    dataPrivacyLaw: 'Ley 1581 de 2012',
    healthRegulator: 'MinSalud + INVIMA',
    retentionYears: 15,
    consentModel: 'opt-in',
    dataResidency: 'regional',
    requiredPatientFields: ['firstName', 'lastName', 'dateOfBirth', 'sex', 'cc'],
    optionalPatientFields: ['email', 'phone', 'address', 'city', 'state', 'payer'],
    hiddenPatientFields: ['cpf', 'cns', 'rg', 'dni', 'cuil', 'curp', 'ssn'],
    consentRequirements: [
      { id: 'data-processing', label: 'Autorización de Datos', description: 'Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012.', required: true, defaultValue: false },
      { id: 'ai-analysis', label: 'Análisis con IA', description: 'Autorizo el uso de herramientas de IA para soporte clínico.', required: false, defaultValue: false },
      { id: 'privacy-notice', label: 'Aviso de Privacidad', description: 'Reconozco el aviso de privacidad de la entidad.', required: true, defaultValue: false },
    ],
    auditRequirements: ['accessReason', 'ipAddress'],
  },

  MX: {
    country: 'MX',
    countryName: 'Mexico',
    dataPrivacyLaw: 'LFPDPPP (Ley Federal de Protección de Datos)',
    healthRegulator: 'COFEPRIS + Secretaría de Salud',
    retentionYears: 12,
    consentModel: 'opt-in',
    dataResidency: 'local',
    requiredPatientFields: ['firstName', 'lastName', 'dateOfBirth', 'sex', 'curp'],
    optionalPatientFields: ['rfc', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'payer'],
    hiddenPatientFields: ['cpf', 'cns', 'rg', 'dni', 'cuil', 'ssn'],
    consentRequirements: [
      { id: 'data-processing', label: 'Aviso de Privacidad', description: 'Acepto el tratamiento de mis datos personales conforme al Aviso de Privacidad y la LFPDPPP.', required: true, defaultValue: false },
      { id: 'ai-analysis', label: 'Análisis con IA', description: 'Autorizo el uso de herramientas de IA para asistencia clínica.', required: false, defaultValue: false },
    ],
    auditRequirements: ['accessReason', 'ipAddress'],
  },

  US: {
    country: 'US',
    countryName: 'United States',
    dataPrivacyLaw: 'HIPAA (45 CFR Parts 160, 164)',
    healthRegulator: 'HHS / OCR + FDA',
    retentionYears: 6,
    consentModel: 'opt-out',
    dataResidency: 'global',
    requiredPatientFields: ['firstName', 'lastName', 'dateOfBirth', 'sex'],
    optionalPatientFields: ['ssn', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'payer', 'emergencyContactName', 'emergencyContactPhone'],
    hiddenPatientFields: ['cpf', 'cns', 'rg', 'dni', 'cuil', 'curp'],
    consentRequirements: [
      { id: 'hipaa-auth', label: 'HIPAA Authorization', description: 'I authorize the use and disclosure of my protected health information for treatment, payment, and healthcare operations.', required: true, defaultValue: false },
      { id: 'ai-analysis', label: 'AI-Assisted Decision Support', description: 'I acknowledge that AI-assisted clinical decision support tools may be used in my care.', required: false, defaultValue: true },
      { id: 'notice-privacy', label: 'Notice of Privacy Practices', description: 'I acknowledge receipt of the Notice of Privacy Practices.', required: true, defaultValue: false },
    ],
    auditRequirements: ['accessReason', 'accessPurpose', 'ipAddress', 'userAgent'],
  },
};

export function getComplianceRules(country: MercosurCountry): ComplianceRuleSet {
  return COMPLIANCE_RULES[country] ?? COMPLIANCE_RULES.BR;
}

export function getAllCountries(): { code: MercosurCountry; name: string }[] {
  return Object.values(COMPLIANCE_RULES).map((r) => ({ code: r.country, name: r.countryName }));
}

export function isFieldRequired(country: MercosurCountry, fieldName: string): boolean {
  const rules = getComplianceRules(country);
  return rules.requiredPatientFields.includes(fieldName);
}

export function isFieldHidden(country: MercosurCountry, fieldName: string): boolean {
  const rules = getComplianceRules(country);
  return rules.hiddenPatientFields.includes(fieldName);
}
