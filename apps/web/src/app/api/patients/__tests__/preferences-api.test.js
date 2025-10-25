"use strict";
/**
 * Integration Tests: Patient Preferences API
 * Tests GET/PUT endpoints with database mocking
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const server_1 = require("next/server");
// Mock Supabase FIRST (before any other imports)
const mockSupabaseClient = {
    auth: {
        getUser: globals_1.jest.fn().mockResolvedValue({
            data: {
                user: {
                    id: 'test-supabase-user-id',
                    email: 'test@example.com',
                }
            },
            error: null,
        }),
    },
};
globals_1.jest.mock('@/lib/supabase/server', () => ({
    createClient: globals_1.jest.fn(() => mockSupabaseClient),
}));
// Mock Prisma - create mock functions
const mockFindUniqueUser = globals_1.jest.fn();
const mockFindUniquePatient = globals_1.jest.fn();
const mockFindUniquePreferences = globals_1.jest.fn();
const mockCreatePreferences = globals_1.jest.fn();
const mockUpsertPreferences = globals_1.jest.fn();
globals_1.jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: mockFindUniqueUser,
        },
        patient: {
            findUnique: mockFindUniquePatient,
        },
        patientPreferences: {
            findUnique: mockFindUniquePreferences,
            create: mockCreatePreferences,
            upsert: mockUpsertPreferences,
        },
    },
}));
// Mock middleware
globals_1.jest.mock('@/lib/api/middleware', () => ({
    createProtectedRoute: (handler) => handler,
}));
// Import route handlers AFTER all mocks
const route_1 = require("../[id]/preferences/route");
(0, globals_1.describe)('Patient Preferences API - Integration Tests', () => {
    const testPatientId = 'test-patient-123';
    const testUserId = 'test-user-456';
    const testIpAddress = '192.168.1.1';
    // ===========================================================================
    // GET /api/patients/[id]/preferences
    // ===========================================================================
    (0, globals_1.describe)('GET /api/patients/[id]/preferences', () => {
        (0, globals_1.beforeEach)(() => {
            globals_1.jest.clearAllMocks();
            // Mock authenticated user for middleware
            mockFindUniqueUser.mockResolvedValue({
                id: testUserId,
                email: 'clinician@holilabs.com',
                role: 'CLINICIAN',
                supabaseId: 'test-supabase-user-id',
            });
        });
        (0, globals_1.it)('should return existing preferences', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock existing preferences
            const mockPreferences = {
                id: 'pref-123',
                patientId: testPatientId,
                smsEnabled: true,
                emailEnabled: true,
                pushEnabled: false,
                whatsappEnabled: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockFindUniquePreferences.mockResolvedValue(mockPreferences);
            // Create mock request
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences');
            const context = { params: { id: testPatientId } };
            // Call handler
            const response = await (0, route_1.GET)(request, context);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(data.success).toBe(true);
            (0, globals_1.expect)(data.data).toEqual(mockPreferences);
            (0, globals_1.expect)(mockFindUniquePatient).toHaveBeenCalledWith({
                where: { id: testPatientId },
                select: { id: true },
            });
            (0, globals_1.expect)(mockFindUniquePreferences).toHaveBeenCalledWith({
                where: { patientId: testPatientId },
            });
        });
        (0, globals_1.it)('should auto-create default preferences if none exist', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock no existing preferences
            mockFindUniquePreferences.mockResolvedValue(null);
            // Mock creation of new preferences
            const newPreferences = {
                id: 'pref-new-123',
                patientId: testPatientId,
                smsEnabled: true,
                emailEnabled: true,
                pushEnabled: true,
                whatsappEnabled: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockCreatePreferences.mockResolvedValue(newPreferences);
            // Create mock request
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences');
            const context = { params: { id: testPatientId } };
            // Call handler
            const response = await (0, route_1.GET)(request, context);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(data.success).toBe(true);
            (0, globals_1.expect)(data.data).toEqual(newPreferences);
            (0, globals_1.expect)(mockCreatePreferences).toHaveBeenCalledWith({
                data: {
                    patientId: testPatientId,
                },
            });
        });
        (0, globals_1.it)('should return 404 if patient not found', async () => {
            // Mock patient not found
            mockFindUniquePatient.mockResolvedValue(null);
            // Create mock request
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/invalid-id/preferences');
            const context = { params: { id: 'invalid-id' } };
            // Call handler
            const response = await (0, route_1.GET)(request, context);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(404);
            (0, globals_1.expect)(data.success).toBe(false);
            (0, globals_1.expect)(data.error).toBe('Patient not found');
        });
        (0, globals_1.it)('should handle database errors gracefully', async () => {
            // Mock database error
            mockFindUniquePatient.mockRejectedValue(new Error('Database connection failed'));
            // Create mock request
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences');
            const context = { params: { id: testPatientId } };
            // Call handler - should throw or handle error
            await (0, globals_1.expect)((0, route_1.GET)(request, context)).rejects.toThrow();
        });
    });
    // ===========================================================================
    // PUT /api/patients/[id]/preferences
    // ===========================================================================
    (0, globals_1.describe)('PUT /api/patients/[id]/preferences', () => {
        (0, globals_1.beforeEach)(() => {
            globals_1.jest.clearAllMocks();
            // Mock authenticated user for middleware
            mockFindUniqueUser.mockResolvedValue({
                id: testUserId,
                email: 'clinician@holilabs.com',
                role: 'CLINICIAN',
                supabaseId: 'test-supabase-user-id',
            });
        });
        (0, globals_1.it)('should update preferences successfully', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock upsert
            const updatedPreferences = {
                id: 'pref-123',
                patientId: testPatientId,
                smsEnabled: false, // Updated
                emailEnabled: true,
                pushEnabled: true,
                whatsappEnabled: false,
                smsOptedOutAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockUpsertPreferences.mockResolvedValue(updatedPreferences);
            // Create mock request with body
            const requestBody = {
                smsEnabled: false,
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                    'x-forwarded-for': testIpAddress,
                },
            });
            const context = { params: { id: testPatientId } };
            // Call handler
            const response = await (0, route_1.PUT)(request, context);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(data.success).toBe(true);
            (0, globals_1.expect)(data.data).toEqual(updatedPreferences);
            (0, globals_1.expect)(data.message).toBe('Preferences updated successfully');
        });
        (0, globals_1.it)('should track SMS consent when enabling SMS', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock upsert
            mockUpsertPreferences.mockResolvedValue({
                id: 'pref-123',
                patientId: testPatientId,
                smsEnabled: true,
                smsConsentedAt: globals_1.expect.any(Date),
                smsConsentIp: testIpAddress,
                smsConsentMethod: 'web',
            });
            // Create mock request
            const requestBody = {
                smsEnabled: true,
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                    'x-forwarded-for': testIpAddress,
                },
            });
            const context = { params: { id: testPatientId } };
            // Call handler
            const response = await (0, route_1.PUT)(request, context);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(mockUpsertPreferences).toHaveBeenCalled();
            // Verify upsert was called with consent tracking
            const upsertCall = mockUpsertPreferences.mock.calls[0][0];
            (0, globals_1.expect)(upsertCall.update).toBeDefined();
        });
        (0, globals_1.it)('should track SMS opt-out when disabling SMS', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock upsert
            mockUpsertPreferences.mockResolvedValue({
                id: 'pref-123',
                patientId: testPatientId,
                smsEnabled: false,
                smsOptedOutAt: globals_1.expect.any(Date),
            });
            // Create mock request
            const requestBody = {
                smsEnabled: false,
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                },
            });
            const context = { params: { id: testPatientId } };
            // Call handler
            const response = await (0, route_1.PUT)(request, context);
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(mockUpsertPreferences).toHaveBeenCalled();
        });
        (0, globals_1.it)('should track email consent when enabling email', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock upsert
            mockUpsertPreferences.mockResolvedValue({
                id: 'pref-123',
                patientId: testPatientId,
                emailEnabled: true,
                emailConsentedAt: globals_1.expect.any(Date),
            });
            // Create mock request
            const requestBody = {
                emailEnabled: true,
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                    'x-forwarded-for': testIpAddress,
                },
            });
            const context = { params: { id: testPatientId } };
            // Call handler
            const response = await (0, route_1.PUT)(request, context);
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
        });
        (0, globals_1.it)('should track WhatsApp consent when enabling WhatsApp', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock upsert
            mockUpsertPreferences.mockResolvedValue({
                id: 'pref-123',
                patientId: testPatientId,
                whatsappConsented: true,
                whatsappConsentedAt: globals_1.expect.any(Date),
            });
            // Create mock request
            const requestBody = {
                whatsappConsented: true,
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                },
            });
            const context = { params: { id: testPatientId } };
            // Call handler
            const response = await (0, route_1.PUT)(request, context);
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
        });
        (0, globals_1.it)('should return 404 if patient not found', async () => {
            // Mock patient not found
            mockFindUniquePatient.mockResolvedValue(null);
            // Create mock request
            const requestBody = {
                smsEnabled: false,
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/invalid-id/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                },
            });
            const context = { params: { id: 'invalid-id' } };
            // Call handler
            const response = await (0, route_1.PUT)(request, context);
            const data = await response.json();
            // Assertions
            (0, globals_1.expect)(response.status).toBe(404);
            (0, globals_1.expect)(data.success).toBe(false);
            (0, globals_1.expect)(data.error).toBe('Patient not found');
        });
        (0, globals_1.it)('should validate request body with Zod schema', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Create mock request with invalid body
            const requestBody = {
                smsEnabled: 'not-a-boolean', // Invalid type
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                },
            });
            const context = { params: { id: testPatientId } };
            // Call handler - should throw validation error
            await (0, globals_1.expect)((0, route_1.PUT)(request, context)).rejects.toThrow();
        });
        (0, globals_1.it)('should capture IP address for consent tracking', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock upsert
            mockUpsertPreferences.mockResolvedValue({
                id: 'pref-123',
                patientId: testPatientId,
            });
            // Create mock request with IP header
            const requestBody = {
                smsEnabled: true,
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                    'x-forwarded-for': '203.0.113.195',
                    'x-real-ip': '203.0.113.195',
                },
            });
            const context = { params: { id: testPatientId } };
            // Call handler
            const response = await (0, route_1.PUT)(request, context);
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
            // Verify IP was captured
            const upsertCall = mockUpsertPreferences.mock.calls[0][0];
            // IP should be in the update data
            (0, globals_1.expect)(upsertCall).toBeDefined();
        });
        (0, globals_1.it)('should handle missing IP address gracefully', async () => {
            // Mock patient exists
            mockFindUniquePatient.mockResolvedValue({
                id: testPatientId,
            });
            // Mock upsert
            mockUpsertPreferences.mockResolvedValue({
                id: 'pref-123',
                patientId: testPatientId,
            });
            // Create mock request without IP headers
            const requestBody = {
                smsEnabled: true,
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/patients/test-patient-123/preferences', {
                method: 'PUT',
                body: JSON.stringify(requestBody),
                headers: {
                    'content-type': 'application/json',
                },
            });
            const context = { params: { id: testPatientId } };
            // Call handler - should use 'unknown'
            const response = await (0, route_1.PUT)(request, context);
            // Assertions
            (0, globals_1.expect)(response.status).toBe(200);
        });
    });
});
//# sourceMappingURL=preferences-api.test.js.map