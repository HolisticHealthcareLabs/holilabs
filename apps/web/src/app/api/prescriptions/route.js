"use strict";
/**
 * Prescription API - Create Prescription
 *
 * POST /api/prescriptions - Create new prescription with blockchain hash
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
const crypto_1 = __importDefault(require("crypto"));
// Force dynamic rendering - prevents build-time evaluation
exports.dynamic = 'force-dynamic';
/**
 * POST /api/prescriptions
 * Create new prescription with e-signature
 * SECURITY: Enforces tenant isolation - clinicians can only create prescriptions for their own patients
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        // Validate required fields
        const requiredFields = ['patientId', 'medications', 'signatureMethod', 'signatureData'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return server_1.NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }
        // ===================================================================
        // SECURITY: TENANT ISOLATION - CRITICAL FOR HIPAA COMPLIANCE
        // ===================================================================
        // Verify the patient belongs to this clinician
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: body.patientId },
            select: { assignedClinicianId: true },
        });
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }
        // Only ADMIN or assigned clinician can create prescriptions for this patient
        if (patient.assignedClinicianId !== context.user.id &&
            context.user.role !== 'ADMIN') {
            return server_1.NextResponse.json({ error: 'Forbidden: You cannot create prescriptions for this patient' }, { status: 403 });
        }
        // Use authenticated user ID as clinician
        const clinicianId = context.user.id;
        // Generate prescription hash for blockchain
        const prescriptionData = {
            patientId: body.patientId,
            clinicianId,
            medications: body.medications,
            timestamp: new Date().toISOString(),
        };
        const prescriptionHash = crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(prescriptionData))
            .digest('hex');
        // Create prescription
        const prescription = await prisma_1.prisma.prescription.create({
            data: {
                patientId: body.patientId,
                clinicianId,
                prescriptionHash,
                medications: body.medications,
                instructions: body.instructions || '',
                diagnosis: body.diagnoses || body.diagnosis || '',
                signatureMethod: body.signatureMethod,
                signatureData: body.signatureData,
                signedAt: new Date(),
                status: 'SIGNED',
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        tokenId: true,
                    },
                },
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        licenseNumber: true,
                    },
                },
            },
        });
        // Create individual medication records
        const medicationPromises = body.medications.map((med) => {
            return prisma_1.prisma.medication.create({
                data: {
                    patientId: body.patientId,
                    name: med.name,
                    genericName: med.genericName || med.name,
                    dose: med.dose,
                    frequency: med.frequency,
                    route: med.route || 'oral',
                    instructions: med.instructions || '',
                    startDate: new Date(),
                    isActive: true,
                    prescribedBy: clinicianId,
                    prescriptionHash,
                },
            });
        });
        await Promise.all(medicationPromises);
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: clinicianId,
                userEmail: context.user.email,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'Prescription',
                resourceId: prescription.id,
                details: {
                    medicationCount: body.medications.length,
                    prescriptionHash,
                },
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: prescription,
            message: 'Prescription created successfully',
        }, { status: 201 });
    }
    catch (error) {
        console.error('Error creating prescription:', error);
        return server_1.NextResponse.json({ error: 'Failed to create prescription', details: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'Prescription' },
});
/**
 * GET /api/prescriptions?patientId=xxx
 * Get prescriptions for a patient
 * SECURITY: Enforces tenant isolation - clinicians can only view prescriptions for their own patients
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId query parameter is required' }, { status: 400 });
        }
        // ===================================================================
        // SECURITY: TENANT ISOLATION - CRITICAL FOR HIPAA COMPLIANCE
        // ===================================================================
        // Verify the patient belongs to this clinician
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: patientId },
            select: { assignedClinicianId: true },
        });
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }
        // Only ADMIN or assigned clinician can view prescriptions for this patient
        if (patient.assignedClinicianId !== context.user.id &&
            context.user.role !== 'ADMIN') {
            return server_1.NextResponse.json({ error: 'Forbidden: You cannot access prescriptions for this patient' }, { status: 403 });
        }
        const prescriptions = await prisma_1.prisma.prescription.findMany({
            where: { patientId },
            include: {
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        licenseNumber: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return server_1.NextResponse.json({
            success: true,
            data: prescriptions,
        });
    }
    catch (error) {
        console.error('Error fetching prescriptions:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch prescriptions', details: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'Prescription' },
    skipCsrf: true, // GET requests don't need CSRF protection
});
//# sourceMappingURL=route.js.map