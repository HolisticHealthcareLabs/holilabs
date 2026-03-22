/**
 * Tests for ANVISAComplianceChecker
 * Coverage: controlled substance witness requirement, expiration checks, reporting
 */

import { ANVISAComplianceChecker } from '../anvisa-compliance';
import { SupplyItem, StockMovement } from '../types';

describe('ANVISAComplianceChecker', () => {
  let checker: ANVISAComplianceChecker;
  const tenantId = 'tenant-1';
  const facilityId = 'facility-1';

  beforeEach(() => {
    checker = new ANVISAComplianceChecker();
  });

  describe('validateMovement', () => {
    it('should require witness for CONTROLLED_I dispensing (RUTH)', () => {
      const item: SupplyItem = {
        id: 'item-1',
        tenantId,
        facilityId,
        name: 'Morphine 10mg',
        anvisaClass: 'CONTROLLED_I',
        anvisaRegistration: 'ANVISA-001',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Locked Cabinet',
        reorderPoint: 5,
        reorderQuantity: 10,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const movementWithoutWitness: StockMovement = {
        id: 'mov-1',
        tenantId,
        itemId: 'item-1',
        type: 'DISPENSING',
        quantity: -1,
        performedBy: 'nurse-1',
        timestamp: new Date().toISOString(),
        // Missing: witnessedBy
      };

      const validation = checker.validateMovement(item, movementWithoutWitness);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('witness')
      );
    });

    it('should accept CONTROLLED_I with witness', () => {
      const item: SupplyItem = {
        id: 'item-1',
        tenantId,
        facilityId,
        name: 'Morphine 10mg',
        anvisaClass: 'CONTROLLED_I',
        anvisaRegistration: 'ANVISA-001',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Locked Cabinet',
        reorderPoint: 5,
        reorderQuantity: 10,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const movementWithWitness: StockMovement = {
        id: 'mov-1',
        tenantId,
        itemId: 'item-1',
        type: 'DISPENSING',
        quantity: -1,
        performedBy: 'nurse-1',
        timestamp: new Date().toISOString(),
        witnessedBy: 'pharmacist-1',
      };

      const validation = checker.validateMovement(item, movementWithWitness);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should require witness for CONTROLLED_II dispensing', () => {
      const item: SupplyItem = {
        id: 'item-2',
        tenantId,
        facilityId,
        name: 'Codeine 30mg',
        anvisaClass: 'CONTROLLED_II',
        anvisaRegistration: 'ANVISA-002',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 100,
        unit: 'units',
        location: 'Locked Cabinet',
        reorderPoint: 10,
        reorderQuantity: 20,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const movement: StockMovement = {
        id: 'mov-2',
        tenantId,
        itemId: 'item-2',
        type: 'DISPENSING',
        quantity: -5,
        performedBy: 'nurse-1',
        timestamp: new Date().toISOString(),
      };

      const validation = checker.validateMovement(item, movement);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('witness')
      );
    });

    it('should require lot number for all items (RUTH)', () => {
      const item: SupplyItem = {
        id: 'item-3',
        tenantId,
        facilityId,
        name: 'Saline Solution',
        anvisaClass: 'GENERAL',
        lotNumber: '', // Empty lot number
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 100,
        unit: 'mL',
        location: 'Shelf A',
        reorderPoint: 20,
        reorderQuantity: 50,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const movement: StockMovement = {
        id: 'mov-3',
        tenantId,
        itemId: 'item-3',
        type: 'RECEIPT',
        quantity: 50,
        performedBy: 'user-1',
        timestamp: new Date().toISOString(),
      };

      const validation = checker.validateMovement(item, movement);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('Lot number')
      );
    });

    it('should require ANVISA registration for regulated items', () => {
      const item: SupplyItem = {
        id: 'item-4',
        tenantId,
        facilityId,
        name: 'Antibiotic',
        anvisaClass: 'ANTIMICROBIAL',
        // Missing: anvisaRegistration
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 100,
        unit: 'units',
        location: 'Shelf B',
        reorderPoint: 10,
        reorderQuantity: 25,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const movement: StockMovement = {
        id: 'mov-4',
        tenantId,
        itemId: 'item-4',
        type: 'RECEIPT',
        quantity: 50,
        performedBy: 'user-1',
        timestamp: new Date().toISOString(),
      };

      const validation = checker.validateMovement(item, movement);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('ANVISA registration')
      );
    });

    it('should require temperature range for thermolabile items', () => {
      const item: SupplyItem = {
        id: 'item-5',
        tenantId,
        facilityId,
        name: 'Vaccine',
        anvisaClass: 'THERMOLABILE',
        anvisaRegistration: 'ANVISA-003',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Cold Storage',
        // Missing: temperatureRange
        reorderPoint: 5,
        reorderQuantity: 10,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const movement: StockMovement = {
        id: 'mov-5',
        tenantId,
        itemId: 'item-5',
        type: 'RECEIPT',
        quantity: 20,
        performedBy: 'user-1',
        timestamp: new Date().toISOString(),
      };

      const validation = checker.validateMovement(item, movement);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('Temperature range')
      );
    });

    it('should pass validation for compliant movement', () => {
      const item: SupplyItem = {
        id: 'item-6',
        tenantId,
        facilityId,
        name: 'Amoxicillin 500mg',
        anvisaClass: 'ANTIMICROBIAL',
        anvisaRegistration: 'ANVISA-004',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 100,
        unit: 'units',
        location: 'Pharmacy Shelf',
        reorderPoint: 20,
        reorderQuantity: 50,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'BARCODE_SCAN',
        status: 'IN_STOCK',
      };

      const movement: StockMovement = {
        id: 'mov-6',
        tenantId,
        itemId: 'item-6',
        type: 'DISPENSING',
        quantity: -10,
        performedBy: 'pharmacist-1',
        timestamp: new Date().toISOString(),
      };

      const validation = checker.validateMovement(item, movement);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('checkExpirationCompliance', () => {
    it('should identify expired items', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const inventory = new Map<string, SupplyItem>([
        [
          'item-expired',
          {
            id: 'item-expired',
            tenantId,
            facilityId,
            name: 'Expired Drug',
            anvisaClass: 'GENERAL',
            lotNumber: 'LOT-001',
            expirationDate: pastDate.toISOString(),
            quantity: 50,
            unit: 'units',
            location: 'Shelf A',
            reorderPoint: 10,
            reorderQuantity: 25,
            lastCountDate: new Date().toISOString(),
            lastCountSource: 'MANUAL',
            status: 'EXPIRED',
          },
        ],
      ]);

      const compliance = checker.checkExpirationCompliance(inventory);
      expect(compliance.nonCompliant).toHaveLength(1);
      expect(compliance.nonCompliant[0].id).toBe('item-expired');
    });

    it('should identify items expiring within 30 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const inventory = new Map<string, SupplyItem>([
        [
          'item-expiring',
          {
            id: 'item-expiring',
            tenantId,
            facilityId,
            name: 'Soon Expired',
            anvisaClass: 'GENERAL',
            lotNumber: 'LOT-001',
            expirationDate: futureDate.toISOString(),
            quantity: 100,
            unit: 'units',
            location: 'Shelf B',
            reorderPoint: 20,
            reorderQuantity: 50,
            lastCountDate: new Date().toISOString(),
            lastCountSource: 'MANUAL',
            status: 'IN_STOCK',
          },
        ],
      ]);

      const compliance = checker.checkExpirationCompliance(inventory);
      expect(compliance.warningItems).toHaveLength(1);
      expect(compliance.warningItems[0].id).toBe('item-expiring');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', () => {
      const inventory = new Map<string, SupplyItem>([
        [
          'controlled-item',
          {
            id: 'controlled-item',
            tenantId,
            facilityId,
            name: 'Controlled Substance',
            anvisaClass: 'CONTROLLED_I',
            anvisaRegistration: 'ANVISA-001',
            lotNumber: 'LOT-001',
            expirationDate: '2027-12-31T23:59:59Z',
            quantity: 50,
            unit: 'units',
            location: 'Cabinet',
            reorderPoint: 5,
            reorderQuantity: 10,
            lastCountDate: new Date().toISOString(),
            lastCountSource: 'MANUAL',
            status: 'IN_STOCK',
          },
        ],
        [
          'antibiotic-item',
          {
            id: 'antibiotic-item',
            tenantId,
            facilityId,
            name: 'Antibiotic',
            anvisaClass: 'ANTIMICROBIAL',
            anvisaRegistration: 'ANVISA-002',
            lotNumber: 'LOT-001',
            expirationDate: '2027-12-31T23:59:59Z',
            quantity: 100,
            unit: 'units',
            location: 'Shelf A',
            reorderPoint: 20,
            reorderQuantity: 50,
            lastCountDate: new Date().toISOString(),
            lastCountSource: 'BARCODE_SCAN',
            status: 'IN_STOCK',
          },
        ],
      ]);

      const now = new Date();
      const movements: StockMovement[] = [
        {
          id: 'mov-1',
          tenantId,
          itemId: 'controlled-item',
          type: 'DISPENSING',
          quantity: -1,
          performedBy: 'nurse-1',
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          witnessedBy: 'pharmacist-1',
        },
        {
          id: 'mov-2',
          tenantId,
          itemId: 'antibiotic-item',
          type: 'DISPENSING',
          quantity: -10,
          performedBy: 'pharmacist-1',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const report = checker.generateComplianceReport(
        tenantId,
        inventory,
        movements,
        {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        }
      );

      expect(report.tenantId).toBe(tenantId);
      expect(report.totalMovements).toBe(2);
      expect(report.controlledSubstanceMovements).toBe(1);
      expect(report.witnessingCompliance).toBe(100); // 1/1 movements witnessed
      expect(report.antimicrobialDispensings).toBe(1);
      expect(report.overallComplianceScore).toBeGreaterThanOrEqual(0);
      expect(report.overallComplianceScore).toBeLessThanOrEqual(100);
    });

    it('should penalize non-compliant controlled movements', () => {
      const inventory = new Map<string, SupplyItem>([
        [
          'controlled-item',
          {
            id: 'controlled-item',
            tenantId,
            facilityId,
            name: 'Controlled Substance',
            anvisaClass: 'CONTROLLED_I',
            anvisaRegistration: 'ANVISA-001',
            lotNumber: 'LOT-001',
            expirationDate: '2027-12-31T23:59:59Z',
            quantity: 50,
            unit: 'units',
            location: 'Cabinet',
            reorderPoint: 5,
            reorderQuantity: 10,
            lastCountDate: new Date().toISOString(),
            lastCountSource: 'MANUAL',
            status: 'IN_STOCK',
          },
        ],
      ]);

      const now = new Date();
      const movements: StockMovement[] = [
        {
          id: 'mov-1',
          tenantId,
          itemId: 'controlled-item',
          type: 'DISPENSING',
          quantity: -1,
          performedBy: 'nurse-1',
          timestamp: now.toISOString(),
          // Missing: witnessedBy (non-compliant)
        },
      ];

      const report = checker.generateComplianceReport(
        tenantId,
        inventory,
        movements,
        {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        }
      );

      expect(report.witnessingCompliance).toBe(0); // 0/1 movements witnessed
      expect(report.overallComplianceScore).toBeLessThan(100);
    });
  });

  describe('requiresANVISAReporting', () => {
    it('should flag controlled substance expiration for reporting', () => {
      const item: SupplyItem = {
        id: 'item-1',
        tenantId,
        facilityId,
        name: 'Controlled Drug',
        anvisaClass: 'CONTROLLED_I',
        anvisaRegistration: 'ANVISA-001',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Cabinet',
        reorderPoint: 5,
        reorderQuantity: 10,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'EXPIRED',
      };

      const shouldReport = checker.requiresANVISAReporting(
        item,
        'EXPIRED_IN_INVENTORY'
      );
      expect(shouldReport).toBe(true);
    });

    it('should flag cold chain violation for thermolabile items', () => {
      const item: SupplyItem = {
        id: 'item-2',
        tenantId,
        facilityId,
        name: 'Vaccine',
        anvisaClass: 'THERMOLABILE',
        anvisaRegistration: 'ANVISA-002',
        lotNumber: 'LOT-001',
        expirationDate: '2027-12-31T23:59:59Z',
        quantity: 50,
        unit: 'units',
        location: 'Cold Storage',
        temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
        reorderPoint: 5,
        reorderQuantity: 10,
        lastCountDate: new Date().toISOString(),
        lastCountSource: 'MANUAL',
        status: 'IN_STOCK',
      };

      const shouldReport = checker.requiresANVISAReporting(
        item,
        'COLD_CHAIN_VIOLATION'
      );
      expect(shouldReport).toBe(true);
    });

    it('should not report general item expiration', () => {
      const item: SupplyItem = {
        id: 'item-3',
        tenantId,
        facilityId,
        name: 'General Item',
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
        status: 'EXPIRED',
      };

      const shouldReport = checker.requiresANVISAReporting(
        item,
        'EXPIRED_IN_INVENTORY'
      );
      expect(shouldReport).toBe(false);
    });
  });
});
