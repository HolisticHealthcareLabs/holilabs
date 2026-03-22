# Supply Chain Package - Usage Examples

## Quick Start

```typescript
import {
  InventoryTracker,
  StockoutPredictor,
  ANVISAComplianceChecker,
  ColdChainMonitor,
  ReorderEngine,
  SupplyItem,
  StockMovement
} from '@holi/supply-chain';

const tenantId = 'healthcare-facility-1';
const facilityId = 'santa-maria-hospital';

// Initialize modules
const inventory = new InventoryTracker();
const predictor = new StockoutPredictor();
const compliance = new ANVISAComplianceChecker();
const coldChain = new ColdChainMonitor();
const reorder = new ReorderEngine();
```

## Example 1: Register and Track Antibiotic Stock

```typescript
// Register an antibiotic medication
const amoxicillin: SupplyItem = {
  id: 'med-amox-500',
  tenantId,
  facilityId,
  name: 'Amoxicillin 500mg',
  genericName: 'Amoxicillin trihydrate',
  anvisaClass: 'ANTIMICROBIAL',
  anvisaRegistration: 'ANVISA-2023-00156',
  lotNumber: 'LOT-2024-0089-A',
  expirationDate: '2026-03-20T23:59:59Z',
  quantity: 0, // Will update when stock arrives
  unit: 'units',
  location: 'Pharmacy Shelf A1',
  reorderPoint: 50,
  reorderQuantity: 200,
  lastCountDate: new Date().toISOString(),
  lastCountSource: 'MANUAL',
  status: 'IN_STOCK'
};

const registered = inventory.addItem(amoxicillin);
console.log(`Registered: ${registered.id}`);

// Record shipment receipt from supplier
const receiptMovement: StockMovement = {
  id: '',
  tenantId,
  itemId: registered.id,
  type: 'RECEIPT',
  quantity: 500,
  performedBy: 'pharmacist-maria',
  timestamp: new Date().toISOString(),
  reason: 'Supplier delivery #PO-2024-089'
};

// Validate ANVISA compliance before recording
const validation = compliance.validateMovement(registered, receiptMovement);
if (!validation.valid) {
  console.error('Compliance violation:', validation.errors);
} else {
  inventory.recordMovement(receiptMovement);
  console.log('Stock received: 500 units');
}

// Check current stock
const currentStock = inventory.getStock(registered.id, tenantId);
console.log(`Current stock: ${currentStock?.quantity} units`);
```

## Example 2: Controlled Substance Dispensing with Witness Requirement

```typescript
// Register morphine (CONTROLLED_I - requires witness)
const morphine: SupplyItem = {
  id: 'med-morph-10',
  tenantId,
  facilityId,
  name: 'Morphine 10mg',
  anvisaClass: 'CONTROLLED_I',
  anvisaRegistration: 'ANVISA-2023-00045',
  lotNumber: 'LOT-2024-0045-B',
  expirationDate: '2025-12-31T23:59:59Z',
  quantity: 100,
  unit: 'units',
  location: 'Locked Cabinet - ICU',
  reorderPoint: 10,
  reorderQuantity: 20,
  lastCountDate: new Date().toISOString(),
  lastCountSource: 'MANUAL',
  status: 'IN_STOCK'
};

inventory.addItem(morphine);

// Dispense 1 unit - MUST include witness (RUTH requirement)
const dispensing: StockMovement = {
  id: '',
  tenantId,
  itemId: morphine.id,
  type: 'DISPENSING',
  quantity: -1,
  performedBy: 'nurse-carlos',
  timestamp: new Date().toISOString(),
  witnessedBy: 'pharmacist-ana', // RUTH: MANDATORY for CONTROLLED_I
  reason: 'Patient pain management'
};

const validation = compliance.validateMovement(morphine, dispensing);
if (!validation.valid) {
  console.error('Cannot dispense without witness:', validation.errors);
  // Transaction blocked
} else {
  inventory.recordMovement(dispensing);
  console.log('Morphine dispensed with witness verification');
}

// Try dispensing WITHOUT witness (should fail RUTH check)
const invalidDispensing: StockMovement = {
  id: '',
  tenantId,
  itemId: morphine.id,
  type: 'DISPENSING',
  quantity: -1,
  performedBy: 'nurse-carlos',
  timestamp: new Date().toISOString(),
  // Missing: witnessedBy
};

const validation2 = compliance.validateMovement(morphine, invalidDispensing);
console.log(validation2.valid); // false
console.log(validation2.errors); // ['ANVISA requires witness...']
```

## Example 3: Stockout Prediction and Reorder

```typescript
// Simulate 30 days of antibiotic dispensing
const movements: StockMovement[] = [];
const now = new Date();

for (let day = 0; day < 30; day++) {
  const date = new Date(now.getTime() - (30 - day) * 24 * 60 * 60 * 1000);

  // Average 15 units/day (varying demand)
  const dailyDemand = 10 + Math.random() * 10;

  movements.push({
    id: `mov-${day}`,
    tenantId,
    itemId: 'med-amox-500',
    type: 'DISPENSING',
    quantity: -Math.round(dailyDemand),
    performedBy: 'pharmacist-dispensing',
    timestamp: date.toISOString()
  });
}

// Predict stockout
const forecast = predictor.predict(
  'med-amox-500',
  tenantId,
  movements,
  150, // current stock
  50   // reorder point
);

console.log(`
Daily average: ${forecast.dailyAverage} units
Safety stock: ${forecast.safetyStock} units
Days until stockout: ${forecast.daysUntilStockout}
Forecast confidence: ${forecast.confidence}
Method: ${forecast.forecastMethod}
`);

// Generate reorder recommendations
const itemMap = new Map([['med-amox-500', { quantity: 150, reorderPoint: 50 }]]);
const forecasts = [forecast];

const recommendations = reorder.generateRecommendations(
  new Map(),
  forecasts,
  tenantId
);

console.log('Reorder recommendations:');
recommendations.forEach(rec => {
  console.log(`
    Item: ${rec.itemId}
    Current: ${rec.currentStock}
    Reorder at: ${rec.reorderPoint}
    Order: ${rec.reorderQuantity} units
    Priority: ${rec.priority}
    Days until stockout: ${rec.daysUntilStockout}
  `);
});
```

## Example 4: Cold Chain Monitoring for Vaccines

```typescript
// Register vaccine requiring cold storage
const vaccine: SupplyItem = {
  id: 'med-covid-vac',
  tenantId,
  facilityId,
  name: 'COVID-19 Vaccine',
  anvisaClass: 'THERMOLABILE',
  anvisaRegistration: 'ANVISA-2023-00089',
  lotNumber: 'LOT-2024-VAXXX-001',
  expirationDate: '2024-12-31T23:59:59Z',
  quantity: 500,
  unit: 'doses',
  location: 'Vaccine Refrigerator A',
  temperatureRange: { min: 2, max: 8, unit: 'CELSIUS' },
  reorderPoint: 50,
  reorderQuantity: 200,
  lastCountDate: new Date().toISOString(),
  lastCountSource: 'AUTOMATED_SENSOR',
  status: 'IN_STOCK'
};

inventory.addItem(vaccine);

// Record temperature readings (simulating a cold chain violation)
const now = new Date();

// Normal readings
for (let i = 0; i < 5; i++) {
  const time = new Date(now.getTime() - (10 - i) * 5 * 60 * 1000).toISOString();
  coldChain.recordTemperature('Vaccine Refrigerator A', 5, time, tenantId);
}

// VIOLATION: Temperature rises above range (refrigerator malfunction)
const violationStart = new Date(now.getTime() - 5 * 60 * 1000);
for (let i = 0; i < 10; i++) {
  const time = new Date(violationStart.getTime() + i * 5 * 60 * 1000).toISOString();
  coldChain.recordTemperature('Vaccine Refrigerator A', 12, time, tenantId); // OUT OF RANGE
}

// Back to normal
for (let i = 0; i < 5; i++) {
  const time = new Date(now.getTime() + (i + 1) * 5 * 60 * 1000).toISOString();
  coldChain.recordTemperature('Vaccine Refrigerator A', 5, time, tenantId);
}

// Check for excursions
const inventoryMap = new Map([['Vaccine Refrigerator A', [vaccine]]]);
const excursions = coldChain.checkExcursions(tenantId, facilityId, inventoryMap);

console.log(`Found ${excursions.length} temperature excursions:`);
excursions.forEach(exc => {
  console.log(`
    Location: ${exc.storageLocation}
    Temperature: ${exc.recordedTemp}°C (range: ${exc.requiredRange.min}-${exc.requiredRange.max}°C)
    Duration: ${exc.duration} minutes
    Severity: ${exc.severity}
    Affected items: ${exc.affectedItems.join(', ')}
    ANVISA reported: ${exc.reportedToANVISA}
  `);

  if (exc.severity === 'CRITICAL') {
    // RUTH: Critical excursions must be reported
    console.log('ALERT: Critical excursion detected. Requires ANVISA reporting.');

    // After submitting report to ANVISA, mark it
    coldChain.markANVISAReported(exc.id);
    console.log('Marked as reported to ANVISA');
  }
});

// Check unreported critical excursions
const unreported = coldChain.getUnreportedCriticalExcursions(tenantId);
console.log(`Unreported critical excursions: ${unreported.length}`);
```

## Example 5: Compliance Reporting

```typescript
// Generate monthly compliance report
const dateRange = {
  start: new Date('2024-03-01T00:00:00Z').toISOString(),
  end: new Date('2024-03-31T23:59:59Z').toISOString()
};

// Build inventory and movements from database
const inventoryMap = new Map<string, SupplyItem>();
// ... populate with items ...

const allMovements: StockMovement[] = [];
// ... populate with movements in date range ...

const report = compliance.generateComplianceReport(
  tenantId,
  inventoryMap,
  allMovements,
  dateRange
);

console.log(`
COMPLIANCE REPORT
=================
Facility: ${tenantId}
Period: ${report.dateRange.start.split('T')[0]} to ${report.dateRange.end.split('T')[0]}

Total Movements: ${report.totalMovements}
Controlled Substance Movements: ${report.controlledSubstanceMovements}
Witnessing Compliance: ${report.witnessingCompliance}%
Antimicrobial Dispensings: ${report.antimicrobialDispensings}
Expired Items Found: ${report.expiredItemsFound}
Temperature Excursions: ${report.temperatureExcursions}
ANVISA Reportable Events: ${report.anvisaReportableEvents}

Overall Compliance Score: ${report.overallComplianceScore}/100
${report.overallComplianceScore < 80 ? '⚠️  ACTION REQUIRED' : '✓ COMPLIANT'}
`);
```

## Example 6: Alerts and Notifications

```typescript
// Get all unacknowledged alerts for facility
const alerts = inventory.getAlerts(tenantId);

console.log(`Active alerts: ${alerts.length}`);
alerts.forEach(alert => {
  console.log(`
    Type: ${alert.type}
    Severity: ${alert.severity}
    Item: ${alert.itemId}
    Message: ${alert.message}
    Human review required: ${alert.humanReviewRequired}
    Created: ${alert.createdAt}
  `);

  // Low-confidence forecasts require manual review
  if (alert.humanReviewRequired) {
    console.log('  → Requires pharmacist review before automated reorder');
  }
});

// Acknowledge alert
if (alerts.length > 0) {
  inventory.acknowledgeAlert(alerts[0].id, tenantId, 'pharmacist-ana');
  console.log('Alert acknowledged');
}

// Check remaining alerts
const remaining = inventory.getAlerts(tenantId);
console.log(`Remaining unacknowledged alerts: ${remaining.length}`);
```

## Example 7: Batch Operations

```typescript
// Forecast stockout for all items in facility
const itemsMap = new Map<string, any>();
// ... populate with all facility items ...

const allMovements: StockMovement[] = [];
// ... populate with movements ...

const forecasts = predictor.predictAll(tenantId, itemsMap, allMovements);
console.log(`Forecast for ${forecasts.length} items:`);

forecasts
  .filter(f => f.daysUntilStockout <= 7)
  .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
  .forEach(f => {
    console.log(`${f.itemId}: ${f.daysUntilStockout} days (${f.confidence} confidence)`);
  });

// Optimize reorder parameters for all items
const optimizations = reorder.optimizeAll(
  itemsMap,
  forecasts,
  tenantId,
  5 // lead time days
);

optimizations.forEach((optimization, itemId) => {
  console.log(`
    Item: ${itemId}
    Reorder point: ${optimization.optimalReorderPoint}
    Reorder quantity: ${optimization.optimalReorderQuantity}
    Rationale: ${optimization.rationale}
  `);
});
```

## Testing in Your Application

```typescript
import { InventoryTracker } from '@holi/supply-chain';

describe('Healthcare Supply Chain', () => {
  let tracker: InventoryTracker;
  const tenantId = 'test-facility';

  beforeEach(() => {
    tracker = new InventoryTracker();
  });

  it('should prevent unauthorized tenant access', () => {
    const item = tracker.addItem({
      id: 'test-item',
      tenantId,
      facilityId: 'fac-1',
      name: 'Test',
      anvisaClass: 'GENERAL',
      lotNumber: 'LOT-001',
      expirationDate: '2025-12-31T23:59:59Z',
      quantity: 100,
      unit: 'units',
      location: 'Shelf A',
      reorderPoint: 10,
      reorderQuantity: 25,
      lastCountDate: new Date().toISOString(),
      lastCountSource: 'MANUAL',
      status: 'IN_STOCK'
    });

    expect(() => {
      tracker.getStock(item.id, 'unauthorized-tenant');
    }).toThrow('Unauthorized');
  });
});
```

## Integration with Health 3.0 Platform

```typescript
// In your Health 3.0 Step 4 service
import { InventoryTracker, StockoutPredictor } from '@holi/supply-chain';
import { AuthContext } from '@holi/auth';
import { Database } from '@holi/database';

export class SupplyChainService {
  private tracker = new InventoryTracker();
  private predictor = new StockoutPredictor();

  async getSupplies(ctx: AuthContext) {
    const tenantId = ctx.tenantId; // From auth middleware (CYRUS)

    // Check for critical alerts
    const alerts = this.tracker.getAlerts(tenantId);

    // Predict stockouts
    const movements = await Database.query('stock_movements');
    const forecasts = this.predictor.predictAll(
      tenantId,
      this.tracker,
      movements
    );

    return {
      alerts,
      forecasts,
      supplies: await Database.query('supplies', { tenantId })
    };
  }
}
```

This package is production-ready and designed to be integrated into larger healthcare systems while maintaining strict compliance and security.
