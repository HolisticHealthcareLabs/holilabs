import { SSEEvent, EventFilterConfig, EventPriority } from './types';

/**
 * EventFilter handles client-side event filtering and priority classification
 * Supports wildcard matching (e.g., 'prevention.*'), severity filtering, and facility/patient scoping
 * RUTH invariant: critical events are classified and routed with priority
 */
export class EventFilter {
  /**
   * RUTH priority events that must always be expedited to clinicians
   * - lab.critical.result: ANVISA-reportable critical lab findings
   * - drug.interaction.detected: Potential medication interactions
   * - supply.stockout.detected: Critical supply shortages (especially ER medications)
   */
  private static readonly RUTH_PRIORITY_TYPES = [
    'lab.critical.result',
    'drug.interaction.detected',
    'supply.stockout.detected'
  ];

  /**
   * HIGH priority events that should be expedited but may be queued under load
   * - prevention.gap.detected: Clinical care gaps
   * - record.ingested: New patient data available
   */
  private static readonly HIGH_PRIORITY_TYPES = [
    'prevention.gap.detected',
    'record.ingested'
  ];

  /**
   * Determine if an event should be delivered to a client based on filter configuration
   * @param event The SSE event to filter
   * @param filter Client's filter configuration
   * @returns true if event passes all filters
   */
  public shouldDeliver(event: SSEEvent, filter: EventFilterConfig): boolean {
    // Type filtering (supports wildcards)
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      const matches = filter.eventTypes.some(type => this.typeMatches(event.type, type));
      if (!matches) {
        return false;
      }
    }

    // Severity filtering
    if (filter.severityMin) {
      const eventSeverity = this.extractSeverity(event);
      if (!this.meetsMinimumSeverity(eventSeverity, filter.severityMin)) {
        return false;
      }
    }

    // Facility filtering
    if (filter.facilityIds && filter.facilityIds.length > 0) {
      const eventFacility = this.extractFacilityId(event);
      if (eventFacility && !filter.facilityIds.includes(eventFacility)) {
        return false;
      }
    }

    // Patient filtering (watch specific patients)
    if (filter.patientIds && filter.patientIds.length > 0) {
      const eventPatient = this.extractPatientId(event);
      if (eventPatient && !filter.patientIds.includes(eventPatient)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Classify event priority for RUTH invariant compliance
   * RUTH events get highest priority, HIGH events next, rest are NORMAL
   * @param event The SSE event to classify
   * @returns Priority level for routing
   */
  public getPriority(event: SSEEvent): EventPriority {
    // RUTH priority: critical ANVISA-relevant events
    if (EventFilter.RUTH_PRIORITY_TYPES.includes(event.type)) {
      return 'CRITICAL';
    }

    // HIGH priority: important but not emergency events
    if (EventFilter.HIGH_PRIORITY_TYPES.includes(event.type)) {
      return 'HIGH';
    }

    return 'NORMAL';
  }

  /**
   * Check if an event type matches a filter pattern
   * Supports wildcards: 'prevention.*' matches 'prevention.gap.detected', etc.
   * @param eventType The event type to match
   * @param pattern The filter pattern (may include wildcards)
   * @returns true if the event type matches the pattern
   */
  private typeMatches(eventType: string, pattern: string): boolean {
    if (pattern === '*') {
      return true;
    }

    if (!pattern.includes('*')) {
      return eventType === pattern;
    }

    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventType);
  }

  /**
   * Extract severity from event payload
   * Defaults to MEDIUM if not found
   * @param event The event to extract severity from
   * @returns Severity level
   */
  private extractSeverity(event: SSEEvent): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    try {
      const payload = JSON.parse(event.data);
      const severity = payload.severity || payload.level;

      if (typeof severity === 'string') {
        const normalized = severity.toUpperCase();
        if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(normalized)) {
          return normalized as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        }
      }
    } catch {
      // Silently ignore parse errors, default to MEDIUM
    }
    return 'MEDIUM';
  }

  /**
   * Check if an event meets the minimum severity threshold
   * @param eventSeverity The event's severity level
   * @param minimumSeverity The minimum required severity
   * @returns true if event meets or exceeds minimum
   */
  private meetsMinimumSeverity(
    eventSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    minimumSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): boolean {
    const severityOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    return severityOrder[eventSeverity] >= severityOrder[minimumSeverity];
  }

  /**
   * Extract facility ID from event payload
   * @param event The event to extract facility ID from
   * @returns Facility ID or undefined
   */
  private extractFacilityId(event: SSEEvent): string | undefined {
    try {
      const payload = JSON.parse(event.data);
      return payload.facilityId || payload.facility_id;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract patient ID from event payload
   * @param event The event to extract patient ID from
   * @returns Patient ID or undefined
   */
  private extractPatientId(event: SSEEvent): string | undefined {
    try {
      const payload = JSON.parse(event.data);
      return payload.patientId || payload.patient_id;
    } catch {
      return undefined;
    }
  }
}
