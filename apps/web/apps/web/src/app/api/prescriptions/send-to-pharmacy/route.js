"use strict";
/**
 * Send Prescription to Pharmacy API
 * Sends a prescription to a specific pharmacy
 *
 * POST /api/prescriptions/send-to-pharmacy
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
const zod_1 = require("zod");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const SendToPharmacySchema = zod_1.z.object({
    prescriptionId: zod_1.z.string().cuid(),
    pharmacyId: zod_1.z.string().cuid(),
    deliveryMethod: zod_1.z.enum(['PICKUP', 'HOME_DELIVERY', 'CLINIC_DELIVERY']).default('PICKUP'),
    deliveryAddress: zod_1.z.string().optional(),
});
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const body = await request.json();
    const validated = SendToPharmacySchema.parse(body);
    // Check if prescription exists and belongs to clinician
    const prescription = await prisma_1.prisma.prescription.findUnique({
        where: { id: validated.prescriptionId },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                },
            },
        },
    });
    if (!prescription) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Prescription not found',
        }, { status: 404 });
    }
    // Check if pharmacy exists
    const pharmacy = await prisma_1.prisma.pharmacy.findUnique({
        where: { id: validated.pharmacyId },
    });
    if (!pharmacy) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Pharmacy not found',
        }, { status: 404 });
    }
    if (!pharmacy.isActive || !pharmacy.acceptsEPrescriptions) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Pharmacy does not accept e-prescriptions',
        }, { status: 400 });
    }
    // Create pharmacy prescription record
    const pharmacyPrescription = await prisma_1.prisma.pharmacyPrescription.create({
        data: {
            prescriptionId: validated.prescriptionId,
            pharmacyId: validated.pharmacyId,
            status: 'SENT',
            deliveryMethod: validated.deliveryMethod,
            deliveryAddress: validated.deliveryAddress,
        },
        include: {
            pharmacy: true,
        },
    });
    // Update prescription status
    await prisma_1.prisma.prescription.update({
        where: { id: validated.prescriptionId },
        data: {
            sentToPharmacy: true,
            pharmacyId: validated.pharmacyId,
            status: 'SENT',
        },
    });
    // TODO: Send actual API request to pharmacy system
    // TODO: Send SMS notification to patient
    return server_1.NextResponse.json({
        success: true,
        data: {
            pharmacyPrescription,
            pharmacyName: pharmacy.name,
            pharmacyAddress: pharmacy.address,
        },
        message: 'Prescription sent to pharmacy successfully',
    });
}, {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'PharmacyPrescription' },
});
//# sourceMappingURL=route.js.map