/**
 * Context Agent Tests
 *
 * Tests:
 * - gather fetches all 4 endpoints in parallel
 * - gather with scribeOutput generates reconciliation alerts
 * - timeout handling
 */

import { ContextAgent } from '../context-agent';

const mockFetch = jest.fn();

beforeAll(() => {
  globalThis.fetch = mockFetch as any;
});

describe('ContextAgent', () => {
  let agent: ContextAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ContextAgent('http://localhost:3001', 'test-session-123');
  });

  describe('gather() - parallel fetches', () => {
    it('fetches all 4 endpoints in parallel', async () => {
      const mockDemographics = { age: 45, weight: 70, sex: 'M' };
      const mockMedications = [
        { name: 'Metformin', dose: '500mg', frequency: 'BID', route: 'oral' },
      ];
      const mockAllergies = ['Penicillin', 'Sulfa'];
      const mockLabs = [
        { testName: 'Glucose', value: 120, unit: 'mg/dL', collectedAt: '2024-03-17' },
      ];

      let callCount = 0;
      mockFetch.mockImplementation(() => {
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

      expect(mockFetch).toHaveBeenCalledTimes(4);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/patients/PAT-001/demographics',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/patients/PAT-001/medications',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/patients/PAT-001/allergies',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/patients/PAT-001/labs',
        expect.any(Object)
      );

      expect(result.mergedState.patientId).toBe('PAT-001');
      expect(result.mergedState.demographics).toEqual(mockDemographics);
      expect(result.mergedState.currentMedications).toEqual(mockMedications);
      expect(result.mergedState.knownAllergies).toEqual(mockAllergies);
      expect(result.mergedState.recentLabValues).toEqual(mockLabs);
      expect(result.sourceCount).toBe(4);
    });
  });

  describe('gather() - reconciliation with scribeOutput', () => {
    it('generates reconciliation alerts for new medications', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue(null) },
          {
            ok: true,
            json: jest.fn().mockResolvedValue([
              { name: 'Metformin', dose: '500mg' },
            ]),
          },
          { ok: true, json: jest.fn().mockResolvedValue(null) },
          { ok: true, json: jest.fn().mockResolvedValue(null) },
        ];
        return Promise.resolve(responses[callCount++]);
      });

      const result = await agent.gather({
        patientId: 'PAT-001',
        scribeOutput: {
          medications: [
            { name: 'Insulin', dose: '10U' },
          ],
        },
      });

      expect(result.reconciliationAlerts).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringContaining('Insulin'),
        })
      );
    });

    it('generates reconciliation alerts for new allergies', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue(null) },
          { ok: true, json: jest.fn().mockResolvedValue(null) },
          {
            ok: true,
            json: jest.fn().mockResolvedValue(['Penicillin']),
          },
          { ok: true, json: jest.fn().mockResolvedValue(null) },
        ];
        return Promise.resolve(responses[callCount++]);
      });

      const result = await agent.gather({
        patientId: 'PAT-001',
        scribeOutput: {
          allergies: ['Cephalosporin'],
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
      mockFetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue({ age: 45 }) },
          { ok: false },
          { ok: true, json: jest.fn().mockResolvedValue([]) },
          { ok: true, json: jest.fn().mockResolvedValue([]) },
        ];
        return Promise.resolve(responses[callCount++]);
      });

      const result = await agent.gather({
        patientId: 'PAT-001',
      });

      expect(result.mergedState.patientId).toBe('PAT-001');
      expect(result.mergedState.demographics).toEqual({ age: 45 });
      expect(result.mergedState.currentMedications).toBeNull();
    });
  });

  describe('gather() - extracted fields', () => {
    it('extracts medication names and allergy categories', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        const responses = [
          { ok: true, json: jest.fn().mockResolvedValue(null) },
          {
            ok: true,
            json: jest.fn().mockResolvedValue([
              { name: 'Aspirin', dose: '100mg' },
              { name: 'Lisinopril', dose: '10mg' },
            ]),
          },
          {
            ok: true,
            json: jest.fn().mockResolvedValue(['Sulfa', 'NSAIDs']),
          },
          { ok: true, json: jest.fn().mockResolvedValue(null) },
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
