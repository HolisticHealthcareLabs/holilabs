/**
 * Tests for InventoryTracker
 * Coverage: CRUD, tenant isolation (CYRUS), movement audit trail (ELENA)
 */

import { InventoryTracker } from '../inventory-tracker';
import { SupplyItem, StockMovement } from '../types';

describe('InventoryTracker', () => {
  let tracker: InventoryTracker;
  const tenantId = 'tenant-1';
  const facilityId = 'facility-1';

  beforeEach(() => {
    tracker = new InventoryTracker();
  });

  describe('addItem', () => {
    it('should register a new supply item', () => {
      const item: SupplyItem = {
        id: '',
        tenantId,
        facilityId,
        name: 'Amoxicillin 500mg',
        anvisaClass: 'ANTIMICROBIAL',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 100,
        unit: 'units',
        location: 'Pharmacy Shelf A',
        reorderPoint: 20,
        reorderQuantity: 50,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'BARCODE_SCAN',
        status: 'IN_STOCK',
      };

      const stored = tracker.addItem(item);
      expect(stored.id).toBeDefined();
      expect(stored.name).toBe('Amoxicillin 500mg');
      expect(stored.tenantId).toBe(tenantId);
    });

    it('should preserve provided ID if given', () => {
      const item: SupplyItem = {
        id: 'item-123',
        tenantId,
        facilityId,
        name: 'Test Item',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Shelf 1',
        reorderPoint: 10,
        reorderQuantity: 25,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const stored = tracker.addItem(item);
      expect(stored.id).toBe('item-123');
    });
  });

  describe('recordMovement', () => {
    let itemId: string;

    beforeEach(() => {
      const item: SupplyItem = {
        id: 'item-1',
        tenantId,
        facilityId,
        name: 'Saline Solution 500mL',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 100,
        unit: 'mL',
        location: 'Refrigerator 1',
        reorderPoint: 20,
        reorderQuantity: 50,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'AUTOMATED_SENSOR',
        status: 'IN_STOCK',
      };
      const stored = tracker.addItem(item);
      itemId = stored.id;
    });

    it('should record a stock receipt movement', () => {
      const movement: StockMovement = {
        id: '',
        tenantId,
        itemId,
        type: 'RECEIPT',
        quantity: 50,
        performedBy: 'user-1',
        timestamp: new Date().toISOString(),
        reason: 'Supplier delivery',
      };

      const recorded = tracker.recordMovement(movement);
      expect(recorded.id).toBeDefined();
      expect(recorded.type).toBe('RECEIPT');

      const stock = tracker.getStock(itemId, tenantId);
      expect(stock?.quantity).toBe(150);
    });

    it('should record a stock dispensing movement', () => {
      const movement: StockMovement = {
        id: '',
        tenantId,
        itemId,
        type: 'DISPENSING',
        quantity: -20,
        performedBy: 'nurse-1',
        timestamp: new Date().toISOString(),
      };

      const recorded = tracker.recordMovement(movement);
      expect(recorded.type).toBe('DISPENSING');

      const stock = tracker.getStock(itemId, tenantId);
      expect(stock?.quantity).toBe(80);
    });

    it('should throw on tenant mismatch', () => {
      const movement: StockMovement = {
        id: '',
        tenantId: 'tenant-2',
        itemId,
        type: 'RECEIPT',
        quantity: 50,
        performedBy: 'user-1',
        timestamp: new Date().toISOString(),
      };

      expect(() => tracker.recordMovement(movement)).toThrow(
        'Tenant mismatch'
      );
    });

    it('should update item status to LOW_STOCK when below reorder point', () => {
      const movement: StockMovement = {
        id: '',
        tenantId,
        itemId,
        type: 'DISPENSING',
        quantity: -85,
        performedBy: 'nurse-1',
        timestamp: new Date().toISOString(),
      };

      tracker.recordMovement(movement);
      const stock = tracker.getStock(itemId, tenantId);
      expect(stock?.quantity).toBe(15);
      expect(stock?.status).toBe('CRITICAL');
    });

    it('should update item status to STOCKOUT at zero quantity', () => {
      const movement: StockMovement = {
        id: '',
        tenantId,
        itemId,
        type: 'DISPENSING',
        quantity: -100,
        performedBy: 'nurse-1',
        timestamp: new Date().toISOString(),
      };

      tracker.recordMovement(movement);
      const stock = tracker.getStock(itemId, tenantId);
      expect(stock?.status).toBe('STOCKOUT');
    });

    it('should generate alert on status change (QUINN: non-blocking)', () => {
      tracker.recordMovement({
        id: '',
        tenantId,
        itemId,
        type: 'DISPENSING',
        quantity: -85,
        performedBy: 'nurse-1',
        timestamp: new Date().toISOString(),
      });

      const alerts = tracker.getAlerts(tenantId);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('LOW_STOCK');
    });
  });

  describe('getStock (CYRUS: tenant isolation)', () => {
    it('should return item for authorized tenant', () => {
      const item: SupplyItem = {
        id: 'item-2',
        tenantId,
        facilityId,
        name: 'Insulin Vial',
        anvisaClass: 'THERMOLABILE',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Fridge 2',
        temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
        reorderPoint: 10,
        reorderQuantity: 20,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      tracker.addItem(item);
      const stock = tracker.getStock('item-2', tenantId);
      expect(stock).not.toBeNull();
      expect(stock?.name).toBe('Insulin Vial');
    });

    it('should throw on unauthorized tenant access', () => {
      const item: SupplyItem = {
        id: 'item-3',
        tenantId,
        facilityId,
        name: 'Medication',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Shelf',
        reorderPoint: 10,
        reorderQuantity: 25,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      tracker.addItem(item);
      expect(() => tracker.getStock('item-3', 'unauthorized-tenant')).toThrow(
        'Unauthorized'
      );
    });
  });

  describe('getExpiringItems', () => {
    it('should return items expiring within specified days', () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      const item1: SupplyItem = {
        id: 'item-exp-1',
        tenantId,
        facilityId,
        name: 'Expiring Soon',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: fiveDaysFromNow.toISOString(),
        quantity: 50,
        unit: 'units',
        location: 'Shelf A',
        reorderPoint: 10,
        reorderQuantity: 25,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const item2: SupplyItem = {
        id: 'item-exp-2',
        tenantId,
        facilityId,
        name: 'Expires Later',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-002',
        expirationDate: tenDaysFromNow.toISOString(),
        quantity: 50,
        unit: 'units',
        location: 'Shelf B',
        reorderPoint: 10,
        reorderQuantity: 25,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      tracker.addItem(item1);
      tracker.addItem(item2);

      const expiring = tracker.getExpiringItems(tenantId, 7);
      expect(expiring.length).toBe(1);
      expect(expiring[0].name).toBe('Expiring Soon');
    });
  });

  describe('checkReorderPoints', () => {
    it('should identify items below reorder point', () => {
      const item: SupplyItem = {
        id: 'item-reorder',
        tenantId,
        facilityId,
        name: 'Critical Stock Item',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 5,
        unit: 'units',
        location: 'Shelf C',
        reorderPoint: 20,
        reorderQuantity: 50,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'CRITICAL',
      };

      tracker.addItem(item);
      const needsReorder = tracker.checkReorderPoints(tenantId);
      expect(needsReorder.length).toBe(1);
      expect(needsReorder[0].id).toBe('item-reorder');
    });

    it('should not return expired items in reorder list', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const item: SupplyItem = {
        id: 'item-expired',
        tenantId,
        facilityId,
        name: 'Expired Item',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: pastDate.toISOString(),
        quantity: 5,
        unit: 'units',
        location: 'Shelf D',
        reorderPoint: 20,
        reorderQuantity: 50,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'EXPIRED',
      };

      tracker.addItem(item);
      const needsReorder = tracker.checkReorderPoints(tenantId);
      expect(needsReorder).not.toContainEqual(expect.objectContaining({ id: 'item-expired' }));
    });
  });

  describe('getAlerts', () => {
    it('should return unacknowledged alerts only', () => {
      const item: SupplyItem = {
        id: 'item-alert',
        tenantId,
        facilityId,
        name: 'Alert Item',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 100,
        unit: 'units',
        location: 'Shelf',
        reorderPoint: 20,
        reorderQuantity: 50,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      tracker.addItem(item);
      tracker.recordMovement({
        id: '',
        tenantId,
        itemId: 'item-alert',
        type: 'DISPENSING',
        quantity: -85,
        performedBy: 'nurse-1',
        timestamp: new Date().toISOString(),
      });

      let alerts = tracker.getAlerts(tenantId);
      expect(alerts.length).toBeGreaterThan(0);

      const alertId = alerts[0].id;
      tracker.acknowledgeAlert(alertId, tenantId, 'user-1');

      alerts = tracker.getAlerts(tenantId);
      expect(alerts).not.toContainEqual(
        expect.objectContaining({ id: alertId })
      );
    });
  });

  describe('updateCountSource (ELENA)', () => {
    it('should update count source and timestamp', () => {
      const item: SupplyItem = {
        id: 'item-source',
        tenantId,
        facilityId,
        name: 'Tracked Item',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 100,
        unit: 'units',
        location: 'Shelf',
        reorderPoint: 20,
        reorderQuantity: 50,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      tracker.addItem(item);
      tracker.updateCountSource('item-source', tenantId, 'AUTOMATED_SENSOR');

      const stock = tracker.getStock('item-source', tenantId);
      expect(stock?.lastCountSource).toBe('AUTOMATED_SENSOR');
      expect(stock?.lastCountDate).toBeDefined();
    });
  });

  describe('markExpired', () => {
    it('should mark item as expired and create alert', () => {
      const item: SupplyItem = {
        id: 'item-to-expire',
        tenantId,
        facilityId,
        name: 'Will Expire',
        anvisaClass: 'GENERAL',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Shelf',
        reorderPoint: 10,
        reorderQuantity: 25,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      tracker.addItem(item);
      tracker.markExpired('item-to-expire', tenantId);

      const stock = tracker.getStock('item-to-expire', tenantId);
      expect(stock?.status).toBe('EXPIRED');

      const alerts = tracker.getAlerts(tenantId);
      const expiredAlert = alerts.find(a => a.type === 'EXPIRED');
      expect(expiredAlert).toBeDefined();
    });
  });
});
