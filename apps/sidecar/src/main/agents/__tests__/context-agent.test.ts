/**
 * Context Agent Tests
 *
 * Tests:
 * - gather fetches all 4 endpoints in parallel
 * - gather with scribeOutput generates reconciliation alerts
 * - timeout handling
 */

import { ContextAgent } from '../context-agent';

// Mock fetch globally
jest.mock('node-fetch');

const fetch = require('node-fetch');

describe('ContextAgent', () => {
  let agent: ContextAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ContextAgent('http://localhost:3001', 'test-session-123');
  });

  describe('gather() - parallel fetches', () => {
    it('fetches all 4 endpoints in parallel', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn(),
      });

      const mockDemographics = { age: 45, weight: 70, sex: 'M' };
      const mockMedications = [
        { name: 'Metformin', dose: '500mg', frequency: 'BID', route: 'oral' },
      ];
      const mockAllergies = ['Penicillin', 'Sulfa'];
      const mockLabs = [
        { testName: 'Glucose', value: 120, unit: 'mg/dL', collectedAt: '2024-03-17' },
      ];

      // Setup fetch responses
      let callCount = 0;
      fetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue(mockDemographics) },
          { ok: true, json: jest.fn().mockResolvedValue(mockMedications) },
          { ok: true, json: jest.fn().mockResolvedValue(mockAllergies) },
          { ok: true, json: jest.fn().mockResolvedValue(mockLabs) },
        ];
        return Promise.resolve(responses[callCount++]);
      });

      const result = await agent.gather({
        patientId: 'PAT-001',
        edgeNodeUrl: 'http://localhost:3001',
      });

      // Verify parallel calls (fetch called 4 times)
      expect(fetch).toHaveBeenCalledTimes(4);

      // Verify all endpoints were called
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/patients/PAT-001/demographics',
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/patients/PAT-001/medications',
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/patients/PAT-001/allergies',
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/patients/PAT-001/labs',
        expect.any(Object)
      );

      // Verify merged state
      expect(result.mergedState.patientId).toBe('PAT-001');
      expect(result.mergedState.demographics).toEqual(mockDemographics);
      expect(result.mergedState.currentMedications).toEqual(mockMedications);
      expect(result.mergedState.knownAllergies).toEqual(mockAllergies);
      expect(result.mergedState.recentLabValues).toEqual(mockLabs);

      // Verify source count (all 4 sources)
      expect(result.sourceCount).toBe(4);
    });
  });

  describe('gather() - reconciliation with scribeOutput', () => {
    it('generates reconciliation alerts for new medications', async () => {
      fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(null),
        })
      );

      // Mock medications endpoint to return something
      let callCount = 0;
      fetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue(null) }, // demographics
          {
            ok: true,
            json: jest.fn().mockResolvedValue([
              { name: 'Metformin', dose: '500mg' },
            ]),
          }, // medications
          { ok: true, json: jest.fn().mockResolvedValue(null) }, // allergies
          { ok: true, json: jest.fn().mockResolvedValue(null) }, // labs
        ];
        return Promise.resolve(responses[callCount++]);
      });

      const result = await agent.gather({
        patientId: 'PAT-001',
        scribeOutput: {
          medications: [
            { name: 'Insulin', dose: '10U' }, // New medication
          ],
        },
      });

      // Should generate a warning alert
      expect(result.reconciliationAlerts).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringContaining('Insulin'),
        })
      );
    });

    it('generates reconciliation alerts for new allergies', async () => {
      let callCount = 0;
      fetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue(null) }, // demographics
          { ok: true, json: jest.fn().mockResolvedValue(null) }, // medications
          {
            ok: true,
            json: jest.fn().mockResolvedValue(['Penicillin']),
          }, // allergies
          { ok: true, json: jest.fn().mockResolvedValue(null) }, // labs
        ];
        return Promise.resolve(responses[callCount++]);
      });

      const result = await agent.gather({
        patientId: 'PAT-001',
        scribeOutput: {
          allergies: ['Cephalosporin'], // New allergy
        },
      });

      expect(result.reconciliationAlerts).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringContaining('Cephalosporin'),
        })
      );
    });
  });

  describe('gather() - timeout handling', () => {
    it('handles timeout gracefully and returns partial data', async () => {
      let callCount = 0;
      fetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue({ age: 45 }) }, // demographics OK
          {
            ok: false,
          }, // medications timeout (mocked as failed response)
          { ok: true, json: jest.fn().mockResolvedValue([]) }, // allergies OK
          { ok: true, json: jest.fn().mockResolvedValue([]) }, // labs OK
        ];
        return Promise.resolve(responses[callCount++]);
      });

      const result = await agent.gather({
        patientId: 'PAT-001',
      });

      // Should still return a result with partial data
      expect(result.mergedState.patientId).toBe('PAT-001');
      expect(result.mergedState.demographics).toEqual({ age: 45 });
      // Medications failed, so should be null
      expect(result.mergedState.currentMedications).toBeNull();
    });
  });

  describe('gather() - extracted fields', () => {
    it('extracts medication names and allergy categories', async () => {
      let callCount = 0;
      fetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue(null) }, // demographics
          {
            ok: true,
            json: jest.fn().mockResolvedValue([
              { name: 'Aspirin', dose: '100mg' },
              { name: 'Lisinopril', dose: '10mg' },
            ]),
          }, // medications
          {
            ok: true,
            json: jest.fn().mockResolvedValue(['Sulfa', 'NSAIDs']),
          }, // allergies
          { ok: true, json: jest.fn().mockResolvedValue(null) }, // labs
        ];
        return Promise.resolve(responses[callCount++]);
      });

      const result = await agent.gather({
        patientId: 'PAT-001',
      });

      expect(result.extractedFields.medicationNames).toEqual([
        'Aspirin',
        'Lisinopril',
      ]);
      expect(result.extractedFields.allergyCategories).toEqual(['Sulfa', 'NSAIDs']);
    });
  });
});
