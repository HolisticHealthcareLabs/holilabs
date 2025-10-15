/**
 * CFDI (Comprobante Fiscal Digital por Internet) Generator
 * Mexican tax-compliant invoice XML generation for SAT
 *
 * Supports CFDI 4.0 specification
 */

import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export interface CFDIData {
  // Emisor (Issuer - Holi Labs)
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string; // e.g., "612" - Personas Físicas con Actividades Empresariales
  };

  // Receptor (Receiver - Patient)
  receptor: {
    rfc: string;
    nombre: string;
    usoCFDI: string; // e.g., "G03" - Gastos en general
    domicilioFiscalReceptor: string; // Postal code
    regimenFiscalReceptor?: string;
  };

  // Invoice details
  serie?: string;
  folio?: string;
  fecha: string; // ISO 8601 format
  formaPago: string; // e.g., "03" - Transferencia electrónica
  metodoPago: string; // e.g., "PUE" - Pago en una sola exhibición
  moneda: string; // e.g., "MXN"
  tipoComprobante: string; // e.g., "I" - Ingreso
  lugarExpedicion: string; // Postal code where issued

  // Amounts
  subtotal: number;
  descuento?: number;
  total: number;

  // Line items (Conceptos)
  conceptos: {
    claveProdServ: string; // SAT product/service code
    cantidad: number;
    claveUnidad: string; // e.g., "E48" - Servicio
    unidad?: string;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    objetoImp: string; // e.g., "02" - Sí objeto de impuesto
    impuestos?: {
      traslados?: {
        base: number;
        impuesto: string; // e.g., "002" - IVA
        tipoFactor: string; // e.g., "Tasa"
        tasaOCuota: string; // e.g., "0.160000"
        importe: number;
      }[];
    };
  }[];

  // Taxes
  impuestos?: {
    totalImpuestosTrasladados?: number;
    traslados?: {
      impuesto: string;
      tipoFactor: string;
      tasaOCuota: string;
      importe: number;
    }[];
  };
}

/**
 * Generate CFDI 4.0 XML
 */
export function generateCFDIXML(data: CFDIData): string {
  const uuid = uuidv4();

  // Build XML structure
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<cfdi:Comprobante ';
  xml += 'xmlns:cfdi="http://www.sat.gob.mx/cfd/4" ';
  xml += 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ';
  xml += 'xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" ';
  xml += `Version="4.0" `;
  xml += `Serie="${data.serie || ''}" `;
  xml += `Folio="${data.folio || ''}" `;
  xml += `Fecha="${data.fecha}" `;
  xml += `FormaPago="${data.formaPago}" `;
  xml += `MetodoPago="${data.metodoPago}" `;
  xml += `TipoDeComprobante="${data.tipoComprobante}" `;
  xml += `Moneda="${data.moneda}" `;
  xml += `SubTotal="${data.subtotal.toFixed(2)}" `;

  if (data.descuento) {
    xml += `Descuento="${data.descuento.toFixed(2)}" `;
  }

  xml += `Total="${data.total.toFixed(2)}" `;
  xml += `LugarExpedicion="${data.lugarExpedicion}">\n`;

  // Emisor
  xml += '  <cfdi:Emisor ';
  xml += `Rfc="${data.emisor.rfc}" `;
  xml += `Nombre="${escapeXml(data.emisor.nombre)}" `;
  xml += `RegimenFiscal="${data.emisor.regimenFiscal}" />\n`;

  // Receptor
  xml += '  <cfdi:Receptor ';
  xml += `Rfc="${data.receptor.rfc}" `;
  xml += `Nombre="${escapeXml(data.receptor.nombre)}" `;
  xml += `DomicilioFiscalReceptor="${data.receptor.domicilioFiscalReceptor}" `;

  if (data.receptor.regimenFiscalReceptor) {
    xml += `RegimenFiscalReceptor="${data.receptor.regimenFiscalReceptor}" `;
  }

  xml += `UsoCFDI="${data.receptor.usoCFDI}" />\n`;

  // Conceptos (Line Items)
  xml += '  <cfdi:Conceptos>\n';

  data.conceptos.forEach((concepto) => {
    xml += '    <cfdi:Concepto ';
    xml += `ClaveProdServ="${concepto.claveProdServ}" `;
    xml += `Cantidad="${concepto.cantidad}" `;
    xml += `ClaveUnidad="${concepto.claveUnidad}" `;

    if (concepto.unidad) {
      xml += `Unidad="${escapeXml(concepto.unidad)}" `;
    }

    xml += `Descripcion="${escapeXml(concepto.descripcion)}" `;
    xml += `ValorUnitario="${concepto.valorUnitario.toFixed(6)}" `;
    xml += `Importe="${concepto.importe.toFixed(2)}" `;
    xml += `ObjetoImp="${concepto.objetoImp}"`;

    // Taxes for this line item
    if (concepto.impuestos?.traslados && concepto.impuestos.traslados.length > 0) {
      xml += '>\n';
      xml += '      <cfdi:Impuestos>\n';
      xml += '        <cfdi:Traslados>\n';

      concepto.impuestos.traslados.forEach((traslado) => {
        xml += '          <cfdi:Traslado ';
        xml += `Base="${traslado.base.toFixed(2)}" `;
        xml += `Impuesto="${traslado.impuesto}" `;
        xml += `TipoFactor="${traslado.tipoFactor}" `;
        xml += `TasaOCuota="${traslado.tasaOCuota}" `;
        xml += `Importe="${traslado.importe.toFixed(2)}" />\n`;
      });

      xml += '        </cfdi:Traslados>\n';
      xml += '      </cfdi:Impuestos>\n';
      xml += '    </cfdi:Concepto>\n';
    } else {
      xml += ' />\n';
    }
  });

  xml += '  </cfdi:Conceptos>\n';

  // Total Taxes
  if (data.impuestos && data.impuestos.totalImpuestosTrasladados) {
    xml += '  <cfdi:Impuestos ';
    xml += `TotalImpuestosTrasladados="${data.impuestos.totalImpuestosTrasladados.toFixed(2)}">\n`;

    if (data.impuestos.traslados) {
      xml += '    <cfdi:Traslados>\n';

      data.impuestos.traslados.forEach((traslado) => {
        xml += '      <cfdi:Traslado ';
        xml += `Impuesto="${traslado.impuesto}" `;
        xml += `TipoFactor="${traslado.tipoFactor}" `;
        xml += `TasaOCuota="${traslado.tasaOCuota}" `;
        xml += `Importe="${traslado.importe.toFixed(2)}" />\n`;
      });

      xml += '    </cfdi:Traslados>\n';
    }

    xml += '  </cfdi:Impuestos>\n';
  }

  xml += '</cfdi:Comprobante>';

  return xml;
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate QR code for CFDI verification
 * Format: https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?...
 */
export async function generateCFDIQRCode(
  emisorRFC: string,
  receptorRFC: string,
  total: number,
  uuid: string
): Promise<string> {
  // SAT verification URL format
  const url =
    `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?` +
    `id=${uuid}&` +
    `re=${emisorRFC}&` +
    `rr=${receptorRFC}&` +
    `tt=${total.toFixed(6)}`;

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 200,
    margin: 1,
  });

  return qrCodeDataUrl;
}

/**
 * Validate RFC (Registro Federal de Contribuyentes)
 * Format: XXXX######XXX (12-13 characters)
 */
export function validateRFC(rfc: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanRFC = rfc.replace(/\s/g, '').toUpperCase();

  // Physical person: 13 characters (XXXX######XXX)
  // Legal entity: 12 characters (XXX######XXX)
  const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

  return rfcPattern.test(cleanRFC);
}

/**
 * Generate folio (invoice number) for CFDI
 */
export function generateCFDIFolio(lastFolio?: string): string {
  if (!lastFolio) {
    return '1';
  }

  const num = parseInt(lastFolio, 10);
  return (num + 1).toString();
}

/**
 * Calculate digito verificador for RFC
 */
export function calculateRFCVerificationDigit(rfc: string): string {
  const cleanRFC = rfc.replace(/\s/g, '').toUpperCase();

  // This is a simplified version. Real implementation should use SAT algorithm
  // For production, use a proper RFC validation library

  return cleanRFC;
}

/**
 * Format amount for CFDI (6 decimal places)
 */
export function formatCFDIAmount(cents: number): number {
  return Number((cents / 100).toFixed(6));
}

/**
 * Get current timestamp in ISO 8601 format (Mexico City timezone)
 */
export function getCFDITimestamp(): string {
  const now = new Date();

  // Convert to Mexico City timezone (UTC-6 or UTC-5 depending on DST)
  const mexicoTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
  );

  return mexicoTime.toISOString();
}
