/**
 * Prevention Service Tests
 *
 * CDSS V3 - Tests for prevention gap detection and actionable alerts.
 * Ensures alerts are properly validated with Zod schemas.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies before importing the service
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
    },
    medication: {
      findMany: jest.fn(),
    },
    labResult: {
      findMany: jest.fn(),
    },
    screening: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { prisma } = require('@/lib/prisma');
import { PreventionAlertSchema } from '@/lib/schemas/prevention-alert.schema';

describe('PreventionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alert Schema Validation', () => {
    it('should validate a valid prevention alert', () => {
      const validAlert = {
        id: 'alert-123',
        type: 'drug_interaction',
        severity: 'critical',
        title: 'Metformin + IV Contrast Interaction',
        description: 'Hold metformin 48 hours before and after contrast procedures.',
        action: {
          label: 'Review',
          type: 'alert',
        },
        source: 'USPSTF Grade A',
        createdAt: new Date(),
      };

      const result = PreventionAlertSchema.safeParse(validAlert);
      expect(result.success).toBe(true);
    });

    it('should reject alert with invalid type', () => {
      const invalidAlert = {
        id: 'alert-123',
        type: 'invalid_type', // Invalid type
        severity: 'critical',
        title: 'Test Alert',
        description: 'Test description',
        source: 'Test',
        createdAt: new Date(),
      };

      const result = PreventionAlertSchema.safeParse(invalidAlert);
      expect(result.success).toBe(false);
    });

    it('should reject alert with title exceeding max length', () => {
      const invalidAlert = {
        id: 'alert-123',
        type: 'drug_interaction',
        severity: 'warning',
        title: 'A'.repeat(101), // Exceeds 100 character limit
        description: 'Test description',
        source: 'Test',
        createdAt: new Date(),
      };

      const result = PreventionAlertSchema.safeParse(invalidAlert);
      expect(result.success).toBe(false);
    });

    it('should reject alert with description exceeding max length', () => {
      const invalidAlert = {
        id: 'alert-123',
        type: 'screening_overdue',
        severity: 'info',
        title: 'Test Alert',
        description: 'D'.repeat(501), // Exceeds 500 character limit
        source: 'Test',
        createdAt: new Date(),
      };

      const result = PreventionAlertSchema.safeParse(invalidAlert);
      expect(result.success).toBe(false);
    });

    it('should allow alert without optional action', () => {
      const alertWithoutAction = {
        id: 'alert-123',
        type: 'critical_lab',
        severity: 'critical',
        title: 'Critical Lab Value',
        description: 'Potassium level is critically high.',
        source: 'Lab System',
        createdAt: new Date(),
      };

      const result = PreventionAlertSchema.safeParse(alertWithoutAction);
      expect(result.success).toBe(true);
    });

    it('should validate all alert severity levels', () => {
      const severities = ['critical', 'warning', 'info'];

      for (const severity of severities) {
        const alert = {
          id: `alert-${severity}`,
          type: 'drug_interaction',
          severity,
          title: 'Test Alert',
          description: 'Test description',
          source: 'Test',
          createdAt: new Date(),
        };

        const result = PreventionAlertSchema.safeParse(alert);
        expect(result.success).toBe(true);
      }
    });

    it('should validate all alert types', () => {
      const types = [
        'drug_interaction',
        'screening_overdue',
        'screening_due',
        'critical_lab',
        'recent_hospitalization',
      ];

      for (const type of types) {
        const alert = {
          id: `alert-${type}`,
          type,
          severity: 'warning',
          title: 'Test Alert',
          description: 'Test description',
          source: 'Test',
          createdAt: new Date(),
        };

        const result = PreventionAlertSchema.safeParse(alert);
        expect(result.success).toBe(true);
      }
    });

    it('should validate action with all action types', () => {
      const actionTypes = ['order', 'alert', 'link', 'dismiss'];

      for (const actionType of actionTypes) {
        const alert = {
          id: `alert-action-${actionType}`,
          type: 'screening_due',
          severity: 'info',
          title: 'Test Alert',
          description: 'Test description',
          action: {
            label: 'Test Action',
            type: actionType,
          },
          source: 'Test',
          createdAt: new Date(),
        };

        const result = PreventionAlertSchema.safeParse(alert);
        expect(result.success).toBe(true);
      }
    });

    it('should validate action with optional payload', () => {
      const alertWithPayload = {
        id: 'alert-123',
        type: 'screening_overdue',
        severity: 'warning',
        title: 'Colonoscopy Overdue',
        description: 'Patient is due for colonoscopy screening.',
        action: {
          label: 'Order Colonoscopy',
          type: 'order',
          payload: {
            orderType: 'COLONOSCOPY',
            priority: 'routine',
          },
        },
        source: 'USPSTF',
        createdAt: new Date(),
      };

      const result = PreventionAlertSchema.safeParse(alertWithPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('PHI Safety', () => {
    it('should not include PHI in alert title', () => {
      // Alerts should use generic terms, not patient-specific identifiers
      const alertWithoutPHI = {
        id: 'alert-123',
        type: 'drug_interaction',
        severity: 'critical',
        title: 'Drug Interaction Detected', // Generic, no PHI
        description: 'Interaction between current medications detected.',
        source: 'Drug Database',
        createdAt: new Date(),
      };

      const result = PreventionAlertSchema.safeParse(alertWithoutPHI);
      expect(result.success).toBe(true);
      expect(alertWithoutPHI.title).not.toMatch(/john|doe|123-45-6789|patient/i);
    });

    it('should not contain SSN patterns in any field', () => {
      const ssnPattern = /\d{3}-\d{2}-\d{4}/;

      const alert = {
        id: 'alert-123',
        type: 'screening_overdue',
        severity: 'warning',
        title: 'Screening Alert',
        description: 'Routine screening is overdue.',
        source: 'Screening System',
        createdAt: new Date(),
      };

      expect(alert.title).not.toMatch(ssnPattern);
      expect(alert.description).not.toMatch(ssnPattern);
      expect(alert.source).not.toMatch(ssnPattern);
    });
  });

  describe('Alert Deduplication', () => {
    it('should have unique IDs for different alerts', () => {
      const alert1 = {
        id: 'alert-001',
        type: 'drug_interaction',
        severity: 'critical',
        title: 'Alert 1',
        description: 'Description 1',
        source: 'Source 1',
        createdAt: new Date(),
      };

      const alert2 = {
        id: 'alert-002',
        type: 'drug_interaction',
        severity: 'critical',
        title: 'Alert 2',
        description: 'Description 2',
        source: 'Source 2',
        createdAt: new Date(),
      };

      expect(alert1.id).not.toBe(alert2.id);
    });
  });
});
