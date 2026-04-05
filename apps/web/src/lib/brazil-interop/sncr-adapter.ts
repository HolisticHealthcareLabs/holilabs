/**
 * SNCR Adapter — ANVISA Sistema Nacional de Controle de Receitas
 *
 * Submits signed controlled-substance prescriptions to ANVISA's SNCR
 * per RDC 1.000/2025 (mandatory by June 1, 2026).
 *
 * RUTH: SNCR submission is legally mandatory for Lista A, B, C, and antimicrobials.
 * CYRUS: All payloads must be signed; no PHI in logs.
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';

export interface SNCRSubmission {
  prescriptionId: string;
  prescriptionHash: string;
  prescriptionType: string;
  controlledSchedule: string | null;
  clinicianCrm: string;
  clinicianCpf?: string;
  patientCpf: string;
  patientCns?: string;
  medications: Array<{
    catmatCode: string | null;
    genericName: string;
    dose: string;
    quantity: number;
  }>;
  signedAt: string; // ISO
  digitalSignatureType: string;
  icpBrasilCertSerial?: string;
  establishmentCnes: string; // CNES of the prescribing establishment
}

export interface SNCRResponse {
  success: boolean;
  sncrId: string | null;
  status: 'ACCEPTED' | 'REJECTED' | 'QUEUED';
  errorCode: string | null;
  errorMessage: string | null;
  timestamp: string;
}

/**
 * SNCR API configuration.
 * In production, set SNCR_API_URL and SNCR_API_KEY via env vars.
 * Sandbox URL is used when SNCR_SANDBOX=true or NODE_ENV !== 'production'.
 */
function getSNCRConfig(): { baseUrl: string; apiKey: string; isSandbox: boolean } {
  const isSandbox = process.env.NODE_ENV !== 'production' || process.env.SNCR_SANDBOX === 'true';

  return {
    baseUrl: isSandbox
      ? 'https://sncr-sandbox.anvisa.gov.br/api/v1'
      : (process.env.SNCR_API_URL || 'https://sncr.anvisa.gov.br/api/v1'),
    apiKey: process.env.SNCR_API_KEY || '',
    isSandbox,
  };
}

/**
 * Build the SNCR submission payload per ANVISA's schema.
 */
function buildSNCRPayload(submission: SNCRSubmission): Record<string, unknown> {
  return {
    idReceita: submission.prescriptionHash,
    tipoReceita: mapPrescriptionType(submission.prescriptionType),
    classeSubstancia: submission.controlledSchedule,
    prescritor: {
      crm: submission.clinicianCrm,
      cpf: submission.clinicianCpf,
    },
    paciente: {
      cpf: submission.patientCpf,
      cns: submission.patientCns,
    },
    estabelecimento: {
      cnes: submission.establishmentCnes,
    },
    medicamentos: submission.medications.map((med) => ({
      codigoCATMAT: med.catmatCode,
      nomeGenerico: med.genericName,
      dose: med.dose,
      quantidade: med.quantity,
    })),
    assinatura: {
      tipo: submission.digitalSignatureType,
      certificadoSerial: submission.icpBrasilCertSerial,
      dataAssinatura: submission.signedAt,
    },
    hashPrescricao: submission.prescriptionHash,
  };
}

function mapPrescriptionType(type: string): string {
  const map: Record<string, string> = {
    AMARELA: 'NOTIFICACAO_A',
    AZUL: 'NOTIFICACAO_B',
    ESPECIAL: 'CONTROLE_ESPECIAL',
    ANTIMICROBIAL: 'ANTIMICROBIANO',
    BRANCA: 'SIMPLES',
  };
  return map[type] || 'SIMPLES';
}

/**
 * Submit a prescription to SNCR.
 *
 * In sandbox/dev mode, simulates the response.
 * In production, calls the ANVISA SNCR API.
 */
export async function submitToSNCR(submission: SNCRSubmission): Promise<SNCRResponse> {
  const config = getSNCRConfig();

  // Sandbox: simulate successful submission
  if (config.isSandbox) {
    const simulatedSncrId = `SNCR-SB-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    logger.info({
      event: 'sncr_sandbox_submission',
      prescriptionId: submission.prescriptionId,
      sncrId: simulatedSncrId,
      prescriptionType: submission.prescriptionType,
    });

    return {
      success: true,
      sncrId: simulatedSncrId,
      status: 'ACCEPTED',
      errorCode: null,
      errorMessage: null,
      timestamp: new Date().toISOString(),
    };
  }

  // Production: call SNCR API
  if (!config.apiKey) {
    logger.error({ event: 'sncr_missing_api_key' });
    return {
      success: false,
      sncrId: null,
      status: 'REJECTED',
      errorCode: 'CONFIG_ERROR',
      errorMessage: 'SNCR API key not configured',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const payload = buildSNCRPayload(submission);

    const response = await fetch(`${config.baseUrl}/receitas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-ANVISA-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      logger.error({
        event: 'sncr_api_error',
        prescriptionId: submission.prescriptionId,
        status: response.status,
        errorBody,
      });

      return {
        success: false,
        sncrId: null,
        status: 'REJECTED',
        errorCode: `HTTP_${response.status}`,
        errorMessage: errorBody,
        timestamp: new Date().toISOString(),
      };
    }

    const data = await response.json() as {
      idSNCR?: string;
      status?: string;
      codigoErro?: string;
      mensagemErro?: string;
    };

    return {
      success: true,
      sncrId: data.idSNCR || null,
      status: data.status === 'ACEITA' ? 'ACCEPTED' : 'QUEUED',
      errorCode: data.codigoErro || null,
      errorMessage: data.mensagemErro || null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({
      event: 'sncr_submission_failed',
      prescriptionId: submission.prescriptionId,
      error,
    });

    return {
      success: false,
      sncrId: null,
      status: 'REJECTED',
      errorCode: 'NETWORK_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check SNCR status for a previously submitted prescription.
 */
export async function checkSNCRStatus(sncrId: string): Promise<{
  status: 'ACCEPTED' | 'REJECTED' | 'QUEUED' | 'CANCELLED';
  errorCode: string | null;
  errorMessage: string | null;
}> {
  const config = getSNCRConfig();

  if (config.isSandbox) {
    return { status: 'ACCEPTED', errorCode: null, errorMessage: null };
  }

  try {
    const response = await fetch(`${config.baseUrl}/receitas/${sncrId}/status`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { status: 'QUEUED', errorCode: `HTTP_${response.status}`, errorMessage: null };
    }

    const data = await response.json() as {
      status?: string;
      codigoErro?: string;
      mensagemErro?: string;
    };

    const statusMap: Record<string, 'ACCEPTED' | 'REJECTED' | 'QUEUED' | 'CANCELLED'> = {
      ACEITA: 'ACCEPTED',
      REJEITADA: 'REJECTED',
      PENDENTE: 'QUEUED',
      CANCELADA: 'CANCELLED',
    };

    return {
      status: statusMap[data.status || ''] || 'QUEUED',
      errorCode: data.codigoErro || null,
      errorMessage: data.mensagemErro || null,
    };
  } catch {
    return { status: 'QUEUED', errorCode: 'NETWORK_ERROR', errorMessage: null };
  }
}
