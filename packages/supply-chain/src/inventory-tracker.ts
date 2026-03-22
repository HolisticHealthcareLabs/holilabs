/**
 * InventoryTracker: Core inventory management with audit trail
 * Enforces CYRUS (tenant-scoping) and ELENA (source tracking)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SupplyItem,
  StockMovement,
  SupplyAlert,
  StockCountSource,
} from './types';

export class InventoryTracker {
  private items: Map<string, SupplyItem> = new Map();
  private movements: Map<string, StockMovement[]> = new Map();
  private alerts: Map<string, SupplyAlert[]> = new Map();

  /**
   * Register a new supply item (CYRUS: tenant-scoped)
   */
  addItem(item: SupplyItem): SupplyItem {
    const id = item.id || uuidv4();
    const storedItem = { ...item, id };
    this.items.set(id, storedItem);
    return storedItem;
  }

  /**
   * Record a stock movement (ELENA: tracks source and performer)
   */
  recordMovement(movement: StockMovement): StockMovement {
    const id = movement.id || uuidv4();
    const storedMovement = { ...movement, id };

    // Get the item to update its quantity
    const item = this.items.get(storedMovement.itemId);
    if (!item) {
      throw new Error(`Item not found: ${storedMovement.itemId}`);
    }

    // Verify tenant match (CYRUS)
    if (item.tenantId !== storedMovement.tenantId) {
      throw new Error('Tenant mismatch: item and movement must belong to same tenant');
    }

    // Update item quantity
    item.quantity += storedMovement.quantity;

    // Update item status based on quantity
    const oldStatus = item.status;
    if (item.quantity <= 0) {
      item.status = 'STOCKOUT';
    } else if (item.quantity < item.reorderPoint) {
      item.status = item.quantity === 0 ? 'STOCKOUT' : 'CRITICAL';
    } else {
      item.status = 'IN_STOCK';
    }

    // Record movement (ELENA: with source tracking)
    const itemMovements = this.movements.get(storedMovement.itemId) || [];
    itemMovements.push(storedMovement);
    this.movements.set(storedMovement.itemId, itemMovements);

    // Emit alert if status changed (QUINN: non-blocking)
    if (oldStatus !== item.status) {
      this.createStatusAlert(item, oldStatus, item.status);
    }

    return storedMovement;
  }

  /**
   * Get current stock with staleness indicator (CYRUS: tenant-scoped)
   */
  getStock(itemId: string, tenantId: string): SupplyItem | null {
    const item = this.items.get(itemId);
    if (!item) return null;

    // CYRUS: verify tenant access
    if (item.tenantId !== tenantId) {
      throw new Error('Unauthorized: tenant mismatch');
    }

    return item;
  }

  /**
   * Get items expiring within N days (CYRUS: tenant-scoped)
   */
  getExpiringItems(tenantId: string, daysAhead: number): SupplyItem[] {
    const now = new Date();
    const deadline = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const expiring = Array.from(this.items.values())
      .filter(item => {
        // CYRUS: tenant isolation
        if (item.tenantId !== tenantId) return false;

        const expDate = new Date(item.expirationDate);
        return expDate <= deadline && expDate > now;
      });

    return expiring;
  }

  /**
   * Get all active alerts for a tenant (CYRUS: tenant-scoped)
   */
  getAlerts(tenantId: string): SupplyAlert[] {
    const tenantAlerts = this.alerts.get(tenantId) || [];
    return tenantAlerts.filter(alert => !alert.acknowledgedAt);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, tenantId: string, userId: string): void {
    const tenantAlerts = this.alerts.get(tenantId) || [];
    const alert = tenantAlerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userId;
  }

  /**
   * Check reorder points and return items needing reorder (CYRUS: tenant-scoped)
   */
  checkReorderPoints(tenantId: string): SupplyItem[] {
    return Array.from(this.items.values()).filter(item => {
      // CYRUS: tenant isolation
      if (item.tenantId !== tenantId) return false;

      // Check if item is below reorder point and not expired
      const expDate = new Date(item.expirationDate);
      const isExpired = expDate < new Date();

      return item.quantity <= item.reorderPoint && !isExpired;
    });
  }

  /**
   * Get movement history for an item (CYRUS: tenant-scoped)
   */
  getMovementHistory(itemId: string, tenantId: string): StockMovement[] {
    const item = this.items.get(itemId);
    if (!item) return [];

    // CYRUS: verify tenant access
    if (item.tenantId !== tenantId) {
      throw new Error('Unauthorized: tenant mismatch');
    }

    return this.movements.get(itemId) || [];
  }

  /**
   * Update item's count source (ELENA: source tracking)
   */
  updateCountSource(
    itemId: string,
    tenantId: string,
    source: StockCountSource
  ): void {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    // CYRUS: verify tenant access
    if (item.tenantId !== tenantId) {
      throw new Error('Unauthorized: tenant mismatch');
    }

    item.lastCountSource = source;
    item.lastCountDate = new Date().toISOString();
  }

  /**
   * Mark item as expired
   */
  markExpired(itemId: string, tenantId: string): void {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    // CYRUS: verify tenant access
    if (item.tenantId !== tenantId) {
      throw new Error('Unauthorized: tenant mismatch');
    }

    const oldStatus = item.status;
    item.status = 'EXPIRED';
    this.createStatusAlert(item, oldStatus, 'EXPIRED');
  }

  /**
   * Private: create status change alert (QUINN: fire-and-forget)
   */
  private createStatusAlert(
    item: SupplyItem,
    oldStatus: string,
    newStatus: string
  ): void {
    const alert: SupplyAlert = {
      id: uuidv4(),
      tenantId: item.tenantId,
      facilityId: item.facilityId,
      type:
        newStatus === 'STOCKOUT'
          ? 'STOCKOUT'
          : newStatus === 'CRITICAL'
            ? 'LOW_STOCK'
            : newStatus === 'EXPIRED'
              ? 'EXPIRED'
              : 'REORDER_NEEDED',
      severity:
        newStatus === 'STOCKOUT'
          ? 'CRITICAL'
          : newStatus === 'CRITICAL'
            ? 'HIGH'
            : newStatus === 'EXPIRED'
              ? 'HIGH'
              : 'MEDIUM',
      itemId: item.id,
      message: `${item.name}: status changed from ${oldStatus} to ${newStatus}`,
      humanReviewRequired: false,
      createdAt: new Date().toISOString(),
    };

    const tenantAlerts = this.alerts.get(item.tenantId) || [];
    tenantAlerts.push(alert);
    this.alerts.set(item.tenantId, tenantAlerts);
  }
}
