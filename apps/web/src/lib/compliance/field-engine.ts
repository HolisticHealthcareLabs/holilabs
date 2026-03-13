/**
 * Dynamic Field Engine
 *
 * Determines which patient fields are required, optional, or hidden
 * based on the workspace's compliance jurisdiction.
 */

import { type MercosurCountry, getComplianceRules, isFieldHidden, isFieldRequired } from './mercosur-engine';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'tel' | 'email';
  section: 'personal' | 'contact' | 'ids' | 'insurance' | 'emergency' | 'clinical';
  required: boolean;
  hidden: boolean;
  placeholder?: string;
  mask?: string;
}

const ALL_FIELDS: Omit<FieldConfig, 'required' | 'hidden'>[] = [
  { name: 'firstName', label: 'First Name', type: 'text', section: 'personal' },
  { name: 'lastName', label: 'Last Name', type: 'text', section: 'personal' },
  { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', section: 'personal' },
  { name: 'sex', label: 'Sex', type: 'select', section: 'personal' },
  { name: 'email', label: 'Email', type: 'email', section: 'contact' },
  { name: 'phone', label: 'Phone', type: 'tel', section: 'contact' },
  { name: 'address', label: 'Address', type: 'text', section: 'contact' },
  { name: 'city', label: 'City', type: 'text', section: 'contact' },
  { name: 'state', label: 'State / Province', type: 'text', section: 'contact' },
  { name: 'postalCode', label: 'Postal Code', type: 'text', section: 'contact' },
  { name: 'cpf', label: 'CPF', type: 'text', section: 'ids', placeholder: '000.000.000-00', mask: '###.###.###-##' },
  { name: 'cns', label: 'CNS (Cartao SUS)', type: 'text', section: 'ids', placeholder: '000 0000 0000 0000' },
  { name: 'rg', label: 'RG', type: 'text', section: 'ids', placeholder: '00.000.000-0' },
  { name: 'dni', label: 'DNI', type: 'text', section: 'ids', placeholder: '00.000.000' },
  { name: 'cuil', label: 'CUIL', type: 'text', section: 'ids', placeholder: '00-00000000-0' },
  { name: 'ci', label: 'CI (Cedula de Identidad)', type: 'text', section: 'ids' },
  { name: 'curp', label: 'CURP', type: 'text', section: 'ids', placeholder: '18 characters' },
  { name: 'rfc', label: 'RFC', type: 'text', section: 'ids' },
  { name: 'cc', label: 'CC (Cedula de Ciudadania)', type: 'text', section: 'ids' },
  { name: 'ssn', label: 'SSN', type: 'text', section: 'ids', placeholder: '000-00-0000' },
  { name: 'payer', label: 'Insurance / Payer', type: 'text', section: 'insurance' },
  { name: 'primaryContactName', label: 'Primary Contact Name', type: 'text', section: 'emergency' },
  { name: 'primaryContactPhone', label: 'Primary Contact Phone', type: 'tel', section: 'emergency' },
  { name: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text', section: 'emergency' },
  { name: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'tel', section: 'emergency' },
];

export function getFieldsForCountry(country: MercosurCountry): FieldConfig[] {
  return ALL_FIELDS.map((field) => ({
    ...field,
    required: isFieldRequired(country, field.name),
    hidden: isFieldHidden(country, field.name),
  })).filter((f) => !f.hidden);
}

export function getFieldsBySection(country: MercosurCountry, section: FieldConfig['section']): FieldConfig[] {
  return getFieldsForCountry(country).filter((f) => f.section === section);
}

export function getRequiredFields(country: MercosurCountry): FieldConfig[] {
  return getFieldsForCountry(country).filter((f) => f.required);
}

export function validatePatientData(country: MercosurCountry, data: Record<string, unknown>): { valid: boolean; missing: string[] } {
  const rules = getComplianceRules(country);
  const missing = rules.requiredPatientFields.filter((field) => {
    const value = data[field];
    return !value || (typeof value === 'string' && value.trim() === '');
  });
  return { valid: missing.length === 0, missing };
}
