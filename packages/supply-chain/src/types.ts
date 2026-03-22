/**
 * Health 3.0 Supply Chain Tracking Types
 * Enforces CYRUS (tenant-scoping), ELENA (source tracking),
 * RUTH (ANVISA compliance), and QUINN (non-blocking alerts)
 */

// RUTH: ANVISA Item Classification
export type ANVISAClass =
  | 'CONTROLLED_I'
  | 'CONTROLLED_II'
  | 'ANTIMICROBIAL'
  | 'THERMOLABILE'
  | 'GENERAL'
  | 'MEDICAL_DEVICE';

// Temperature range for cold-chain items
export interface TemperatureRange {
  min: number;
  max: number;
  unit: 'CELSIUS';
}

// ELENA: Stock count sources
export type StockCountSource =
  | 'MANUAL'
  | 'AUTOMATED_SENSOR'
  | 'BARCODE_SCAN'
  | 'RFID';

// Supply item in inventory
export interface SupplyItem {
  id: string;
  tenantId: string;                    // CYRUS: Tenant isolation
  facilityId: string;
  name: string;
  genericName?: string;
  anvisaRegistration?: string;         // RUTH: ANVISA registration number
  anvisaClass: ANVISAClass;
  lotNumber: string;
  expirationDate: string;              // ISO datetime
  quantity: number;
  unit: string;                        // 'units', 'mL', 'mg', 'boxes'
  location: string;                    // Storage location in facility
  temperatureRange?: TemperatureRange; // For thermolabile items
  reorderPoint: number;                // Min quantity before reorder triggered
  reorderQuantity: number;             // Standard reorder amount
  lastCountDate: string;               // ELENA: when was this last verified
  lastCountSource: StockCountSource;   // ELENA: how was it counted
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' | 'STOCKOUT' | 'EXPIRED' | 'RECALLED';
}

// Stock movement audit trail
export interface StockMovement {
  id: string;
  tenantId: string;                    // CYRUS: Tenant isolation
  itemId: string;
  type: 'RECEIPT' | 'DISPENSING' | 'TRANSFER' | 'WASTE' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;                    // Positive for in, negative for out
  performedBy: string;                 // userId
  timestamp: string;                   // ISO datetime
  reason?: string;
  witnessedBy?: string;                // RUTH: required for CONTROLLED_I and CONTROLLED_II
}

// Temperature excursion event (cold chain violation)
export interface TemperatureExcursion {
  id: string;
  tenantId: string;                    // CYRUS: Tenant isolation
  facilityId: string;
  storageLocation: string;
  recordedTemp: number;
  requiredRange: TemperatureRange;
  duration: number;                    // minutes
  affectedItems: string[];             // itemIds
  severity: 'WARNING' | 'CRITICAL';
  reportedToANVISA: boolean;           // RUTH: critical excursions must be reported
}

// Demand forecast for stockout prediction
export interface DemandForecast {
  itemId: string;
  tenantId: string;
  dailyAverage: number;
  weeklyAverage: number;
  safetyStock: number;
  daysUntilStockout: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  forecastMethod: string;              // ELENA: always disclose method
  calculatedAt: string;                // ISO datetime
}

// Supply alert (QUINN: fire-and-forget, non-blocking)
export interface SupplyAlert {
  id: string;
  tenantId: string;                    // CYRUS: Tenant isolation
  facilityId: string;
  type: 'STOCKOUT' | 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED' | 'TEMPERATURE_EXCURSION' | 'RECALL' | 'REORDER_NEEDED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  itemId: string;
  message: string;
  humanReviewRequired: boolean;        // ELENA: true if forecast confidence is LOW
  createdAt: string;                   // ISO datetime
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

// Compliance report summary
export interface ComplianceReport {
  tenantId: string;
  dateRange: {
    start: string;
    end: string;
  };
  totalMovements: number;
  controlledSubstanceMovements: number;
  witnessingCompliance: number;        // % of controlled movements with witness
  antimicrobialDispensings: number;
  expiredItemsFound: number;
  temperatureExcursions: number;
  anvisaReportableEvents: number;
  overallComplianceScore: number;      // 0-100
}

// Reorder recommendation
export interface ReorderRecommendation {
  itemId: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  daysUntilStockout: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}
