/**
 * Tests for StockoutPredictor
 * Coverage: moving average, safety stock, edge cases, confidence assessment
 */

import { StockoutPredictor } from '../stockout-predictor';
import { StockMovement } from '../types';

describe('StockoutPredictor', () => {
  let predictor: StockoutPredictor;
  const tenantId = 'tenant-1';
  const itemId = 'item-1';

  beforeEach(() => {
    predictor = new StockoutPredictor();
  });

  describe('predict', () => {
    it('should calculate moving average for 30-day history', () => {
      const now = new Date();
      const movements: StockMovement[] = [];

      // Generate 30 days of dispensing data (5 units/day)
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
        movements.push({
          id: `mov-${i}`,
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -5,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
      }

      const forecast = predictor.predict(
        itemId,
        tenantId,
        movements,
        100, // current stock
        20   // reorder point
      );

      expect(forecast.dailyAverage).toBe(5);
      expect(forecast.weeklyAverage).toBe(35);
      expect(forecast.forecastMethod).toContain('Moving Average');
    });

    it('should handle no dispensing history (edge case)', () => {
      const movements: StockMovement[] = [];

      const forecast = predictor.predict(
        itemId,
        tenantId,
        movements,
        100,
        20
      );

      expect(forecast.dailyAverage).toBe(0);
      expect(forecast.safetyStock).toBe(0);
      expect(forecast.daysUntilStockout).toBe(999); // default when no demand
    });

    it('should calculate safety stock using standard deviation', () => {
      const now = new Date();
      const movements: StockMovement[] = [];

      // Variable demand: 3, 5, 7, 5, 4 units per day
      const dailyDemands = [3, 5, 7, 5, 4];
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
        const demand = dailyDemands[i % dailyDemands.length];
        movements.push({
          id: `mov-${i}`,
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -demand,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
      }

      const forecast = predictor.predict(
        itemId,
        tenantId,
        movements,
        100,
        20
      );

      expect(forecast.safetyStock).toBeGreaterThan(0);
      expect(forecast.forecastMethod).toContain('Newsvendor');
    });

    it('should estimate days until stockout correctly', () => {
      const now = new Date();
      const movements: StockMovement[] = [];

      // Generate 10 days of data with 10 units/day consumption
      for (let i = 0; i < 10; i++) {
        const date = new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000);
        movements.push({
          id: `mov-${i}`,
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -10,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
      }

      const forecast = predictor.predict(
        itemId,
        tenantId,
        movements,
        100, // current stock
        20   // reorder point
      );

      // With 10 units/day and ~0 safety stock variance
      // daysUntilStockout ≈ (100 - safetyStock) / 10
      expect(forecast.daysUntilStockout).toBeGreaterThan(0);
    });

    it('should assess confidence as LOW with < 7 data points', () => {
      const now = new Date();
      const movements: StockMovement[] = [];

      // Only 3 days of history
      for (let i = 0; i < 3; i++) {
        const date = new Date(now.getTime() - (3 - i) * 24 * 60 * 60 * 1000);
        movements.push({
          id: `mov-${i}`,
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -5,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
      }

      const forecast = predictor.predict(itemId, tenantId, movements, 100, 20);
      expect(forecast.confidence).toBe('LOW');
    });

    it('should assess confidence as HIGH with stable demand', () => {
      const now = new Date();
      const movements: StockMovement[] = [];

      // 30 days of stable 5 units/day
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
        movements.push({
          id: `mov-${i}`,
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -5,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
      }

      const forecast = predictor.predict(itemId, tenantId, movements, 100, 20);
      expect(forecast.confidence).toBe('HIGH');
    });

    it('should disclose forecast method (ELENA)', () => {
      const now = new Date();
      const movements: StockMovement[] = [
        {
          id: 'mov-1',
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -5,
          performedBy: 'nurse-1',
          timestamp: new Date(
            now.getTime() - 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ];

      const forecast = predictor.predict(itemId, tenantId, movements, 100, 20);
      expect(forecast.forecastMethod).toBeDefined();
      expect(forecast.forecastMethod).toContain('Moving Average');
    });

    it('should include calculation timestamp', () => {
      const movements: StockMovement[] = [];
      const forecast = predictor.predict(itemId, tenantId, movements, 100, 20);
      expect(forecast.calculatedAt).toBeDefined();
    });
  });

  describe('predictAll', () => {
    it('should batch forecast multiple items', () => {
      const now = new Date();
      const movements: StockMovement[] = [];

      // Create movements for two items
      for (let i = 0; i < 10; i++) {
        const date = new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000);
        movements.push({
          id: `mov-item1-${i}`,
          tenantId,
          itemId: 'item-1',
          type: 'DISPENSING',
          quantity: -5,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
        movements.push({
          id: `mov-item2-${i}`,
          tenantId,
          itemId: 'item-2',
          type: 'DISPENSING',
          quantity: -3,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
      }

      const inventory = new Map([
        [
          'item-1',
          {
            id: 'item-1',
            tenantId,
            facilityId: 'fac-1',
            quantity: 100,
            reorderPoint: 20,
          },
        ],
        [
          'item-2',
          {
            id: 'item-2',
            tenantId,
            facilityId: 'fac-1',
            quantity: 50,
            reorderPoint: 10,
          },
        ],
        [
          'item-3',
          {
            id: 'item-3',
            tenantId: 'tenant-2', // Different tenant
            facilityId: 'fac-2',
            quantity: 30,
            reorderPoint: 5,
          },
        ],
      ]);

      const forecasts = predictor.predictAll(tenantId, inventory, movements);

      // Should include only items from tenant-1
      expect(forecasts.length).toBe(2);
      expect(forecasts.map(f => f.itemId)).toContain('item-1');
      expect(forecasts.map(f => f.itemId)).toContain('item-2');
      expect(forecasts.map(f => f.itemId)).not.toContainEqual('item-3');
    });

    it('should skip items with calculation errors gracefully', () => {
      const inventory = new Map([
        ['item-1', { id: 'item-1', tenantId, facilityId: 'fac-1', quantity: 100 }],
      ]);

      const forecasts = predictor.predictAll(tenantId, inventory, []);
      expect(forecasts.length).toBe(1); // Should still include item with no movement data
    });
  });

  describe('edge cases', () => {
    it('should handle single data point', () => {
      const now = new Date();
      const movements: StockMovement[] = [
        {
          id: 'mov-1',
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -5,
          performedBy: 'nurse-1',
          timestamp: now.toISOString(),
        },
      ];

      const forecast = predictor.predict(itemId, tenantId, movements, 100, 20);
      expect(forecast.confidence).toBe('LOW');
      expect(forecast.dailyAverage).toBeGreaterThanOrEqual(0);
    });

    it('should handle very high daily demand', () => {
      const now = new Date();
      const movements: StockMovement[] = [];

      for (let i = 0; i < 10; i++) {
        const date = new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000);
        movements.push({
          id: `mov-${i}`,
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -100,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
      }

      const forecast = predictor.predict(itemId, tenantId, movements, 50, 20);
      expect(forecast.daysUntilStockout).toBeLessThanOrEqual(1);
    });

    it('should calculate correctly when current stock is above max safety level', () => {
      const now = new Date();
      const movements: StockMovement[] = [];

      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
        movements.push({
          id: `mov-${i}`,
          tenantId,
          itemId,
          type: 'DISPENSING',
          quantity: -2,
          performedBy: 'nurse-1',
          timestamp: date.toISOString(),
        });
      }

      const forecast = predictor.predict(itemId, tenantId, movements, 10000, 20);
      expect(forecast.daysUntilStockout).toBeGreaterThan(100);
    });
  });
});
