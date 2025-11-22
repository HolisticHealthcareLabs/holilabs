"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyBudgetTracker = void 0;
class PrivacyBudgetTracker {
    constructor(maxEpsilon = 1.0) {
        this.entries = [];
        this.totalConsumed = 0;
        if (maxEpsilon <= 0) {
            throw new Error('Maximum epsilon must be positive');
        }
        this.maxEpsilon = maxEpsilon;
    }
    canQuery(epsilon) {
        return this.totalConsumed + epsilon <= this.maxEpsilon;
    }
    consume(epsilon, query, userId) {
        if (epsilon <= 0) {
            throw new Error('Epsilon must be positive');
        }
        if (!this.canQuery(epsilon)) {
            const msg = 'Privacy budget exceeded: ' + (this.totalConsumed + epsilon) + ' > ' + this.maxEpsilon;
            throw new Error(msg);
        }
        const entry = {
            timestamp: new Date(),
            epsilon,
            query,
            userId,
        };
        this.entries.push(entry);
        this.totalConsumed += epsilon;
    }
    getRemaining() {
        return Math.max(0, this.maxEpsilon - this.totalConsumed);
    }
    getConsumed() {
        return this.totalConsumed;
    }
    getMaxEpsilon() {
        return this.maxEpsilon;
    }
    getPercentageUsed() {
        return (this.totalConsumed / this.maxEpsilon) * 100;
    }
    getEntries() {
        return [...this.entries];
    }
    getEntriesByUser(userId) {
        return this.entries.filter((entry) => entry.userId === userId);
    }
    generateReport() {
        return {
            totalEpsilon: this.totalConsumed,
            remainingEpsilon: this.getRemaining(),
            percentageUsed: this.getPercentageUsed(),
            queryCount: this.entries.length,
            entries: this.getEntries(),
        };
    }
    reset() {
        this.entries = [];
        this.totalConsumed = 0;
    }
    generatePeriodReport(startDate, endDate) {
        const periodEntries = this.entries.filter((entry) => entry.timestamp >= startDate && entry.timestamp <= endDate);
        const periodTotal = periodEntries.reduce((sum, entry) => sum + entry.epsilon, 0);
        return {
            totalEpsilon: periodTotal,
            remainingEpsilon: this.getRemaining(),
            percentageUsed: (periodTotal / this.maxEpsilon) * 100,
            queryCount: periodEntries.length,
            entries: periodEntries,
        };
    }
}
exports.PrivacyBudgetTracker = PrivacyBudgetTracker;
