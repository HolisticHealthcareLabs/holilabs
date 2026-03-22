import { EventFilter } from '../event-filter';
import { SSEEvent, EventFilterConfig } from '../types';

describe('EventFilter', () => {
  let filter: EventFilter;

  beforeEach(() => {
    filter = new EventFilter();
  });

  describe('shouldDeliver', () => {
    it('should deliver event when no filters specified', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: JSON.stringify({ severity: 'CRITICAL' })
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1'
      };

      expect(filter.shouldDeliver(event, config)).toBe(true);
    });

    it('should filter by event type', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: '{}'
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        eventTypes: ['lab.critical.result']
      };

      expect(filter.shouldDeliver(event, config)).toBe(true);
    });

    it('should reject event not in type filter', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'record.ingested',
        data: '{}'
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        eventTypes: ['lab.critical.result', 'drug.interaction.detected']
      };

      expect(filter.shouldDeliver(event, config)).toBe(false);
    });

    it('should support wildcard type matching', () => {
      const event1: SSEEvent = {
        id: 'evt-1',
        type: 'prevention.gap.detected',
        data: '{}'
      };

      const event2: SSEEvent = {
        id: 'evt-2',
        type: 'prevention.something.else',
        data: '{}'
      };

      const event3: SSEEvent = {
        id: 'evt-3',
        type: 'lab.critical.result',
        data: '{}'
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        eventTypes: ['prevention.*']
      };

      expect(filter.shouldDeliver(event1, config)).toBe(true);
      expect(filter.shouldDeliver(event2, config)).toBe(true);
      expect(filter.shouldDeliver(event3, config)).toBe(false);
    });

    it('should filter by severity', () => {
      const lowEvent: SSEEvent = {
        id: 'evt-1',
        type: 'test.event',
        data: JSON.stringify({ severity: 'LOW' })
      };

      const mediumEvent: SSEEvent = {
        id: 'evt-2',
        type: 'test.event',
        data: JSON.stringify({ severity: 'MEDIUM' })
      };

      const criticalEvent: SSEEvent = {
        id: 'evt-3',
        type: 'test.event',
        data: JSON.stringify({ severity: 'CRITICAL' })
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        severityMin: 'HIGH'
      };

      expect(filter.shouldDeliver(lowEvent, config)).toBe(false);
      expect(filter.shouldDeliver(mediumEvent, config)).toBe(false);
      expect(filter.shouldDeliver(criticalEvent, config)).toBe(true);
    });

    it('should filter by facility', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'test.event',
        data: JSON.stringify({ facilityId: 'facility-1' })
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        facilityIds: ['facility-1', 'facility-2']
      };

      expect(filter.shouldDeliver(event, config)).toBe(true);
    });

    it('should reject event from unauthorized facility', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'test.event',
        data: JSON.stringify({ facilityId: 'facility-3' })
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        facilityIds: ['facility-1', 'facility-2']
      };

      expect(filter.shouldDeliver(event, config)).toBe(false);
    });

    it('should filter by patient', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'test.event',
        data: JSON.stringify({ patientId: 'patient-1' })
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        patientIds: ['patient-1', 'patient-2']
      };

      expect(filter.shouldDeliver(event, config)).toBe(true);
    });

    it('should apply multiple filters (AND logic)', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: JSON.stringify({
          severity: 'CRITICAL',
          facilityId: 'facility-1',
          patientId: 'patient-1'
        })
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        eventTypes: ['lab.*'],
        severityMin: 'HIGH',
        facilityIds: ['facility-1'],
        patientIds: ['patient-1']
      };

      expect(filter.shouldDeliver(event, config)).toBe(true);
    });

    it('should reject event failing any filter (AND logic)', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: JSON.stringify({
          severity: 'LOW', // Fails severity check
          facilityId: 'facility-1',
          patientId: 'patient-1'
        })
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        eventTypes: ['lab.*'],
        severityMin: 'HIGH',
        facilityIds: ['facility-1'],
        patientIds: ['patient-1']
      };

      expect(filter.shouldDeliver(event, config)).toBe(false);
    });

    it('should handle malformed event data gracefully', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'test.event',
        data: 'not-json' // Invalid JSON
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        severityMin: 'HIGH'
      };

      // Should not throw, defaults to MEDIUM severity
      expect(filter.shouldDeliver(event, config)).toBe(false);
    });

    it('should support "level" field as alternative to "severity"', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'test.event',
        data: JSON.stringify({ level: 'CRITICAL' }) // Using 'level' instead
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        severityMin: 'HIGH'
      };

      expect(filter.shouldDeliver(event, config)).toBe(true);
    });
  });

  describe('getPriority', () => {
    it('should classify lab.critical.result as CRITICAL (RUTH)', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: '{}'
      };

      expect(filter.getPriority(event)).toBe('CRITICAL');
    });

    it('should classify drug.interaction.detected as CRITICAL (RUTH)', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'drug.interaction.detected',
        data: '{}'
      };

      expect(filter.getPriority(event)).toBe('CRITICAL');
    });

    it('should classify supply.stockout.detected as CRITICAL (RUTH)', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'supply.stockout.detected',
        data: '{}'
      };

      expect(filter.getPriority(event)).toBe('CRITICAL');
    });

    it('should classify prevention.gap.detected as HIGH', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'prevention.gap.detected',
        data: '{}'
      };

      expect(filter.getPriority(event)).toBe('HIGH');
    });

    it('should classify record.ingested as HIGH', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'record.ingested',
        data: '{}'
      };

      expect(filter.getPriority(event)).toBe('HIGH');
    });

    it('should classify unknown events as NORMAL', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'unknown.event.type',
        data: '{}'
      };

      expect(filter.getPriority(event)).toBe('NORMAL');
    });
  });

  describe('wildcard matching edge cases', () => {
    it('should match * wildcard', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'anything.at.all',
        data: '{}'
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        eventTypes: ['*']
      };

      expect(filter.shouldDeliver(event, config)).toBe(true);
    });

    it('should match multi-level wildcards', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'a.b.c.d.e',
        data: '{}'
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        eventTypes: ['a.*']
      };

      expect(filter.shouldDeliver(event, config)).toBe(true);
    });

    it('should not match partial wildcards', () => {
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: '{}'
      };

      const config: EventFilterConfig = {
        tenantId: 'tenant-1',
        eventTypes: ['lab.critical'] // No wildcard, should match exactly
      };

      expect(filter.shouldDeliver(event, config)).toBe(false);
    });
  });
});
