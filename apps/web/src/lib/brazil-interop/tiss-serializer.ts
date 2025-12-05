/**
 * TISS XML Serializer
 *
 * Generates TISS-compliant XML for Brazilian private health insurance billing.
 * Implements TISS 4.x standard for electronic claim submission.
 *
 * TISS (Troca de Informações na Saúde Suplementar) is the Brazilian standard
 * for health insurance data exchange, mandated by ANS (Agência Nacional de Saúde).
 *
 * Supported Guia Types:
 * - Guia de Consulta (Consultation Guide)
 * - Guia de SP/SADT (Procedures/Diagnostics)
 * - Guia de Internação (Hospitalization)
 * - Guia de Honorários (Professional Fees)
 *
 * @see https://www.ans.gov.br/prestadores/tiss-troca-de-informacao-de-saude-suplementar
 */

import { create } from 'xmlbuilder2';
import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type GuiaType =
  | 'CONSULTA'
  | 'SP_SADT'
  | 'INTERNACAO'
  | 'HONORARIOS';

export interface TISSBeneficiary {
  numeroCarteira: string; // Beneficiary card number
  nomeBeneficiario: string;
  numeroCNS?: string; // Optional: Cartão Nacional de Saúde
}

export interface TISSContratado {
  codigoOperadoraNaANS: string; // 6-digit ANS code
  codigoPrestadorNaOperadora: string;
  nomeContratado: string;
  cnpj: string;
  cnesContratado: string; // 7-digit CNES code
}

export interface TISSProcedure {
  codigoTabela: string; // '22' for CBHPM
  codigoProcedimento: string; // CBHPM code
  descricaoProcedimento: string;
  quantidade: number;
  valorUnitario: number; // in cents
  valorTotal: number; // in cents
  dataRealizacao: Date;
}

export interface TISSConsultaGuia {
  numeroGuiaPrestador: string; // Internal guide number
  numeroGuiaOperadora?: string; // Assigned by insurer (for responses)
  guiaType: 'CONSULTA';
  dataAtendimento: Date;
  beneficiario: TISSBeneficiary;
  contratado: TISSContratado;
  profissionalExecutante: {
    nomeProfissional: string;
    conselhoProfissional: string; // "CRM", "CRO", etc.
    numeroConselhoProfissional: string;
    uf: string;
    cbo: string; // 6-digit CBO code
  };
  procedimentos: TISSProcedure[];
  diagnostico: {
    codigoCID10: string;
    descricaoCID10: string;
  };
  observacao?: string;
  valorTotal: number; // in cents
}

export interface TISSSPSADTGuia {
  numeroGuiaPrestador: string;
  numeroGuiaOperadora?: string;
  guiaType: 'SP_SADT';
  dataAutorizacao?: Date;
  dataSolicitacao: Date;
  beneficiario: TISSBeneficiary;
  contratado: TISSContratado;
  profissionalSolicitante: {
    nomeProfissional: string;
    conselhoProfissional: string;
    numeroConselhoProfissional: string;
    uf: string;
  };
  procedimentos: TISSProcedure[];
  diagnostico: {
    codigoCID10: string;
    descricaoCID10: string;
  };
  indicacaoClinica?: string;
  observacao?: string;
  valorTotal: number;
}

export type TISSGuia = TISSConsultaGuia | TISSSPSADTGuia;

export interface TISSLoteGuias {
  numeroLote: string;
  dataEnvio: Date;
  operadoraDestinataria: {
    codigoANS: string;
    nomeOperadora: string;
  };
  prestadorRemetente: {
    cnpj: string;
    nomeContratado: string;
    cnesContratado: string;
  };
  guias: TISSGuia[];
}

// ============================================================================
// TISS XML GENERATION
// ============================================================================

/**
 * Formats date for TISS XML (YYYY-MM-DD)
 */
function formatTISSDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Formats currency for TISS (divide cents by 100, format with 2 decimals)
 */
function formatTISSCurrency(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Generates a Guia de Consulta (Consultation Guide) XML element
 */
function generateConsultaGuia(
  root: XMLBuilder,
  guia: TISSConsultaGuia
): XMLBuilder {
  const guiaElement = root.ele('guiaConsulta');

  // Header
  guiaElement
    .ele('cabecalhoGuia')
    .ele('registroANS').txt(guia.contratado.codigoOperadoraNaANS).up()
    .ele('numeroGuiaPrestador').txt(guia.numeroGuiaPrestador).up();

  if (guia.numeroGuiaOperadora) {
    guiaElement.ele('numeroGuiaOperadora').txt(guia.numeroGuiaOperadora);
  }

  // Beneficiary data
  const beneficiario = guiaElement.ele('dadosBeneficiario');
  beneficiario
    .ele('numeroCarteira').txt(guia.beneficiario.numeroCarteira).up()
    .ele('nomeBeneficiario').txt(guia.beneficiario.nomeBeneficiario).up();

  if (guia.beneficiario.numeroCNS) {
    beneficiario.ele('numeroCNS').txt(guia.beneficiario.numeroCNS);
  }

  // Contractor data
  const contratado = guiaElement.ele('dadosContratado');
  contratado
    .ele('codigoPrestadorNaOperadora').txt(guia.contratado.codigoPrestadorNaOperadora).up()
    .ele('nomeContratado').txt(guia.contratado.nomeContratado).up()
    .ele('CNPJ').txt(guia.contratado.cnpj).up()
    .ele('CNES').txt(guia.contratado.cnesContratado).up();

  // Professional data
  const profissional = guiaElement.ele('profissionalExecutante');
  profissional
    .ele('nomeProfissional').txt(guia.profissionalExecutante.nomeProfissional).up()
    .ele('conselhoProfissional').txt(guia.profissionalExecutante.conselhoProfissional).up()
    .ele('numeroConselhoProfissional').txt(guia.profissionalExecutante.numeroConselhoProfissional).up()
    .ele('UF').txt(guia.profissionalExecutante.uf).up()
    .ele('codigoCBO').txt(guia.profissionalExecutante.cbo).up();

  // Attendance data
  guiaElement
    .ele('dataAtendimento').txt(formatTISSDate(guia.dataAtendimento)).up();

  // Procedures
  const procedimentosElement = guiaElement.ele('procedimentosExecutados');
  for (const proc of guia.procedimentos) {
    const procElement = procedimentosElement.ele('procedimento');
    procElement
      .ele('codigoTabela').txt(proc.codigoTabela).up()
      .ele('codigoProcedimento').txt(proc.codigoProcedimento).up()
      .ele('descricaoProcedimento').txt(proc.descricaoProcedimento).up()
      .ele('quantidadeExecutada').txt(String(proc.quantidade)).up()
      .ele('valorUnitario').txt(formatTISSCurrency(proc.valorUnitario)).up()
      .ele('valorTotal').txt(formatTISSCurrency(proc.valorTotal)).up();
  }

  // Diagnosis
  const diagnostico = guiaElement.ele('diagnostico');
  diagnostico
    .ele('codigoCID10').txt(guia.diagnostico.codigoCID10).up()
    .ele('descricaoCID10').txt(guia.diagnostico.descricaoCID10).up();

  // Observation
  if (guia.observacao) {
    guiaElement.ele('observacao').txt(guia.observacao);
  }

  // Total value
  guiaElement
    .ele('valorTotal').txt(formatTISSCurrency(guia.valorTotal)).up();

  return guiaElement;
}

/**
 * Generates a Guia de SP/SADT (Procedures/Diagnostics Guide) XML element
 */
function generateSPSADTGuia(
  root: XMLBuilder,
  guia: TISSSPSADTGuia
): XMLBuilder {
  const guiaElement = root.ele('guiaSPSADT');

  // Header
  guiaElement
    .ele('cabecalhoGuia')
    .ele('registroANS').txt(guia.contratado.codigoOperadoraNaANS).up()
    .ele('numeroGuiaPrestador').txt(guia.numeroGuiaPrestador).up();

  if (guia.numeroGuiaOperadora) {
    guiaElement.ele('numeroGuiaOperadora').txt(guia.numeroGuiaOperadora);
  }

  // Authorization date
  if (guia.dataAutorizacao) {
    guiaElement.ele('dataAutorizacao').txt(formatTISSDate(guia.dataAutorizacao));
  }

  // Request date
  guiaElement.ele('dataSolicitacao').txt(formatTISSDate(guia.dataSolicitacao));

  // Beneficiary data
  const beneficiario = guiaElement.ele('dadosBeneficiario');
  beneficiario
    .ele('numeroCarteira').txt(guia.beneficiario.numeroCarteira).up()
    .ele('nomeBeneficiario').txt(guia.beneficiario.nomeBeneficiario).up();

  if (guia.beneficiario.numeroCNS) {
    beneficiario.ele('numeroCNS').txt(guia.beneficiario.numeroCNS);
  }

  // Contractor data
  const contratado = guiaElement.ele('dadosContratado');
  contratado
    .ele('codigoPrestadorNaOperadora').txt(guia.contratado.codigoPrestadorNaOperadora).up()
    .ele('nomeContratado').txt(guia.contratado.nomeContratado).up()
    .ele('CNPJ').txt(guia.contratado.cnpj).up()
    .ele('CNES').txt(guia.contratado.cnesContratado).up();

  // Requesting professional
  const profissional = guiaElement.ele('profissionalSolicitante');
  profissional
    .ele('nomeProfissional').txt(guia.profissionalSolicitante.nomeProfissional).up()
    .ele('conselhoProfissional').txt(guia.profissionalSolicitante.conselhoProfissional).up()
    .ele('numeroConselhoProfissional').txt(guia.profissionalSolicitante.numeroConselhoProfissional).up()
    .ele('UF').txt(guia.profissionalSolicitante.uf).up();

  // Clinical indication
  if (guia.indicacaoClinica) {
    guiaElement.ele('indicacaoClinica').txt(guia.indicacaoClinica);
  }

  // Procedures
  const procedimentosElement = guiaElement.ele('procedimentosSolicitados');
  for (const proc of guia.procedimentos) {
    const procElement = procedimentosElement.ele('procedimento');
    procElement
      .ele('codigoTabela').txt(proc.codigoTabela).up()
      .ele('codigoProcedimento').txt(proc.codigoProcedimento).up()
      .ele('descricaoProcedimento').txt(proc.descricaoProcedimento).up()
      .ele('quantidadeSolicitada').txt(String(proc.quantidade)).up()
      .ele('dataRealizacao').txt(formatTISSDate(proc.dataRealizacao)).up();
  }

  // Diagnosis
  const diagnostico = guiaElement.ele('diagnostico');
  diagnostico
    .ele('codigoCID10').txt(guia.diagnostico.codigoCID10).up()
    .ele('descricaoCID10').txt(guia.diagnostico.descricaoCID10).up();

  // Observation
  if (guia.observacao) {
    guiaElement.ele('observacao').txt(guia.observacao);
  }

  // Total value
  guiaElement.ele('valorTotal').txt(formatTISSCurrency(guia.valorTotal));

  return guiaElement;
}

/**
 * Generates a complete TISS XML batch (lote) for submission to insurance company
 *
 * @param lote - Batch of guides to be submitted
 * @returns XML string in TISS 4.x format
 *
 * @example
 * ```typescript
 * const lote: TISSLoteGuias = {
 *   numeroLote: "2025120500001",
 *   dataEnvio: new Date(),
 *   operadoraDestinataria: {
 *     codigoANS: "123456",
 *     nomeOperadora: "Unimed"
 *   },
 *   prestadorRemetente: {
 *     cnpj: "12345678000190",
 *     nomeContratado: "Clínica Holi Labs",
 *     cnesContratado: "1234567"
 *   },
 *   guias: [consultaGuia1, consultaGuia2]
 * };
 *
 * const xml = generateTISSXML(lote);
 * // Send to insurance company via web service
 * ```
 */
export function generateTISSXML(lote: TISSLoteGuias): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('tissLoteGuias', {
      xmlns: 'http://www.ans.gov.br/padroes/tiss/schemas',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.ans.gov.br/padroes/tiss/schemas tissLoteGuias_4_00.xsd'
    });

  // Batch header
  const cabecalhoLote = doc.ele('cabecalhoLote');
  cabecalhoLote
    .ele('numeroLote').txt(lote.numeroLote).up()
    .ele('dataEnvioLote').txt(formatTISSDate(lote.dataEnvio)).up();

  // Destination insurance company
  const operadora = cabecalhoLote.ele('operadoraDestinataria');
  operadora
    .ele('codigoANS').txt(lote.operadoraDestinataria.codigoANS).up()
    .ele('nomeOperadora').txt(lote.operadoraDestinataria.nomeOperadora).up();

  // Sender provider
  const prestador = cabecalhoLote.ele('prestadorRemetente');
  prestador
    .ele('CNPJ').txt(lote.prestadorRemetente.cnpj).up()
    .ele('nomeContratado').txt(lote.prestadorRemetente.nomeContratado).up()
    .ele('CNES').txt(lote.prestadorRemetente.cnesContratado).up();

  // Guides
  const guiasElement = doc.ele('loteGuias');
  for (const guia of lote.guias) {
    if (guia.guiaType === 'CONSULTA') {
      generateConsultaGuia(guiasElement, guia as TISSConsultaGuia);
    } else if (guia.guiaType === 'SP_SADT') {
      generateSPSADTGuia(guiasElement, guia as TISSSPSADTGuia);
    }
  }

  // Generate XML string
  return doc.end({ prettyPrint: true });
}

/**
 * Parses TISS XML response from insurance company
 *
 * @param xmlString - TISS XML response
 * @returns Parsed response object with status and messages
 *
 * @example
 * ```typescript
 * const response = await fetch('https://operadora.com.br/webservice', {
 *   method: 'POST',
 *   body: xml
 * });
 * const xmlResponse = await response.text();
 * const parsed = parseTISSResponse(xmlResponse);
 * console.log(parsed.guiasStatus); // Array of guide statuses
 * ```
 */
export function parseTISSResponse(xmlString: string): {
  numeroLote: string;
  dataProcessamento: Date;
  guiasStatus: Array<{
    numeroGuiaPrestador: string;
    numeroGuiaOperadora: string;
    status: 'AUTORIZADO' | 'NEGADO' | 'PENDENTE';
    motivoNegacao?: string;
  }>;
} {
  // TODO: Implement XML parsing using xml2js or similar
  // This is a placeholder for the parsing logic
  throw new Error('parseTISSResponse not yet implemented - requires xml2js');
}

/**
 * Validates TISS guide data before XML generation
 *
 * @param guia - Guide to validate
 * @returns Array of validation errors (empty if valid)
 *
 * @example
 * ```typescript
 * const errors = validateTISSGuia(consultaGuia);
 * if (errors.length > 0) {
 *   console.error('Validation errors:', errors);
 * } else {
 *   const xml = generateTISSXML(lote);
 * }
 * ```
 */
export function validateTISSGuia(guia: TISSGuia): string[] {
  const errors: string[] = [];

  // Validate ANS code (6 digits)
  if (!/^\d{6}$/.test(guia.contratado.codigoOperadoraNaANS)) {
    errors.push('Invalid ANS code: must be 6 digits');
  }

  // Validate CNPJ (14 digits)
  if (!/^\d{14}$/.test(guia.contratado.cnpj)) {
    errors.push('Invalid CNPJ: must be 14 digits');
  }

  // Validate CNES code (7 digits)
  if (!/^\d{7}$/.test(guia.contratado.cnesContratado)) {
    errors.push('Invalid CNES code: must be 7 digits');
  }

  // Validate CID-10 code
  if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(guia.diagnostico.codigoCID10)) {
    errors.push('Invalid ICD-10 code format');
  }

  // Validate procedures exist
  if (!guia.procedimentos || guia.procedimentos.length === 0) {
    errors.push('At least one procedure is required');
  }

  // Validate procedure codes
  for (const proc of guia.procedimentos) {
    if (proc.codigoTabela === '22' && !/^\d{8}$/.test(proc.codigoProcedimento)) {
      errors.push(`Invalid CBHPM code ${proc.codigoProcedimento}: must be 8 digits`);
    }
    if (proc.quantidade <= 0) {
      errors.push(`Invalid quantity for procedure ${proc.codigoProcedimento}`);
    }
    if (proc.valorUnitario <= 0 || proc.valorTotal <= 0) {
      errors.push(`Invalid values for procedure ${proc.codigoProcedimento}`);
    }
  }

  // Type-specific validations
  if (guia.guiaType === 'CONSULTA') {
    const consulta = guia as TISSConsultaGuia;
    // Validate CBO code (6 digits)
    if (!/^\d{6}$/.test(consulta.profissionalExecutante.cbo)) {
      errors.push('Invalid CBO code: must be 6 digits');
    }
  }

  return errors;
}

/**
 * Generates a unique guide number (Número da Guia do Prestador)
 *
 * Format: YYYYMMDD + Sequence Number (5 digits)
 * Example: "2025120500001"
 *
 * @param sequenceNumber - Sequential number for the day
 * @returns Formatted guide number
 */
export function generateGuideNumber(sequenceNumber: number): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(5, '0');

  return `${year}${month}${day}${seq}`;
}

/**
 * Generates a unique batch number (Número do Lote)
 *
 * Format: CNES (7 digits) + YYYYMMDD + Sequence (3 digits)
 * Example: "123456720251205001"
 *
 * @param cnesCode - CNES code of the provider
 * @param sequenceNumber - Sequential number for the day
 * @returns Formatted batch number
 */
export function generateBatchNumber(cnesCode: string, sequenceNumber: number): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(3, '0');

  return `${cnesCode}${year}${month}${day}${seq}`;
}
