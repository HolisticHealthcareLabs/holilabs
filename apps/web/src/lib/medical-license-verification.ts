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
 * API: https://siem-servicos-api.cfm.org.br/swagger-ui/index.html
 */
async function verifyCFMPortal(data: {
  nome: string;
  crm: string;
  uf: BrazilState;
}): Promise<MedicalLicenseVerificationResult> {
  logger.info({
    event: 'cfm_verification_attempt',
    uf: data.uf,
    crm: data.crm.substring(0, 4) + '***',
  });

  try {
    // Option 1: Try using Infosimples API (third-party service)
    // If CFM_API_KEY is set in environment, use it
    const cfmApiKey = process.env.CFM_API_KEY || process.env.INFOSIMPLES_API_TOKEN;

    if (cfmApiKey) {
      try {
        // Use Infosimples API for CFM verification
        // https://infosimples.com/consultas/cfm-cadastro/
        const apiUrl = `https://api.infosimples.com/api/v2/consultas/cfm/cadastro`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: cfmApiKey,
            uf: data.uf,
            numero_inscricao: data.crm,
            timeout: 300,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          if (result.code === 200 && result.data) {
            const cfmData = result.data;

            // Calculate name match score
            const matchScore = calculateNameMatchScore(
              data.nome.toLowerCase(),
              cfmData.nome?.toLowerCase() || ''
            );

            // Check if match is good enough
            const verified = matchScore >= 0.8 && cfmData.situacao === 'ATIVO';
            let status: 'VERIFIED' | 'PARTIAL_MATCH' | 'NO_MATCH' = 'VERIFIED';
            const discrepancies: string[] = [];

            if (matchScore < 0.5) {
              status = 'NO_MATCH';
              discrepancies.push(`Name mismatch: Expected "${data.nome}", found "${cfmData.nome}"`);
            } else if (matchScore < 0.8) {
              status = 'PARTIAL_MATCH';
              discrepancies.push(`Partial name match: ${matchScore.toFixed(2)}`);
            }

            if (cfmData.situacao !== 'ATIVO') {
              status = 'NO_MATCH';
              discrepancies.push(`License not active: ${cfmData.situacao}`);
            }

            logger.info({
              event: 'cfm_verification_complete',
              crm: data.crm.substring(0, 4) + '***',
              verified,
              matchScore,
            });

            return {
              verified,
              status,
              matchScore,
              source: 'CFM Portal (via Infosimples)',
              externalVerificationId: data.crm,
              matchedData: {
                name: cfmData.nome,
                licenseNumber: data.crm,
                specialty: cfmData.especialidade,
                status: cfmData.situacao,
                issuedDate: cfmData.data_inscricao,
              },
              discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
              verificationNotes: verified
                ? `Successfully verified with CFM`
                : `Verification issues: ${discrepancies.join('; ')}`,
            };
          }
        }
      } catch (apiError) {
        logger.warn({
          event: 'cfm_api_fallback',
          error: apiError instanceof Error ? apiError.message : 'API call failed',
        });
        // Fall through to public portal scraping
      }
    }

    // Option 2: Use public CFM search portal
    // https://portal.cfm.org.br/busca-medicos/
    // This requires web scraping, which is complex and fragile
    // For now, we'll return PENDING with instructions for manual verification

    logger.info({
      event: 'cfm_manual_verification_required',
      crm: data.crm,
      uf: data.uf,
    });

    return {
      verified: false,
      status: 'PENDING',
      matchScore: 0,
      source: 'CFM Portal',
      verificationNotes: [
        'Automated CFM verification requires API credentials.',
        `Manual verification URL: https://portal.cfm.org.br/busca-medicos/?nome=${encodeURIComponent(data.nome)}&crm=${data.crm}&uf=${data.uf}`,
        'To enable automated verification, set CFM_API_KEY or INFOSIMPLES_API_TOKEN environment variable.',
      ].join(' '),
    };
  } catch (error) {
    logger.error({
      event: 'cfm_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      crm: data.crm.substring(0, 4) + '***',
    });

    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: 'CFM Portal',
      verificationNotes: `Error verifying with CFM: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
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

  // State CRM portals are difficult to automate as each has different structure
  // For now, we fall back to CFM portal or return PENDING
  // If CRM_API_KEY is available, could use third-party service

  try {
    const crmApiKey = process.env.CRM_API_KEY;

    if (crmApiKey) {
      // If you have a CRM API key, implement the API call here
      // For now, this is a placeholder
      logger.info({
        event: 'crm_api_not_implemented',
        uf: data.uf,
      });
    }

    // Return pending with manual verification link
    return {
      verified: false,
      status: 'PENDING',
      matchScore: 0,
      source: `CRM-${data.uf}`,
      verificationNotes: [
        `Manual verification required with CRM-${data.uf}.`,
        `Portal: ${crmPortalUrls[data.uf]}`,
        'State CRM verification is not yet automated. Please verify manually or use CFM portal.',
      ].join(' '),
    };
  } catch (error) {
    logger.error({
      event: 'crm_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      uf: data.uf,
    });

    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: `CRM-${data.uf}`,
      verificationNotes: `Error verifying with CRM-${data.uf}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify Argentinian medical license (REFEPS/SISA - Federal System)
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
      source: 'REFEPS/SISA',
      verificationNotes: 'Province is required for Argentinian license verification',
    };
  }

  try {
    // Step 1: Try REFEPS/SISA (Red Federal de Registros de Profesionales de la Salud)
    // This is the official federal system managed by Argentina's Ministry of Health
    // https://sisa.msal.gov.ar/
    const refepsResult = await verifyREFEPS({
      nombre: `${firstName}`,
      apellido: lastName,
      matricula: licenseNumber,
      provincia: state,
    });

    if (refepsResult.verified) {
      return refepsResult;
    }

    // Step 2: Try Provincial Medical Board (Colegio Médico Provincial)
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
      source: 'REFEPS/SISA',
      verificationNotes: 'Failed to verify with Argentinian medical registries',
    };
  }
}

/**
 * Verify with REFEPS/SISA (Red Federal de Registros de Profesionales de la Salud)
 * Official federal system managed by Argentina's Ministry of Health
 * Web Service WS020 - Nominal Query of Health Professionals
 */
async function verifyREFEPS(data: {
  nombre: string;
  apellido: string;
  matricula: string;
  provincia: string;
}): Promise<MedicalLicenseVerificationResult> {
  logger.info({
    event: 'refeps_verification_attempt',
    provincia: data.provincia,
    matricula: data.matricula.substring(0, 4) + '***',
  });

  try {
    // Check if SISA credentials are available
    const sisaUsername = process.env.SISA_USERNAME;
    const sisaPassword = process.env.SISA_PASSWORD;

    if (!sisaUsername || !sisaPassword) {
      // No credentials - return pending with manual verification link
      logger.info({
        event: 'refeps_credentials_missing',
        provincia: data.provincia,
      });

      return {
        verified: false,
        status: 'PENDING',
        matchScore: 0,
        source: 'REFEPS/SISA',
        verificationNotes: [
          'Automated REFEPS verification requires SISA credentials.',
          `Public search: https://sisa.msal.gov.ar/sisadoc/docs/050102/refeps_buscador_publico_profesionales.jsp`,
          'To enable automated verification, set SISA_USERNAME and SISA_PASSWORD environment variables.',
          'Contact: soporte@sisa.msal.gov.ar for API access.',
        ].join(' '),
      };
    }

    // SISA WS020 API - Nominal Query
    // Endpoint: https://sisa.msal.gov.ar/sisa/services/rest/refeps/...
    // Note: Actual SISA API endpoint needs to be confirmed with proper documentation

    const apiUrl = 'https://sisa.msal.gov.ar/sisa/services/rest/refeps/consulta-nominal';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${sisaUsername}:${sisaPassword}`).toString('base64')}`,
      },
      body: JSON.stringify({
        apellido: data.apellido,
        nombre: data.nombre,
        numeroMatricula: data.matricula,
        provincia: data.provincia,
      }),
    });

    if (!response.ok) {
      logger.error({
        event: 'refeps_api_error',
        status: response.status,
        statusText: response.statusText,
      });

      return {
        verified: false,
        status: 'ERROR',
        matchScore: 0,
        source: 'REFEPS/SISA',
        verificationNotes: `REFEPS API error: ${response.statusText}. Status ${response.status}`,
      };
    }

    const result = await response.json();

    // Check if professional was found
    if (!result || !result.profesional) {
      return {
        verified: false,
        status: 'NOT_FOUND',
        matchScore: 0,
        source: 'REFEPS/SISA',
        verificationNotes: 'No matching professional found in REFEPS database',
      };
    }

    const profesional = result.profesional;

    // Calculate name match score
    const searchName = `${data.nombre} ${data.apellido}`.trim().toLowerCase();
    const foundName = `${profesional.nombre || ''} ${profesional.apellido || ''}`.trim().toLowerCase();
    const matchScore = calculateNameMatchScore(searchName, foundName);

    // Determine verification status
    let status: 'VERIFIED' | 'PARTIAL_MATCH' | 'NO_MATCH' = 'VERIFIED';
    let verified = true;
    const discrepancies: string[] = [];

    if (matchScore < 0.5) {
      status = 'NO_MATCH';
      verified = false;
      discrepancies.push(`Name mismatch: Expected "${searchName}", found "${foundName}"`);
    } else if (matchScore < 0.8) {
      status = 'PARTIAL_MATCH';
      verified = false;
      discrepancies.push(`Partial name match: ${matchScore.toFixed(2)}`);
    }

    // Check if license is active
    if (profesional.estado !== 'ACTIVO' && profesional.estado !== 'ACTIVA') {
      status = 'NO_MATCH';
      verified = false;
      discrepancies.push(`License not active: ${profesional.estado}`);
    }

    logger.info({
      event: 'refeps_verification_complete',
      matricula: data.matricula.substring(0, 4) + '***',
      verified,
      matchScore,
    });

    return {
      verified,
      status,
      matchScore,
      source: 'REFEPS/SISA',
      externalVerificationId: profesional.numeroMatricula,
      matchedData: {
        name: foundName,
        licenseNumber: profesional.numeroMatricula,
        specialty: profesional.profesion,
        status: profesional.estado,
        issuedDate: profesional.fechaInscripcion,
      },
      discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
      verificationNotes: verified
        ? `Successfully verified with REFEPS/SISA`
        : `Verification issues: ${discrepancies.join('; ')}`,
    };
  } catch (error) {
    logger.error({
      event: 'refeps_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      matricula: data.matricula.substring(0, 4) + '***',
    });

    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: 'REFEPS/SISA',
      verificationNotes: `Error verifying with REFEPS: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify with Provincial Medical Board in Argentina (Colegio Médico Provincial)
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

  // Each province has its own medical board (Colegio Médico)
  // Examples:
  // - Buenos Aires: Colegio de Médicos de la Provincia de Buenos Aires
  // - Córdoba: Colegio Médico de Córdoba
  // - Santa Fe: Colegio de Médicos de Santa Fe
  // - CABA: Colegio Médico de la Ciudad Autónoma de Buenos Aires

  const provincialBoardUrls: Partial<Record<string, string>> = {
    'Buenos Aires': 'https://www.colmed.org.ar/',
    'Córdoba': 'https://www.comeco.org.ar/',
    'Santa Fe': 'https://www.colegiomedicosantafe.org.ar/',
    'CABA': 'https://www.medicoscaba.org.ar/',
    'Mendoza': 'https://www.colegiomedicomendoza.org.ar/',
    'Tucumán': 'https://www.comtucuman.org.ar/',
    // Add other provinces as needed
  };

  try {
    // Provincial boards don't have standardized APIs
    // Each would need individual integration
    // For now, return PENDING with manual verification instructions

    const boardUrl = provincialBoardUrls[data.provincia] || 'https://sisa.msal.gov.ar/';

    return {
      verified: false,
      status: 'PENDING',
      matchScore: 0,
      source: `Colegio Médico - ${data.provincia}`,
      verificationNotes: [
        `Manual verification required with ${data.provincia} medical board.`,
        `Portal: ${boardUrl}`,
        'Provincial medical boards do not have standardized APIs for automated verification.',
        'Please use REFEPS/SISA for federal verification or contact the provincial board directly.',
      ].join(' '),
    };
  } catch (error) {
    logger.error({
      event: 'provincial_board_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      provincia: data.provincia,
    });

    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: `Colegio Médico - ${data.provincia}`,
      verificationNotes: `Error verifying with provincial board: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify US medical license (NPPES/State Boards)
 */
async function verifyUSLicense(
  request: MedicalLicenseVerificationRequest
): Promise<MedicalLicenseVerificationResult> {
  const { firstName, lastName, licenseNumber } = request;

  logger.info({
    event: 'us_license_verification_attempt',
    licenseNumber: licenseNumber.substring(0, 4) + '***',
  });

  try {
    // NPPES API endpoint - no authentication required
    const apiUrl = new URL('https://npiregistry.cms.hhs.gov/api/');
    apiUrl.searchParams.set('version', '2.1');
    apiUrl.searchParams.set('number', licenseNumber);

    // Optional: Add name parameters for additional validation
    if (firstName) apiUrl.searchParams.set('first_name', firstName);
    if (lastName) apiUrl.searchParams.set('last_name', lastName);
    apiUrl.searchParams.set('limit', '10');

    logger.info({
      event: 'nppes_api_request',
      url: apiUrl.toString().replace(licenseNumber, licenseNumber.substring(0, 4) + '***'),
    });

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error({
        event: 'nppes_api_error',
        status: response.status,
        statusText: response.statusText,
      });

      return {
        verified: false,
        status: 'ERROR',
        matchScore: 0,
        source: 'NPPES',
        verificationNotes: `NPPES API error: ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Check if results were found
    if (!data.results || data.results.length === 0) {
      return {
        verified: false,
        status: 'NOT_FOUND',
        matchScore: 0,
        source: 'NPPES',
        verificationNotes: 'No matching NPI found in NPPES database',
      };
    }

    // Get the first result (should be exact match since we searched by NPI number)
    const provider = data.results[0];
    const basic = provider.basic;
    const taxonomies = provider.taxonomies || [];
    const addresses = provider.addresses || [];

    // Extract provider name
    let providerName = '';
    if (provider.enumeration_type === 'NPI-1') {
      // Individual provider
      providerName = `${basic.first_name || ''} ${basic.middle_name || ''} ${basic.last_name || ''}`.trim();
    } else {
      // Organizational provider
      providerName = basic.organization_name || basic.name || '';
    }

    // Calculate name match score
    const searchName = `${firstName} ${lastName}`.trim().toLowerCase();
    const matchScore = calculateNameMatchScore(searchName, providerName.toLowerCase());

    // Determine verification status based on match score
    let status: 'VERIFIED' | 'PARTIAL_MATCH' | 'NO_MATCH' = 'VERIFIED';
    let verified = true;
    const discrepancies: string[] = [];

    if (matchScore < 0.5) {
      status = 'NO_MATCH';
      verified = false;
      discrepancies.push(`Name mismatch: Expected "${searchName}", found "${providerName}"`);
    } else if (matchScore < 0.9) {
      status = 'PARTIAL_MATCH';
      verified = false;
      discrepancies.push(`Partial name match: Searched "${searchName}", found "${providerName}"`);
    }

    // Check if license is active
    if (basic.status !== 'A') {
      status = 'NO_MATCH';
      verified = false;
      discrepancies.push(`License status is not active: ${basic.status}`);
    }

    // Extract primary taxonomy (specialty)
    const primaryTaxonomy = taxonomies.find((t: any) => t.primary) || taxonomies[0];
    const specialty = primaryTaxonomy?.desc || 'Not specified';

    // Extract primary practice address
    const practiceAddress = addresses.find((a: any) => a.address_purpose === 'LOCATION') || addresses[0];

    logger.info({
      event: 'nppes_verification_complete',
      npi: licenseNumber.substring(0, 4) + '***',
      verified,
      status,
      matchScore,
    });

    return {
      verified,
      status,
      matchScore,
      source: 'NPPES',
      externalVerificationId: provider.number,
      matchedData: {
        name: providerName,
        licenseNumber: provider.number,
        specialty,
        status: basic.status === 'A' ? 'Active' : basic.status === 'D' ? 'Deactivated' : 'Unknown',
        issuedDate: basic.enumeration_date,
        expirationDate: basic.last_updated,
      },
      discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
      verificationNotes: verified
        ? `Successfully verified with NPPES. Provider: ${providerName}, Specialty: ${specialty}`
        : `Verification failed: ${discrepancies.join('; ')}`,
    };
  } catch (error) {
    logger.error({
      event: 'nppes_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      licenseNumber: licenseNumber.substring(0, 4) + '***',
    });

    return {
      verified: false,
      status: 'ERROR',
      matchScore: 0,
      source: 'NPPES',
      verificationNotes: `Error verifying with NPPES: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
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
      return state ? `Colegio Médico - ${state}` : 'REFEPS/SISA (Red Federal de Registros de Profesionales de la Salud)';
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
      // Note: Database enum may need updating from CONFEMED_VERIFICATION to REFEPS_VERIFICATION
      // For now, using CONFEMED_VERIFICATION as placeholder
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
