/**
 * Integration Tests: CDS Evaluation API
 *
 * Tests the /api/cds/evaluate endpoint including:
 * - Request validation
 * - Context enrichment
 * - Alert generation
 * - Response format
 * - Error handling
 */

import { describe, it, expect } from '@jest/globals';

describe('CDS Evaluation API', () => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  describe('POST /api/cds/evaluate', () => {
    it('should return 400 for missing patient ID', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hookType: 'patient-view',
          context: {},
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 400 for invalid hook type', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'invalid-hook',
          context: { patientId: 'test-patient-1' },
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('hook');
    });

    it('should successfully evaluate patient-view hook', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'patient-view',
          context: {
            patientId: 'test-patient-1',
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(data.data.alerts).toBeDefined();
      expect(Array.isArray(data.data.alerts)).toBe(true);
      expect(data.evaluatedAt).toBeDefined();
    });

    it('should return properly formatted CDS Hooks cards', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'medication-prescribe',
          context: {
            patientId: 'test-patient-1',
          },
        }),
      });

      const data = await response.json();

      if (data.data.alerts.length > 0) {
        const alert = data.data.alerts[0];

        // Verify alert structure
        expect(alert.id).toBeDefined();
        expect(alert.summary).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(['critical', 'warning', 'info']).toContain(alert.severity);
        expect(alert.category).toBeDefined();
        expect(alert.source).toBeDefined();
        expect(alert.source.label).toBeDefined();
      }
    });

    it('should include override reasons for critical alerts', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-with-interactions',
          hookType: 'medication-prescribe',
          context: {
            patientId: 'test-patient-with-interactions',
          },
        }),
      });

      const data = await response.json();

      const criticalAlert = data.data.alerts.find(
        (alert: any) => alert.severity === 'critical'
      );

      if (criticalAlert) {
        expect(criticalAlert.overrideReasons).toBeDefined();
        expect(Array.isArray(criticalAlert.overrideReasons)).toBe(true);
        expect(criticalAlert.overrideReasons.length).toBeGreaterThan(0);
      }
    });

    it('should filter alerts by hook type', async () => {
      const medicationResponse = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'medication-prescribe',
          context: { patientId: 'test-patient-1' },
        }),
      });

      const encounterResponse = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'encounter-start',
          context: { patientId: 'test-patient-1' },
        }),
      });

      const medicationData = await medicationResponse.json();
      const encounterData = await encounterResponse.json();

      // Medication hook should return medication-related alerts
      const medicationCategories = medicationData.data.alerts.map(
        (alert: any) => alert.category
      );
      const hasMedicationAlerts = medicationCategories.some((cat: string) =>
        ['drug-interaction', 'allergy', 'duplicate-therapy'].includes(cat)
      );

      // Encounter hook should return preventive care alerts
      const encounterCategories = encounterData.data.alerts.map(
        (alert: any) => alert.category
      );
      const hasPreventiveAlerts = encounterCategories.some((cat: string) =>
        cat === 'preventive-care'
      );

      expect(hasMedicationAlerts || medicationCategories.length === 0).toBe(true);
      expect(hasPreventiveAlerts || encounterCategories.length === 0).toBe(true);
    });

    it('should handle patients with no alerts gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'healthy-patient',
          hookType: 'patient-view',
          context: {
            patientId: 'healthy-patient',
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data.alerts).toBeDefined();
      expect(Array.isArray(data.data.alerts)).toBe(true);
    });

    it('should include performance metrics in response', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'patient-view',
          context: { patientId: 'test-patient-1' },
        }),
      });

      const data = await response.json();

      expect(data.evaluatedAt).toBeDefined();
      expect(data.data.rulesEvaluated).toBeDefined();
      expect(typeof data.data.rulesEvaluated).toBe('number');
    });
  });

  describe('GET /api/cds/evaluate', () => {
    it('should return list of available rules', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.currentRules).toBeDefined();
      expect(Array.isArray(data.currentRules)).toBe(true);

      if (data.currentRules.length > 0) {
        const rule = data.currentRules[0];

        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(rule.enabled).toBeDefined();
        expect(typeof rule.enabled).toBe('boolean');
        expect(rule.triggerHooks).toBeDefined();
        expect(Array.isArray(rule.triggerHooks)).toBe(true);
      }
    });

    it('should include evidence strength for rules', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'GET',
      });

      const data = await response.json();

      const guidelineRules = data.currentRules.filter(
        (rule: any) => rule.category === 'guideline-recommendation'
      );

      guidelineRules.forEach((rule: any) => {
        if (rule.evidenceStrength) {
          expect(['A', 'B', 'C', 'D', 'insufficient']).toContain(
            rule.evidenceStrength
          );
        }
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const requests = [];

      // Make 20 rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          fetch(`${baseUrl}/api/cds/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientId: 'test-patient-1',
              hookType: 'patient-view',
              context: { patientId: 'test-patient-1' },
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((res) => res.status === 429);

      // Some requests should be rate limited
      expect(rateLimited).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for server errors with safe error message', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'patient-that-causes-error',
          hookType: 'patient-view',
          context: { patientId: 'patient-that-causes-error' },
        }),
      });

      if (response.status === 500) {
        const data = await response.json();
        expect(data.error).toBeDefined();
        // Should not expose internal error details
        expect(data.error).not.toContain('stack');
        expect(data.error).not.toContain('database');
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Context Enrichment', () => {
    it('should enrich context with patient data from database', async () => {
      // This test verifies that the API fetches additional patient data
      const response = await fetch(`${baseUrl}/api/cds/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'patient-view',
          context: {
            patientId: 'test-patient-1',
            // Minimal context - API should enrich with medications, conditions, etc.
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // If the API is working correctly, it should have enriched the context
      // and evaluated rules that require additional data
      expect(data.data).toBeDefined();
      expect(data.data.rulesEvaluated).toBeGreaterThan(0);
    });
  });
});
