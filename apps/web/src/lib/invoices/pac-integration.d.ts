/**
 * PAC (Proveedor Autorizado de Certificación) Integration
 *
 * Integrates with Mexican PAC providers for CFDI "timbrado" (stamping)
 *
 * Supported PACs:
 * - Finkok (recommended)
 * - SW Sapien
 * - Diverza
 * - Ecodex
 *
 * This is a template implementation. In production, you'll need:
 * 1. Register with a PAC provider
 * 2. Obtain API credentials
 * 3. Implement their specific API endpoints
 * 4. Handle callbacks and webhooks
 */
export interface PACConfig {
    provider: 'finkok' | 'sw-sapien' | 'diverza' | 'ecodex';
    apiUrl: string;
    username: string;
    password: string;
    rfc: string;
    certificate?: string;
    privateKey?: string;
    privateKeyPassword?: string;
}
export interface StampResult {
    success: boolean;
    uuid?: string;
    stampedXml?: string;
    stampDate?: string;
    error?: string;
    errorCode?: string;
}
/**
 * Finkok PAC Integration
 * Documentation: https://www.finkok.com/api-docs
 */
export declare class FinkokPAC {
    private config;
    constructor(config: PACConfig);
    /**
     * Stamp (Timbrar) a CFDI
     */
    stampCFDI(xml: string): Promise<StampResult>;
    /**
     * Cancel a stamped CFDI
     */
    cancelCFDI(uuid: string, reason: string): Promise<StampResult>;
    /**
     * Check stamping status
     */
    checkStatus(uuid: string): Promise<{
        status: 'active' | 'cancelled' | 'not_found';
        cancellationDate?: string;
    }>;
}
/**
 * SW Sapien PAC Integration
 * Documentation: https://developers.sw.com.mx/
 */
export declare class SWSapienPAC {
    private config;
    constructor(config: PACConfig);
    stampCFDI(xml: string): Promise<StampResult>;
    private getAuthToken;
    cancelCFDI(uuid: string, reason: string): Promise<StampResult>;
}
/**
 * Factory function to create PAC client
 */
export declare function createPACClient(config: PACConfig): FinkokPAC | SWSapienPAC;
/**
 * Get PAC configuration from environment variables
 */
export declare function getPACConfig(): PACConfig;
/**
 * Example usage:
 *
 * ```typescript
 * import { createPACClient, getPACConfig } from '@/lib/invoices/pac-integration';
 * import { generateCFDIXML } from '@/lib/invoices/cfdi-generator';
 *
 * // Generate CFDI XML
 * const cfdiXml = generateCFDIXML(cfdiData);
 *
 * // Stamp with PAC
 * const config = getPACConfig();
 * const pac = createPACClient(config);
 * const result = await pac.stampCFDI(cfdiXml);
 *
 * if (result.success) {
 *   // Save stamped XML and UUID to database
 *   await prisma.invoice.update({
 *     where: { id: invoiceId },
 *     data: {
 *       cfdiUUID: result.uuid,
 *       cfdiXml: result.stampedXml,
 *       cfdiStampDate: new Date(result.stampDate!),
 *       cfdiStatus: 'STAMPED',
 *     },
 *   });
 * }
 * ```
 */
//# sourceMappingURL=pac-integration.d.ts.map