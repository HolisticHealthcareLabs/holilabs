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

export class PrivacyBudgetTracker {
  private maxEpsilon: number;
  private entries: BudgetEntry[] = [];
  private totalConsumed: number = 0;

  constructor(maxEpsilon: number = 1.0) {
    if (maxEpsilon <= 0) {
      throw new Error('Maximum epsilon must be positive');
    }
    this.maxEpsilon = maxEpsilon;
  }

  canQuery(epsilon: number): boolean {
    return this.totalConsumed + epsilon <= this.maxEpsilon;
  }

  consume(epsilon: number, query: string, userId?: string): void {
    if (epsilon <= 0) {
      throw new Error('Epsilon must be positive');
    }

    if (!this.canQuery(epsilon)) {
      const msg = 'Privacy budget exceeded: ' + (this.totalConsumed + epsilon) + ' > ' + this.maxEpsilon;
      throw new Error(msg);
    }

    const entry: BudgetEntry = {
      timestamp: new Date(),
      epsilon,
      query,
      userId,
    };

    this.entries.push(entry);
    this.totalConsumed += epsilon;
  }

  getRemaining(): number {
    return Math.max(0, this.maxEpsilon - this.totalConsumed);
  }

  getConsumed(): number {
    return this.totalConsumed;
  }

  getMaxEpsilon(): number {
    return this.maxEpsilon;
  }

  getPercentageUsed(): number {
    return (this.totalConsumed / this.maxEpsilon) * 100;
  }

  getEntries(): BudgetEntry[] {
    return [...this.entries];
  }

  getEntriesByUser(userId: string): BudgetEntry[] {
    return this.entries.filter((entry) => entry.userId === userId);
  }

  generateReport(): BudgetReport {
    return {
      totalEpsilon: this.totalConsumed,
      remainingEpsilon: this.getRemaining(),
      percentageUsed: this.getPercentageUsed(),
      queryCount: this.entries.length,
      entries: this.getEntries(),
    };
  }

  reset(): void {
    this.entries = [];
    this.totalConsumed = 0;
  }

  generatePeriodReport(startDate: Date, endDate: Date): BudgetReport {
    const periodEntries = this.entries.filter(
      (entry) => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const periodTotal = periodEntries.reduce(
      (sum, entry) => sum + entry.epsilon,
      0
    );

    return {
      totalEpsilon: periodTotal,
      remainingEpsilon: this.getRemaining(),
      percentageUsed: (periodTotal / this.maxEpsilon) * 100,
      queryCount: periodEntries.length,
      entries: periodEntries,
    };
  }
}
