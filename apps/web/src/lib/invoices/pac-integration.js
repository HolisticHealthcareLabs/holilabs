"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWSapienPAC = exports.FinkokPAC = void 0;
exports.createPACClient = createPACClient;
exports.getPACConfig = getPACConfig;
/**
 * Finkok PAC Integration
 * Documentation: https://www.finkok.com/api-docs
 */
class FinkokPAC {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Stamp (Timbrar) a CFDI
     */
    async stampCFDI(xml) {
        try {
            // Finkok API endpoint for stamping
            const endpoint = `${this.config.apiUrl}/stamp`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
                },
                body: JSON.stringify({
                    xml,
                    rfc: this.config.rfc,
                }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                return {
                    success: true,
                    uuid: data.uuid,
                    stampedXml: data.xml,
                    stampDate: data.fecha_timbrado,
                };
            }
            else {
                return {
                    success: false,
                    error: data.error || 'Error al timbrar CFDI',
                    errorCode: data.codigo_error,
                };
            }
        }
        catch (error) {
            console.error('Finkok stamping error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }
    /**
     * Cancel a stamped CFDI
     */
    async cancelCFDI(uuid, reason) {
        try {
            const endpoint = `${this.config.apiUrl}/cancel`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
                },
                body: JSON.stringify({
                    uuid,
                    rfc: this.config.rfc,
                    motivo: reason,
                }),
            });
            const data = await response.json();
            return {
                success: response.ok && data.success,
                error: data.error,
                errorCode: data.codigo_error,
            };
        }
        catch (error) {
            console.error('Finkok cancellation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }
    /**
     * Check stamping status
     */
    async checkStatus(uuid) {
        try {
            const endpoint = `${this.config.apiUrl}/status/${uuid}`;
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
                },
            });
            const data = await response.json();
            return {
                status: data.estado,
                cancellationDate: data.fecha_cancelacion,
            };
        }
        catch (error) {
            console.error('Finkok status check error:', error);
            return { status: 'not_found' };
        }
    }
}
exports.FinkokPAC = FinkokPAC;
/**
 * SW Sapien PAC Integration
 * Documentation: https://developers.sw.com.mx/
 */
class SWSapienPAC {
    config;
    constructor(config) {
        this.config = config;
    }
    async stampCFDI(xml) {
        try {
            // SW Sapien uses token-based authentication
            const token = await this.getAuthToken();
            const endpoint = `${this.config.apiUrl}/cfdi33/stamp/v3/b64`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    xml: Buffer.from(xml).toString('base64'),
                }),
            });
            const data = await response.json();
            if (data.status === 'success') {
                return {
                    success: true,
                    uuid: data.data.uuid,
                    stampedXml: Buffer.from(data.data.cfdi, 'base64').toString('utf-8'),
                    stampDate: data.data.fechaTimbrado,
                };
            }
            else {
                return {
                    success: false,
                    error: data.message,
                    errorCode: data.messageDetail,
                };
            }
        }
        catch (error) {
            console.error('SW Sapien stamping error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }
    async getAuthToken() {
        const response = await fetch(`${this.config.apiUrl}/security/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user: this.config.username,
                password: this.config.password,
            }),
        });
        const data = await response.json();
        return data.data.token;
    }
    async cancelCFDI(uuid, reason) {
        // Similar implementation to Finkok
        return { success: false, error: 'Not implemented' };
    }
}
exports.SWSapienPAC = SWSapienPAC;
/**
 * Factory function to create PAC client
 */
function createPACClient(config) {
    switch (config.provider) {
        case 'finkok':
            return new FinkokPAC(config);
        case 'sw-sapien':
            return new SWSapienPAC(config);
        default:
            throw new Error(`PAC provider ${config.provider} not supported`);
    }
}
/**
 * Get PAC configuration from environment variables
 */
function getPACConfig() {
    const provider = process.env.PAC_PROVIDER;
    if (!provider) {
        throw new Error('PAC_PROVIDER environment variable not set');
    }
    return {
        provider,
        apiUrl: process.env.PAC_API_URL || '',
        username: process.env.PAC_USERNAME || '',
        password: process.env.PAC_PASSWORD || '',
        rfc: process.env.HOLI_LABS_RFC || '',
        certificate: process.env.PAC_CERTIFICATE,
        privateKey: process.env.PAC_PRIVATE_KEY,
        privateKeyPassword: process.env.PAC_PRIVATE_KEY_PASSWORD,
    };
}
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
//# sourceMappingURL=pac-integration.js.map