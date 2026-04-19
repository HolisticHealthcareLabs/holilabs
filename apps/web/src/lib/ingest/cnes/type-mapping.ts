/**
 * CNES TP_UNIDADE code → our EstablishmentType enum.
 *
 * Codes sourced from DATASUS table TIPO_UNIDADE
 * (http://cnes.datasus.gov.br/pages/downloads/tabelasAuxiliares.jsp).
 *
 * Unlisted codes map to OTHER. Review annually — DATASUS publishes updates
 * roughly every quarter.
 */
import type { EstablishmentType } from '@prisma/client';

const CNES_TYPE_TO_ENUM: Record<string, EstablishmentType> = {
  // Hospitals
  '05': 'HOSPITAL',          // HOSPITAL GERAL
  '07': 'HOSPITAL',          // HOSPITAL ESPECIALIZADO
  '62': 'HOSPITAL',          // HOSPITAL/DIA - ISOLADO
  '73': 'HOSPITAL',          // PRONTO SOCORRO GERAL
  '74': 'HOSPITAL',          // PRONTO SOCORRO ESPECIALIZADO
  '75': 'HOSPITAL',          // PRONTO ATENDIMENTO / UPA

  // Clinics / ambulatory
  '01': 'CLINIC',            // POSTO DE SAUDE
  '02': 'CLINIC',            // CENTRO DE SAUDE/UNIDADE BASICA
  '36': 'CLINIC',            // CLINICA/CENTRO DE ESPECIALIDADE
  '40': 'POLYCLINIC',        // POLICLINICA
  '42': 'CLINIC',            // UNIDADE MOVEL FLUVIAL
  '64': 'CLINIC',            // CENTRAL DE REGULACAO DE SERVICOS DE SAUDE
  '68': 'CLINIC',            // SECRETARIA DE SAUDE
  '69': 'CLINIC',            // CENTRO DE ATENCAO HEMOTERAPIA E OU HEMATOLOGICAMENTE

  // Labs & imaging
  '04': 'LAB',               // POLICLINICA (legacy)
  '39': 'LAB',               // UNIDADE DE APOIO DIAGNOSE E TERAPIA (SADT ISOLADO)
  '77': 'LAB',               // HEMOCENTRO
  '78': 'IMAGING',           // UNIDADE DE ATENCAO EM REGIME RESIDENCIAL

  // Pharmacy
  '43': 'PHARMACY',          // FARMACIA

  // Home care
  '71': 'HOME_CARE',         // ASSISTENCIA DOMICILIAR
  '72': 'HOME_CARE',         // CENTRO DE APOIO PSICOSSOCIAL
};

export function mapCnesTypeToEnum(code: string | null | undefined): EstablishmentType {
  if (!code) return 'OTHER';
  const key = code.trim().padStart(2, '0');
  return CNES_TYPE_TO_ENUM[key] ?? 'OTHER';
}
