/**
 * StockoutPredictor: ML-free demand forecasting
 * Uses simple moving average + safety stock (newsvendor model)
 * Enforces ELENA (always disclose method)
 */

import { DemandForecast, StockMovement } from './types';
import { v4 as uuidv4 } from 'uuid';

export class StockoutPredictor {
  /**
   * Predict stockout for a single item
   * Uses 30-day moving average + safety stock calculation
   */
  predict(
    itemId: string,
    tenantId: string,
    movements: StockMovement[],
    currentStock: number,
    reorderPoint: number
  ): DemandForecast {
    // Filter movements for this item and tenant
    const itemMovements = movements.filter(
      m => m.itemId === itemId && m.tenantId === tenantId && m.type === 'DISPENSING'
    );

    // Calculate demand metrics
    const { dailyAverage, weeklyAverage, standardDeviation } =
      this.calculateDemandMetrics(itemMovements);

    // Calculate safety stock using standard deviation
    // Safety stock = Z-score * standard deviation
    // Z = 1.65 for 95% service level (common for healthcare)
    const zScore = 1.65;
    const safetyStock = Math.ceil(zScore * standardDeviation);

    // Estimate days until stockout
    // daysUntilStockout = (currentStock - safetyStock) / dailyAverage
    let daysUntilStockout = 999; // default if no demand
    if (dailyAverage > 0) {
      daysUntilStockout = Math.floor((currentStock - safetyStock) / dailyAverage);
    }

    // Determine confidence based on data availability
    const confidence = this.assessConfidence(itemMovements.length, standardDeviation);

    return {
      itemId,
      tenantId,
      dailyAverage,
      weeklyAverage,
      safetyStock,
      daysUntilStockout,
      confidence,
      forecastMethod: 'Moving Average (30-day) + Newsvendor Safety Stock (Z=1.65)',
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Batch predict stockout for all items in inventory
   */
  predictAll(
    tenantId: string,
    inventory: Map<string, any>, // SupplyItem map
    movements: StockMovement[]
  ): DemandForecast[] {
    const forecasts: DemandForecast[] = [];

    for (const [itemId, item] of inventory.entries()) {
      if (item.tenantId !== tenantId) continue;

      try {
        const forecast = this.predict(
          itemId,
          tenantId,
          movements,
          item.quantity,
          item.reorderPoint
        );
        forecasts.push(forecast);
      } catch (error) {
        // Skip items with calculation errors
        continue;
      }
    }

    return forecasts;
  }

  /**
   * Calculate daily and weekly demand average
   * Uses last 30 days of dispensing data
   */
  private calculateDemandMetrics(movements: StockMovement[]): {
    dailyAverage: number;
    weeklyAverage: number;
    standardDeviation: number;
  } {
    if (movements.length === 0) {
      return { dailyAverage: 0, weeklyAverage: 0, standardDeviation: 0 };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group movements by day (last 30 days)
    const dailyDemand: Map<string, number> = new Map();

    for (const movement of movements) {
      const movementDate = new Date(movement.timestamp);
      if (movementDate < thirtyDaysAgo) continue;

      const dateKey = movementDate.toISOString().split('T')[0];
      const current = dailyDemand.get(dateKey) || 0;
      // Use absolute value for dispensing (always positive demand)
      dailyDemand.set(dateKey, current + Math.abs(movement.quantity));
    }

    if (dailyDemand.size === 0) {
      return { dailyAverage: 0, weeklyAverage: 0, standardDeviation: 0 };
    }

    const demands = Array.from(dailyDemand.values());
    const dailyAverage = demands.reduce((a, b) => a + b, 0) / demands.length;
    const weeklyAverage = dailyAverage * 7;

    // Calculate standard deviation for safety stock
    const variance =
      demands.reduce((sum, demand) => {
        return sum + Math.pow(demand - dailyAverage, 2);
      }, 0) / demands.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      weeklyAverage: Math.round(weeklyAverage * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
    };
  }

  /**
   * Assess forecast confidence based on data quality
   */
  private assessConfidence(
    dataPoints: number,
    standardDeviation: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    // LOW: < 7 data points (less than 1 week of data)
    if (dataPoints < 7) {
      return 'LOW';
    }

    // LOW: high variability (coefficient of variation > 1.0)
    // MEDIUM: moderate variability (0.5 - 1.0)
    // HIGH: stable demand (< 0.5)
    // Note: without mean, we use std dev as proxy
    // This is conservative - flagging uncertainty appropriately
    if (standardDeviation > 10) {
      return 'LOW';
    } else if (standardDeviation > 5) {
      return 'MEDIUM';
    }

    return 'HIGH';
  }
}
