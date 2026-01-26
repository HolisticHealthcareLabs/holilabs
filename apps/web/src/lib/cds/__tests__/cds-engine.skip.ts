/**
 * Unit Tests: Clinical Decision Support Engine
 *
 * Tests the CDS engine rule evaluation logic including:
 * - Drug interaction detection
 * - Clinical guideline recommendations
 * - Lab abnormality alerts
 * - Preventive care reminders
 * - WHO PEN protocol integration
 * - PAHO prevention guidelines
 *
 * TODO: Refactor test contexts to match updated CDSContext interface
 */

// @ts-nocheck
import { describe, it, expect } from '@jest/globals';
import { CDSEngine } from '../engines/cds-engine';
import type { CDSContext, CDSAlert } from '../types';

describe('CDS Engine', () => {
  let engine: CDSEngine;

  beforeEach(() => {
    engine = new CDSEngine();
  });

  describe('Drug Interaction Detection', () => {
    it('should detect critical warfarin + aspirin interaction', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-1',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-1',
          birthDate: '1960-01-01',
        },
        medications: [
          {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
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
          {
            resourceType: 'MedicationRequest',
            id: 'med-2',
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
        ],
      };

      const result = await engine.evaluate(context, 'medication-prescribe');

      expect(result.alerts).toBeDefined();
      expect(result.alerts.length).toBeGreaterThan(0);

      const interactionAlert = result.alerts.find((alert) =>
        alert.summary.toLowerCase().includes('interaction')
      );

      expect(interactionAlert).toBeDefined();
      expect(interactionAlert?.severity).toBe('critical');
      expect(interactionAlert?.category).toBe('drug-interaction');
    });

    it('should not alert for non-interacting medications', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-2',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-2',
          birthDate: '1970-01-01',
        },
        medications: [
          {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
            medicationCodeableConcept: {
              coding: [
                {
                  system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                  code: '197361',
                  display: 'Metformin',
                },
              ],
            },
          },
        ],
      };

      const result = await engine.evaluate(context, 'medication-prescribe');

      const interactionAlert = result.alerts.find(
        (alert) => alert.category === 'drug-interaction'
      );

      expect(interactionAlert).toBeUndefined();
    });
  });

  describe('Allergy Alerts', () => {
    it('should alert when prescribing medication patient is allergic to', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-3',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-3',
          birthDate: '1975-01-01',
        },
        allergies: [
          {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-1',
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
        ],
        medications: [
          {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
            medicationCodeableConcept: {
              coding: [
                {
                  system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                  code: '723',
                  display: 'Amoxicillin', // Beta-lactam antibiotic
                },
              ],
            },
          },
        ],
      };

      const result = await engine.evaluate(context, 'medication-prescribe');

      const allergyAlert = result.alerts.find(
        (alert) => alert.category === 'allergy'
      );

      expect(allergyAlert).toBeDefined();
      expect(allergyAlert?.severity).toBe('critical');
    });
  });

  describe('WHO PEN Hypertension Protocol', () => {
    it('should alert for uncontrolled hypertension (BP ≥140/90)', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-4',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-4',
          birthDate: '1965-01-01',
        },
        observations: [
          {
            resourceType: 'Observation',
            id: 'obs-1',
            status: 'final',
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '85354-9',
                  display: 'Blood Pressure',
                },
              ],
            },
            component: [
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8480-6',
                      display: 'Systolic BP',
                    },
                  ],
                },
                valueQuantity: {
                  value: 165,
                  unit: 'mmHg',
                },
              },
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8462-4',
                      display: 'Diastolic BP',
                    },
                  ],
                },
                valueQuantity: {
                  value: 95,
                  unit: 'mmHg',
                },
              },
            ],
          },
        ],
      };

      const result = await engine.evaluate(context, 'patient-view');

      const hypertensionAlert = result.alerts.find((alert) =>
        alert.summary.toLowerCase().includes('hypertension') ||
        alert.summary.toLowerCase().includes('blood pressure')
      );

      expect(hypertensionAlert).toBeDefined();
      expect(hypertensionAlert?.category).toBe('guideline-recommendation');
      expect(hypertensionAlert?.source.label).toContain('WHO PEN');
    });

    it('should not alert for normal blood pressure', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-5',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-5',
          birthDate: '1970-01-01',
        },
        observations: [
          {
            resourceType: 'Observation',
            id: 'obs-1',
            status: 'final',
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '85354-9',
                  display: 'Blood Pressure',
                },
              ],
            },
            component: [
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8480-6',
                      display: 'Systolic BP',
                    },
                  ],
                },
                valueQuantity: {
                  value: 120,
                  unit: 'mmHg',
                },
              },
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8462-4',
                      display: 'Diastolic BP',
                    },
                  ],
                },
                valueQuantity: {
                  value: 80,
                  unit: 'mmHg',
                },
              },
            ],
          },
        ],
      };

      const result = await engine.evaluate(context, 'patient-view');

      const hypertensionAlert = result.alerts.find((alert) =>
        alert.summary.toLowerCase().includes('hypertension')
      );

      expect(hypertensionAlert).toBeUndefined();
    });
  });

  describe('Diabetes Management (WHO PEN)', () => {
    it('should alert for poor glycemic control (HbA1c ≥7%)', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-6',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-6',
          birthDate: '1960-01-01',
        },
        conditions: [
          {
            resourceType: 'Condition',
            id: 'cond-1',
            code: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '44054006',
                  display: 'Type 2 Diabetes',
                },
              ],
            },
            clinicalStatus: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                  code: 'active',
                },
              ],
            },
          },
        ],
        labResults: [
          {
            resourceType: 'Observation',
            id: 'lab-1',
            status: 'final',
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '4548-4',
                  display: 'HbA1c',
                },
              ],
            },
            valueQuantity: {
              value: 9.2,
              unit: '%',
            },
          },
        ],
      };

      const result = await engine.evaluate(context, 'patient-view');

      const diabetesAlert = result.alerts.find(
        (alert) =>
          alert.summary.toLowerCase().includes('diabetes') ||
          alert.summary.toLowerCase().includes('hba1c')
      );

      expect(diabetesAlert).toBeDefined();
      expect(diabetesAlert?.severity).toBe('critical');
      expect(diabetesAlert?.category).toBe('lab-abnormal');
    });
  });

  describe('PAHO Prevention Guidelines', () => {
    it('should recommend influenza vaccine for eligible adults', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-7',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-7',
          birthDate: '1955-01-01', // 69 years old
        },
        immunizations: [], // No flu vaccine recorded
      };

      const result = await engine.evaluate(context, 'encounter-start');

      const vaccineAlert = result.alerts.find((alert) =>
        alert.summary.toLowerCase().includes('vaccine') ||
        alert.summary.toLowerCase().includes('immunization') ||
        alert.summary.toLowerCase().includes('influenza')
      );

      expect(vaccineAlert).toBeDefined();
      expect(vaccineAlert?.category).toBe('preventive-care');
      expect(vaccineAlert?.source.label).toContain('PAHO');
    });

    it('should recommend cervical cancer screening for eligible women', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-8',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-8',
          birthDate: '1990-01-01', // 34 years old
          gender: 'female',
        },
        procedures: [], // No screening history
      };

      const result = await engine.evaluate(context, 'encounter-start');

      const screeningAlert = result.alerts.find((alert) =>
        alert.summary.toLowerCase().includes('cervical') ||
        alert.summary.toLowerCase().includes('screening')
      );

      expect(screeningAlert).toBeDefined();
      expect(screeningAlert?.category).toBe('preventive-care');
    });
  });

  describe('Duplicate Therapy Detection', () => {
    it('should detect duplicate antihypertensive medications', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-9',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-9',
          birthDate: '1965-01-01',
        },
        medications: [
          {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
            medicationCodeableConcept: {
              coding: [
                {
                  system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                  code: '197361',
                  display: 'Amlodipine', // Calcium channel blocker
                },
              ],
            },
          },
          {
            resourceType: 'MedicationRequest',
            id: 'med-2',
            status: 'active',
            medicationCodeableConcept: {
              coding: [
                {
                  system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                  code: '203142',
                  display: 'Nifedipine', // Also calcium channel blocker
                },
              ],
            },
          },
        ],
      };

      const result = await engine.evaluate(context, 'medication-prescribe');

      const duplicateAlert = result.alerts.find(
        (alert) => alert.category === 'duplicate-therapy'
      );

      expect(duplicateAlert).toBeDefined();
      expect(duplicateAlert?.severity).toBe('warning');
    });
  });

  describe('Rule Filtering by Hook Type', () => {
    it('should only return medication-related alerts for medication-prescribe hook', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-10',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-10',
          birthDate: '1960-01-01',
        },
        medications: [
          {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
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
      };

      const result = await engine.evaluate(context, 'medication-prescribe');

      // All alerts should be medication-related
      result.alerts.forEach((alert) => {
        expect(['drug-interaction', 'allergy', 'duplicate-therapy', 'contraindication', 'dosing-guidance']).toContain(
          alert.category
        );
      });
    });

    it('should return preventive care alerts for encounter-start hook', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-11',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-11',
          birthDate: '1955-01-01',
        },
      };

      const result = await engine.evaluate(context, 'encounter-start');

      const preventiveAlert = result.alerts.find(
        (alert) => alert.category === 'preventive-care'
      );

      expect(preventiveAlert).toBeDefined();
    });
  });

  describe('Alert Priority and Severity', () => {
    it('should assign higher priority to critical alerts', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-12',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-12',
          birthDate: '1970-01-01',
        },
        allergies: [
          {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-1',
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
        ],
        medications: [
          {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
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
      };

      const result = await engine.evaluate(context, 'medication-prescribe');

      const criticalAlerts = result.alerts.filter(
        (alert) => alert.severity === 'critical'
      );

      criticalAlerts.forEach((alert) => {
        expect(alert.priority).toBeLessThanOrEqual(100); // Higher priority = lower number
      });
    });
  });

  describe('Evidence Strength Assignment', () => {
    it('should assign evidence strength to guideline recommendations', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-13',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-13',
          birthDate: '1960-01-01',
        },
        observations: [
          {
            resourceType: 'Observation',
            id: 'obs-1',
            status: 'final',
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '85354-9',
                  display: 'Blood Pressure',
                },
              ],
            },
            component: [
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8480-6',
                      display: 'Systolic BP',
                    },
                  ],
                },
                valueQuantity: {
                  value: 165,
                  unit: 'mmHg',
                },
              },
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8462-4',
                      display: 'Diastolic BP',
                    },
                  ],
                },
                valueQuantity: {
                  value: 95,
                  unit: 'mmHg',
                },
              },
            ],
          },
        ],
      };

      const result = await engine.evaluate(context, 'patient-view');

      const guidelineAlert = result.alerts.find(
        (alert) => alert.category === 'guideline-recommendation'
      );

      expect(guidelineAlert?.evidenceStrength).toBeDefined();
      expect(['A', 'B', 'C', 'D', 'insufficient']).toContain(
        guidelineAlert?.evidenceStrength
      );
    });
  });

  describe('Rule Enable/Disable', () => {
    it('should not evaluate disabled rules', async () => {
      const context: CDSContext = {
        patientId: 'test-patient-14',
        patient: {
          resourceType: 'Patient',
          id: 'test-patient-14',
          birthDate: '1960-01-01',
        },
        medications: [
          {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
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
          {
            resourceType: 'MedicationRequest',
            id: 'med-2',
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
        ],
      };

      // Disable drug interaction rule
      const ruleId = 'drug-interaction-check';
      engine.disableRule(ruleId);

      const result = await engine.evaluate(context, 'medication-prescribe');

      const interactionAlert = result.alerts.find(
        (alert) => alert.ruleId === ruleId
      );

      expect(interactionAlert).toBeUndefined();
    });
  });
});
