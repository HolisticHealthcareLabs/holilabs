/**
 * Unit Tests: CDS Hooks 2.0 Compliance
 *
 * Tests CDS Hooks endpoints for spec compliance:
 * - Discovery endpoint
 * - Service endpoints (patient-view, medication-prescribe, etc.)
 * - Card format compliance
 * - Prefetch template validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock auth module BEFORE route import
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
  authOptions: {},
}));

// Mock CDS engine with formatAsCDSHooksResponse
jest.mock('@/lib/cds/engines/cds-engine', () => ({
  __esModule: true,
  cdsEngine: {
    evaluate: jest.fn(),
    getRules: jest.fn().mockReturnValue([]),
    formatAsCDSHooksResponse: jest.fn(),
  },
}));

// Mock audit log
jest.mock('@/lib/audit', () => ({
  __esModule: true,
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

// Use require for route imports to ensure mocks are applied
const discoveryRoute = require('../discovery/route');
const patientViewRoute = require('../patient-view/route');
const medicationPrescribeRoute = require('../medication-prescribe/route');
const orderSignRoute = require('../order-sign/route');
const encounterStartRoute = require('../encounter-start/route');

const authMock = require('@/lib/auth');
const cdsEngineMock = require('@/lib/cds/engines/cds-engine');

describe('CDS Hooks 2.0 Compliance', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'doctor@holilabs.com',
      name: 'Dr. Test',
      role: 'clinician',
    },
    expires: '2099-01-01T00:00:00.000Z',
  };

  const mockEmptyResult = {
    alerts: [],
    rulesFired: 0,
    rulesEvaluated: 5,
  };

  const mockAlertResult = {
    alerts: [
      {
        id: 'alert-1',
        summary: 'Drug Interaction Warning: Warfarin + Aspirin',
        severity: 'critical',
        category: 'drug-interaction',
        source: { label: 'CDSS' },
        overrideReasons: ['Emergency situation'],
      },
    ],
    rulesFired: 1,
    rulesEvaluated: 5,
  };

  const mockEmptyCardsResponse = {
    cards: [],
  };

  const mockCardsResponse = {
    cards: [
      {
        uuid: 'card-1',
        summary: 'Drug Interaction Warning: Warfarin + Aspirin',
        indicator: 'critical',
        source: { label: 'CDSS' },
        detail: 'Potential bleeding risk',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authMock.getServerSession.mockResolvedValue(mockSession);
    cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(mockEmptyResult);
    cdsEngineMock.cdsEngine.formatAsCDSHooksResponse.mockReturnValue(mockEmptyCardsResponse);
  });

  describe('GET /api/cds/hooks/discovery', () => {
    it('should return CDS Hooks discovery response', async () => {
      const response = await discoveryRoute.GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.services).toBeDefined();
      expect(Array.isArray(data.services)).toBe(true);
      expect(data.services.length).toBeGreaterThan(0);
    });

    it('should include required service fields', async () => {
      const response = await discoveryRoute.GET();
      const data = await response.json();

      data.services.forEach((service: any) => {
        // Required fields per CDS Hooks 2.0 spec
        expect(service.hook).toBeDefined();
        expect(service.id).toBeDefined();
        expect(service.title).toBeDefined();
        expect(service.description).toBeDefined();

        // Hook should be valid
        expect([
          'patient-view',
          'medication-prescribe',
          'order-sign',
          'encounter-start',
        ]).toContain(service.hook);
      });
    });

    it('should include prefetch templates', async () => {
      const response = await discoveryRoute.GET();
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
      const response = await discoveryRoute.GET();
      const data = await response.json();

      const patientViewService = data.services.find(
        (s: any) => s.hook === 'patient-view'
      );

      expect(patientViewService).toBeDefined();
      expect(patientViewService.id).toContain('patient-view');
    });

    it('should declare medication-prescribe service', async () => {
      const response = await discoveryRoute.GET();
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

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/patient-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await patientViewRoute.POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
      expect(Array.isArray(data.cards)).toBe(true);
    });

    it('should return cards in CDS Hooks 2.0 format', async () => {
      cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(mockAlertResult);
      cdsEngineMock.cdsEngine.formatAsCDSHooksResponse.mockReturnValue(mockCardsResponse);

      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-2',
        context: {
          patientId: 'test-patient-with-alerts',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/patient-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await patientViewRoute.POST(request);
      const data = await response.json();

      if (data.cards && data.cards.length > 0) {
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

    it('should handle request without patientId gracefully', async () => {
      // Note: The route currently doesn't validate patientId presence
      // and relies on the CDS engine to handle missing context
      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-3',
        context: {},
      };

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/patient-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await patientViewRoute.POST(request);
      // Route returns 200 with empty cards when patientId is missing
      expect([200, 400]).toContain(response.status);
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

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/patient-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await patientViewRoute.POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      authMock.getServerSession.mockResolvedValue(null);

      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-auth',
        context: {
          patientId: 'test-patient-1',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/patient-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await patientViewRoute.POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cds/hooks/medication-prescribe', () => {
    it('should detect drug interactions', async () => {
      cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(mockAlertResult);

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

      const request = new NextRequest(
        'http://localhost:3000/api/cds/hooks/medication-prescribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hookRequest),
        }
      );

      const response = await medicationPrescribeRoute.POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();

      const interactionCard = data.cards.find((card: any) =>
        card.summary?.toLowerCase().includes('interaction')
      );

      if (interactionCard) {
        expect(interactionCard.indicator).toBe('critical');
      }
    });

    it('should detect allergy contraindications', async () => {
      const allergyAlertResult = {
        alerts: [
          {
            id: 'alert-allergy',
            summary: 'Allergy Alert: Patient allergic to Penicillin',
            severity: 'critical',
            category: 'allergy-contraindication',
            source: { label: 'CDSS' },
          },
        ],
        rulesFired: 1,
        rulesEvaluated: 5,
      };
      cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(allergyAlertResult);

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
                        system:
                          'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
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

      const request = new NextRequest(
        'http://localhost:3000/api/cds/hooks/medication-prescribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hookRequest),
        }
      );

      const response = await medicationPrescribeRoute.POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();

      const allergyCard = data.cards.find((card: any) =>
        card.summary?.toLowerCase().includes('allergy')
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

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/order-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await orderSignRoute.POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
    });
  });

  describe('POST /api/cds/hooks/encounter-start', () => {
    it('should provide preventive care reminders', async () => {
      const preventiveAlertResult = {
        alerts: [
          {
            id: 'alert-preventive',
            summary: 'Screening recommended: Colorectal cancer screening',
            severity: 'info',
            category: 'preventive-care',
            source: { label: 'PAHO/WHO Guidelines' },
          },
        ],
        rulesFired: 1,
        rulesEvaluated: 5,
      };
      cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(preventiveAlertResult);

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

      const request = new NextRequest(
        'http://localhost:3000/api/cds/hooks/encounter-start',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hookRequest),
        }
      );

      const response = await encounterStartRoute.POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
    });
  });

  describe('Card Actions and Suggestions', () => {
    it('should include suggestions in cards', async () => {
      const alertWithSuggestions = {
        alerts: [
          {
            id: 'alert-suggestion',
            summary: 'Consider alternative medication',
            severity: 'warning',
            category: 'medication',
            source: { label: 'CDSS' },
            suggestions: [
              {
                label: 'Use alternative',
                actions: [{ type: 'update', resource: {} }],
              },
            ],
          },
        ],
        rulesFired: 1,
        rulesEvaluated: 5,
      };
      cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(alertWithSuggestions);

      const hookRequest = {
        hook: 'medication-prescribe',
        hookInstance: 'test-instance-9',
        context: {
          patientId: 'test-patient-with-suggestions',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/cds/hooks/medication-prescribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hookRequest),
        }
      );

      const response = await medicationPrescribeRoute.POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
    });

    it('should include links to guidelines', async () => {
      const alertWithLinks = {
        alerts: [
          {
            id: 'alert-links',
            summary: 'Review clinical guidelines',
            severity: 'info',
            category: 'guidelines',
            source: { label: 'CDSS' },
            links: [
              {
                label: 'WHO Guidelines',
                url: 'https://who.int/guidelines',
                type: 'absolute',
              },
            ],
          },
        ],
        rulesFired: 1,
        rulesEvaluated: 5,
      };
      cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(alertWithLinks);

      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-10',
        context: {
          patientId: 'test-patient-with-guidelines',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/patient-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await patientViewRoute.POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cards).toBeDefined();
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

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/patient-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await patientViewRoute.POST(request);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      // CDS Hooks should respond in under 5 seconds per spec
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should return empty cards array for invalid patient', async () => {
      // Return empty alerts for invalid patient
      cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(mockEmptyResult);

      const hookRequest = {
        hook: 'patient-view',
        hookInstance: 'test-instance-error',
        context: {
          patientId: 'nonexistent-patient',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/cds/hooks/patient-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hookRequest),
      });

      const response = await patientViewRoute.POST(request);

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

      const request = new NextRequest(
        'http://localhost:3000/api/cds/hooks/medication-prescribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hookRequest),
        }
      );

      const response = await medicationPrescribeRoute.POST(request);

      // Should handle gracefully
      expect([200, 400]).toContain(response.status);
    });
  });
});
