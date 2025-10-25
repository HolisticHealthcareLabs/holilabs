import { DPBudget } from './types';
/**
 * Differential Privacy Budget Accountant
 * Tracks epsilon consumption per (org, subject) pair
 * Enforces cooldown periods between exports
 */
export declare class DPAccountant {
    private defaultTotalEpsilon;
    private budgets;
    constructor(defaultTotalEpsilon?: number);
    /**
     * Get budget key for (org, subject) pair
     */
    private getBudgetKey;
    /**
     * Get current budget for a subject
     */
    getBudget(orgId: string, subjectId: string): DPBudget;
    /**
     * Check if an export is allowed given epsilon request
     */
    canExport(orgId: string, subjectId: string, requestedEpsilon: number, cooldownMinutes?: number): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Reserve epsilon for an export
     */
    reserveEpsilon(orgId: string, subjectId: string, epsilon: number, cooldownMinutes?: number): void;
    /**
     * Release epsilon (e.g., if export fails)
     */
    releaseEpsilon(orgId: string, subjectId: string, epsilon: number): void;
    /**
     * Get all budgets for an organization
     */
    getOrgBudgets(orgId: string): DPBudget[];
    /**
     * Reset budget for a subject (admin operation)
     */
    resetBudget(orgId: string, subjectId: string): void;
    /**
     * Set custom total epsilon for a subject (admin operation)
     */
    setTotalEpsilon(orgId: string, subjectId: string, totalEpsilon: number): void;
}
/**
 * Global accountant instance (singleton)
 * In production: persist to database
 */
export declare const globalAccountant: DPAccountant;
//# sourceMappingURL=accountant.d.ts.map