/**
 * ReorderEngine: Automatic reorder point calculation
 * Integrates with StockoutPredictor to optimize reorder strategy
 */

import { SupplyItem, DemandForecast, ReorderRecommendation } from './types';

export class ReorderEngine {
  /**
   * Calculate optimal reorder point using Economic Order Quantity principles
   * Reorder Point = (Average Daily Demand × Lead Time) + Safety Stock
   */
  calculateReorderPoint(
    dailyAverage: number,
    leadTimeDays: number,
    safetyStock: number
  ): number {
    const reorderPoint = dailyAverage * leadTimeDays + safetyStock;
    return Math.ceil(reorderPoint);
  }

  /**
   * Calculate optimal reorder quantity using EOQ formula
   * Simplified: reorderQuantity = 2 × (Average Daily Demand × 90 days)
   * This ensures ~90-day supply buffer for most items
   */
  calculateReorderQuantity(
    dailyAverage: number,
    holdingCostFactor: number = 1
  ): number {
    // Target ~90 days of supply
    const targetDays = 90;
    const quantity = dailyAverage * targetDays * holdingCostFactor;
    return Math.ceil(quantity);
  }

  /**
   * Generate reorder recommendations for items based on forecast
   */
  generateRecommendations(
    inventory: Map<string, SupplyItem>,
    forecasts: DemandForecast[],
    tenantId: string
  ): ReorderRecommendation[] {
    const recommendations: ReorderRecommendation[] = [];

    for (const forecast of forecasts) {
      const item = inventory.get(forecast.itemId);
      if (!item || item.tenantId !== tenantId) continue;

      // Skip expired items
      const expDate = new Date(item.expirationDate);
      if (expDate < new Date()) continue;

      // Determine priority based on days until stockout
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'LOW';
      if (forecast.daysUntilStockout <= 0) {
        priority = 'URGENT';
      } else if (forecast.daysUntilStockout <= 7) {
        priority = 'HIGH';
      } else if (forecast.daysUntilStockout <= 14) {
        priority = 'MEDIUM';
      }

      recommendations.push({
        itemId: forecast.itemId,
        currentStock: item.quantity,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
        daysUntilStockout: Math.max(0, forecast.daysUntilStockout),
        priority,
      });
    }

    // Sort by priority (URGENT first)
    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    return recommendations;
  }

  /**
   * Optimize item's reorder parameters based on usage history
   */
  optimizeReorderParams(
    item: SupplyItem,
    forecast: DemandForecast,
    leadTimeDays: number = 5
  ): {
    optimalReorderPoint: number;
    optimalReorderQuantity: number;
    rationale: string;
  } {
    const optimalReorderPoint = this.calculateReorderPoint(
      forecast.dailyAverage,
      leadTimeDays,
      forecast.safetyStock
    );

    const optimalReorderQuantity = this.calculateReorderQuantity(
      forecast.dailyAverage
    );

    let rationale = `Based on ${forecast.forecastMethod}: `;
    rationale += `${forecast.dailyAverage} units/day average, `;
    rationale += `${leadTimeDays}-day lead time, `;
    rationale += `${forecast.safetyStock} units safety stock (${forecast.confidence} confidence). `;

    if (forecast.confidence === 'LOW') {
      rationale += 'Recommend manual review due to low forecast confidence.';
    }

    return {
      optimalReorderPoint,
      optimalReorderQuantity,
      rationale,
    };
  }

  /**
   * Batch optimize all items in inventory
   */
  optimizeAll(
    inventory: Map<string, SupplyItem>,
    forecasts: DemandForecast[],
    tenantId: string,
    leadTimeDays: number = 5
  ): Map<string, {
    optimalReorderPoint: number;
    optimalReorderQuantity: number;
    rationale: string;
  }> {
    const optimizations = new Map();

    for (const forecast of forecasts) {
      const item = inventory.get(forecast.itemId);
      if (!item || item.tenantId !== tenantId) continue;

      const optimization = this.optimizeReorderParams(
        item,
        forecast,
        leadTimeDays
      );

      optimizations.set(forecast.itemId, optimization);
    }

    return optimizations;
  }
}
