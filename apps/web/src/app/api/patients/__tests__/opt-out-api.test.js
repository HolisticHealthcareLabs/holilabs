"use strict";
/**
 * Integration Tests: Public Opt-Out API
 * Tests TCPA & CAN-SPAM compliant public opt-out endpoint
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const server_1 = require("next/server");
const route_1 = require("../preferences/opt-out/route");
const opt_out_1 = require("@/lib/notifications/opt-out");
// Create mock functions first
const mockFindUniquePatient = globals_1.jest.fn();
const mockUpsertPreferences = globals_1.jest.fn();
const mockCreateAuditLog = globals_1.jest.fn();
// Mock Prisma
globals_1.jest.mock('@/lib/prisma', () => ({
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
(0, globals_1.describe)('Public Opt-Out API - Integration Tests', () => {
    const testPatientId = 'test-patient-123';
    const testToken = (0, opt_out_1.encryptPatientId)(testPatientId);
    const testIpAddress = '192.168.1.1';
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    // ===========================================================================
    // GET /api/patients/preferences/opt-out?token=xxx&type=sms
    // ===========================================================================
    (0, globals_1.describe)('GET /api/patients/preferences/opt-out - SMS Opt-Out', () => {
        (0, globals_1.it)('should opt-out of SMS successfully', async () => {
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
            const request = new server_1.NextRequest(url, {
                headers: {
                    'x-forwarded-for': testIpAddress,
                },
            });
            // Call handler
            const response = await (0, route_1.GET)(request);
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.headers.get('content-type')).toContain('text/html');
            // Verify patient was looked up
            (0, globals_1.expect)(prisma.patient.findUnique).toHaveBeenCalledWith({
                where: { id: testPatientId },
                select: { id: true, firstName: true, lastName: true },
            });
            // Verify preferences were updated
            (0, globals_1.expect)(prisma.patientPreferences.upsert).toHaveBeenCalledWith({
                where: { patientId: testPatientId },
                update: globals_1.expect.objectContaining({
                    smsEnabled: false,
                    smsAppointments: false,
                    smsPrescriptions: false,
                    smsResults: false,
                    smsReminders: false,
                    smsMarketing: false,
                    smsOptedOutAt: globals_1.expect.any(Date),
                }),
                create: globals_1.expect.objectContaining({
                    patientId: testPatientId,
                    smsEnabled: false,
                }),
            });
            // Verify audit log was created
            (0, globals_1.expect)(prisma.auditLog.create).toHaveBeenCalledWith({
                data: globals_1.expect.objectContaining({
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
            (0, globals_1.expect)(html).toContain('Preferencias Actualizadas');
            (0, globals_1.expect)(html).toContain('María González');
        });
        (0, globals_1.it)('should return 400 if token is missing', async () => {
            // Create mock request without token
            const url = 'http://localhost:3000/api/patients/preferences/opt-out?type=sms';
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(data.success).toBe(false);
            (0, globals_1.expect)(data.error).toContain('Missing token');
        });
        (0, globals_1.it)('should return 400 if type is missing', async () => {
            // Create mock request without type
            const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}`;
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(data.success).toBe(false);
            (0, globals_1.expect)(data.error).toContain('Invalid type');
        });
        (0, globals_1.it)('should return 400 if type is invalid', async () => {
            // Create mock request with invalid type
            const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=invalid`;
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(data.success).toBe(false);
            (0, globals_1.expect)(data.error).toContain('Invalid type');
        });
        (0, globals_1.it)('should return 400 if token is invalid', async () => {
            // Create mock request with invalid token
            const url = 'http://localhost:3000/api/patients/preferences/opt-out?token=invalid-token&type=sms';
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(data.success).toBe(false);
            (0, globals_1.expect)(data.error).toContain('Invalid or expired token');
        });
        (0, globals_1.it)('should return 404 if patient not found', async () => {
            // Mock patient not found
            mockFindUniquePatient.mockResolvedValue(null);
            // Create mock request
            const url = `http://localhost:3000/api/patients/preferences/opt-out?token=${testToken}&type=sms`;
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(404);
            (0, globals_1.expect)(data.success).toBe(false);
            (0, globals_1.expect)(data.error).toBe('Patient not found');
        });
    });
    // ===========================================================================
    // GET /api/patients/preferences/opt-out?token=xxx&type=email
    // ===========================================================================
    (0, globals_1.describe)('GET /api/patients/preferences/opt-out - Email Opt-Out', () => {
        (0, globals_1.it)('should opt-out of email successfully', async () => {
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
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            // Verify preferences were updated
            (0, globals_1.expect)(prisma.patientPreferences.upsert).toHaveBeenCalledWith({
                where: { patientId: testPatientId },
                update: globals_1.expect.objectContaining({
                    emailEnabled: false,
                    emailAppointments: false,
                    emailPrescriptions: false,
                    emailResults: false,
                    emailReminders: false,
                    emailMarketing: false,
                    emailOptedOutAt: globals_1.expect.any(Date),
                }),
                create: globals_1.expect.objectContaining({
                    patientId: testPatientId,
                    emailEnabled: false,
                }),
            });
            // Verify audit log
            (0, globals_1.expect)(prisma.auditLog.create).toHaveBeenCalledWith({
                data: globals_1.expect.objectContaining({
                    action: 'OPT_OUT',
                    changes: { type: 'email', ipAddress: globals_1.expect.any(String) },
                }),
            });
        });
    });
    // ===========================================================================
    // GET /api/patients/preferences/opt-out?token=xxx&type=all
    // ===========================================================================
    (0, globals_1.describe)('GET /api/patients/preferences/opt-out - All Communications Opt-Out', () => {
        (0, globals_1.it)('should opt-out of all communications successfully', async () => {
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
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            // Verify both SMS and email were disabled
            (0, globals_1.expect)(prisma.patientPreferences.upsert).toHaveBeenCalledWith({
                where: { patientId: testPatientId },
                update: globals_1.expect.objectContaining({
                    // SMS
                    smsEnabled: false,
                    smsAppointments: false,
                    smsOptedOutAt: globals_1.expect.any(Date),
                    // Email
                    emailEnabled: false,
                    emailAppointments: false,
                    emailOptedOutAt: globals_1.expect.any(Date),
                }),
                create: globals_1.expect.any(Object),
            });
            // Verify HTML response
            const html = await response.text();
            (0, globals_1.expect)(html).toContain('todas las comunicaciones');
        });
    });
    // ===========================================================================
    // Security & Compliance Tests
    // ===========================================================================
    (0, globals_1.describe)('Security & Compliance', () => {
        (0, globals_1.it)('should work without authentication (public endpoint)', async () => {
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
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            // Should succeed without auth
            (0, globals_1.expect)(response.status).toBe(200);
        });
        (0, globals_1.it)('should capture IP address for audit trail (TCPA/CAN-SPAM)', async () => {
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
            const request = new server_1.NextRequest(url, {
                headers: {
                    'x-forwarded-for': customIp,
                },
            });
            // Call handler
            const response = await (0, route_1.GET)(request);
            // Verify IP was logged
            (0, globals_1.expect)(prisma.auditLog.create).toHaveBeenCalledWith({
                data: globals_1.expect.objectContaining({
                    ipAddress: customIp,
                    changes: globals_1.expect.objectContaining({
                        ipAddress: customIp,
                    }),
                }),
            });
        });
        (0, globals_1.it)('should capture user agent for audit trail', async () => {
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
            const request = new server_1.NextRequest(url, {
                headers: {
                    'user-agent': customUserAgent,
                },
            });
            // Call handler
            const response = await (0, route_1.GET)(request);
            // Verify user agent was logged
            (0, globals_1.expect)(prisma.auditLog.create).toHaveBeenCalledWith({
                data: globals_1.expect.objectContaining({
                    userAgent: customUserAgent,
                }),
            });
        });
        (0, globals_1.it)('should return user-friendly HTML page (not JSON)', async () => {
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
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            // Verify HTML response
            (0, globals_1.expect)(response.headers.get('content-type')).toContain('text/html');
            const html = await response.text();
            (0, globals_1.expect)(html).toContain('<!DOCTYPE html>');
            (0, globals_1.expect)(html).toContain('<html');
            (0, globals_1.expect)(html).toContain('</html>');
            (0, globals_1.expect)(html).toContain('Preferencias Actualizadas');
        });
        (0, globals_1.it)('should be Spanish-language for Mexican market', async () => {
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
            const request = new server_1.NextRequest(url);
            // Call handler
            const response = await (0, route_1.GET)(request);
            const html = await response.text();
            // Verify Spanish text
            (0, globals_1.expect)(html).toContain('lang="es"');
            (0, globals_1.expect)(html).toContain('Preferencias');
            (0, globals_1.expect)(html).toContain('Hola');
        });
    });
});
//# sourceMappingURL=opt-out-api.test.js.map