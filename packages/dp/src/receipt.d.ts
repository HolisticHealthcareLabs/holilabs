import { ExportReceipt } from './types';
/**
 * Generate cryptographic receipt for DP export
 */
export declare function generateReceipt(datasetSha256: string, epsilon: number, delta: number, policyVersion: string, orgId: string, subjectId: string): ExportReceipt;
/**
 * Verify receipt integrity
 */
export declare function verifyReceipt(receipt: ExportReceipt): boolean;
/**
 * Generate PDF receipt document
 */
export declare function generateReceiptPDF(receipt: ExportReceipt): Promise<Buffer>;
//# sourceMappingURL=receipt.d.ts.map