/**
 * ANVISAComplianceChecker: Enforce ANVISA regulations
 * RUTH: All checks are enforced, not optional
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SupplyItem,
  StockMovement,
  ANVISAClass,
  ComplianceReport,
} from './types';

export class ANVISAComplianceChecker {
  /**
   * Validate a movement against ANVISA rules (RUTH: enforce mandatory requirements)
   */
  validateMovement(item: SupplyItem, movement: StockMovement): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // RUTH: All items require lot number
    if (!item.lotNumber) {
      errors.push('Lot number is mandatory for all items');
    }

    // RUTH: Controlled substances require witness
    if (
      (item.anvisaClass === 'CONTROLLED_I' ||
        item.anvisaClass === 'CONTROLLED_II') &&
      movement.type === 'DISPENSING'
    ) {
      if (!movement.witnessedBy) {
        errors.push(
          `ANVISA requires witness for ${item.anvisaClass} dispensing`
        );
      }
    }

    // RUTH: ANVISA registration required for regulated items
    const regulatedClasses: ANVISAClass[] = [
      'CONTROLLED_I',
      'CONTROLLED_II',
      'ANTIMICROBIAL',
      'THERMOLABILE',
    ];
    if (
      regulatedClasses.includes(item.anvisaClass) &&
      !item.anvisaRegistration
    ) {
      errors.push(
        `ANVISA registration required for ${item.anvisaClass} items`
      );
    }

    // RUTH: Temperature tracking required for thermolabile items
    if (
      item.anvisaClass === 'THERMOLABILE' &&
      !item.temperatureRange
    ) {
      errors.push('Temperature range is required for thermolabile items');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check expiration compliance (RUTH: mandatory enforcement)
   */
  checkExpirationCompliance(inventory: Map<string, SupplyItem>): {
    nonCompliant: SupplyItem[];
    warningItems: SupplyItem[];
  } {
    const nonCompliant: SupplyItem[] = [];
    const warningItems: SupplyItem[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    for (const item of inventory.values()) {
      const expDate = new Date(item.expirationDate);

      // Non-compliant: expired items in inventory
      if (expDate < now) {
        nonCompliant.push(item);
      }
      // Warning: expiring within 30 days
      else if (expDate <= thirtyDaysFromNow) {
        warningItems.push(item);
      }
    }

    return { nonCompliant, warningItems };
  }

  /**
   * Generate compliance report for a date range (RUTH: full audit trail)
   */
  generateComplianceReport(
    tenantId: string,
    inventory: Map<string, SupplyItem>,
    movements: StockMovement[],
    dateRange: { start: string; end: string }
  ): ComplianceReport {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Filter movements in date range for this tenant
    const relevantMovements = movements.filter(m => {
      if (m.tenantId !== tenantId) return false;

      const movDate = new Date(m.timestamp);
      return movDate >= startDate && movDate <= endDate;
    });

    // Count controlled substance movements
    let controlledSubstanceMovements = 0;
    let witnessingCompliance = 0;
    let antimicrobialDispensings = 0;
    const nonCompliantMovements: StockMovement[] = [];

    for (const movement of relevantMovements) {
      const item = inventory.get(movement.itemId);
      if (!item) continue;

      // Count controlled movements
      if (
        item.anvisaClass === 'CONTROLLED_I' ||
        item.anvisaClass === 'CONTROLLED_II'
      ) {
        controlledSubstanceMovements++;

        if (movement.type === 'DISPENSING' && movement.witnessedBy) {
          witnessingCompliance++;
        } else if (movement.type === 'DISPENSING') {
          nonCompliantMovements.push(movement);
        }
      }

      // Count antimicrobial dispensings
      if (item.anvisaClass === 'ANTIMICROBIAL' && movement.type === 'DISPENSING') {
        antimicrobialDispensings++;
      }
    }

    // Count expiration issues
    const { nonCompliant: expiredItems, warningItems: expiringItems } =
      this.checkExpirationCompliance(inventory);

    const expiredItemsInPeriod = expiredItems.filter(item => {
      const expDate = new Date(item.expirationDate);
      return expDate >= startDate && expDate <= endDate;
    });

    // Calculate overall compliance score (0-100)
    // 100 = perfect, decreases for violations
    let complianceScore = 100;

    // Deduct for non-compliant controlled movements
    if (controlledSubstanceMovements > 0) {
      const witnessRate = witnessingCompliance / controlledSubstanceMovements;
      complianceScore -= (1 - witnessRate) * 20; // Max -20 for witness issues
    }

    // Deduct for expired items
    if (expiredItemsInPeriod.length > 0) {
      complianceScore -= Math.min(expiredItemsInPeriod.length * 5, 30);
    }

    // Deduct for temperature excursions (tracked separately)
    // Assuming they're counted via separate temperature tracking
    // Reserved for integration with ColdChainMonitor

    complianceScore = Math.max(0, Math.floor(complianceScore));

    return {
      tenantId,
      dateRange,
      totalMovements: relevantMovements.length,
      controlledSubstanceMovements,
      witnessingCompliance: controlledSubstanceMovements > 0
        ? Math.round((witnessingCompliance / controlledSubstanceMovements) * 100)
        : 100,
      antimicrobialDispensings,
      expiredItemsFound: expiredItemsInPeriod.length,
      temperatureExcursions: 0, // Tracked by ColdChainMonitor
      anvisaReportableEvents: expiredItemsInPeriod.length + nonCompliantMovements.length,
      overallComplianceScore: complianceScore,
    };
  }

  /**
   * Check if item needs ANVISA reporting
   */
  requiresANVISAReporting(item: SupplyItem, reason: string): boolean {
    // RUTH: Certain events must be reported to ANVISA
    const reportableReasons = [
      'EXPIRED_IN_INVENTORY',
      'COLD_CHAIN_VIOLATION',
      'INTEGRITY_BREACH',
      'RECALL',
      'ADVERSE_EVENT',
    ];

    const isRegulatedItem =
      item.anvisaClass === 'CONTROLLED_I' ||
      item.anvisaClass === 'CONTROLLED_II' ||
      item.anvisaClass === 'THERMOLABILE';

    return isRegulatedItem && reportableReasons.includes(reason);
  }
}
