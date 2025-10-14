/**
 * Integration Tests: Public Opt-Out API
 * Tests TCPA & CAN-SPAM compliant public opt-out endpoint
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '../preferences/opt-out/route';
import { encryptPatientId } from '@/lib/notifications/opt-out';

// Create mock functions first
const mockFindUniquePatient = jest.fn();
const mockUpsertPreferences = jest.fn();
const mockCreateAuditLog = jest.fn();

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: mockFindUniquePatient,
    },
    patientPreferences: {
      upsert: mockUpsertPreferences,
    },
    auditLog: {
      create: mockCreateAuditLog,
    },
  },
}));

describe('Public Opt-Out API - Integration Tests', () => {
  const testPatientId = 'test-patient-123';
  const testToken = encryptPatientId(testPatientId);
  const testIpAddress = '192.168.1.1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/patients/preferences/opt-out?token=xxx&type=sms
  // ===========================================================================

  describe('GET /api/patients/preferences/opt-out - SMS Opt-Out', () => {
    it('should opt-out of SMS successfully', async () => {
      // Mock patient exists
      mockFindUniquePatient.mockResolvedValue({
        id: testPatientId,
        firstName: 'María',
        lastName: 'González',
      });

      // Mock upsert
      mockUpsertPreferences.mockResolvedValue({
        id: 'pref-123',
        patientId: testPatientId,
        smsEnabled: false,
        smsOptedOutAt: new Date(),
      });

      // Mock audit log
      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
      });

      // Create mock request
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=sms`;
      const request = new NextRequest(url, {
        headers: {
          'x-forwarded-for': testIpAddress,
        },
      });

      // Call handler
      const response = await GET(request);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');

      // Verify patient was looked up
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: testPatientId },
        select: { id: true, firstName: true, lastName: true },
      });

      // Verify preferences were updated
      expect(prisma.patientPreferences.upsert).toHaveBeenCalledWith({
        where: { patientId: testPatientId },
        update: expect.objectContaining({
          smsEnabled: false,
          smsAppointments: false,
          smsPrescriptions: false,
          smsResults: false,
          smsReminders: false,
          smsMarketing: false,
          smsOptedOutAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          patientId: testPatientId,
          smsEnabled: false,
        }),
      });

      // Verify audit log was created
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: testPatientId,
          action: 'OPT_OUT',
          resource: 'PatientPreferences',
          resourceId: testPatientId,
          changes: { type: 'sms', ipAddress: testIpAddress },
          ipAddress: testIpAddress,
        }),
      });

      // Verify HTML response contains success message
      const html = await response.text();
      expect(html).toContain('Preferencias Actualizadas');
      expect(html).toContain('María González');
    });

    it('should return 400 if token is missing', async () => {
      // Create mock request without token
      const url = 'http://localhost:3000/api/patients/preferences/opt-out?type=sms';
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing token');
    });

    it('should return 400 if type is missing', async () => {
      // Create mock request without type
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}`;
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid type');
    });

    it('should return 400 if type is invalid', async () => {
      // Create mock request with invalid type
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=invalid`;
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid type');
    });

    it('should return 400 if token is invalid', async () => {
      // Create mock request with invalid token
      const url = 'http://localhost:3000/api/patients/preferences/opt-out?token=invalid-token&type=sms';
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid or expired token');
    });

    it('should return 404 if patient not found', async () => {
      // Mock patient not found
      mockFindUniquePatient.mockResolvedValue(null);

      // Create mock request
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=sms`;
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Patient not found');
    });
  });

  // ===========================================================================
  // GET /api/patients/preferences/opt-out?token=xxx&type=email
  // ===========================================================================

  describe('GET /api/patients/preferences/opt-out - Email Opt-Out', () => {
    it('should opt-out of email successfully', async () => {
      // Mock patient exists
      mockFindUniquePatient.mockResolvedValue({
        id: testPatientId,
        firstName: 'María',
        lastName: 'González',
      });

      // Mock upsert
      mockUpsertPreferences.mockResolvedValue({
        id: 'pref-123',
        patientId: testPatientId,
        emailEnabled: false,
        emailOptedOutAt: new Date(),
      });

      // Mock audit log
      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
      });

      // Create mock request
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=email`;
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);

      // Assertions
      expect(response.status).toBe(200);

      // Verify preferences were updated
      expect(prisma.patientPreferences.upsert).toHaveBeenCalledWith({
        where: { patientId: testPatientId },
        update: expect.objectContaining({
          emailEnabled: false,
          emailAppointments: false,
          emailPrescriptions: false,
          emailResults: false,
          emailReminders: false,
          emailMarketing: false,
          emailOptedOutAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          patientId: testPatientId,
          emailEnabled: false,
        }),
      });

      // Verify audit log
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'OPT_OUT',
          changes: { type: 'email', ipAddress: expect.any(String) },
        }),
      });
    });
  });

  // ===========================================================================
  // GET /api/patients/preferences/opt-out?token=xxx&type=all
  // ===========================================================================

  describe('GET /api/patients/preferences/opt-out - All Communications Opt-Out', () => {
    it('should opt-out of all communications successfully', async () => {
      // Mock patient exists
      mockFindUniquePatient.mockResolvedValue({
        id: testPatientId,
        firstName: 'María',
        lastName: 'González',
      });

      // Mock upsert
      mockUpsertPreferences.mockResolvedValue({
        id: 'pref-123',
        patientId: testPatientId,
        smsEnabled: false,
        emailEnabled: false,
        smsOptedOutAt: new Date(),
        emailOptedOutAt: new Date(),
      });

      // Mock audit log
      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
      });

      // Create mock request
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=all`;
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);

      // Assertions
      expect(response.status).toBe(200);

      // Verify both SMS and email were disabled
      expect(prisma.patientPreferences.upsert).toHaveBeenCalledWith({
        where: { patientId: testPatientId },
        update: expect.objectContaining({
          // SMS
          smsEnabled: false,
          smsAppointments: false,
          smsOptedOutAt: expect.any(Date),
          // Email
          emailEnabled: false,
          emailAppointments: false,
          emailOptedOutAt: expect.any(Date),
        }),
        create: expect.any(Object),
      });

      // Verify HTML response
      const html = await response.text();
      expect(html).toContain('todas las comunicaciones');
    });
  });

  // ===========================================================================
  // Security & Compliance Tests
  // ===========================================================================

  describe('Security & Compliance', () => {
    it('should work without authentication (public endpoint)', async () => {
      // Mock patient exists
      mockFindUniquePatient.mockResolvedValue({
        id: testPatientId,
        firstName: 'María',
        lastName: 'González',
      });

      // Mock upsert
      mockUpsertPreferences.mockResolvedValue({
        id: 'pref-123',
        patientId: testPatientId,
      });

      // Mock audit log
      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
      });

      // Create mock request without any auth headers
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=sms`;
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);

      // Should succeed without auth
      expect(response.status).toBe(200);
    });

    it('should capture IP address for audit trail (TCPA/CAN-SPAM)', async () => {
      // Mock patient exists
      mockFindUniquePatient.mockResolvedValue({
        id: testPatientId,
        firstName: 'María',
        lastName: 'González',
      });

      // Mock upsert
      mockUpsertPreferences.mockResolvedValue({
        id: 'pref-123',
        patientId: testPatientId,
      });

      // Mock audit log
      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
      });

      const customIp = '203.0.113.42';

      // Create mock request with IP
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=sms`;
      const request = new NextRequest(url, {
        headers: {
          'x-forwarded-for': customIp,
        },
      });

      // Call handler
      const response = await GET(request);

      // Verify IP was logged
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: customIp,
          changes: expect.objectContaining({
            ipAddress: customIp,
          }),
        }),
      });
    });

    it('should capture user agent for audit trail', async () => {
      // Mock patient exists
      mockFindUniquePatient.mockResolvedValue({
        id: testPatientId,
        firstName: 'María',
        lastName: 'González',
      });

      // Mock upsert
      mockUpsertPreferences.mockResolvedValue({
        id: 'pref-123',
        patientId: testPatientId,
      });

      // Mock audit log
      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
      });

      const customUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';

      // Create mock request with user agent
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=sms`;
      const request = new NextRequest(url, {
        headers: {
          'user-agent': customUserAgent,
        },
      });

      // Call handler
      const response = await GET(request);

      // Verify user agent was logged
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: customUserAgent,
        }),
      });
    });

    it('should return user-friendly HTML page (not JSON)', async () => {
      // Mock patient exists
      mockFindUniquePatient.mockResolvedValue({
        id: testPatientId,
        firstName: 'María',
        lastName: 'González',
      });

      // Mock upsert
      mockUpsertPreferences.mockResolvedValue({
        id: 'pref-123',
        patientId: testPatientId,
      });

      // Mock audit log
      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
      });

      // Create mock request
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=sms`;
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);

      // Verify HTML response
      expect(response.headers.get('content-type')).toContain('text/html');

      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('Preferencias Actualizadas');
    });

    it('should be Spanish-language for Mexican market', async () => {
      // Mock patient exists
      mockFindUniquePatient.mockResolvedValue({
        id: testPatientId,
        firstName: 'María',
        lastName: 'González',
      });

      // Mock upsert
      mockUpsertPreferences.mockResolvedValue({
        id: 'pref-123',
        patientId: testPatientId,
      });

      // Mock audit log
      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
      });

      // Create mock request
      const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=sms`;
      const request = new NextRequest(url);

      // Call handler
      const response = await GET(request);

      const html = await response.text();

      // Verify Spanish text
      expect(html).toContain('lang="es"');
      expect(html).toContain('Preferencias');
      expect(html).toContain('Hola');
    });
  });
});
