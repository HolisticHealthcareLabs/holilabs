/**
 * RNDS (Rede Nacional de Dados em Saúde) — FHIR Profile Registry
 *
 * Brazil's national health data network requires FHIR R4 resources to
 * declare RNDS-specific profile URLs in resource.meta.profile[].
 *
 * Registry reference: https://simplifier.net/redenacionaldedadosemsaude
 *
 * RUTH: all RNDS data transfers logged with LGPD Art. 33 boundary annotation.
 * CYRUS: mTLS certificate stored encrypted via secrets manager, never in env vars.
 */

/* ── RNDS Profile URLs ───────────────────────────────────────── */

export const RNDS_PROFILES = {
  Patient: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0',
  Encounter: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRContatoAssistencial-1.0',
  Observation: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRObservacaoDescritiva-1.0',
  Condition: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDiagnosticoAtribuido-1.0',
  MedicationRequest: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPrescricaoMedicamento-1.0',
  Immunization: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRImunobiologicoAdministrado-1.0',
  DiagnosticReport: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRLaudoExame-1.0',
  Procedure: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRProcedimentoRealizado-1.0',
  AllergyIntolerance: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRAlergiaReacaoAdversa-1.0',
  Composition: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRSumarioAlta-1.0',
} as const;

/* ── RNDS Identifier Systems ─────────────────────────────────── */

export const RNDS_IDENTIFIERS = {
  CPF: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
  CNS: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
  CNES: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes',
  CBO: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cbo',
} as const;

/* ── RNDS Code Systems ───────────────────────────────────────── */

export const RNDS_CODE_SYSTEMS = {
  CID10: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRCID10',
  CIAP2: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRCIAP2',
  TUSS: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTabelaSUS',
  CATMAT: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRCATMAT',
} as const;

/* ── RNDS API Endpoints ──────────────────────────────────────── */

export const RNDS_ENDPOINTS = {
  auth: 'https://ehr-auth.saude.gov.br/api/token',
  fhir: 'https://ehr-services.saude.gov.br/api/fhir/r4',
  authHomolog: 'https://ehr-auth-hmg.saude.gov.br/api/token',
  fhirHomolog: 'https://ehr-services-hmg.saude.gov.br/api/fhir/r4',
} as const;

/* ── Profile injection helper ────────────────────────────────── */

/**
 * Injects RNDS profile URL into a FHIR resource's meta.profile array.
 * Idempotent — won't duplicate if already present.
 */
export function injectRndsProfile<T extends { resourceType: string; meta?: { profile?: string[] } }>(
  resource: T
): T {
  const profileUrl = RNDS_PROFILES[resource.resourceType as keyof typeof RNDS_PROFILES];
  if (!profileUrl) return resource;

  const meta = resource.meta ?? {};
  const profiles = meta.profile ?? [];

  if (profiles.includes(profileUrl)) return resource;

  return {
    ...resource,
    meta: {
      ...meta,
      profile: [...profiles, profileUrl],
    },
  };
}

/**
 * Ensures a Patient resource has CPF and CNS identifiers in RNDS format.
 * Required for RNDS registration.
 */
export function ensureRndsPatientIdentifiers(
  resource: any,
  cpf?: string,
  cns?: string
): any {
  const identifiers = resource.identifier ?? [];

  const hasCpf = identifiers.some((id: any) => id.system === RNDS_IDENTIFIERS.CPF);
  const hasCns = identifiers.some((id: any) => id.system === RNDS_IDENTIFIERS.CNS);

  const updated = [...identifiers];

  if (!hasCpf && cpf) {
    updated.push({
      use: 'official',
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'TAX', display: 'Tax ID' }],
        text: 'CPF',
      },
      system: RNDS_IDENTIFIERS.CPF,
      value: cpf.replace(/\D/g, ''),
    });
  }

  if (!hasCns && cns) {
    updated.push({
      use: 'official',
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'HC', display: 'Health Card' }],
        text: 'CNS',
      },
      system: RNDS_IDENTIFIERS.CNS,
      value: cns.replace(/\D/g, ''),
    });
  }

  return { ...resource, identifier: updated };
}
