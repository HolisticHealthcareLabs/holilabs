/**
 * Blockchain Smart Contract Integration
 *
 * Purpose: Store hashes on-chain for immutability and verification
 * Networks: Polygon (low cost), Ethereum, Base
 *
 * IMPORTANT: This is designed for future use. All functions are
 * currently stubbed but ready for production deployment.
 */
/**
 * Store consent hash on blockchain
 * Returns transaction hash for audit trail
 */
export declare function storeConsentOnChain(consentId: string, consentHash: string, patientWallet?: string): Promise<{
    txHash: string;
    blockNumber: number;
    gasUsed: string;
}>;
/**
 * Store prescription hash on blockchain
 */
export declare function storePrescriptionOnChain(prescriptionId: string, prescriptionHash: string, clinicianWallet?: string): Promise<{
    txHash: string;
    blockNumber: number;
    gasUsed: string;
}>;
/**
 * Store document hash on blockchain
 */
export declare function storeDocumentOnChain(documentId: string, documentHash: string): Promise<{
    txHash: string;
    blockNumber: number;
    gasUsed: string;
}>;
/**
 * Verify a record on blockchain
 * Checks if the hash matches what's stored on-chain
 */
export declare function verifyRecordOnChain(recordId: string, expectedHash: string): Promise<{
    isValid: boolean;
    onChainHash: string;
    timestamp: number;
}>;
/**
 * Batch store multiple hashes (cost-efficient)
 * Generates Merkle root and stores single hash
 */
export declare function batchStoreHashes(records: Array<{
    id: string;
    hash: string;
    type: 'consent' | 'prescription' | 'document';
}>): Promise<{
    txHash: string;
    merkleRoot: string;
    recordCount: number;
}>;
/**
 * Get transaction status
 */
export declare function getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    blockNumber?: number;
}>;
/**
 * Estimate gas cost for a transaction
 */
export declare function estimateGasCost(operation: 'consent' | 'prescription' | 'document'): Promise<{
    gasEstimate: string;
    costInUSD: string;
}>;
/**
 * Check if blockchain integration is enabled
 */
export declare function isBlockchainEnabled(): boolean;
/**
 * Initialize blockchain connection (call on app startup)
 */
export declare function initializeBlockchain(): Promise<{
    connected: boolean;
    network: string;
}>;
//# sourceMappingURL=contracts.d.ts.map