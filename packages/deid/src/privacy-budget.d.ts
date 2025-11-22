export interface BudgetEntry {
    timestamp: Date;
    epsilon: number;
    query: string;
    userId?: string;
}
export interface BudgetReport {
    totalEpsilon: number;
    remainingEpsilon: number;
    percentageUsed: number;
    queryCount: number;
    entries: BudgetEntry[];
}
export declare class PrivacyBudgetTracker {
    private maxEpsilon;
    private entries;
    private totalConsumed;
    constructor(maxEpsilon?: number);
    canQuery(epsilon: number): boolean;
    consume(epsilon: number, query: string, userId?: string): void;
    getRemaining(): number;
    getConsumed(): number;
    getMaxEpsilon(): number;
    getPercentageUsed(): number;
    getEntries(): BudgetEntry[];
    getEntriesByUser(userId: string): BudgetEntry[];
    generateReport(): BudgetReport;
    reset(): void;
    generatePeriodReport(startDate: Date, endDate: Date): BudgetReport;
}
//# sourceMappingURL=privacy-budget.d.ts.map