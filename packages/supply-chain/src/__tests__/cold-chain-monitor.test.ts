/**
 * Tests for ColdChainMonitor
 * Coverage: temperature tracking, excursion detection, severity classification
 */

import { ColdChainMonitor } from '../cold-chain-monitor';
import { SupplyItem, TemperatureRange } from '../types';

describe('ColdChainMonitor', () => {
  let monitor: ColdChainMonitor;
  const tenantId = 'tenant-1';
  const facilityId = 'facility-1';

  beforeEach(() => {
    monitor = new ColdChainMonitor();
  });

  describe('recordTemperature', () => {
    it('should record a temperature reading', () => {
      const reading = monitor.recordTemperature(
        'Vaccine Storage',
        5,
        new Date().toISOString(),
        tenantId
      );

      expect(reading.id).toBeDefined();
      expect(reading.location).toBe('Vaccine Storage');
      expect(reading.temperature).toBe(5);
      expect(reading.tenantId).toBe(tenantId);
    });

    it('should record multiple readings for same location', () => {
      const now = new Date();
      monitor.recordTemperature('Vaccine Storage', 5, now.toISOString(), tenantId);
      monitor.recordTemperature(
        'Vaccine Storage',
        6,
        new Date(now.getTime() + 1000).toISOString(),
        tenantId
      );
      monitor.recordTemperature(
        'Vaccine Storage',
        4,
        new Date(now.getTime() + 2000).toISOString(),
        tenantId
      );

      const history = monitor.getTemperatureHistory('Vaccine Storage', tenantId, 1);
      expect(history.length).toBe(3);
    });
  });

  describe('checkExcursions', () => {
    it('should detect critical excursion (> 30 minutes out of range)', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 35 * 60 * 1000); // 35 minutes ago

      // Record temperature readings outside normal range
      for (let i = 0; i < 7; i++) {
        const time = new Date(
          startTime.getTime() + (i * 5 * 60 * 1000)
        ).toISOString();
        monitor.recordTemperature('Vaccine Storage', 15, time, tenantId); // Out of range (should be 2-8°C)
      }

      const inventory = new Map<string, SupplyItem[]>([
        [
          'Vaccine Storage',
          [
            {
              id: 'vaccine-1',
              tenantId,
              facilityId,
              name: 'COVID-19 Vaccine',
              anvisaClass: 'THERMOLABILE',
              anvisaRegistration: 'ANVISA-001',
              lotNumber: 'LOT-001',
              expirationDate: '2027-12-31T23:59:59Z',
              quantity: 100,
              unit: 'units',
              location: 'Vaccine Storage',
              temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
              reorderPoint: 10,
              reorderQuantity: 20,
              lastCountDate: new Date().toISOString(),
              lastCountSource: 'MANUAL',
              status: 'IN_STOCK',
            },
          ],
        ],
      ]);

      const excursions = monitor.checkExcursions(tenantId, facilityId, inventory);
      expect(excursions.length).toBeGreaterThan(0);
      expect(excursions[0].severity).toBe('CRITICAL');
      expect(excursions[0].duration).toBeGreaterThanOrEqual(30);
    });

    it('should not create excursion for brief out-of-range (< 30 minutes)', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 15 * 60 * 1000); // Only 15 minutes ago

      for (let i = 0; i < 3; i++) {
        const time = new Date(
          startTime.getTime() + (i * 5 * 60 * 1000)
        ).toISOString();
        monitor.recordTemperature('Vaccine Storage', 15, time, tenantId);
      }

      const inventory = new Map<string, SupplyItem[]>([
        [
          'Vaccine Storage',
          [
            {
              id: 'vaccine-1',
              tenantId,
              facilityId,
              name: 'Vaccine',
              anvisaClass: 'THERMOLABILE',
              anvisaRegistration: 'ANVISA-001',
              lotNumber: 'LOT-001',
              expirationDate: '2027-12-31T23:59:59Z',
              quantity: 100,
              unit: 'units',
              location: 'Vaccine Storage',
              temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
              reorderPoint: 10,
              reorderQuantity: 20,
              lastCountDate: new Date().toISOString(),
              lastCountSource: 'MANUAL',
              status: 'IN_STOCK',
            },
          ],
        ],
      ]);

      const excursions = monitor.checkExcursions(tenantId, facilityId, inventory);
      // Should not create critical excursion for 15 min violation
      const criticalExcursions = excursions.filter(e => e.severity === 'CRITICAL');
      expect(criticalExcursions.length).toBe(0);
    });

    it('should identify affected items by location', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 40 * 60 * 1000);

      for (let i = 0; i < 8; i++) {
        const time = new Date(
          startTime.getTime() + (i * 5 * 60 * 1000)
        ).toISOString();
        monitor.recordTemperature('Insulin Fridge', -5, time, tenantId); // Out of range
      }

      const vaccine: SupplyItem = {
        id: 'vaccine-1',
        tenantId,
        facilityId,
        name: 'Vaccine',
        anvisaClass: 'THERMOLABILE',
        anvisaRegistration: 'ANVISA-001',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Insulin Fridge',
        temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
        reorderPoint: 5,
        reorderQuantity: 10,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const insulin: SupplyItem = {
        id: 'insulin-1',
        tenantId,
        facilityId,
        name: 'Insulin',
        anvisaClass: 'THERMOLABILE',
        anvisaRegistration: 'ANVISA-002',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 30,
        unit: 'units',
        location: 'Insulin Fridge',
        temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
        reorderPoint: 5,
        reorderQuantity: 10,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const inventory = new Map<string, SupplyItem[]>([
        ['Insulin Fridge', [vaccine, insulin]],
      ]);

      const excursions = monitor.checkExcursions(tenantId, facilityId, inventory);
      expect(excursions.length).toBeGreaterThan(0);
      expect(excursions[0].affectedItems).toContain('vaccine-1');
      expect(excursions[0].affectedItems).toContain('insulin-1');
    });

    it('should handle readings within range correctly', () => {
      const now = new Date();

      // Record in-range readings
      for (let i = 0; i < 5; i++) {
        const time = new Date(
          now.getTime() - (5 - i) * 5 * 60 * 1000
        ).toISOString();
        monitor.recordTemperature('Vaccine Storage', 5, time, tenantId); // Within 2-8°C
      }

      const inventory = new Map<string, SupplyItem[]>();
      const excursions = monitor.checkExcursions(tenantId, facilityId, inventory);
      expect(excursions).toHaveLength(0);
    });
  });

  describe('getAffectedItems', () => {
    it('should return all items in affected location', () => {
      const items: SupplyItem[] = [
        {
          id: 'item-1',
          tenantId,
          facilityId,
          name: 'Item 1',
          anvisaClass: 'THERMOLABILE',
          anvisaRegistration: 'ANVISA-001',
          lotNumber: 'LOT-001',
          expirationDate: '2027-12-31T23:59:59Z',
          quantity: 100,
          unit: 'units',
          location: 'Cold Storage A',
          temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
          reorderPoint: 10,
          reorderQuantity: 20,
          lastCountDate: new Date().toISOString(),
          lastCountSource: 'MANUAL',
          status: 'IN_STOCK',
        },
        {
          id: 'item-2',
          tenantId,
          facilityId,
          name: 'Item 2',
          anvisaClass: 'THERMOLABILE',
          anvisaRegistration: 'ANVISA-002',
          lotNumber: 'LOT-002',
          expirationDate: '2027-12-31T23:59:59Z',
          quantity: 50,
          unit: 'units',
          location: 'Cold Storage A',
          temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
          reorderPoint: 5,
          reorderQuantity: 10,
          lastCountDate: new Date().toISOString(),
          lastCountSource: 'MANUAL',
          status: 'IN_STOCK',
        },
      ];

      const inventory = new Map<string, SupplyItem[]>([
        ['Cold Storage A', items],
      ]);

      const affected = monitor.getAffectedItems('Cold Storage A', inventory);
      expect(affected).toHaveLength(2);
      expect(affected).toContain('item-1');
      expect(affected).toContain('item-2');
    });
  });

  describe('markANVISAReported', () => {
    it('should mark excursion as reported to ANVISA (RUTH)', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 40 * 60 * 1000);

      for (let i = 0; i < 8; i++) {
        const time = new Date(
          startTime.getTime() + (i * 5 * 60 * 1000)
        ).toISOString();
        monitor.recordTemperature('Vaccine Storage', 12, time, tenantId);
      }

      const inventory = new Map<string, SupplyItem[]>([
        [
          'Vaccine Storage',
          [
            {
              id: 'vaccine-1',
              tenantId,
              facilityId,
              name: 'Vaccine',
              anvisaClass: 'THERMOLABILE',
              anvisaRegistration: 'ANVISA-001',
              lotNumber: 'LOT-001',
              expirationDate: '2027-12-31T23:59:59Z',
              quantity: 100,
              unit: 'units',
              location: 'Vaccine Storage',
              temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
              reorderPoint: 10,
              reorderQuantity: 20,
              lastCountDate: new Date().toISOString(),
              lastCountSource: 'MANUAL',
              status: 'IN_STOCK',
            },
          ],
        ],
      ]);

      const excursions = monitor.checkExcursions(tenantId, facilityId, inventory);
      expect(excursions.length).toBeGreaterThan(0);

      const excursionId = excursions[0].id;
      monitor.markANVISAReported(excursionId);

      const unreported = monitor.getUnreportedCriticalExcursions(tenantId);
      expect(unreported).not.toContainEqual(
        expect.objectContaining({ id: excursionId })
      );
    });
  });

  describe('getUnreportedCriticalExcursions', () => {
    it('should return only critical unreported excursions (RUTH)', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 40 * 60 * 1000);

      for (let i = 0; i < 8; i++) {
        const time = new Date(
          startTime.getTime() + (i * 5 * 60 * 1000)
        ).toISOString();
        monitor.recordTemperature('Location 1', 20, time, tenantId);
      }

      const inventory = new Map<string, SupplyItem[]>();

      monitor.checkExcursions(tenantId, facilityId, inventory);
      const unreported = monitor.getUnreportedCriticalExcursions(tenantId);

      // Verify all are critical and unreported
      for (const excursion of unreported) {
        expect(excursion.severity).toBe('CRITICAL');
        expect(excursion.reportedToANVISA).toBe(false);
      }
    });
  });

  describe('getTemperatureHistory', () => {
    it('should retrieve temperature history for location', () => {
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const time = new Date(now.getTime() - (5 - i) * 1000).toISOString();
        monitor.recordTemperature('Test Location', 5 + i, time, tenantId);
      }

      const history = monitor.getTemperatureHistory(
        'Test Location',
        tenantId,
        1
      );
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].location).toBe('Test Location');
    });

    it('should filter by time window', () => {
      const now = new Date();
      const oldTime = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

      monitor.recordTemperature('Test Location', 5, oldTime.toISOString(), tenantId);
      monitor.recordTemperature('Test Location', 6, recentTime.toISOString(), tenantId);

      const last24h = monitor.getTemperatureHistory(
        'Test Location',
        tenantId,
        24
      );
      expect(last24h.length).toBe(1); // Only the recent reading
      expect(last24h[0].temperature).toBe(6);
    });
  });

  describe('getExcursions', () => {
    it('should return all excursions for tenant', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 40 * 60 * 1000);

      // Create excursion in Location 1
      for (let i = 0; i < 8; i++) {
        const time = new Date(
          startTime.getTime() + (i * 5 * 60 * 1000)
        ).toISOString();
        monitor.recordTemperature('Location 1', 20, time, tenantId);
      }

      const inventory = new Map<string, SupplyItem[]>();
      monitor.checkExcursions(tenantId, facilityId, inventory);

      const excursions = monitor.getExcursions(tenantId);
      expect(excursions.length).toBeGreaterThan(0);
      expect(excursions.every(e => e.tenantId === tenantId)).toBe(true);
    });
  });
});
