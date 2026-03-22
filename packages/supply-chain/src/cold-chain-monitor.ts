/**
 * ColdChainMonitor: Temperature tracking for biologics/vaccines
 * RUTH: Critical excursions are auto-flagged for ANVISA reporting
 */

import { v4 as uuidv4 } from 'uuid';
import { TemperatureExcursion, SupplyItem, TemperatureRange } from './types';

interface TemperatureReading {
  id: string;
  location: string;
  temperature: number;
  timestamp: string;
  tenantId: string;
}

// Standard cold chain temperature ranges per WHO
const COLD_CHAIN_RANGES: Record<string, TemperatureRange> = {
  VACCINE_STANDARD: { min: 2, max: 8, unit: 'CELSIUS' },
  INSULIN_STORAGE: { min: 2, max: 8, unit: 'CELSIUS' },
  INSULIN_IN_USE: { min: 15, max: 30, unit: 'CELSIUS' },
};

export class ColdChainMonitor {
  private readings: TemperatureReading[] = [];
  private excursions: Map<string, TemperatureExcursion> = new Map();

  /**
   * Record a temperature reading
   */
  recordTemperature(
    location: string,
    temperature: number,
    timestamp: string,
    tenantId: string
  ): TemperatureReading {
    const reading: TemperatureReading = {
      id: uuidv4(),
      location,
      temperature,
      timestamp,
      tenantId,
    };

    this.readings.push(reading);
    return reading;
  }

  /**
   * Check for temperature excursions in a facility
   */
  checkExcursions(
    tenantId: string,
    facilityId: string,
    inventoryLocations: Map<string, SupplyItem[]>
  ): TemperatureExcursion[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent readings for this tenant and location
    const recentReadings = this.readings.filter(
      r =>
        r.tenantId === tenantId &&
        new Date(r.timestamp) >= oneHourAgo
    );

    const detectedExcursions: TemperatureExcursion[] = [];

    // Check each location's readings
    const readingsByLocation = new Map<string, TemperatureReading[]>();
    for (const reading of recentReadings) {
      const existing = readingsByLocation.get(reading.location) || [];
      existing.push(reading);
      readingsByLocation.set(reading.location, existing);
    }

    for (const [location, locationReadings] of readingsByLocation) {
      // Determine which temperature range applies to this location
      const range = this.inferTemperatureRange(location);
      if (!range) continue;

      // Check for excursions
      let excursionStart: TemperatureReading | null = null;

      for (const reading of locationReadings) {
        const isOutOfRange =
          reading.temperature < range.min || reading.temperature > range.max;

        if (isOutOfRange && !excursionStart) {
          excursionStart = reading;
        }

        // Calculate duration if we have a start time
        if (excursionStart && isOutOfRange) {
          const duration = Math.round(
            (new Date(reading.timestamp).getTime() -
              new Date(excursionStart.timestamp).getTime()) /
              (1000 * 60)
          );

          // RUTH: Critical excursions are >= 30 minutes
          const severity = duration >= 30 ? 'CRITICAL' : 'WARNING';

          const affectedItemIds = this.getAffectedItems(
            location,
            inventoryLocations
          );

          // Create excursion record (only if duration crossed threshold)
          if (severity === 'CRITICAL' && duration >= 30) {
            const excursion: TemperatureExcursion = {
              id: uuidv4(),
              tenantId,
              facilityId,
              storageLocation: location,
              recordedTemp: reading.temperature,
              requiredRange: range,
              duration,
              affectedItems: affectedItemIds,
              severity,
              reportedToANVISA: false, // RUTH: will be set by compliance checker
            };

            this.excursions.set(excursion.id, excursion);
            detectedExcursions.push(excursion);
          }
        }

        // Reset if back in range
        if (!isOutOfRange && excursionStart) {
          excursionStart = null;
        }
      }
    }

    return detectedExcursions;
  }

  /**
   * Get items affected by a temperature excursion
   */
  getAffectedItems(
    location: string,
    inventoryLocations: Map<string, SupplyItem[]>
  ): string[] {
    const items = inventoryLocations.get(location) || [];
    return items.map(item => item.id);
  }

  /**
   * Mark excursion as reported to ANVISA (RUTH)
   */
  markANVISAReported(excursionId: string): void {
    const excursion = this.excursions.get(excursionId);
    if (excursion) {
      excursion.reportedToANVISA = true;
    }
  }

  /**
   * Get all critical excursions not yet reported
   */
  getUnreportedCriticalExcursions(tenantId: string): TemperatureExcursion[] {
    return Array.from(this.excursions.values()).filter(
      e =>
        e.tenantId === tenantId &&
        e.severity === 'CRITICAL' &&
        !e.reportedToANVISA
    );
  }

  /**
   * Infer temperature range from location name or default
   */
  private inferTemperatureRange(location: string): TemperatureRange | null {
    const lowerLocation = location.toLowerCase();

    if (
      lowerLocation.includes('vaccine') ||
      lowerLocation.includes('immunization')
    ) {
      return COLD_CHAIN_RANGES.VACCINE_STANDARD;
    }

    if (lowerLocation.includes('insulin')) {
      // Assume storage; could check for "in use" context
      return COLD_CHAIN_RANGES.INSULIN_STORAGE;
    }

    // Default cold chain range
    return COLD_CHAIN_RANGES.VACCINE_STANDARD;
  }

  /**
   * Get temperature history for a location
   */
  getTemperatureHistory(
    location: string,
    tenantId: string,
    hoursBack: number = 24
  ): TemperatureReading[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    return this.readings.filter(
      r =>
        r.location === location &&
        r.tenantId === tenantId &&
        new Date(r.timestamp) >= cutoffTime
    );
  }

  /**
   * Get all excursions for a tenant
   */
  getExcursions(tenantId: string): TemperatureExcursion[] {
    return Array.from(this.excursions.values()).filter(
      e => e.tenantId === tenantId
    );
  }
}
