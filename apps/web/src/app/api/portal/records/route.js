"use strict";
/**
 * Patient Medical Records API
 *
 * GET /api/portal/records
 * Fetch all medical records (SOAP notes) for authenticated patient
 * with filtering, pagination, and search
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const zod_1 = require("zod");
// Query parameters schema
const RecordsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(), // ISO date
    endDate: zod_1.z.string().optional(), // ISO date
    status: zod_1.z.enum(['DRAFT', 'PENDING_REVIEW', 'SIGNED', 'AMENDED', 'ADDENDUM']).optional(),
    sortBy: zod_1.z.enum(['createdAt', 'signedAt', 'updatedAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
async function GET(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const queryValidation = RecordsQuerySchema.safeParse({
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
            search: searchParams.get('search'),
            startDate: searchParams.get('startDate'),
            endDate: searchParams.get('endDate'),
            status: searchParams.get('status'),
            sortBy: searchParams.get('sortBy'),
            sortOrder: searchParams.get('sortOrder'),
        });
        if (!queryValidation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid query parameters',
                details: queryValidation.error.errors,
            }, { status: 400 });
        }
        const { page, limit, search, startDate, endDate, status, sortBy, sortOrder, } = queryValidation.data;
        // Build filter conditions
        const where = {
            patientId: session.patientId,
        };
        // Search filter (searches in subjective, objective, assessment, plan)
        if (search) {
            where.OR = [
                { subjective: { contains: search, mode: 'insensitive' } },
                { objective: { contains: search, mode: 'insensitive' } },
                { assessment: { contains: search, mode: 'insensitive' } },
                { plan: { contains: search, mode: 'insensitive' } },
                { chiefComplaint: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Date range filter
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        // Status filter
        if (status) {
            where.status = status;
        }
        // Calculate pagination
        const skip = (page - 1) * limit;
        // Fetch records with pagination
        const [records, totalCount] = await Promise.all([
            prisma_1.prisma.sOAPNote.findMany({
                where,
                include: {
                    clinician: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            specialty: true,
                        },
                    },
                    session: {
                        select: {
                            id: true,
                            audioDuration: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip,
                take: limit,
            }),
            prisma_1.prisma.sOAPNote.count({ where }),
        ]);
        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        // Log access for HIPAA compliance
        logger_1.default.info({
            event: 'patient_records_accessed',
            patientId: session.patientId,
            patientUserId: session.userId,
            recordCount: records.length,
            filters: { search, startDate, endDate, status },
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                records,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNextPage,
                    hasPrevPage,
                },
            },
        }, { status: 200 });
    }
    catch (error) {
        // Check if it's an auth error
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
        logger_1.default.error({
            event: 'patient_records_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar registros médicos.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map