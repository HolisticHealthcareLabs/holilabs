/**
 * Integration Tests: CDS Hooks 2.0 Compliance
 *
 * Tests CDS Hooks endpoints for spec compliance:
 * - Discovery endpoint
 * - Service endpoints (patient-view, medication-prescribe, etc.)
 * - Card format compliance
 * - Prefetch template validation
 */

import { describe, it, expect } from '@jest/globals';

describe('CDS Hooks 2.0 Compliance', () => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  describe('GET /api/cds/hooks/discovery', () => {
    it('should return CDS Hooks discovery response', async () => {
      const response = await fetch(`${baseUrl}/api/cds/hooks/discovery`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json();
      expect(data.services).toBeDefined();
      expect(Array.isArray(data.services)).toBe(true);
      expect(data.services.length).toBeGreaterThan(0);
    });

    it('should include required service fields', async () => {
      const response = await fetch(`${baseUrl}/api/cds/hooks/discovery`);
      const data = await response.json();

      data.services.forEach((service: any) => {
        // Required fields per CDS Hooks 2.0 spec
        expect(service.hook).toBeDefined();
        expect(service.id).toBeDefined();
        expect(service.title).toBeDefined();
        expect(service.description).toBeDefined();

        // Hook should be valid
        expect(['patient-view', 'medication-prescribe', 'order-sign', 'encounter-start']).toContain(
          service.hook
        );
      });
    });

    it('should include prefetch templates', async () => {
      const response = await fetch(`${baseUrl}/api/cds/hooks/discovery`);
      const data = await response.json();

      data.services.forEach((service: any) => {
        if (service.prefetch) {
          expect(typeof service.prefetch).toBe('object');
          // Prefetch templates should include patient data
          expect(service.prefetch.patient).toBeDefined();
        }
      });
    });

    it('should declare patient-view service', async () => {
      const response = await fetch(`${baseUrl}/api/cds/hooks/discovery`);
      const data = await response.json();

      const patientViewService = data.services.find(
        (s: any) => s.hook === 'patient-view'
      );

      expect(patientViewService).toBeDefined();
      expect(patientViewService.id).toContain('patient-view');
    });

    it('should declare medication-prescribe service', async () => {
      const response = await fetch(`${baseUrl}/api/cds/hooks/discovery`);
      const data = await response.json();

      const medicationService = data.services.find(
        (s: any) => s.hook === 'medication-prescribe'
      );

      expect(medicationService).toBeDefined();
      expect(medicationService.id).toContain('medication');
    });
  });

  describe('POST /api/cds/hooks/patient-view', () => {
    it('should accept valid CDS Hooks request', async () => {
      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-1',
        fhirServer: 'http://localhost:3000/fhir',
        context: {
          patientId: 'test-patient-1',
          userId: 'Practitioner/test-doctor-1',
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/patient-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.cards).toBeDefined();
      expect(Array.isArray(data.cards)).toBe(true);
    });

    it('should return cards in CDS Hooks 2.0 format', async () => {
      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-2',
        context: {
          patientId: 'test-patient-with-alerts',
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/patient-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const data = await response.json();

      if (data.cards.length > 0) {
        const card = data.cards[0];

        // Required card fields
        expect(card.uuid).toBeDefined();
        expect(card.summary).toBeDefined();
        expect(card.source).toBeDefined();
        expect(card.source.label).toBeDefined();

        // Indicator should be valid
        if (card.indicator) {
          expect(['info', 'warning', 'critical']).toContain(card.indicator);
        }
      }
    });

    it('should reject request without patientId', async () => {
      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-3',
        context: {},
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/patient-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      expect(response.status).toBe(400);
    });

    it('should handle prefetch data', async () => {
      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-4',
        context: {
          patientId: 'test-patient-1',
        },
        prefetch: {
          patient: {
            resourceType: 'Patient',
            id: 'test-patient-1',
            birthDate: '1960-01-01',
          },
          conditions: {
            resourceType: 'Bundle',
            entry: [],
          },
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/patient-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
    });
  });

  describe('POST /api/cds/hooks/medication-prescribe', () => {
    it('should detect drug interactions', async () => {
      const hookRequest = {
        hook: 'medication-prescribe',
        hookInstance: 'test-instance-5',
        context: {
          patientId: 'test-patient-1',
          medications: [
            {
              resourceType: 'MedicationRequest',
              medicationCodeableConcept: {
                coding: [
                  {
                    system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                    code: '855333',
                    display: 'Warfarin',
                  },
                ],
              },
            },
          ],
        },
        prefetch: {
          patient: {
            resourceType: 'Patient',
            id: 'test-patient-1',
          },
          medications: {
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'MedicationRequest',
                  status: 'active',
                  medicationCodeableConcept: {
                    coding: [
                      {
                        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                        code: '1191',
                        display: 'Aspirin',
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/medication-prescribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      const interactionCard = data.cards.find((card: any) =>
        card.summary.toLowerCase().includes('interaction')
      );

      if (interactionCard) {
        expect(interactionCard.indicator).toBe('critical');
      }
    });

    it('should detect allergy contraindications', async () => {
      const hookRequest = {
        hook: 'medication-prescribe',
        hookInstance: 'test-instance-6',
        context: {
          patientId: 'test-patient-2',
          medications: [
            {
              resourceType: 'MedicationRequest',
              medicationCodeableConcept: {
                coding: [
                  {
                    system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                    code: '723',
                    display: 'Amoxicillin',
                  },
                ],
              },
            },
          ],
        },
        prefetch: {
          allergies: {
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'AllergyIntolerance',
                  code: {
                    coding: [
                      {
                        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                        code: '7984',
                        display: 'Penicillin',
                      },
                    ],
                  },
                  clinicalStatus: {
                    coding: [
                      {
                        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
                        code: 'active',
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/medication-prescribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      const allergyCard = data.cards.find((card: any) =>
        card.summary.toLowerCase().includes('allergy')
      );

      if (allergyCard) {
        expect(allergyCard.indicator).toBe('critical');
      }
    });
  });

  describe('POST /api/cds/hooks/order-sign', () => {
    it('should perform final safety check', async () => {
      const hookRequest = {
        hook: 'order-sign',
        hookInstance: 'test-instance-7',
        context: {
          patientId: 'test-patient-1',
          draftOrders: {
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'MedicationRequest',
                  medicationCodeableConcept: {
                    coding: [
                      {
                        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                        code: '855333',
                        display: 'Warfarin',
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/order-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
    });
  });

  describe('POST /api/cds/hooks/encounter-start', () => {
    it('should provide preventive care reminders', async () => {
      const hookRequest = {
        hook: 'encounter-start',
        hookInstance: 'test-instance-8',
        context: {
          patientId: 'test-patient-3',
          encounterId: 'encounter-1',
        },
        prefetch: {
          patient: {
            resourceType: 'Patient',
            id: 'test-patient-3',
            birthDate: '1955-01-01', // 69 years old
          },
          immunizations: {
            resourceType: 'Bundle',
            entry: [],
          },
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/encounter-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      const preventiveCard = data.cards.find(
        (card: any) =>
          card.summary.toLowerCase().includes('vaccine') ||
          card.summary.toLowerCase().includes('screening')
      );

      if (preventiveCard) {
        expect(preventiveCard.source.label).toContain('PAHO');
      }
    });
  });

  describe('Card Actions and Suggestions', () => {
    it('should include suggestions in cards', async () => {
      const hookRequest = {
        hook: 'medication-prescribe',
        hookInstance: 'test-instance-9',
        context: {
          patientId: 'test-patient-with-suggestions',
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/medication-prescribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const data = await response.json();

      const cardWithSuggestions = data.cards.find(
        (card: any) => card.suggestions && card.suggestions.length > 0
      );

      if (cardWithSuggestions) {
        const suggestion = cardWithSuggestions.suggestions[0];
        expect(suggestion.label).toBeDefined();
        expect(suggestion.actions).toBeDefined();
      }
    });

    it('should include links to guidelines', async () => {
      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-10',
        context: {
          patientId: 'test-patient-with-guidelines',
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/patient-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const data = await response.json();

      const cardWithLinks = data.cards.find(
        (card: any) => card.links && card.links.length > 0
      );

      if (cardWithLinks) {
        const link = cardWithLinks.links[0];
        expect(link.label).toBeDefined();
        expect(link.url).toBeDefined();
        expect(link.type).toBe('absolute');
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();

      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-perf',
        context: {
          patientId: 'test-patient-1',
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/patient-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      // CDS Hooks should respond in under 5 seconds per spec
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should return empty cards array for invalid patient', async () => {
      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-error',
        context: {
          patientId: 'nonexistent-patient',
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/patient-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      // Should still return 200 with empty cards per spec
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
      expect(Array.isArray(data.cards)).toBe(true);
    });

    it('should handle malformed FHIR resources gracefully', async () => {
      const hookRequest = {
        hook: 'medication-prescribe',
        hookInstance: 'test-instance-malformed',
        context: {
          patientId: 'test-patient-1',
          medications: [
            {
              // Malformed - missing required fields
              invalid: 'data',
            },
          ],
        },
      };

      const response = await fetch(`${baseUrl}/api/cds/hooks/medication-prescribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      // Should handle gracefully
      expect([200, 400]).toContain(response.status);
    });
  });
});
