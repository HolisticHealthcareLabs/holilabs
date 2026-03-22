# Supply Chain Package Architecture

## Overview
The `@holi/supply-chain` package is an industry-grade supply chain visibility system for Brazilian healthcare facilities. It tracks medications, medical supplies, and ANVISA-regulated items with strict compliance enforcement.

## Core Modules

### 1. InventoryTracker
**Purpose**: Central inventory management with complete audit trail

**Key Methods**:
- `addItem(item)` - Register new supply items
- `recordMovement(movement)` - Log stock transactions (receipt, dispensing, transfer, waste, adjustment, return)
- `getStock(itemId, tenantId)` - Retrieve current inventory
- `getExpiringItems(tenantId, daysAhead)` - Find expiring stock
- `checkReorderPoints(tenantId)` - Identify items below reorder threshold
- `getMovementHistory(itemId, tenantId)` - Full audit trail
- `updateCountSource(itemId, tenantId, source)` - Track count method

**CYRUS Enforcement**: Every operation verifies `tenantId` matches
**ELENA Tracking**: Every movement records `performedBy`, `timestamp`, and `source`
**Alerts**: Status changes automatically generate non-blocking alerts

### 2. StockoutPredictor
**Purpose**: Forecast stockouts using proven operations research (no ML)

**Algorithm**:
1. Extract 30-day dispensing history
2. Calculate daily average demand
3. Compute standard deviation for variability
4. Apply newsvendor safety stock formula: `safetyStock = Z × σ` (Z=1.65)
5. Estimate days until stockout: `(currentStock - safetyStock) / dailyAverage`

**Confidence Levels**:
- LOW: < 7 data points or high variability (σ > 10)
- MEDIUM: 7-30 data points with moderate variability (σ > 5)
- HIGH: stable demand pattern (σ ≤ 5)

**ELENA Requirement**: Always includes `forecastMethod` and `calculatedAt` timestamp

### 3. ANVISAComplianceChecker
**Purpose**: Enforce Brazilian pharmaceutical regulations

**Mandatory Checks**:
1. **Witness Requirement** (CONTROLLED_I, CONTROLLED_II)
   - Dispensing transactions MUST include `witnessedBy` field
   - Non-compliance flagged in reports

2. **Lot Number Tracking**
   - ALL items must have `lotNumber`
   - Enables traceability for recalls

3. **ANVISA Registration**
   - Regulated items (CONTROLLED_*, ANTIMICROBIAL, THERMOLABILE) require `anvisaRegistration`
   - Auto-validated on movement

4. **Temperature Range Documentation**
   - Thermolabile items must specify `temperatureRange` (min, max, unit)
   - Enables cold-chain monitoring

**Compliance Reporting**:
- Calculates witnessing percentage (controlled substances)
- Counts antimicrobial dispensings (stewardship tracking)
- Identifies expired items
- Flags ANVISA-reportable events
- Generates 0-100 compliance score

### 4. ColdChainMonitor
**Purpose**: Track temperature excursions for biologics and vaccines

**Standard Ranges**:
- Vaccines: 2-8°C (WHO standard)
- Insulin storage: 2-8°C
- Insulin in-use: 15-30°C

**Excursion Detection**:
- WARNING: < 30 minutes out of range (tracked but not critical)
- CRITICAL: > 30 minutes out of range (auto-flagged for ANVISA)

**RUTH Requirement**:
- Critical excursions automatically set `reportedToANVISA: false`
- Must be explicitly marked as reported
- Never lost from audit trail

**Key Methods**:
- `recordTemperature(location, temp, timestamp, tenantId)` - Log readings
- `checkExcursions(tenantId, facilityId, inventory)` - Detect violations
- `getAffectedItems(location, inventory)` - Identify products in excursion zone
- `markANVISAReported(excursionId)` - Track reporting status
- `getUnreportedCriticalExcursions(tenantId)` - Alert dashboard

### 5. ReorderEngine
**Purpose**: Optimize reorder points and quantities

**Calculations**:
```
Reorder Point = (Daily Avg × Lead Time) + Safety Stock
Reorder Quantity = Daily Avg × 90 (days)
```

**Prioritization**:
- URGENT: 0 or fewer days until stockout
- HIGH: 1-7 days
- MEDIUM: 8-14 days
- LOW: 15+ days

**Integration**: Works directly with `StockoutPredictor.predict()` output

## Type Hierarchy

```
SupplyItem
├── tenantId (CYRUS)
├── facilityId
├── anvisaClass (ANVISAClass)
├── quantity
├── status (IN_STOCK | LOW_STOCK | CRITICAL | STOCKOUT | EXPIRED | RECALLED)
├── lastCountSource (ELENA)
├── lastCountDate (ELENA)
└── temperatureRange (optional, RUTH for THERMOLABILE)

StockMovement
├── tenantId (CYRUS)
├── itemId
├── type (RECEIPT | DISPENSING | TRANSFER | WASTE | ADJUSTMENT | RETURN)
├── quantity (signed)
├── performedBy (ELENA)
├── timestamp (ELENA)
├── reason
└── witnessedBy (RUTH, required for CONTROLLED_*)

DemandForecast
├── dailyAverage
├── weeklyAverage
├── safetyStock
├── daysUntilStockout
├── confidence (LOW | MEDIUM | HIGH)
├── forecastMethod (ELENA: always disclosed)
└── calculatedAt (ELENA)

TemperatureExcursion
├── tenantId (CYRUS)
├── facilityId
├── storageLocation
├── recordedTemp
├── requiredRange
├── duration (minutes)
├── affectedItems (itemIds)
├── severity (WARNING | CRITICAL)
└── reportedToANVISA (RUTH: false until explicitly marked)

SupplyAlert
├── tenantId (CYRUS)
├── type (STOCKOUT | LOW_STOCK | EXPIRING_SOON | EXPIRED | TEMPERATURE_EXCURSION | RECALL | REORDER_NEEDED)
├── severity (LOW | MEDIUM | HIGH | CRITICAL)
├── itemId
├── humanReviewRequired (ELENA: true if forecast confidence is LOW)
├── createdAt
└── acknowledgedAt (optional)
```

## Data Flow Example

### Scenario: Receiving antibiotic shipment
```
1. InventoryTracker.addItem({name: "Amoxicillin", anvisaClass: "ANTIMICROBIAL", ...})
   → Creates SupplyItem with tenantId = "facility-1"

2. ANVISAComplianceChecker.validateMovement({type: "RECEIPT", quantity: +100})
   → Verifies ANVISA registration present
   → Verifies lot number present

3. InventoryTracker.recordMovement({type: "RECEIPT", quantity: 100})
   → Updates quantity: 0 → 100
   → Updates status: STOCKOUT → IN_STOCK
   → Generates SupplyAlert (status change)
   → Records StockMovement in audit trail

4. StockoutPredictor.predict(...) [async]
   → Analyzes last 30 days of dispensing
   → Calculates moving average + safety stock
   → Returns DemandForecast with confidence level
```

### Scenario: Cold chain violation detection
```
1. ColdChainMonitor.recordTemperature("Vaccine Storage", 12°C, timestamp)
   → Outside normal range (2-8°C)

2. Monitor detects 40-minute excursion
   → Creates TemperatureExcursion with severity="CRITICAL"
   → reportedToANVISA = false (requires explicit acknowledgment)
   → Identifies affectedItems: [vaccine-1, vaccine-2]

3. ANVISAComplianceChecker.requiresANVISAReporting(...)
   → Returns true for THERMOLABILE items in excursion
   → System flags for manual ANVISA submission

4. ColdChainMonitor.markANVISAReported(excursionId)
   → Sets reportedToANVISA = true
   → Removed from getUnreportedCriticalExcursions()
```

## Safety Invariants

### CYRUS (Tenant Isolation)
Every method that retrieves data verifies tenant authorization:
```typescript
if (item.tenantId !== tenantId) {
  throw new Error('Unauthorized: tenant mismatch');
}
```
This ensures healthcare facilities cannot access each other's inventory.

### ELENA (Source Tracking & Transparency)
All measurements include:
- WHO took the measurement (`performedBy`)
- WHEN it was taken (`timestamp`)
- HOW it was measured (`lastCountSource`)
- WHAT method was used (`forecastMethod`)

This enables audit trails and reproducibility.

### RUTH (Regulatory Compliance)
Non-optional enforcement:
```typescript
// Controlled substances MUST have witness
if (item.anvisaClass === 'CONTROLLED_I' && !movement.witnessedBy) {
  return { valid: false, errors: ['ANVISA requires witness...'] };
}
```
Invalid movements are rejected, not logged.

### QUINN (Non-Blocking Alerts)
Stockout warnings never interrupt clinical workflow:
```typescript
// Alert created but doesn't throw
const alert: SupplyAlert = { type: 'STOCKOUT', ... };
alerts.push(alert);
// Movement completes successfully
return { quantity: -50, timestamp: ... };
```

## Testing Strategy

**82+ test cases** verify:
1. **Functional correctness**: All methods work as specified
2. **Safety invariants**: CYRUS/ELENA/RUTH/QUINN are enforced
3. **Edge cases**: No data, single point, high demand
4. **Integration**: Modules work together correctly
5. **Compliance**: ANVISA rules are mandatory, not optional

**Test Coverage**:
- InventoryTracker: CRUD, tenant isolation, audit trail
- StockoutPredictor: Moving average, safety stock, confidence
- ANVISAComplianceChecker: Witness requirement, expiration, reporting
- ColdChainMonitor: Temperature tracking, excursion detection, severity

## Performance Considerations

- **InventoryTracker**: O(1) item lookup, O(n) for tenant-scoped queries
- **StockoutPredictor**: O(n) for 30-day history analysis
- **ColdChainMonitor**: O(n) for excursion detection across readings
- All modules use in-memory Maps for test/prototype phase
- Ready for database persistence (PostgreSQL with JSONB for flexible schema)

## Future Extensions

1. **Persistence Layer**: PostgreSQL with tenant-scoped schema
2. **API Layer**: REST/GraphQL endpoints with role-based access
3. **Real-time Alerts**: WebSocket push for stockouts and excursions
4. **Integration**: HL7 FHIR for hospital system integration
5. **Reporting**: Automated ANVISA compliance exports
6. **Analytics**: Dashboard for supply chain metrics
7. **Supplier Integration**: Direct PO automation based on reorder engine
8. **Barcode Scanning**: Mobile app integration for warehouse ops
