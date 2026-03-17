/**
 * Consent Middleware Tests — Unit 7
 *
 * 11 test cases covering:
 * - Consent verification flow
 * - Emergency break-glass with rate limiting
 * - Patient-data vs non-patient-data tool routing
 * - Correct consent type mapping (RECORDING, DATA_RESEARCH, GENERAL_CONSULTATION)
 * - Error response format (LGPD_CONSENT_DENIED, not 500)
 */

import { wrapWithConsentCheck } from '../consent-middleware';
import type { MCPTool, MCPContext } from '../../types';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    consent: {
      findFirst: jest.fn(),
    },
    auditLog: {
      count: jest.fn(),
    },
  },
}));

// Mock Logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Audit Writer
jest.mock('@/lib/audit/write-audit-entry', () => ({
  writeAuditEntry: jest.fn(),
}));

// Mock Consent Gate
jest.mock('../../consent-gate', () => ({
  verifyConsentForAgentAccess: jest.fn(),
  ConsentDeniedError: class ConsentDeniedError extends Error {
    constructor(patientId: string, consentType: string) {
      super(`Consent not granted: ${consentType} for patient ${patientId}`);
      this.name = 'ConsentDeniedError';
    }
  },
}));

const { prisma } = require('@/lib/prisma');
const { logger } = require('@/lib/logger');
const { writeAuditEntry } = require('@/lib/audit/write-audit-entry');
const { verifyConsentForAgentAccess, ConsentDeniedError } = require('../../consent-gate');

// =============================================================================
// FIXTURES
// =============================================================================

const mockContext: MCPContext = {
  clinicianId: 'clinician-123',
  agentId: 'agent-456',
  sessionId: 'session-789',
  roles: ['CLINICIAN'],
};

const mockPatientTool: MCPTool = {
  name: 'get_patient',
  description: 'Get patient details',
  category: 'patient',
  inputSchema: {} as any,
  requiredPermissions: ['patient:read'],
};

const mockScribeTool: MCPTool = {
  name: 'create_scribe_session',
  description: 'Create scribe recording session',
  category: 'scribe',
  inputSchema: {} as any,
  requiredPermissions: ['scribe:write'],
};

const mockAnalyticsTool: MCPTool = {
  name: 'get_analytics',
  description: 'Get analytics data',
  category: 'analytics',
  inputSchema: {} as any,
  requiredPermissions: ['analytics:read'],
};

const mockAdminTool: MCPTool = {
  name: 'list_all_patients',
  description: 'List all patients (admin only)',
  category: 'admin',
  inputSchema: {} as any,
  requiredPermissions: ['admin:read'],
};

// =============================================================================
// TESTS
// =============================================================================

describe('Consent Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyConsentForAgentAccess as jest.Mock).mockResolvedValue(undefined);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
  });

  // =========================================================================
  // Test 1: Patient tool with valid consent proceeds
  // =========================================================================

  test('patient tool with valid consent proceeds to handler', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'patient-123', name: 'John Doe' },
    });

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      mockContext,
    );

    expect(verifyConsentForAgentAccess).toHaveBeenCalledWith('patient-123', 'GENERAL_CONSULTATION');
    expect(mockHandler).toHaveBeenCalledWith(
      { patientId: 'patient-123' },
      mockContext,
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'patient-123', name: 'John Doe' });
  });

  // =========================================================================
  // Test 2: Patient tool with revoked consent returns LGPD_CONSENT_DENIED
  // =========================================================================

  test('patient tool with revoked consent returns LGPD_CONSENT_DENIED', async () => {
    const mockHandler = jest.fn();
    (verifyConsentForAgentAccess as jest.Mock).mockRejectedValue(
      new ConsentDeniedError('patient-123', 'GENERAL_CONSULTATION'),
    );

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      mockContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('LGPD_CONSENT_DENIED');
    expect(result.data).toBeNull();
    expect(result.meta?.warnings).toContain(
      'Consent required: GENERAL_CONSULTATION for patient patient-123',
    );
    expect(mockHandler).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test 3: Patient tool with missing consent returns LGPD_CONSENT_DENIED
  // =========================================================================

  test('patient tool with missing consent returns LGPD_CONSENT_DENIED', async () => {
    const mockHandler = jest.fn();
    (verifyConsentForAgentAccess as jest.Mock).mockRejectedValue(
      new ConsentDeniedError('patient-456', 'GENERAL_CONSULTATION'),
    );

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-456' },
      mockContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('LGPD_CONSENT_DENIED');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test 4: Admin tool (non-patient-data) skips consent check
  // =========================================================================

  test('admin tool skips consent check', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      success: true,
      data: { count: 42 },
    });

    const wrapped = await wrapWithConsentCheck(mockAdminTool, mockHandler);
    const result = await wrapped({}, mockContext);

    expect(verifyConsentForAgentAccess).not.toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  // =========================================================================
  // Test 5: Tool without patientId skips consent check
  // =========================================================================

  test('tool without patientId in input skips consent check', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      success: true,
      data: { results: [] },
    });

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);
    const result = await wrapped({ query: 'search term' }, mockContext);

    expect(verifyConsentForAgentAccess).not.toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  // =========================================================================
  // Test 6: Scribe tool requires RECORDING consent (not GENERAL_CONSULTATION)
  // =========================================================================

  test('scribe tool requires RECORDING consent type', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      success: true,
      data: { sessionId: 'session-123' },
    });

    const wrapped = await wrapWithConsentCheck(mockScribeTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      mockContext,
    );

    expect(verifyConsentForAgentAccess).toHaveBeenCalledWith('patient-123', 'RECORDING');
    expect(mockHandler).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  // =========================================================================
  // Test 7: Analytics tool requires DATA_RESEARCH consent
  // =========================================================================

  test('analytics tool requires DATA_RESEARCH consent type', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      success: true,
      data: { report: {} },
    });

    const wrapped = await wrapWithConsentCheck(mockAnalyticsTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      mockContext,
    );

    expect(verifyConsentForAgentAccess).toHaveBeenCalledWith('patient-123', 'DATA_RESEARCH');
    expect(mockHandler).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  // =========================================================================
  // Test 8: Consent failure returns structured error (not 500)
  // =========================================================================

  test('consent failure returns structured LGPD_CONSENT_DENIED error (not 500)', async () => {
    const mockHandler = jest.fn();
    (verifyConsentForAgentAccess as jest.Mock).mockRejectedValue(
      new ConsentDeniedError('patient-123', 'GENERAL_CONSULTATION'),
    );

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      mockContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('LGPD_CONSENT_DENIED');
    expect(result.data).toBeNull();
    expect(typeof result.error).toBe('string');
    expect(result.error).not.toMatch(/500|internal|server/i);
  });

  // =========================================================================
  // Test 9: ConsentDeniedError includes required consent type in warning
  // =========================================================================

  test('ConsentDeniedError includes required consent type in warning', async () => {
    const mockHandler = jest.fn();
    (verifyConsentForAgentAccess as jest.Mock).mockRejectedValue(
      new ConsentDeniedError('patient-123', 'DATA_RESEARCH'),
    );

    const wrapped = await wrapWithConsentCheck(mockAnalyticsTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      mockContext,
    );

    expect(result.meta?.warnings).toBeDefined();
    expect(result.meta?.warnings?.[0]).toContain('DATA_RESEARCH');
  });

  // =========================================================================
  // Test 10: Emergency override with valid justification bypasses consent gate
  // =========================================================================

  test('emergencyOverride=true + justification skips consent gate', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'patient-123' },
    });

    (verifyConsentForAgentAccess as jest.Mock).mockRejectedValue(
      new ConsentDeniedError('patient-123', 'GENERAL_CONSULTATION'),
    );

    const contextWithOverride: MCPContext = {
      ...mockContext,
      emergencyOverride: true,
      emergencyJustification: 'Life-threatening allergic reaction - immediate intervention required',
    };

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      contextWithOverride,
    );

    expect(verifyConsentForAgentAccess).not.toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(writeAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MCP_EMERGENCY_BREAK_GLASS',
        consentBasis: 'emergency',
        legalBasis: 'LGPD Art. 7 IV',
      }),
    );
  });

  // =========================================================================
  // Test 11: Emergency override without justification returns error
  // =========================================================================

  test('emergencyOverride=true without justification returns EMERGENCY_OVERRIDE_INVALID', async () => {
    const mockHandler = jest.fn();

    const contextWithOverride: MCPContext = {
      ...mockContext,
      emergencyOverride: true,
      // emergencyJustification is missing
    };

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      contextWithOverride,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('EMERGENCY_OVERRIDE_INVALID');
    expect(result.data).toBeNull();
    expect(result.meta?.warnings).toContain('Emergency override requires justification');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test 12: Emergency override rate limiting
  // =========================================================================

  test('emergency override respects 3/24h rate limit', async () => {
    const mockHandler = jest.fn();

    (prisma.auditLog.count as jest.Mock).mockResolvedValue(3); // Already 3 overrides in 24h

    const contextWithOverride: MCPContext = {
      ...mockContext,
      emergencyOverride: true,
      emergencyJustification: 'Critical patient emergency',
    };

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);
    const result = await wrapped(
      { patientId: 'patient-123' },
      contextWithOverride,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('EMERGENCY_OVERRIDE_RATE_LIMITED');
    expect(result.meta?.warnings?.[0]).toContain('rate limit');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test 13: Patient ID extracted from various field names
  // =========================================================================

  test('extracts patientId from various input field names', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'patient-123' },
    });

    const wrapped = await wrapWithConsentCheck(mockPatientTool, mockHandler);

    // Test with patient_id (snake_case)
    await wrapped({ patient_id: 'patient-123' }, mockContext);
    expect(verifyConsentForAgentAccess).toHaveBeenCalledWith('patient-123', 'GENERAL_CONSULTATION');

    jest.clearAllMocks();

    // Test with id
    await wrapped({ id: 'patient-456' }, mockContext);
    expect(verifyConsentForAgentAccess).toHaveBeenCalledWith('patient-456', 'GENERAL_CONSULTATION');
  });
});
