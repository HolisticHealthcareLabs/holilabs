/**
 * Medical License Verification Service
 *
 * Supports automatic verification of medical licenses from:
 * - Brazil: CFM (Federal) and CRM (State-level)
 * - Argentina: CONFEMED and Provincial Medical Boards
 *
 * @compliance Critical for healthcare platform credentialing
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { VerificationMethod } from '@prisma/client';

// Supported countries for medical license verification
export type SupportedCountry = 'BR' | 'AR' | 'US';

// Brazil states (for CRM verification)
export const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

// Argentina provinces (for provincial medical board verification)
export const ARGENTINA_PROVINCES = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa',
  'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
  'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán', 'CABA'
] as const;

export type BrazilState = typeof BRAZIL_STATES[number];
export type ArgentinaProvince = typeof ARGENTINA_PROVINCES[number];

// Verification request interface
export interface MedicalLicenseVerificationRequest {
  firstName: string;
  lastName: string;
  licenseNumber: string;
  country: SupportedCountry;
  state?: BrazilState | ArgentinaProvince | string;
  specialty?: string;
}

// Verification result interface
export interface MedicalLicenseVerificationResult {
  verified: boolean;
  status: 'VERIFIED' | 'PARTIAL_MATCH' | 'NO_MATCH' | 'NOT_FOUND' | 'ERROR' | 'PENDING';
  matchScore: number; // 0-1
  source: string;
  matchedData?: {
    name?: string;
    licenseNumber?: string;
    specialty?: string;
    issuedDate?: string;
    expirationDate?: string;
    status?: string;
  };
  discrepancies?: string[];
  externalVerificationId?: string;
  verificationNotes?: string;
}

/**
 * Main verification function - routes to appropriate verification method
 */
export async function verifyMedicalLicense(
  request: MedicalLicenseVerificationRequest
): Promise<MedicalLicenseVerificationResult> {
  try {
    logger.info({
      event: 'medical_license_verification_started',
      country: request.country,
      licenseNumber: request.licenseNumber.substring(0, 4) + '***', // Partial for privacy
    });

    switch (request.country) {
      case 'BR':
        return await verifyBrazilianLicense(request);
      case 'AR':
        return await verifyArgentinianLicense(request);
      case 'US':
        return await verifyUSLicense(request);
      default:
        throw new Error(`Unsupported country: ${request.country}`);
    }
  } catch (error) {
    logger.error({
      event: 'medical_license_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      country: request.country,
    });

    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: 'ERROR',
      verificationNotes: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verify Brazilian medical license (CFM/CRM)
 *
 * Brazil has a two-tier system:
 * 1. CFM (Federal) - national registry
 * 2. CRM (Regional) - state-level registry
 */
async function verifyBrazilianLicense(
  request: MedicalLicenseVerificationRequest
): Promise<MedicalLicenseVerificationResult> {
  const { firstName, lastName, licenseNumber, state } = request;

  if (!state) {
    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: 'CFM/CRM',
      verificationNotes: 'State (UF) is required for Brazilian license verification',
    };
  }

  try {
    // Step 1: Try CFM Portal (Federal Registry)
    // https://portal.cfm.org.br/busca-medicos/
    const cfmResult = await verifyCFMPortal({
      nome: `${firstName} ${lastName}`,
      crm: licenseNumber,
      uf: state as BrazilState,
    });

    if (cfmResult.verified) {
      return cfmResult;
    }

    // Step 2: If CFM fails, try state CRM portal
    const crmResult = await verifyCRMPortal({
      nome: `${firstName} ${lastName}`,
      crm: licenseNumber,
      uf: state as BrazilState,
    });

    return crmResult;
  } catch (error) {
    logger.error({
      event: 'brazil_license_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      state,
    });

    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: 'CFM/CRM',
      verificationNotes: 'Failed to verify with Brazilian medical boards',
    };
  }
}

/**
 * Verify with CFM (Conselho Federal de Medicina)
 * Portal: https://portal.cfm.org.br/
 */
async function verifyCFMPortal(data: {
  nome: string;
  crm: string;
  uf: BrazilState;
}): Promise<MedicalLicenseVerificationResult> {
  // IMPORTANT: This is a placeholder implementation
  // In production, you would:
  // 1. Use their official API (if available)
  // 2. Use web scraping with puppeteer/playwright
  // 3. Use a third-party verification service (e.g., Truework)

  logger.info({
    event: 'cfm_verification_attempt',
    uf: data.uf,
    crm: data.crm.substring(0, 4) + '***',
  });

  // For now, return manual review required
  // TODO: Implement actual CFM portal verification
  return {
    verified: false,
    status: 'PENDING',
    matchScore: 0,
    source: 'CFM Portal',
    verificationNotes: 'Manual verification required. CFM portal verification not yet automated.',
  };
}

/**
 * Verify with state CRM (Conselho Regional de Medicina)
 */
async function verifyCRMPortal(data: {
  nome: string;
  crm: string;
  uf: BrazilState;
}): Promise<MedicalLicenseVerificationResult> {
  logger.info({
    event: 'crm_verification_attempt',
    uf: data.uf,
    crm: data.crm.substring(0, 4) + '***',
  });

  // Each state has its own CRM portal
  // Examples:
  // - SP: https://www.cremesp.org.br/
  // - RJ: https://www.cremerj.org.br/
  // - MG: https://www.crmmg.org.br/

  const crmPortalUrls: Record<BrazilState, string> = {
    SP: 'https://www.cremesp.org.br/',
    RJ: 'https://www.cremerj.org.br/',
    MG: 'https://www.crmmg.org.br/',
    RS: 'https://www.cremers.org.br/',
    BA: 'https://www.cremeb.org.br/',
    PR: 'https://www.crmpr.org.br/',
    SC: 'https://www.cremesc.org.br/',
    PE: 'https://www.cremepe.org.br/',
    CE: 'https://www.cremec.org.br/',
    GO: 'https://www.cremesp.org.br/', // Using SP as fallback
    PA: 'https://www.cremesp.org.br/', // Using SP as fallback
    // Add other states as needed
    AC: 'https://portal.cfm.org.br/',
    AL: 'https://portal.cfm.org.br/',
    AP: 'https://portal.cfm.org.br/',
    AM: 'https://portal.cfm.org.br/',
    DF: 'https://portal.cfm.org.br/',
    ES: 'https://portal.cfm.org.br/',
    MA: 'https://portal.cfm.org.br/',
    MT: 'https://portal.cfm.org.br/',
    MS: 'https://portal.cfm.org.br/',
    PB: 'https://portal.cfm.org.br/',
    PI: 'https://portal.cfm.org.br/',
    RN: 'https://portal.cfm.org.br/',
    RO: 'https://portal.cfm.org.br/',
    RR: 'https://portal.cfm.org.br/',
    SE: 'https://portal.cfm.org.br/',
    TO: 'https://portal.cfm.org.br/',
  };

  // TODO: Implement actual CRM portal verification
  return {
    verified: false,
    status: 'PENDING',
    matchScore: 0,
    source: `CRM-${data.uf}`,
    verificationNotes: `Manual verification required with CRM-${data.uf}. Portal: ${crmPortalUrls[data.uf]}`,
  };
}

/**
 * Verify Argentinian medical license (CONFEMED / Provincial)
 */
async function verifyArgentinianLicense(
  request: MedicalLicenseVerificationRequest
): Promise<MedicalLicenseVerificationResult> {
  const { firstName, lastName, licenseNumber, state } = request;

  if (!state) {
    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: 'CONFEMED',
      verificationNotes: 'Province is required for Argentinian license verification',
    };
  }

  try {
    // Step 1: Try CONFEMED (Federal)
    // https://www.confemed.org.ar/
    const confemedResult = await verifyCONFEMED({
      nombre: `${firstName} ${lastName}`,
      matricula: licenseNumber,
      provincia: state,
    });

    if (confemedResult.verified) {
      return confemedResult;
    }

    // Step 2: Try Provincial Medical Board
    const provincialResult = await verifyArgentineProvincialBoard({
      nombre: `${firstName} ${lastName}`,
      matricula: licenseNumber,
      provincia: state,
    });

    return provincialResult;
  } catch (error) {
    logger.error({
      event: 'argentina_license_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      province: state,
    });

    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: 'CONFEMED',
      verificationNotes: 'Failed to verify with Argentinian medical boards',
    };
  }
}

/**
 * Verify with CONFEMED (Confederación Médica Argentina)
 */
async function verifyCONFEMED(data: {
  nombre: string;
  matricula: string;
  provincia: string;
}): Promise<MedicalLicenseVerificationResult> {
  logger.info({
    event: 'confemed_verification_attempt',
    provincia: data.provincia,
    matricula: data.matricula.substring(0, 4) + '***',
  });

  // TODO: Implement actual CONFEMED verification
  // Portal: https://www.confemed.org.ar/
  return {
    verified: false,
    status: 'PENDING',
    matchScore: 0,
    source: 'CONFEMED',
    verificationNotes: 'Manual verification required with CONFEMED',
  };
}

/**
 * Verify with Provincial Medical Board in Argentina
 */
async function verifyArgentineProvincialBoard(data: {
  nombre: string;
  matricula: string;
  provincia: string;
}): Promise<MedicalLicenseVerificationResult> {
  logger.info({
    event: 'argentina_provincial_verification_attempt',
    provincia: data.provincia,
    matricula: data.matricula.substring(0, 4) + '***',
  });

  // Each province has its own medical board
  // Examples:
  // - Buenos Aires: Colegio de Médicos de la Provincia de Buenos Aires
  // - Córdoba: Colegio Médico de Córdoba
  // - Santa Fe: Colegio de Médicos de Santa Fe

  const provincialBoardUrls: Partial<Record<string, string>> = {
    'Buenos Aires': 'https://www.colmed.org.ar/',
    'Córdoba': 'https://www.comeco.org.ar/',
    'Santa Fe': 'https://www.colegiomedicosantafe.org.ar/',
    'CABA': 'https://www.medicoscaba.org.ar/',
    // Add other provinces as needed
  };

  // TODO: Implement actual provincial board verification
  return {
    verified: false,
    status: 'PENDING',
    matchScore: 0,
    source: `Provincial Board - ${data.provincia}`,
    verificationNotes: `Manual verification required with ${data.provincia} medical board`,
  };
}

/**
 * Verify US medical license (NPPES/State Boards)
 */
async function verifyUSLicense(
  request: MedicalLicenseVerificationRequest
): Promise<MedicalLicenseVerificationResult> {
  // This would integrate with NPPES API
  // https://npiregistry.cms.hhs.gov/

  logger.info({
    event: 'us_license_verification_attempt',
    licenseNumber: request.licenseNumber.substring(0, 4) + '***',
  });

  // TODO: Implement NPPES verification
  return {
    verified: false,
    status: 'PENDING',
    matchScore: 0,
    source: 'NPPES',
    verificationNotes: 'Manual verification required with NPPES',
  };
}

/**
 * Create a credential verification record in the database
 */
export async function createCredentialVerificationRecord(
  userId: string,
  request: MedicalLicenseVerificationRequest,
  result: MedicalLicenseVerificationResult
) {
  try {
    // First, create or update the provider credential
    const credential = await prisma.providerCredential.upsert({
      where: {
        userId_credentialNumber: {
          userId,
          credentialNumber: request.licenseNumber,
        },
      },
      update: {
        verificationStatus: result.status === 'VERIFIED' ? 'AUTO_VERIFIED' : 'PENDING',
        verifiedAt: result.verified ? new Date() : null,
        autoVerified: result.verified,
        verificationSource: result.source,
        verificationNotes: result.verificationNotes,
      },
      create: {
        userId,
        credentialType: 'MEDICAL_LICENSE',
        credentialNumber: request.licenseNumber,
        issuingAuthority: getIssuingAuthority(request.country, request.state),
        issuingCountry: request.country,
        issuingState: request.state,
        issuedDate: new Date(), // TODO: Get from verification result
        verificationStatus: result.status === 'VERIFIED' ? 'AUTO_VERIFIED' : 'PENDING',
        verifiedAt: result.verified ? new Date() : null,
        autoVerified: result.verified,
        verificationSource: result.source,
        verificationNotes: result.verificationNotes,
      },
    });

    // Create a verification history record
    await prisma.credentialVerification.create({
      data: {
        credentialId: credential.id,
        verificationMethod: getVerificationMethod(request.country),
        verificationSource: result.source,
        completedAt: new Date(),
        status: result.status,
        matchScore: result.matchScore,
        matchedData: result.matchedData,
        discrepancies: result.discrepancies ? { items: result.discrepancies } : undefined,
        externalVerificationId: result.externalVerificationId,
        verificationNotes: result.verificationNotes,
      },
    });

    return credential;
  } catch (error) {
    logger.error({
      event: 'create_credential_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    throw error;
  }
}

/**
 * Helper: Get issuing authority name
 */
function getIssuingAuthority(country: SupportedCountry, state?: string): string {
  switch (country) {
    case 'BR':
      return state ? `CRM-${state} (Conselho Regional de Medicina)` : 'CFM (Conselho Federal de Medicina)';
    case 'AR':
      return state ? `Colegio Médico - ${state}` : 'CONFEMED (Confederación Médica Argentina)';
    case 'US':
      return state ? `${state} State Medical Board` : 'NPPES (National Provider Registry)';
    default:
      return 'Unknown';
  }
}

/**
 * Helper: Get verification method enum
 */
function getVerificationMethod(country: SupportedCountry): VerificationMethod {
  switch (country) {
    case 'BR':
      return VerificationMethod.CFM_VERIFICATION;
    case 'AR':
      return VerificationMethod.CONFEMED_VERIFICATION;
    case 'US':
      return VerificationMethod.NPPES_LOOKUP;
    default:
      return VerificationMethod.MANUAL_VERIFICATION;
  }
}

/**
 * Calculate name match score (for fuzzy matching)
 */
export function calculateNameMatchScore(name1: string, name2: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z\s]/g, '') // Remove special chars
      .trim();

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  if (n1 === n2) return 1.0;

  // Simple word-based matching
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);

  const matches = words1.filter(w1 =>
    words2.some(w2 => w2.includes(w1) || w1.includes(w2))
  ).length;

  return matches / Math.max(words1.length, words2.length);
}
