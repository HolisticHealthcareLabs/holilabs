# @holi/supply-chain

Industry-grade supply chain visibility for Brazilian healthcare facilities. Tracks medications, medical supplies, and ANVISA-regulated items with mandatory compliance enforcement.

## Features

### Core Capabilities
- **Inventory Management**: Track supply items with complete audit trail
- **Stockout Prediction**: ML-free demand forecasting using 30-day moving average + newsvendor safety stock
- **ANVISA Compliance**: Mandatory enforcement of Brazilian pharmaceutical regulations
- **Cold Chain Monitoring**: Temperature tracking for biologics and vaccines
- **Reorder Optimization**: Automatic calculation of optimal reorder points and quantities

### Safety Invariants (Enforced, Not Optional)

#### CYRUS - Tenant Isolation
Every query is scoped by `tenantId`. Unauthorized access throws explicit errors.
```typescript
const stock = tracker.getStock(itemId, tenantId);
// Throws: "Unauthorized: tenant mismatch" if item belongs to different tenant
```

#### ELENA - Source & Method Tracking
All stock counts include source (MANUAL, AUTOMATED_SENSOR, BARCODE_SCAN, RFID) and timestamp.
All forecasts disclose method and calculation timestamp.

#### RUTH - ANVISA Compliance
Non-optional enforcement:
- Controlled substances (CONTROLLED_I, CONTROLLED_II) require witness on dispensing
- All items require lot number
- Regulated items require ANVISA registration
- Thermolabile items require temperature range specification

#### QUINN - Non-Blocking Alerts
Stockout warnings never interrupt clinical workflow. Status changes trigger async alerts.

## Installation

```bash
# From monorepo root
pnpm install

# Or within package directory
cd packages/supply-chain
pnpm install
```

## Usage

### Basic Inventory Tracking
```typescript
import { InventoryTracker } from '@holi/supply-chain';

const tracker = new InventoryTracker();

// Register item
const item = tracker.addItem({
  id: 'med-001',
  tenantId: 'facility-1',
  facilityId: 'santa-maria',
  name: 'Amoxicillin 500mg',
  anvisaClass: 'ANTIMICROBIAL',
  anvisaRegistration: 'ANVISA-2023-00156',
  lotNumber: 'LOT-2024-089',
  expirationDate: '2026-03-20T23:59:59Z',
  quantity: 100,
  unit: 'units',
  location: 'Pharmacy Shelf A',
  reorderPoint: 50,
  reorderQuantity: 200,
  lastCountDate: new Date().toISOString(),
  lastCountSource: 'BARCODE_SCAN',
  status: 'IN_STOCK'
});

// Record movement
tracker.recordMovement({
  id: '',
  tenantId: 'facility-1',
  itemId: item.id,
  type: 'DISPENSING',
  quantity: -20,
  performedBy: 'nurse-123',
  timestamp: new Date().toISOString()
});

// Check stock
const stock = tracker.getStock(item.id, 'facility-1');
console.log(`Current: ${stock.quantity} units`);

// Get alerts
const alerts = tracker.getAlerts('facility-1');
```

### Stockout Prediction
```typescript
import { StockoutPredictor } from '@holi/supply-chain';

const predictor = new StockoutPredictor();

const forecast = predictor.predict(
  'med-001',
  'facility-1',
  movements, // array of StockMovement
  100,       // current stock
  50         // reorder point
);

console.log(`Days until stockout: ${forecast.daysUntilStockout}`);
console.log(`Safety stock: ${forecast.safetyStock}`);
console.log(`Confidence: ${forecast.confidence}`);
```

### ANVISA Compliance Validation
```typescript
import { ANVISAComplianceChecker } from '@holi/supply-chain';

const checker = new ANVISAComplianceChecker();

const validation = checker.validateMovement(item, movement);
if (!validation.valid) {
  console.error('Compliance violation:', validation.errors);
  // Transaction is blocked
}

// Generate compliance report
const report = checker.generateComplianceReport(
  'facility-1',
  inventoryMap,
  movements,
  { start: '2024-03-01T00:00:00Z', end: '2024-03-31T23:59:59Z' }
);

console.log(`Compliance score: ${report.overallComplianceScore}/100`);
```

### Cold Chain Monitoring
```typescript
import { ColdChainMonitor } from '@holi/supply-chain';

const monitor = new ColdChainMonitor();

// Record temperature
monitor.recordTemperature(
  'Vaccine Refrigerator A',
  5,
  new Date().toISOString(),
  'facility-1'
);

// Check for excursions
const excursions = monitor.checkExcursions('facility-1', 'facility-1', inventoryMap);

// Get unreported critical excursions (for ANVISA reporting)
const critical = monitor.getUnreportedCriticalExcursions('facility-1');
```

### Reorder Optimization
```typescript
import { ReorderEngine } from '@holi/supply-chain';

const engine = new ReorderEngine();

const recommendations = engine.generateRecommendations(
  inventoryMap,
  forecasts,
  'facility-1'
);

// Sorted by priority: URGENT → HIGH → MEDIUM → LOW
recommendations.forEach(rec => {
  console.log(`${rec.itemId}: ${rec.priority} (${rec.daysUntilStockout} days)`);
});
```

## Type Definitions

### SupplyItem
```typescript
interface SupplyItem {
  id: string;
  tenantId: string;              // CYRUS: Organization/facility
  facilityId: string;
  name: string;
  genericName?: string;
  anvisaClass: ANVISAClass;      // RUTH: Regulatory class
  anvisaRegistration?: string;   // RUTH: ANVISA registration
  lotNumber: string;             // RUTH: Mandatory tracking
  expirationDate: string;
  quantity: number;
  unit: string;
  location: string;
  temperatureRange?: TemperatureRange;  // RUTH: For thermolabile
  reorderPoint: number;
  reorderQuantity: number;
  lastCountDate: string;         // ELENA: When counted
  lastCountSource: StockCountSource;    // ELENA: How counted
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' | 'STOCKOUT' | 'EXPIRED' | 'RECALLED';
}
```

### StockMovement
```typescript
interface StockMovement {
  id: string;
  tenantId: string;              // CYRUS
  itemId: string;
  type: 'RECEIPT' | 'DISPENSING' | 'TRANSFER' | 'WASTE' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;              // Signed: positive in, negative out
  performedBy: string;           // ELENA: User tracking
  timestamp: string;             // ELENA: When
  reason?: string;
  witnessedBy?: string;          // RUTH: Required for CONTROLLED_*
}
```

### DemandForecast
```typescript
interface DemandForecast {
  itemId: string;
  tenantId: string;
  dailyAverage: number;
  weeklyAverage: number;
  safetyStock: number;
  daysUntilStockout: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  forecastMethod: string;        // ELENA: Always disclosed
  calculatedAt: string;          // ELENA: Timestamp
}
```

## Running Tests

```bash
cd packages/supply-chain

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

### Test Coverage
- **82+ test cases** across 4 modules
- InventoryTracker: 25+ tests (CRUD, tenant isolation, audit trail)
- StockoutPredictor: 18+ tests (moving average, safety stock, confidence)
- ANVISAComplianceChecker: 20+ tests (witness requirement, expiration, reporting)
- ColdChainMonitor: 19+ tests (temperature, excursion detection, severity)

## Building

```bash
# TypeScript compilation
pnpm build

# Output in dist/
```

## Module Overview

### InventoryTracker
Core inventory management with complete audit trail. Tracks item quantities, movements, and status changes. Generates non-blocking alerts on status transitions.

**Key Methods**: `addItem()`, `recordMovement()`, `getStock()`, `getExpiringItems()`, `checkReorderPoints()`, `getMovementHistory()`

### StockoutPredictor
ML-free demand forecasting using 30-day moving average and newsvendor safety stock model (Z=1.65 for 95% service level).

**Key Methods**: `predict()`, `predictAll()`

**Algorithm**:
1. Extract 30-day dispensing history
2. Calculate daily average and standard deviation
3. Apply newsvendor formula: `safetyStock = Z × σ`
4. Estimate days until stockout: `(stock - safetyStock) / dailyAverage`

### ANVISAComplianceChecker
Mandatory enforcement of Brazilian pharmaceutical regulations. All checks are non-optional.

**Key Methods**: `validateMovement()`, `checkExpirationCompliance()`, `generateComplianceReport()`, `requiresANVISAReporting()`

**Requirements**:
- Witness for CONTROLLED_I/II dispensing
- Lot number for all items
- ANVISA registration for regulated classes
- Temperature range for thermolabile items

### ColdChainMonitor
Temperature tracking for biologics and vaccines. Detects excursions and flags critical violations for ANVISA reporting.

**Key Methods**: `recordTemperature()`, `checkExcursions()`, `getAffectedItems()`, `markANVISAReported()`, `getUnreportedCriticalExcursions()`

**Standards**:
- Vaccine: 2-8°C (WHO)
- Insulin storage: 2-8°C
- Insulin in-use: 15-30°C
- Critical: > 30 minutes out of range

### ReorderEngine
Optimizes reorder points and quantities using Economic Order Quantity principles.

**Key Methods**: `calculateReorderPoint()`, `calculateReorderQuantity()`, `generateRecommendations()`, `optimizeReorderParams()`, `optimizeAll()`

## Integration with Health 3.0

This package is Step 4 of the Health 3.0 platform. It integrates with:
- **Auth**: Uses `tenantId` from security context (CYRUS enforcement)
- **Database**: Ready for PostgreSQL with tenant-scoped schema
- **API Layer**: Endpoints in parent Health 3.0 package
- **Alerts**: Fire-and-forget (no blocking of clinical workflow)

## Documentation

- **ARCHITECTURE.md** - Detailed module design and data flow
- **USAGE_EXAMPLES.md** - Code examples for common scenarios
- **BUILD_STATUS.md** - Current build status and roadmap
- **FILES_MANIFEST.txt** - Complete file listing

## Performance

- In-memory storage for prototype phase
- Ready for PostgreSQL persistence layer
- O(1) item lookup, O(n) for tenant-scoped queries
- Stockout prediction: O(n) for 30-day analysis
- Cold chain excursion detection: O(n) for reading analysis

## Future Enhancements

- [ ] PostgreSQL persistence with tenant-scoped schema
- [ ] REST API layer with role-based access control
- [ ] WebSocket real-time alerts
- [ ] HL7 FHIR hospital system integration
- [ ] Automated ANVISA compliance reports
- [ ] Dashboard with supply chain metrics
- [ ] Supplier system integration for auto-PO
- [ ] Mobile barcode scanning app
- [ ] Predictive reorder with supplier lead times
- [ ] Multi-location inventory optimization

## License

Part of Health 3.0 Platform (HoliLabs)

## Security & Compliance

- ✓ CYRUS: Tenant isolation enforced on all queries
- ✓ ELENA: All measurements tracked with source and timestamp
- ✓ RUTH: ANVISA regulations non-optionally enforced
- ✓ QUINN: Alerts non-blocking to clinical workflow
- ✓ HIPAA-ready: No PII in supply chain data
- ✓ Audit trail: Complete immutable movement history

## Support

For issues or questions, contact the Health 3.0 team.
