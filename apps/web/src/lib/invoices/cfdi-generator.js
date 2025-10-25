"use strict";
/**
 * CFDI (Comprobante Fiscal Digital por Internet) Generator
 * Mexican tax-compliant invoice XML generation for SAT
 *
 * Supports CFDI 4.0 specification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCFDIXML = generateCFDIXML;
exports.generateCFDIQRCode = generateCFDIQRCode;
exports.validateRFC = validateRFC;
exports.generateCFDIFolio = generateCFDIFolio;
exports.calculateRFCVerificationDigit = calculateRFCVerificationDigit;
exports.formatCFDIAmount = formatCFDIAmount;
exports.getCFDITimestamp = getCFDITimestamp;
const qrcode_1 = __importDefault(require("qrcode"));
const uuid_1 = require("uuid");
/**
 * Generate CFDI 4.0 XML
 */
function generateCFDIXML(data) {
    const uuid = (0, uuid_1.v4)();
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
        }
        else {
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
function escapeXml(text) {
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
async function generateCFDIQRCode(emisorRFC, receptorRFC, total, uuid) {
    // SAT verification URL format
    const url = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?` +
        `id=${uuid}&` +
        `re=${emisorRFC}&` +
        `rr=${receptorRFC}&` +
        `tt=${total.toFixed(6)}`;
    // Generate QR code as data URL
    const qrCodeDataUrl = await qrcode_1.default.toDataURL(url, {
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
function validateRFC(rfc) {
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
function generateCFDIFolio(lastFolio) {
    if (!lastFolio) {
        return '1';
    }
    const num = parseInt(lastFolio, 10);
    return (num + 1).toString();
}
/**
 * Calculate digito verificador for RFC
 */
function calculateRFCVerificationDigit(rfc) {
    const cleanRFC = rfc.replace(/\s/g, '').toUpperCase();
    // This is a simplified version. Real implementation should use SAT algorithm
    // For production, use a proper RFC validation library
    return cleanRFC;
}
/**
 * Format amount for CFDI (6 decimal places)
 */
function formatCFDIAmount(cents) {
    return Number((cents / 100).toFixed(6));
}
/**
 * Get current timestamp in ISO 8601 format (Mexico City timezone)
 */
function getCFDITimestamp() {
    const now = new Date();
    // Convert to Mexico City timezone (UTC-6 or UTC-5 depending on DST)
    const mexicoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    return mexicoTime.toISOString();
}
//# sourceMappingURL=cfdi-generator.js.map