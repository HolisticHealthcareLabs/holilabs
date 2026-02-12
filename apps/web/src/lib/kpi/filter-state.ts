/**
 * KPI Filter State Model
 * Defines the date range filter structure for KPI queries
 */

export interface KPIFilterState {
  startDate?: string; // ISO 8601 date string (e.g., "2026-02-01")
  endDate?: string;   // ISO 8601 date string (e.g., "2026-02-11")
}

/**
 * Validates and normalizes filter state
 * @param filter - Raw filter object
 * @returns Validated filter state with optional dates
 */
export function validateFilterState(filter: unknown): KPIFilterState {
  if (typeof filter !== 'object' || filter === null) {
    return {};
  }

  const filterObj = filter as Record<string, unknown>;
  const result: KPIFilterState = {};

  if (typeof filterObj.startDate === 'string' && filterObj.startDate.length > 0) {
    // Validate ISO date format
    const startDate = new Date(filterObj.startDate);
    if (!Number.isNaN(startDate.getTime())) {
      result.startDate = filterObj.startDate;
    }
  }

  if (typeof filterObj.endDate === 'string' && filterObj.endDate.length > 0) {
    // Validate ISO date format
    const endDate = new Date(filterObj.endDate);
    if (!Number.isNaN(endDate.getTime())) {
      result.endDate = filterObj.endDate;
    }
  }

  return result;
}
