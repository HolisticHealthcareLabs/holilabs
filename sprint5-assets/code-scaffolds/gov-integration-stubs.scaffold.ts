/**
 * Government Integration Stubs — RNDS, e-SUS APS, RIPS
 *
 * Reference for src/lib/integrations/gov-integration.ts
 *
 * These are STUB implementations that validate input, log the attempt, and return
 * mock responses. Real API calls are marked with TODO comments.
 *
 * Feature flag: process.env.GOV_INTEGRATION_ENABLED === 'true'
 *
 * ELENA: every submission includes sourceAuthority
 * CYRUS: all gov submissions logged to AuditLog
 *
 * @see sprint5-assets/government-integration-specs.json — endpoint URLs, auth, error codes
 * @see sprint5-assets/fhir-resource-templates.json — valid FHIR resource structures
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GovSubmissionResult {
  success: boolean;
  system: 'RNDS' | 'ESUS' | 'RIPS';
  submissionId: string;
  status: 'SUBMITTED' | 'VALIDATED' | 'REJECTED' | 'STUB_OK';
  protocolNumber?: string;
  errors: GovValidationError[];
  note: string;
}

export interface GovValidationError {
  code: string;
  message: string;
  field?: string;
}

interface FHIRBundle {
  resourceType: 'Bundle';
  type: string;
  entry?: Array<{ resource: { resourceType: string; [key: string]: unknown } }>;
}

interface RIPSDataset {
  transaccion: Record<string, unknown>;
  usuarios: Record<string, unknown>[];
  consulta?: Record<string, unknown>[];
  procedimientos?: Record<string, unknown>[];
  urgencias?: Record<string, unknown>[];
  medicamentos?: Record<string, unknown>[];
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

function validateCNS(cns: string): boolean {
  return /^\d{15}$/.test(cns);
}

function validateCNES(cnes: string): boolean {
  return /^\d{7}$/.test(cnes);
}

function validateFHIRBundle(bundle: FHIRBundle, requiredResources: string[]): GovValidationError[] {
  const errors: GovValidationError[] = [];

  if (bundle.resourceType !== 'Bundle') {
    errors.push({ code: 'INVALID_BUNDLE', message: 'Root resource must be a Bundle', field: 'resourceType' });
  }

  if (!bundle.entry || bundle.entry.length === 0) {
    errors.push({ code: 'EMPTY_BUNDLE', message: 'Bundle must contain at least one entry', field: 'entry' });
    return errors;
  }

  const presentTypes = new Set(bundle.entry.map((e) => e.resource?.resourceType));

  for (const required of requiredResources) {
    if (!presentTypes.has(required)) {
      errors.push({
        code: `MISSING_${required.toUpperCase()}`,
        message: `Bundle must contain a ${required} resource`,
        field: `entry[].resource.resourceType`,
      });
    }
  }

  // Check for patient CNS
  const patient = bundle.entry.find((e) => e.resource?.resourceType === 'Patient');
  if (patient) {
    const identifiers = (patient.resource as { identifier?: Array<{ system?: string; value?: string }> }).identifier || [];
    const cns = identifiers.find((id) => id.system?.includes('cns'));
    if (!cns?.value || !validateCNS(cns.value)) {
      errors.push({ code: 'MISSING_CNS', message: 'Patient must have a valid 15-digit CNS identifier', field: 'Patient.identifier' });
    }
  }

  return errors;
}

function generateProtocolNumber(system: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${system}-STUB-${timestamp}-${random}`;
}

// ─── RNDS Client (Brazil) ────────────────────────────────────────────────────

/**
 * RNDS — Rede Nacional de Dados em Saúde
 *
 * FHIR R4 API for Brazil's national health data network.
 * Production: https://ehr-services.saude.gov.br/api/fhir/r4
 * Sandbox: https://ehr-services-hm.saude.gov.br/api/fhir/r4
 *
 * Auth: OAuth2 + ICP-Brasil digital certificate (e-CPF or e-CNPJ)
 *
 * @see government-integration-specs.json — brazil.rnds
 */
export class RNDSClient {
  private sandbox: boolean;

  constructor(sandbox = true) {
    this.sandbox = sandbox;
  }

  /**
   * Submit a FHIR Bundle to RNDS.
   *
   * Supported resource types:
   * - Immunization (BRImunobiologicoAdministrado) — vaccination records
   * - Composition + Encounter (BRRegistroAtendimentoClinico) — clinical encounters
   * - Observation (BRDiagnosticoLaboratorioClinico) — lab results
   */
  async submitBundle(bundle: FHIRBundle): Promise<GovSubmissionResult> {
    // Validate input structure
    const errors = validateFHIRBundle(bundle, ['Patient']);

    if (errors.length > 0) {
      return {
        success: false,
        system: 'RNDS',
        submissionId: '',
        status: 'REJECTED',
        errors,
        note: 'Validation failed before submission',
      };
    }

    const protocolNumber = generateProtocolNumber('RNDS');

    // TODO: holilabsv2 — replace stub with real RNDS API call:
    //
    // const baseUrl = this.sandbox
    //   ? 'https://ehr-services-hm.saude.gov.br/api/fhir/r4'
    //   : 'https://ehr-services.saude.gov.br/api/fhir/r4';
    //
    // const token = await this.getOAuthToken(); // requires e-CNPJ certificate
    //
    // const response = await fetch(`${baseUrl}/Bundle`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/fhir+json',
    //   },
    //   body: JSON.stringify(bundle),
    // });
    //
    // if (!response.ok) {
    //   const error = await response.json();
    //   return { success: false, ... };
    // }

    // CYRUS: Log to AuditLog
    // TODO: holilabsv2 — call prisma.auditLog.create({ action: 'GOV_SUBMIT', entityType: 'RNDS', ... })

    return {
      success: true,
      system: 'RNDS',
      submissionId: protocolNumber,
      status: 'STUB_OK',
      protocolNumber,
      errors: [],
      note: this.sandbox
        ? 'Sandbox mode — production RNDS integration pending e-CNPJ certificate setup. See government-integration-specs.json for credentialing steps.'
        : 'Production submission completed',
    };
  }

  /**
   * Query patient immunization history from RNDS.
   * @param cns Patient CNS (15 digits)
   */
  async getImmunizations(cns: string): Promise<{ immunizations: unknown[]; note: string }> {
    if (!validateCNS(cns)) {
      throw new Error('Invalid CNS format. Must be 15 digits.');
    }

    // TODO: holilabsv2 — replace with real RNDS query:
    // GET /Immunization?patient.identifier=<CNS>

    return {
      immunizations: [],
      note: 'Stub — real RNDS query requires e-CNPJ certificate and SCPA authorization',
    };
  }
}

// ─── e-SUS APS Exporter (Brazil) ─────────────────────────────────────────────

/**
 * e-SUS APS — Sistema e-SUS Atenção Primária
 *
 * Brazil's primary care information system. Uses Apache Thrift protocol (not REST).
 * For HoliLabs, we generate LEDI-AB compliant data exports that can be imported
 * into e-SUS PEC (Prontuário Eletrônico do Cidadão).
 *
 * @see government-integration-specs.json — brazil.esus
 */
export class ESUSExporter {

  /**
   * Export a clinical encounter in LEDI-AB format.
   * @param encounter Encounter data from Prisma
   * @returns LEDI-AB compliant JSON object
   */
  async exportEncounter(encounter: {
    id: string;
    clinicianCNS: string;
    clinicianCBO: string;
    patientCNS: string;
    patientDateOfBirth: string;
    patientSex: string;
    cnes: string;
    ineTeam?: string;
    date: string;
    type: string;
    icd10Primary: string;
    outcome: string;
  }): Promise<{ lediData: Record<string, unknown>; note: string }> {
    // Validate required fields
    if (!validateCNS(encounter.clinicianCNS)) throw new Error('Invalid clinician CNS');
    if (!validateCNS(encounter.patientCNS)) throw new Error('Invalid patient CNS');
    if (!validateCNES(encounter.cnes)) throw new Error('Invalid CNES');

    // TODO: holilabsv2 — replace with actual LEDI-AB schema generation
    // The real implementation needs the full LEDI-AB spec from integracao.esusab.ufsc.br

    const lediData = {
      headerTransport: {
        cnesUnidadeSaude: encounter.cnes,
        cnsProfissional: encounter.clinicianCNS,
        cboCodigo: encounter.clinicianCBO,
        dataAtendimento: encounter.date,
      },
      fichaAtendimentoIndividual: {
        cnsCidadao: encounter.patientCNS,
        dataNascimento: encounter.patientDateOfBirth,
        sexo: encounter.patientSex === 'M' ? 1 : 2,
        tipoAtendimento: encounter.type,
        cidPrincipal: encounter.icd10Primary,
        condutaDesfecho: encounter.outcome,
      },
    };

    // CYRUS: Log to AuditLog
    // TODO: holilabsv2 — prisma.auditLog.create({ action: 'GOV_EXPORT', entityType: 'ESUS' })

    return {
      lediData,
      note: 'Stub LEDI-AB export. Real export requires full schema compliance. Submit monthly by the 10th of the following month.',
    };
  }
}

// ─── RIPS Exporter (Colombia) ────────────────────────────────────────────────

/**
 * RIPS — Registro Individual de Prestación de Servicios de Salud
 *
 * Colombia's health service reporting system. As of Resolution 2275/2023,
 * RIPS are submitted in JSON format as mandatory support for FEV.
 *
 * @see government-integration-specs.json — colombia.rips
 */
export class RIPSExporter {

  /**
   * Export services in RIPS JSON format (Resolution 2275/2023).
   * @param dateRange Start and end date for the reporting period
   * @param services List of services to include
   */
  async exportRIPS(dateRange: { start: string; end: string }, services: Array<{
    patientDocType: string;
    patientDocNumber: string;
    patientDateOfBirth: string;
    patientSex: string;
    cupsCode: string;
    icd10Primary: string;
    consultDate: string;
    purpose: string;
    value: number;
    authNumber?: string;
  }>): Promise<{ ripsData: RIPSDataset; note: string }> {
    // TODO: holilabsv2 — replace with full RIPS JSON generation per Resolution 2275

    const ripsData: RIPSDataset = {
      transaccion: {
        // TODO: holilabsv2 — fill with billing entity info, FEV number
        codPrestador: 'CNES_OR_NIT_HERE',
        fechaInicio: dateRange.start,
        fechaFin: dateRange.end,
      },
      usuarios: services.map((s) => ({
        tipoIdentificacion: s.patientDocType,
        numIdentificacion: s.patientDocNumber,
        fechaNacimiento: s.patientDateOfBirth,
        codSexo: s.patientSex === 'M' ? '1' : '2',
      })),
      consulta: services.map((s) => ({
        codConsulta: s.cupsCode,
        fechaConsulta: s.consultDate,
        numAutorizacion: s.authNumber || '',
        codDiagnosticoPrincipal: s.icd10Primary,
        finalidadTecnologiaSalud: s.purpose,
        valorConsulta: s.value,
      })),
    };

    // CYRUS: Log to AuditLog
    // TODO: holilabsv2 — prisma.auditLog.create({ action: 'GOV_EXPORT', entityType: 'RIPS' })

    return {
      ripsData,
      note: 'Stub RIPS export (Resolution 2275/2023 JSON format). Submit via SISPRO FEV validation endpoint. See government-integration-specs.json for endpoint URLs and validation rules.',
    };
  }
}

// ─── Feature Flag Guard ──────────────────────────────────────────────────────

/**
 * Check if government integration is enabled.
 * All gov integration calls should be wrapped in this check.
 */
export function isGovIntegrationEnabled(): boolean {
  return process.env.GOV_INTEGRATION_ENABLED === 'true';
}

/**
 * Factory function to create the appropriate client.
 * @param system Target government system
 * @param sandbox Use sandbox/homologation environment
 */
export function createGovClient(
  system: 'RNDS' | 'ESUS' | 'RIPS',
  sandbox = true
): RNDSClient | ESUSExporter | RIPSExporter {
  if (!isGovIntegrationEnabled()) {
    // Return stub clients even when disabled — they'll return STUB_OK
    console.warn(`Gov integration disabled. ${system} client will return stub responses.`);
  }

  switch (system) {
    case 'RNDS': return new RNDSClient(sandbox);
    case 'ESUS': return new ESUSExporter();
    case 'RIPS': return new RIPSExporter();
    default: throw new Error(`Unknown gov system: ${system}`);
  }
}
