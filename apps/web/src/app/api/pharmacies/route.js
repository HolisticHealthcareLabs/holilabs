"use strict";
/**
 * Pharmacies API
 * Manage pharmacy locations and integrations
 *
 * GET /api/pharmacies - List pharmacies with filters
 * POST /api/pharmacies - Create pharmacy location
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
const zod_1 = require("zod");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const CreatePharmacySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    chain: zod_1.z.enum([
        'GUADALAJARA',
        'BENAVIDES',
        'DEL_AHORRO',
        'SIMILARES',
        'SAN_PABLO',
        'ROMA',
        'YZA',
        'INDEPENDIENTE',
        'OTHER',
    ]),
    branchCode: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    address: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    postalCode: zod_1.z.string().min(1),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    openingTime: zod_1.z.string().optional(),
    closingTime: zod_1.z.string().optional(),
    isOpen24Hours: zod_1.z.boolean().default(false),
    hasDelivery: zod_1.z.boolean().default(false),
    acceptsEPrescriptions: zod_1.z.boolean().default(true),
});
// ============================================================================
// POST /api/pharmacies - Create pharmacy
// ============================================================================
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const body = await request.json();
    const validated = CreatePharmacySchema.parse(body);
    const pharmacy = await prisma_1.prisma.pharmacy.create({
        data: {
            name: validated.name,
            chain: validated.chain,
            branchCode: validated.branchCode,
            phone: validated.phone,
            email: validated.email,
            address: validated.address,
            city: validated.city,
            state: validated.state,
            postalCode: validated.postalCode,
            latitude: validated.latitude,
            longitude: validated.longitude,
            openingTime: validated.openingTime,
            closingTime: validated.closingTime,
            isOpen24Hours: validated.isOpen24Hours,
            hasDelivery: validated.hasDelivery,
            acceptsEPrescriptions: validated.acceptsEPrescriptions,
            isActive: true,
        },
    });
    return server_1.NextResponse.json({
        success: true,
        data: pharmacy,
        message: 'Pharmacy created successfully',
    }, { status: 201 });
}, {
    roles: ['ADMIN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
    audit: { action: 'CREATE', resource: 'Pharmacy' },
});
// ============================================================================
// GET /api/pharmacies - List pharmacies
// ============================================================================
exports.GET = (0, middleware_1.createProtectedRoute)(async (request) => {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const hasDelivery = searchParams.get('hasDelivery');
    const where = {
        isActive: true,
    };
    if (chain)
        where.chain = chain;
    if (city)
        where.city = city;
    if (state)
        where.state = state;
    if (hasDelivery)
        where.hasDelivery = hasDelivery === 'true';
    const pharmacies = await prisma_1.prisma.pharmacy.findMany({
        where,
        orderBy: [{ chain: 'asc' }, { name: 'asc' }],
        take: 100,
    });
    return server_1.NextResponse.json({
        success: true,
        data: pharmacies,
        count: pharmacies.length,
    });
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
});
//# sourceMappingURL=route.js.map