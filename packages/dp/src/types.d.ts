export interface DPParameters {
    epsilon: number;
    delta: number;
    mechanism: 'laplace' | 'gaussian';
}
export interface DPBudget {
    orgId: string;
    subjectId: string;
    totalEpsilon: number;
    usedEpsilon: number;
    remainingEpsilon: number;
    exportCount: number;
    lastExport?: Date;
    cooldownUntil?: Date;
}
export interface ExportReceipt {
    datasetSha256: string;
    epsilon: number;
    delta: number;
    policyVersion: string;
    timestamp: Date;
    orgId: string;
    subjectId: string;
    receiptHash: string;
}
export interface DPResult {
    data: any;
    parameters: DPParameters;
    noiseAdded: boolean;
}
//# sourceMappingURL=types.d.ts.map