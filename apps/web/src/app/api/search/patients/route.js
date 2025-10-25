"use strict";
/**
 * Patient Search API
 *
 * GET /api/search/patients?q=query&filter=active
 * Search patients by name, MRN, Token ID, CNS, CPF
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const audit_1 = require("@/lib/audit");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
/**
 * GET /api/search/patients
 * Search patients across multiple fields
 */
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const filter = searchParams.get('filter') || 'all'; // all, active, inactive, palliative
        const limit = parseInt(searchParams.get('limit') || '20');
        if (!query || query.length < 2) {
            return server_1.NextResponse.json({
                success: true,
                data: [],
                message: 'Query must be at least 2 characters',
            });
        }
        // Build search conditions
        const searchConditions = {
            OR: [
                // Search by first name (case-insensitive, partial match)
                {
                    firstName: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
                // Search by last name
                {
                    lastName: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
                // Search by MRN (exact match preferred, but allow partial)
                {
                    mrn: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
                // Search by Token ID (exact match)
                {
                    tokenId: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
                // Search by CPF (remove formatting, then search)
                {
                    cpf: {
                        contains: query.replace(/\D/g, ''), // Remove non-digits
                    },
                },
                // Search by CNS
                {
                    cns: {
                        contains: query.replace(/\D/g, ''),
                    },
                },
            ],
        };
        // Apply filters
        const whereClause = searchConditions;
        if (filter === 'active') {
            whereClause.isActive = true;
        }
        else if (filter === 'inactive') {
            whereClause.isActive = false;
        }
        else if (filter === 'palliative') {
            whereClause.isPalliativeCare = true;
            whereClause.isActive = true;
        }
        // Execute search
        const patients = await prisma_1.prisma.patient.findMany({
            where: whereClause,
            take: limit,
            orderBy: [
                // Prioritize exact MRN matches
                { mrn: 'asc' },
                // Then by last name
                { lastName: 'asc' },
            ],
            select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
                tokenId: true,
                dateOfBirth: true,
                gender: true,
                phone: true,
                email: true,
                cpf: true,
                cns: true,
                isPalliativeCare: true,
                isActive: true,
                assignedClinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        // Create audit log for search query
        await (0, audit_1.auditView)('Search', 'patients', request, {
            query,
            filter,
            resultCount: patients.length,
        });
        return server_1.NextResponse.json({
            success: true,
            data: patients,
            meta: {
                query,
                filter,
                count: patients.length,
                limit,
            },
        });
    }
    catch (error) {
        console.error('Error searching patients:', error);
        return server_1.NextResponse.json({ error: 'Failed to search patients', details: error.message }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map