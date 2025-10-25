/**
 * CFDI (Comprobante Fiscal Digital por Internet) Generator
 * Mexican tax-compliant invoice XML generation for SAT
 *
 * Supports CFDI 4.0 specification
 */
export interface CFDIData {
    emisor: {
        rfc: string;
        nombre: string;
        regimenFiscal: string;
    };
    receptor: {
        rfc: string;
        nombre: string;
        usoCFDI: string;
        domicilioFiscalReceptor: string;
        regimenFiscalReceptor?: string;
    };
    serie?: string;
    folio?: string;
    fecha: string;
    formaPago: string;
    metodoPago: string;
    moneda: string;
    tipoComprobante: string;
    lugarExpedicion: string;
    subtotal: number;
    descuento?: number;
    total: number;
    conceptos: {
        claveProdServ: string;
        cantidad: number;
        claveUnidad: string;
        unidad?: string;
        descripcion: string;
        valorUnitario: number;
        importe: number;
        objetoImp: string;
        impuestos?: {
            traslados?: {
                base: number;
                impuesto: string;
                tipoFactor: string;
                tasaOCuota: string;
                importe: number;
            }[];
        };
    }[];
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
export declare function generateCFDIXML(data: CFDIData): string;
/**
 * Generate QR code for CFDI verification
 * Format: https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?...
 */
export declare function generateCFDIQRCode(emisorRFC: string, receptorRFC: string, total: number, uuid: string): Promise<string>;
/**
 * Validate RFC (Registro Federal de Contribuyentes)
 * Format: XXXX######XXX (12-13 characters)
 */
export declare function validateRFC(rfc: string): boolean;
/**
 * Generate folio (invoice number) for CFDI
 */
export declare function generateCFDIFolio(lastFolio?: string): string;
/**
 * Calculate digito verificador for RFC
 */
export declare function calculateRFCVerificationDigit(rfc: string): string;
/**
 * Format amount for CFDI (6 decimal places)
 */
export declare function formatCFDIAmount(cents: number): number;
/**
 * Get current timestamp in ISO 8601 format (Mexico City timezone)
 */
export declare function getCFDITimestamp(): string;
//# sourceMappingURL=cfdi-generator.d.ts.map