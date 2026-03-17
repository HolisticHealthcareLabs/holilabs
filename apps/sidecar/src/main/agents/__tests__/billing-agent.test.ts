/**
 * Billing Agent Tests
 *
 * Tests:
 * - FIN-001, FIN-002, FIN-003 rule firing
 * - TUSS format validation
 * - glosa amount estimation
 */

import { BillingAgent } from '../billing-agent';

jest.mock('node-fetch');

const fetch = require('node-fetch');

describe('BillingAgent', () => {
  let agent: BillingAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new BillingAgent('http://localhost:3001', 'test-session-123');
  });

  describe('FIN-002 (TUSS Hallucination)', () => {
    it('detects FIN-002 and returns RED', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          signal: [
            {
              ruleId: 'FIN-002',
              ruleName: 'TUSS Hallucination',
              color: 'RED',
              category: 'BILLING',
              message: 'Procedure code not supported by diagnosis',
              estimatedGlosaRisk: {
                probability: 0.9,
                estimatedAmount: 5000,
              },
            },
          ],
          totalGlosaRisk: {
            probability: 0.9,
            totalAmountAtRisk: 5000,
          },
        }),
      });

      const result = await agent.evaluate({
        patientId: 'PAT-001',
        medications: [{ name: 'Aspirin', dose: '100mg' }],
        edgeNodeUrl: 'http://localhost:3001',
      });

      expect(result.alerts).toContainEqual(
        expect.objectContaining({
          ruleId: 'FIN-002',
          color: 'RED',
        })
      );
      expect(result.glosaRisk.probability).toBe(0.9);
      expect(result.glosaRisk.estimatedAmount).toBe(5000);
    });
  });

  describe('FIN-001 (ICD-10 Mismatch)', () => {
    it('detects FIN-001 and returns AMBER', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          signal: [
            {
              ruleId: 'FIN-001',
              ruleName: 'ICD-10 Mismatch',
              color: 'YELLOW',
              category: 'BILLING',
              message: 'Diagnosis code may not fully support procedure',
            },
          ],
        }),
      });

      const result = await agent.evaluate({
        patientId: 'PAT-001',
        medications: [{ name: 'Metformin', dose: '500mg' }],
        diagnosis: {
          icd10Code: 'E11',
          description: 'Type 2 Diabetes',
        },
      });

      expect(result.alerts).toContainEqual(
        expect.objectContaining({
          ruleId: 'FIN-001',
          color: 'AMBER',
        })
      );
    });
  });

  describe('FIN-003 (Quantity Limit)', () => {
    it('detects FIN-003 and returns AMBER', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          signal: [
            {
              ruleId: 'FIN-003',
              ruleName: 'Quantity Limit Exceeded',
              color: 'YELLOW',
              category: 'BILLING',
              message: 'Prescription quantity exceeds coverage limit',
            },
          ],
        }),
      });

      const result = await agent.evaluate({
        patientId: 'PAT-001',
        medications: [
          {
            name: 'Lisinopril',
            dose: '10mg',
            frequency: 'OD',
            rxNormCode: '29046',
          },
        ],
      });

      expect(result.alerts).toContainEqual(
        expect.objectContaining({
          ruleId: 'FIN-003',
          color: 'AMBER',
        })
      );
    });
  });

  describe('TUSS format validation', () => {
    it('validates TUSS format in response', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          signal: [
            {
              ruleId: 'FIN-001',
              ruleName: 'FIN-001',
              color: 'GREEN',
              category: 'BILLING',
              message: 'OK',
            },
          ],
        }),
      });

      const result = await agent.evaluate({
        patientId: 'PAT-001',
        medications: [{ name: 'Aspirin', dose: '100mg' }],
      });

      expect(result.tussValidation).toEqual(
        expect.objectContaining({
          isValid: true,
          format: 'TUSS-1.01.01.01',
        })
      );
    });

    it('marks TUSS as invalid if FIN-002 fired', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          signal: [
            {
              ruleId: 'FIN-002',
              ruleName: 'TUSS Hallucination',
              color: 'RED',
              category: 'BILLING',
              message: 'Invalid TUSS code',
            },
          ],
        }),
      });

      const result = await agent.evaluate({
        patientId: 'PAT-001',
        medications: [{ name: 'Aspirin' }],
      });

      expect(result.tussValidation?.isValid).toBe(false);
    });
  });

  describe('glosa amount estimation', () => {
    it('sums glosa amounts from multiple alerts', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          signal: [
            {
              ruleId: 'FIN-001',
              ruleName: 'ICD Mismatch',
              color: 'YELLOW',
              category: 'BILLING',
              message: 'Diagnosis mismatch',
              estimatedGlosaRisk: {
                estimatedAmount: 1000,
              },
            },
            {
              ruleId: 'FIN-003',
              ruleName: 'Qty Limit',
              color: 'YELLOW',
              category: 'BILLING',
              message: 'Qty exceeded',
              estimatedGlosaRisk: {
                estimatedAmount: 2000,
              },
            },
          ],
          totalGlosaRisk: {
            probability: 0.6,
            totalAmountAtRisk: 3000,
          },
        }),
      });

      const result = await agent.evaluate({
        patientId: 'PAT-001',
        medications: [{ name: 'Aspirin' }],
      });

      expect(result.glosaRisk.estimatedAmount).toBe(3000);
      expect(result.glosaRisk.probability).toBe(0.6);
    });
  });

  describe('error handling', () => {
    it('returns default output on fetch failure', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await agent.evaluate({
        patientId: 'PAT-001',
        medications: [{ name: 'Aspirin' }],
      });

      expect(result.glosaRisk.probability).toBe(0);
      expect(result.alerts).toEqual([]);
      expect(result.rulesFired).toEqual([]);
      expect(result.tussValidation?.isValid).toBe(true);
    });

    it('returns default output on non-OK HTTP response', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await agent.evaluate({
        patientId: 'PAT-001',
        medications: [{ name: 'Aspirin' }],
      });

      expect(result.glosaRisk.probability).toBe(0);
      expect(result.alerts).toEqual([]);
    });
  });

  describe('POST call to /api/prescriptions/safety-check', () => {
    it('calls correct endpoint with correct payload', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ signal: [] }),
      });

      await agent.evaluate({
        patientId: 'PAT-123',
        medications: [
          { name: 'Metformin', dose: '500mg', frequency: 'BID' },
        ],
        diagnosis: {
          icd10Code: 'E11',
          description: 'Type 2 Diabetes',
        },
        procedureCode: 'PROC-001',
      });

      // Check the fetch was called with the right URL
      expect(fetch).toHaveBeenCalled();
      const call = (fetch as any).mock.calls[0];
      expect(call[0]).toBe('http://localhost:3001/api/prescriptions/safety-check');
      expect(call[1].method).toBe('POST');
      expect(call[1].headers['Content-Type']).toBe('application/json');

      // Parse the body to check contents
      const body = JSON.parse(call[1].body);
      expect(body.patientId).toBe('PAT-123');
      expect(body.medications[0].name).toBe('Metformin');
      expect(body.context.diagnosis.icd10Code).toBe('E11');
    });
  });
});
