"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalAccountant = exports.DPAccountant = void 0;
/**
 * Differential Privacy Budget Accountant
 * Tracks epsilon consumption per (org, subject) pair
 * Enforces cooldown periods between exports
 */
class DPAccountant {
    defaultTotalEpsilon;
    budgets = new Map();
    constructor(defaultTotalEpsilon = 10.0) {
        this.defaultTotalEpsilon = defaultTotalEpsilon;
    }
    /**
     * Get budget key for (org, subject) pair
     */
    getBudgetKey(orgId, subjectId) {
        return `${orgId}:${subjectId}`;
    }
    /**
     * Get current budget for a subject
     */
    getBudget(orgId, subjectId) {
        const key = this.getBudgetKey(orgId, subjectId);
        const existing = this.budgets.get(key);
        if (existing) {
            return existing;
        }
        // Initialize new budget
        const newBudget = {
            orgId,
            subjectId,
            totalEpsilon: this.defaultTotalEpsilon,
            usedEpsilon: 0,
            remainingEpsilon: this.defaultTotalEpsilon,
            exportCount: 0,
        };
        this.budgets.set(key, newBudget);
        return newBudget;
    }
    /**
     * Check if an export is allowed given epsilon request
     */
    canExport(orgId, subjectId, requestedEpsilon, cooldownMinutes = 60) {
        const budget = this.getBudget(orgId, subjectId);
        // Check epsilon budget
        if (budget.usedEpsilon + requestedEpsilon > budget.totalEpsilon) {
            return {
                allowed: false,
                reason: `Epsilon budget exhausted. Used: ${budget.usedEpsilon.toFixed(2)}, Requested: ${requestedEpsilon.toFixed(2)}, Total: ${budget.totalEpsilon.toFixed(2)}`,
            };
        }
        // Check cooldown
        if (budget.cooldownUntil && new Date() < budget.cooldownUntil) {
            return {
                allowed: false,
                reason: `Cooldown active until ${budget.cooldownUntil.toISOString()}`,
            };
        }
        return { allowed: true };
    }
    /**
     * Reserve epsilon for an export
     */
    reserveEpsilon(orgId, subjectId, epsilon, cooldownMinutes = 60) {
        const budget = this.getBudget(orgId, subjectId);
        budget.usedEpsilon += epsilon;
        budget.remainingEpsilon = budget.totalEpsilon - budget.usedEpsilon;
        budget.exportCount += 1;
        budget.lastExport = new Date();
        budget.cooldownUntil = new Date(Date.now() + cooldownMinutes * 60 * 1000);
        const key = this.getBudgetKey(orgId, subjectId);
        this.budgets.set(key, budget);
    }
    /**
     * Release epsilon (e.g., if export fails)
     */
    releaseEpsilon(orgId, subjectId, epsilon) {
        const budget = this.getBudget(orgId, subjectId);
        budget.usedEpsilon = Math.max(0, budget.usedEpsilon - epsilon);
        budget.remainingEpsilon = budget.totalEpsilon - budget.usedEpsilon;
        const key = this.getBudgetKey(orgId, subjectId);
        this.budgets.set(key, budget);
    }
    /**
     * Get all budgets for an organization
     */
    getOrgBudgets(orgId) {
        const orgBudgets = [];
        for (const [key, budget] of this.budgets.entries()) {
            if (budget.orgId === orgId) {
                orgBudgets.push(budget);
            }
        }
        return orgBudgets;
    }
    /**
     * Reset budget for a subject (admin operation)
     */
    resetBudget(orgId, subjectId) {
        const key = this.getBudgetKey(orgId, subjectId);
        this.budgets.delete(key);
    }
    /**
     * Set custom total epsilon for a subject (admin operation)
     */
    setTotalEpsilon(orgId, subjectId, totalEpsilon) {
        const budget = this.getBudget(orgId, subjectId);
        budget.totalEpsilon = totalEpsilon;
        budget.remainingEpsilon = totalEpsilon - budget.usedEpsilon;
        const key = this.getBudgetKey(orgId, subjectId);
        this.budgets.set(key, budget);
    }
}
exports.DPAccountant = DPAccountant;
/**
 * Global accountant instance (singleton)
 * In production: persist to database
 */
exports.globalAccountant = new DPAccountant();
//# sourceMappingURL=accountant.js.map