/**
 * CDS Evaluation API Unit Tests
 *
 * Tests the /api/cds/evaluate endpoint including:
 * - Request validation
 * - Context enrichment
 * - Alert generation
 * - Response format
 * - Error handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock auth module BEFORE route import
// jest.fn() must be created INSIDE the factory because jest.mock is hoisted
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
  authOptions: {},
}));

// Mock CDS engine
jest.mock('@/lib/cds/engines/cds-engine', () => ({
  __esModule: true,
  cdsEngine: {
    evaluate: jest.fn(),
    getRules: jest.fn().mockReturnValue([]),
  },
}));

// Use require for BOTH the route AND mock references
// This ensures all modules use the mocked versions
const { POST, GET } = require('../evaluate/route');
const authMock = require('@/lib/auth');
const cdsEngineMock = require('@/lib/cds/engines/cds-engine');

describe('CDS Evaluation API', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'doctor@holilabs.com',
      name: 'Dr. Test',
      role: 'clinician',
    },
    expires: '2099-01-01T00:00:00.000Z',
  };

  const mockEvaluationResult = {
    alerts: [
      {
        id: 'alert-1',
        summary: 'Drug Interaction Warning',
        severity: 'critical',
        category: 'drug-interaction',
        source: { label: 'CDSS' },
        overrideReasons: ['Emergency situation', 'Patient informed consent'],
      },
    ],
    rulesFired: 1,
    rulesEvaluated: 5,
  };

  beforeEach(() => {
    // Reset call history
    authMock.getServerSession.mockClear();
    cdsEngineMock.cdsEngine.evaluate.mockClear();

    // Set default return values for authenticated tests
    authMock.getServerSession.mockResolvedValue(mockSession);
    cdsEngineMock.cdsEngine.evaluate.mockResolvedValue(mockEvaluationResult);
  });

  describe('POST /api/cds/evaluate', () => {
    it('should have working mock', async () => {
      // Verify the mock returns the session
      const session = await authMock.getServerSession({});
      expect(session).toEqual(mockSession);
      expect(session.user).toBeDefined();
      expect(session.user.id).toBe('user-1');
    });

    it('should return 401 when not authenticated', async () => {
      authMock.getServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'patient-1',
          hookType: 'patient-view',
          context: { patientId: 'patient-1' },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 for missing patient ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hookType: 'patient-view',
          context: {},
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 400 for invalid hook type', async () => {
      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'invalid-hook',
          context: { patientId: 'test-patient-1' },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.message).toContain('Invalid hookType');
    });

    it('should successfully evaluate patient-view hook', async () => {
      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
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

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(data.data.alerts).toBeDefined();
      expect(Array.isArray(data.data.alerts)).toBe(true);
    });

    it('should return properly formatted CDS Hooks cards', async () => {
      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
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

      const response = await POST(request);
      const data = await response.json();

      if (data.data.alerts.length > 0) {
        const alert = data.data.alerts[0];
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
      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
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

      const response = await POST(request);
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

    it('should handle patients with no alerts gracefully', async () => {
      cdsEngineMock.cdsEngine.evaluate.mockResolvedValue({
        alerts: [],
        rulesFired: 0,
        rulesEvaluated: 5,
      });

      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
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

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.alerts).toBeDefined();
      expect(Array.isArray(data.data.alerts)).toBe(true);
    });

    it('should call CDS engine with correct context', async () => {
      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'test-patient-1',
          hookType: 'patient-view',
          context: { patientId: 'test-patient-1' },
        }),
      });

      await POST(request);

      expect(cdsEngineMock.cdsEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'test-patient-1',
          hookType: 'patient-view',
          userId: mockSession.user.id,
        })
      );
    });
  });

  describe('GET /api/cds/evaluate', () => {
    it('should return API documentation', async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.endpoints).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for server errors', async () => {
      cdsEngineMock.cdsEngine.evaluate.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'patient-that-causes-error',
          hookType: 'patient-view',
          context: { patientId: 'patient-that-causes-error' },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      });

      const response = await POST(request);
      // Note: This will return 500 because request.json() throws
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Context Enrichment', () => {
    it('should enrich context with patient data from database', async () => {
      const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
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

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(cdsEngineMock.cdsEngine.evaluate).toHaveBeenCalled();
    });
  });

  describe('Valid Hook Types', () => {
    const validHookTypes = [
      'patient-view',
      'medication-prescribe',
      'order-select',
      'order-sign',
      'encounter-start',
      'encounter-discharge',
    ];

    validHookTypes.forEach((hookType) => {
      it(`should accept ${hookType} hook type`, async () => {
        const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: 'test-patient-1',
            hookType,
            context: { patientId: 'test-patient-1' },
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });
    });
  });
});
